const {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetPublicAccessBlockCommand,
  GetBucketPolicyStatusCommand,
  GetBucketAclCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetBucketLoggingCommand,
} = require('@aws-sdk/client-s3');

const PUBLIC_ACL_GROUPS = [
  'http://acs.amazonaws.com/groups/global/AllUsers',
  'http://acs.amazonaws.com/groups/global/AuthenticatedUsers',
];

function buildClient({ region, credentials }) {
  return new S3Client({
    region,
    credentials,
    followRegionRedirects: true,
  });
}

function makeFinding({ ruleId, title, severity, bucket, region, evidence, remediation }) {
  return {
    id: `${ruleId}:${bucket}`,
    ruleId,
    title,
    severity,
    service: 'S3',
    region: region || 'unknown',
    resourceId: bucket,
    evidence: evidence || null,
    remediation: remediation || '',
  };
}

async function safeCall(promise, fallback = null) {
  try {
    return await promise;
  } catch (error) {
    return { __error: error };
  }
}

function isErrorCode(result, ...codes) {
  return result && result.__error && codes.includes(result.__error.name);
}

function deniedOutcome(ruleId) {
  return { __denied: true, ruleId };
}

function erroredOutcome(ruleId, error) {
  return {
    __errored: true,
    ruleId,
    errorName: error?.name || 'UnknownError',
    errorMessage: error?.message || 'Unknown error.',
  };
}

function isAccessDenied(result) {
  return (
    result &&
    result.__error &&
    (result.__error.name === 'AccessDenied' || result.__error.name === 'AccessDeniedException')
  );
}

async function checkPublicAccessBlock(client, bucket, region) {
  const ruleId = 's3-public-access-block';
  const result = await safeCall(client.send(new GetPublicAccessBlockCommand({ Bucket: bucket })));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (isErrorCode(result, 'NoSuchPublicAccessBlockConfiguration')) {
    return makeFinding({
      ruleId: 's3-public-access-block-missing',
      title: 'S3 bucket has no Public Access Block configured',
      severity: 'high',
      bucket,
      region,
      evidence: { publicAccessBlock: 'not-configured' },
      remediation: 'Enable all four Public Access Block settings on the bucket to prevent accidental public exposure.',
    });
  }
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  if (result && result.PublicAccessBlockConfiguration) {
    const cfg = result.PublicAccessBlockConfiguration;
    const allEnabled =
      cfg.BlockPublicAcls && cfg.IgnorePublicAcls && cfg.BlockPublicPolicy && cfg.RestrictPublicBuckets;
    if (!allEnabled) {
      return makeFinding({
        ruleId: 's3-public-access-block-incomplete',
        title: 'S3 Public Access Block is not fully enabled',
        severity: 'high',
        bucket,
        region,
        evidence: cfg,
        remediation: 'Set BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, and RestrictPublicBuckets all to true.',
      });
    }
  }
  return null;
}

async function checkBucketPolicyPublic(client, bucket, region) {
  const ruleId = 's3-bucket-policy-public';
  const result = await safeCall(client.send(new GetBucketPolicyStatusCommand({ Bucket: bucket })));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (isErrorCode(result, 'NoSuchBucketPolicy')) return null;
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  if (result && result.PolicyStatus && result.PolicyStatus.IsPublic) {
    return makeFinding({
      ruleId,
      title: 'S3 bucket policy grants public access',
      severity: 'high',
      bucket,
      region,
      evidence: { isPublic: true },
      remediation: 'Review the bucket policy and remove any statements that allow access to Principal "*" or anonymous users.',
    });
  }
  return null;
}

async function checkBucketAcl(client, bucket, region) {
  const ruleId = 's3-acl-public-grant';
  const result = await safeCall(client.send(new GetBucketAclCommand({ Bucket: bucket })));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  if (!result) return erroredOutcome(ruleId, { name: 'EmptyResponse', message: 'No response from S3.' });
  const grants = result.Grants || [];
  const publicGrants = grants.filter((g) => g.Grantee && g.Grantee.URI && PUBLIC_ACL_GROUPS.includes(g.Grantee.URI));
  if (publicGrants.length > 0) {
    return makeFinding({
      ruleId,
      title: 'S3 bucket ACL grants access to public groups',
      severity: 'high',
      bucket,
      region,
      evidence: { publicGrants: publicGrants.map((g) => ({ uri: g.Grantee.URI, permission: g.Permission })) },
      remediation: 'Remove ACL grants targeting AllUsers or AuthenticatedUsers and rely on bucket policies with explicit principals.',
    });
  }
  return null;
}

async function checkEncryption(client, bucket, region) {
  const ruleId = 's3-encryption-disabled';
  const result = await safeCall(client.send(new GetBucketEncryptionCommand({ Bucket: bucket })));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (isErrorCode(result, 'ServerSideEncryptionConfigurationNotFoundError')) {
    return makeFinding({
      ruleId,
      title: 'S3 bucket has no default encryption configured',
      severity: 'medium',
      bucket,
      region,
      evidence: { defaultEncryption: 'disabled' },
      remediation: 'Enable default encryption (SSE-S3 or SSE-KMS) on the bucket so objects are encrypted at rest by default.',
    });
  }
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  return null;
}

async function checkVersioning(client, bucket, region) {
  const ruleId = 's3-versioning-disabled';
  const result = await safeCall(client.send(new GetBucketVersioningCommand({ Bucket: bucket })));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  if (!result) return erroredOutcome(ruleId, { name: 'EmptyResponse', message: 'No response from S3.' });
  if (result.Status !== 'Enabled') {
    return makeFinding({
      ruleId,
      title: 'S3 bucket versioning is not enabled',
      severity: 'low',
      bucket,
      region,
      evidence: { versioning: result.Status || 'never-enabled' },
      remediation: 'Enable versioning to protect against accidental overwrites and deletions.',
    });
  }
  return null;
}

async function checkLogging(client, bucket, region) {
  const ruleId = 's3-server-access-logging-disabled';
  const result = await safeCall(client.send(new GetBucketLoggingCommand({ Bucket: bucket })));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  if (!result) return erroredOutcome(ruleId, { name: 'EmptyResponse', message: 'No response from S3.' });
  if (!result.LoggingEnabled) {
    return makeFinding({
      ruleId,
      title: 'S3 bucket has server access logging disabled',
      severity: 'low',
      bucket,
      region,
      evidence: { logging: 'disabled' },
      remediation: 'Enable server access logging and direct logs to a dedicated logging bucket for audit visibility.',
    });
  }
  return null;
}

async function resolveBucketRegion(globalClient, bucket) {
  const result = await safeCall(globalClient.send(new GetBucketLocationCommand({ Bucket: bucket })));
  if (!result || result.__error) return null;
  const loc = result.LocationConstraint;
  if (!loc || loc === '') return 'us-east-1';
  if (loc === 'EU') return 'eu-west-1';
  return loc;
}

async function scanBucket(bucket, region, credentials) {
  const client = buildClient({ region, credentials });
  const outcomes = await Promise.all([
    checkPublicAccessBlock(client, bucket, region),
    checkBucketPolicyPublic(client, bucket, region),
    checkBucketAcl(client, bucket, region),
    checkEncryption(client, bucket, region),
    checkVersioning(client, bucket, region),
    checkLogging(client, bucket, region),
  ]);
  const findings = [];
  const denied = [];
  const errored = [];
  for (const outcome of outcomes) {
    if (!outcome) continue;
    if (outcome.__denied) {
      denied.push(outcome.ruleId);
    } else if (outcome.__errored) {
      errored.push({
        ruleId: outcome.ruleId,
        errorName: outcome.errorName,
        errorMessage: outcome.errorMessage,
      });
    } else {
      findings.push(outcome);
    }
  }
  return { findings, denied, errored, totalChecks: outcomes.length };
}

async function listAllBuckets(globalClient) {
  const result = await safeCall(globalClient.send(new ListBucketsCommand({})));
  if (result && !result.__error) {
    return { buckets: (result.Buckets || []).map((b) => b.Name).filter(Boolean) };
  }
  return { buckets: [], error: result.__error };
}

async function runS3Scan({ region, credentials, bucketNames }) {
  const startedAt = new Date();
  // Use us-east-1 as the control-plane region: it's the true S3 global endpoint
  // for ListBuckets / GetBucketLocation. followRegionRedirects then handles
  // per-bucket calls in any region.
  const globalClient = buildClient({ region: 'us-east-1', credentials });

  const explicitBuckets = Array.isArray(bucketNames)
    ? bucketNames.map((n) => String(n).trim()).filter(Boolean)
    : [];

  let buckets = explicitBuckets;
  let listError = null;
  let listAttempted = false;

  if (buckets.length === 0) {
    listAttempted = true;
    const listOutcome = await listAllBuckets(globalClient);
    buckets = listOutcome.buckets;
    listError = listOutcome.error || null;
  }

  const findings = [];
  const scannedBuckets = [];
  const bucketErrors = [];
  let totalChecksAttempted = 0;
  let totalChecksDenied = 0;
  let totalChecksErrored = 0;

  for (const bucket of buckets) {
    const bucketRegion = (await resolveBucketRegion(globalClient, bucket)) || region;
    try {
      const { findings: bucketFindings, denied, errored, totalChecks } = await scanBucket(
        bucket,
        bucketRegion,
        credentials,
      );
      scannedBuckets.push({
        name: bucket,
        region: bucketRegion,
        status: 'scanned',
        deniedChecks: denied,
        erroredChecks: errored,
      });
      findings.push(...bucketFindings);
      totalChecksAttempted += totalChecks;
      totalChecksDenied += denied.length;
      totalChecksErrored += errored.length;
      if (errored.length > 0) {
        console.warn(
          `[s3Scanner] ${bucket} (${bucketRegion}): ${errored.length} check(s) errored:`,
          errored.map((e) => `${e.ruleId}=${e.errorName}:${e.errorMessage}`).join(' | '),
        );
      }
    } catch (error) {
      scannedBuckets.push({ name: bucket, region: bucketRegion, status: 'error' });
      bucketErrors.push({ bucket, message: error.message || 'Bucket scan failed.' });
    }
  }

  const completedAt = new Date();
  const summary = {
    totalChecks: totalChecksAttempted,
    checksDenied: totalChecksDenied,
    checksErrored: totalChecksErrored,
    checksSucceeded: totalChecksAttempted - totalChecksDenied - totalChecksErrored,
    bucketsScanned: scannedBuckets.filter((b) => b.status === 'scanned').length,
    issuesFound: findings.length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  return {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    region,
    bucketSource: explicitBuckets.length > 0 ? 'explicit' : 'list-all',
    listAttempted,
    listError: listError ? { name: listError.name, message: listError.message } : null,
    summary,
    buckets: scannedBuckets,
    bucketErrors,
    findings,
  };
}

module.exports = { runS3Scan };
