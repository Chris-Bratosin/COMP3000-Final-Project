// Express HTTP server for the Cloud Misconfiguration Auditor (CMA).
//
// Two responsibilities:
//   1. Validate AWS credentials supplied by the frontend (POST /api/aws/test-connection).
//   2. Run read-only AWS scans on demand (POST /api/scan/{s3,iam,ec2,secrets})
//      and persist each result to MongoDB so the Reports page can list history.
//
// Every endpoint is rate-limited per IP, CORS is restricted to configured
// frontend origins, and request bodies are capped at 25 KB to keep the
// localhost backend resilient even when called from outside the bundled UI.

require('dotenv').config();

const express = require('express');
const {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  STSClient,
} = require('@aws-sdk/client-sts');
const { connectToDatabase } = require('./src/config/database');
const { runS3Scan } = require('./src/scanners/s3Scanner');
const { runIamScan } = require('./src/scanners/iamScanner');
const { runEc2Scan } = require('./src/scanners/ec2Scanner');
const { runSecretsScan } = require('./src/scanners/secretsScanner');
const { applyReportOptions } = require('./src/scanners/utils');
const ScanRecord = require('./src/models/ScanRecord');

// Pulls the report-shaping options (severity threshold, evidence/remediation
// toggles) off the request body so they can be passed to applyReportOptions
// without leaking unrelated fields into the scanner's response shaping.
function reportOptionsFromBody(body) {
  return {
    severityThreshold: body?.severityThreshold,
    includeEvidence: body?.includeEvidence,
    includeRemediationAdvice: body?.includeRemediationAdvice,
  };
}

// Whether to persist this scan to the history database. Defaults to true so
// older callers (or anything that omits the flag) keep their existing behaviour;
// only an explicit `false` skips the write.
function shouldSaveScanLogs(body) {
  return body?.saveScanLogs !== false;
}

async function persistScanRecord(result, body, scannerLabel) {
  if (!shouldSaveScanLogs(body)) return;
  // Attach the click-level runId so the Reports page can group all parallel
  // scanner records from the same click. The pattern check restricts the value
  // to UUID-like identifiers (alphanumerics + dashes, 8-64 chars) so a tampered
  // request can't push arbitrary strings into MongoDB or React row keys.
  // Anything malformed falls back to null (matches the schema default and
  // lets legacy clients keep working).
  const rawRunId = typeof body?.runId === 'string' ? body.runId.trim() : '';
  const runId = RUN_ID_PATTERN.test(rawRunId) ? rawRunId : null;
  const recordPayload = { ...result, runId };
  try {
    await ScanRecord.create(recordPayload);
  } catch (dbError) {
    console.warn(`[scan] failed to persist ${scannerLabel} scan record:`, dbError.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// Per-route hit counters for the rate limiter factory below. Each route gets
// its own Map so traffic on one endpoint never depletes another endpoint's
// budget.
const rateLimitBuckets = {
  connection: new Map(),
  scan: new Map(),
};

// Hard caps for user-supplied arrays. Without these a single request could
// loop the scanner for tens of thousands of iterations (one SDK call per item)
// — combined with no rate limit that becomes a feasible DoS. The numbers are
// generous: AWS has ~35 regions total and 200 buckets is more than any sane
// account would name explicitly.
const MAX_BUCKET_NAMES = 200;
const MAX_REGIONS = 35;

// runId format: short identifier from the frontend, e.g. a UUID v4 (36 chars
// of hex+dash) or our timestamp-plus-random fallback. Anything not matching
// this shape is dropped to null so a tampered request can't push arbitrary
// strings into the database or React row keys.
const RUN_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

function isOriginAllowed(origin) {
  return !origin || allowedOrigins.includes(origin);
}

// ---------------------------------------------------------------------------
// CORS / request hygiene
// ---------------------------------------------------------------------------
// The CMA UI ships with the backend on localhost; we still validate the Origin
// header so that a browser tab on a different site cannot drive scans against
// a developer's local AWS credentials.
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!isOriginAllowed(origin)) {
    res.status(403).json({ message: 'Origin is not allowed.' });
    return;
  }

  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: '25kb' }));

// Sliding-window rate limiter factory. Each call returns Express middleware
// backed by its own Map so different routes can have independent budgets.
// The response shape is configurable so a 429 from /api/aws/test-connection
// matches that endpoint's `{ connected, message }` envelope and a 429 from
// /api/scan/* matches its `{ ok, message, errorCode }` envelope.
function createRateLimiter({ bucket, windowMs, maxAttempts, responseBody }) {
  const counters = rateLimitBuckets[bucket];
  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = counters.get(key) || { count: 0, resetAt: now + windowMs };
    if (entry.resetAt <= now) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    counters.set(key, entry);
    if (entry.count > maxAttempts) {
      res.status(429).json(responseBody);
      return;
    }
    next();
  };
}

const rateLimitConnectionTests = createRateLimiter({
  bucket: 'connection',
  windowMs: 60 * 1000,
  maxAttempts: 10,
  responseBody: {
    connected: false,
    message: 'Too many connection attempts. Please wait before trying again.',
  },
});

// Allow up to 20 scan POSTs per minute per IP. One Run Scan click can fire up
// to four parallel POSTs (S3 + IAM + EC2 + Secrets), so 20/min permits ~5
// clicks per minute — comfortably above what any legitimate user does
// interactively, well below what a script could use to DoS the backend or the
// downstream AWS account.
const rateLimitScans = createRateLimiter({
  bucket: 'scan',
  windowMs: 60 * 1000,
  maxAttempts: 20,
  responseBody: {
    ok: false,
    message: 'Too many scan requests. Please wait before trying again.',
    errorCode: 'RateLimited',
  },
});

// ---------------------------------------------------------------------------
// Health / liveness routes
// ---------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.send('Express server is running.');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Translates AWS SDK error names into user-friendly messages for the UI.
// Falls back to the raw error.message for anything not explicitly handled so
// that unknown failure modes still produce a useful surface message.
function mapAwsConnectionError(error) {
  switch (error.name) {
    case 'InvalidClientTokenId':
      return 'The AWS access key appears to be invalid.';
    case 'SignatureDoesNotMatch':
      return 'The secret access key does not match the access key provided.';
    case 'ExpiredToken':
      return 'The temporary session token has expired. Generate a new set of sandbox credentials.';
    case 'UnrecognizedClientException':
      return 'AWS did not recognise the supplied credentials.';
    case 'AccessDenied':
    case 'AccessDeniedException':
      return 'AWS rejected the request. Check that the credentials are valid and allowed to call STS.';
    case 'RegionDisabledException':
      return 'STS is not enabled in the selected region.';
    default:
      return error.message || 'AWS connection test failed.';
  }
}

// ---------------------------------------------------------------------------
// AWS connection test
// ---------------------------------------------------------------------------
// Builds an STS client from whichever credential method the user picked, then
// calls GetCallerIdentity. A successful round-trip proves the credentials are
// valid and that STS is reachable from the chosen region. The frontend uses
// this to gate the Run Scan button.
app.post('/api/aws/test-connection', rateLimitConnectionTests, async (req, res) => {
  const {
    connectionMethod,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    assumeRoleArn,
    primaryRegion,
  } = req.body || {};

  const region = primaryRegion || 'eu-west-1';

  try {
    let stsClient;

    if (connectionMethod === 'temporary-credentials') {
      if (!accessKeyId || !secretAccessKey) {
        res.status(400).json({
          connected: false,
          message: 'Access Key ID and Secret Access Key are required.',
        });
        return;
      }

      stsClient = new STSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
          sessionToken: sessionToken || undefined,
        },
      });
    } else if (connectionMethod === 'assume-role') {
      if (!assumeRoleArn) {
        res.status(400).json({
          connected: false,
          message: 'Assume Role ARN is required.',
        });
        return;
      }

      const baseClient = new STSClient({ region });
      const assumeRoleResponse = await baseClient.send(
        new AssumeRoleCommand({
          RoleArn: assumeRoleArn,
          RoleSessionName: 'cma-test-connection',
        }),
      );

      if (!assumeRoleResponse.Credentials) {
        throw new Error('AWS did not return temporary credentials for the supplied role.');
      }

      stsClient = new STSClient({
        region,
        credentials: {
          accessKeyId: assumeRoleResponse.Credentials.AccessKeyId,
          secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey,
          sessionToken: assumeRoleResponse.Credentials.SessionToken,
        },
      });
    } else if (connectionMethod === 'env-vars') {
      stsClient = new STSClient({ region });
    } else {
      res.status(400).json({
        connected: false,
        message: 'Unsupported connection method.',
      });
      return;
    }

    const identity = await stsClient.send(new GetCallerIdentityCommand({}));

    res.status(200).json({
      connected: true,
      accountId: identity.Account || '',
      arn: identity.Arn || '',
      message: 'Connection successful. AWS credentials were validated with STS.',
    });
  } catch (error) {
    res.status(401).json({
      connected: false,
      message: mapAwsConnectionError(error),
    });
  }
});

// ---------------------------------------------------------------------------
// Scan endpoints
// ---------------------------------------------------------------------------
// Each scan endpoint follows the same shape:
//   1. Resolve credentials from the request body (temp creds, assume-role, env).
//   2. Run the scanner-specific function from src/scanners.
//   3. Persist the unfiltered result to MongoDB (unless saveScanLogs is false).
//   4. Apply the user's report-shaping options and return the trimmed result.
// Persistence uses the unfiltered scan so the history view stays truthful;
// only the response sent back to the dashboard is filtered.

// Common credential-resolution path used by every scan endpoint. Throws an
// Error with a `statusCode` property so the route handler can surface 400 vs
// 500 appropriately. Returns `{ region, credentials }` where credentials may
// be undefined when env-vars mode lets the SDK pick them up itself.
async function resolveCredentialsForScan(body) {
  const {
    connectionMethod,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    assumeRoleArn,
    primaryRegion,
  } = body || {};
  const region = primaryRegion || 'eu-west-1';

  if (connectionMethod === 'temporary-credentials') {
    if (!accessKeyId || !secretAccessKey) {
      const err = new Error('Access Key ID and Secret Access Key are required.');
      err.statusCode = 400;
      throw err;
    }
    return {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken: sessionToken || undefined,
      },
    };
  }

  if (connectionMethod === 'assume-role') {
    if (!assumeRoleArn) {
      const err = new Error('Assume Role ARN is required.');
      err.statusCode = 400;
      throw err;
    }
    const baseClient = new STSClient({ region });
    const assumeRoleResponse = await baseClient.send(
      new AssumeRoleCommand({
        RoleArn: assumeRoleArn,
        RoleSessionName: 'cma-scan-run',
      }),
    );
    if (!assumeRoleResponse.Credentials) {
      throw new Error('AWS did not return temporary credentials for the supplied role.');
    }
    return {
      region,
      credentials: {
        accessKeyId: assumeRoleResponse.Credentials.AccessKeyId,
        secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey,
        sessionToken: assumeRoleResponse.Credentials.SessionToken,
      },
    };
  }

  if (connectionMethod === 'env-vars') {
    return { region, credentials: undefined };
  }

  const err = new Error('Unsupported connection method.');
  err.statusCode = 400;
  throw err;
}

app.post('/api/scan/s3', rateLimitScans, async (req, res) => {
  try {
    const { region, credentials } = await resolveCredentialsForScan(req.body);
    const bucketNames = Array.isArray(req.body?.bucketNames)
      ? req.body.bucketNames.slice(0, MAX_BUCKET_NAMES)
      : [];
    const regionFilter = Array.isArray(req.body?.regionFilter)
      ? req.body.regionFilter.slice(0, MAX_REGIONS)
      : null;
    const result = await runS3Scan({ region, credentials, bucketNames, regionFilter });

    await persistScanRecord(result, req.body, 'S3');

    const shaped = applyReportOptions(result, reportOptionsFromBody(req.body));
    res.status(200).json({ ok: true, scan: shaped });
  } catch (error) {
    const status = error.statusCode || (error.name === 'AccessDenied' ? 403 : 500);
    res.status(status).json({
      ok: false,
      message: mapAwsConnectionError(error),
      errorCode: error.name || 'ScanFailed',
    });
  }
});

app.post('/api/scan/ec2', rateLimitScans, async (req, res) => {
  try {
    const { credentials } = await resolveCredentialsForScan(req.body);
    const regions = Array.isArray(req.body?.regions)
      ? req.body.regions.slice(0, MAX_REGIONS)
      : [];
    const result = await runEc2Scan({ credentials, regions });

    await persistScanRecord(result, req.body, 'EC2');

    const shaped = applyReportOptions(result, reportOptionsFromBody(req.body));
    res.status(200).json({ ok: true, scan: shaped });
  } catch (error) {
    const status = error.statusCode || (error.name === 'AccessDenied' ? 403 : 500);
    res.status(status).json({
      ok: false,
      message: mapAwsConnectionError(error),
      errorCode: error.name || 'ScanFailed',
    });
  }
});

app.post('/api/scan/secrets', rateLimitScans, async (req, res) => {
  try {
    const { credentials } = await resolveCredentialsForScan(req.body);
    const regions = Array.isArray(req.body?.regions)
      ? req.body.regions.slice(0, MAX_REGIONS)
      : [];
    const result = await runSecretsScan({ credentials, regions });

    await persistScanRecord(result, req.body, 'Secrets');

    const shaped = applyReportOptions(result, reportOptionsFromBody(req.body));
    res.status(200).json({ ok: true, scan: shaped });
  } catch (error) {
    const status = error.statusCode || (error.name === 'AccessDenied' ? 403 : 500);
    res.status(status).json({
      ok: false,
      message: mapAwsConnectionError(error),
      errorCode: error.name || 'ScanFailed',
    });
  }
});

app.post('/api/scan/iam', rateLimitScans, async (req, res) => {
  try {
    const { credentials, region } = await resolveCredentialsForScan(req.body);

    let accountId = null;
    try {
      const stsClient = new STSClient({ region, credentials });
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      accountId = identity.Account || null;
    } catch {
      // Best-effort: account ID is informational, not required for the scan.
    }

    const result = await runIamScan({ credentials, accountId });

    await persistScanRecord(result, req.body, 'IAM');

    const shaped = applyReportOptions(result, reportOptionsFromBody(req.body));
    res.status(200).json({ ok: true, scan: shaped });
  } catch (error) {
    const status = error.statusCode || (error.name === 'AccessDenied' ? 403 : 500);
    res.status(status).json({
      ok: false,
      message: mapAwsConnectionError(error),
      errorCode: error.name || 'ScanFailed',
    });
  }
});

// ---------------------------------------------------------------------------
// History endpoint
// ---------------------------------------------------------------------------
// Returns the 50 most recent ScanRecord rows for the Reports page. The
// frontend groups them by runId so that one Run Scan click (which fans out
// to up to four parallel scanners) appears as a single row.
app.get('/api/scans', async (_req, res) => {
  try {
    const records = await ScanRecord.find({})
      .sort({ completedAt: -1 })
      .limit(50)
      .lean();
    res.status(200).json({ ok: true, scans: records });
  } catch (error) {
    res.status(503).json({
      ok: false,
      message: 'Scan history is unavailable. The database may not be connected.',
      errorCode: error.name || 'DatabaseUnavailable',
    });
  }
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
// Listen first so the HTTP surface is up before MongoDB completes its
// handshake — this keeps /health responsive even when the database is slow
// or unavailable. The connection is best-effort; scan endpoints still run
// without it, only persistence (and the /api/scans listing) is affected.
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

connectToDatabase().catch((error) => {
  console.error('MongoDB connection failed:', error.message);
});
