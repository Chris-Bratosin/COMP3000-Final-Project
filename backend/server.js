require('dotenv').config();

const express = require('express');
const {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  STSClient,
} = require('@aws-sdk/client-sts');
const { connectToDatabase } = require('./src/config/database');
const { runS3Scan } = require('./src/scanners/s3Scanner');

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';
const allowedOrigins = (process.env.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const connectionTestAttempts = new Map();

function isOriginAllowed(origin) {
  return !origin || allowedOrigins.includes(origin);
}

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

function rateLimitConnectionTests(req, res, next) {
  const windowMs = 60 * 1000;
  const maxAttempts = 10;
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = connectionTestAttempts.get(key) || {
    count: 0,
    resetAt: now + windowMs,
  };

  if (entry.resetAt <= now) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  connectionTestAttempts.set(key, entry);

  if (entry.count > maxAttempts) {
    res.status(429).json({
      connected: false,
      message: 'Too many connection attempts. Please wait before trying again.',
    });
    return;
  }

  next();
}

app.get('/', (_req, res) => {
  res.send('Express server is running.');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

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

app.post('/api/scan/s3', async (req, res) => {
  try {
    const { region, credentials } = await resolveCredentialsForScan(req.body);
    const bucketNames = Array.isArray(req.body?.bucketNames) ? req.body.bucketNames : [];
    const result = await runS3Scan({ region, credentials, bucketNames });
    res.status(200).json({ ok: true, scan: result });
  } catch (error) {
    const status = error.statusCode || (error.name === 'AccessDenied' ? 403 : 500);
    res.status(status).json({
      ok: false,
      message: mapAwsConnectionError(error),
      errorCode: error.name || 'ScanFailed',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

connectToDatabase().catch((error) => {
  console.error('MongoDB connection failed:', error.message);
});
