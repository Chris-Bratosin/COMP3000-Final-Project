'use strict';

// Unit tests for the S3 scanner check functions.
//
// Strategy: tests do NOT hit AWS. Each scanner check takes a `client` object
// and calls `client.send(command)`, so we hand it a fake whose .send() looks
// at the command's class name and returns a scripted response (or throws a
// scripted error). This lets us cover every branch — success, AccessDenied,
// per-service "no such configuration" errors, and unexpected failures —
// without credentials or network. Run with `node --test`.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  checkPublicAccessBlock,
  checkBucketPolicyPublic,
  checkBucketAcl,
  checkEncryption,
  checkVersioning,
  checkLogging,
  resolveBucketRegion,
} = require('../s3Scanner');

// A fake S3 client whose .send() looks at the command class name and returns
// whatever the test scripted for that command. Throws if you forgot to script a
// response, so unhandled commands fail loudly.
function makeFakeClient(responses) {
  return {
    async send(command) {
      const name = command.constructor.name;
      if (!(name in responses)) {
        throw new Error(`unscripted command in test: ${name}`);
      }
      const scripted = responses[name];
      if (scripted instanceof Error) throw scripted;
      return scripted;
    },
  };
}

function awsError(name, message = 'simulated') {
  const err = new Error(message);
  err.name = name;
  return err;
}

const BUCKET = 'demo-bucket';
const REGION = 'eu-west-1';

describe('checkPublicAccessBlock', () => {
  test('flags missing PAB as high-severity finding', async () => {
    const client = makeFakeClient({
      GetPublicAccessBlockCommand: awsError('NoSuchPublicAccessBlockConfiguration'),
    });
    const result = await checkPublicAccessBlock(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-public-access-block-missing');
    assert.equal(result.severity, 'high');
    assert.equal(result.resourceId, BUCKET);
  });

  test('flags incomplete PAB when one flag is false', async () => {
    const client = makeFakeClient({
      GetPublicAccessBlockCommand: {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: false, // <-- the gap
          RestrictPublicBuckets: true,
        },
      },
    });
    const result = await checkPublicAccessBlock(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-public-access-block-incomplete');
    assert.equal(result.severity, 'high');
  });

  test('returns null when all four flags are enabled', async () => {
    const client = makeFakeClient({
      GetPublicAccessBlockCommand: {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      },
    });
    const result = await checkPublicAccessBlock(client, BUCKET, REGION);
    assert.equal(result, null);
  });

  test('returns denied outcome on AccessDenied', async () => {
    const client = makeFakeClient({
      GetPublicAccessBlockCommand: awsError('AccessDenied'),
    });
    const result = await checkPublicAccessBlock(client, BUCKET, REGION);
    assert.equal(result.__denied, true);
    assert.equal(result.ruleId, 's3-public-access-block');
  });

  test('returns errored outcome on unexpected error', async () => {
    const client = makeFakeClient({
      GetPublicAccessBlockCommand: awsError('NetworkingError', 'connect ETIMEDOUT'),
    });
    const result = await checkPublicAccessBlock(client, BUCKET, REGION);
    assert.equal(result.__errored, true);
    assert.equal(result.errorName, 'NetworkingError');
  });
});

describe('checkBucketPolicyPublic', () => {
  test('flags public policy as high-severity finding', async () => {
    const client = makeFakeClient({
      GetBucketPolicyStatusCommand: { PolicyStatus: { IsPublic: true } },
    });
    const result = await checkBucketPolicyPublic(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-bucket-policy-public');
    assert.equal(result.severity, 'high');
  });

  test('returns null when policy is not public', async () => {
    const client = makeFakeClient({
      GetBucketPolicyStatusCommand: { PolicyStatus: { IsPublic: false } },
    });
    const result = await checkBucketPolicyPublic(client, BUCKET, REGION);
    assert.equal(result, null);
  });

  test('returns null when no bucket policy exists', async () => {
    const client = makeFakeClient({
      GetBucketPolicyStatusCommand: awsError('NoSuchBucketPolicy'),
    });
    const result = await checkBucketPolicyPublic(client, BUCKET, REGION);
    assert.equal(result, null);
  });
});

describe('checkBucketAcl', () => {
  test('flags AllUsers grant', async () => {
    const client = makeFakeClient({
      GetBucketAclCommand: {
        Grants: [
          {
            Grantee: { URI: 'http://acs.amazonaws.com/groups/global/AllUsers' },
            Permission: 'READ',
          },
        ],
      },
    });
    const result = await checkBucketAcl(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-acl-public-grant');
    assert.equal(result.severity, 'high');
    assert.equal(result.evidence.publicGrants[0].uri, 'http://acs.amazonaws.com/groups/global/AllUsers');
  });

  test('flags AuthenticatedUsers grant', async () => {
    const client = makeFakeClient({
      GetBucketAclCommand: {
        Grants: [
          {
            Grantee: { URI: 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers' },
            Permission: 'READ',
          },
        ],
      },
    });
    const result = await checkBucketAcl(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-acl-public-grant');
  });

  test('returns null when only owner grants exist', async () => {
    const client = makeFakeClient({
      GetBucketAclCommand: {
        Grants: [
          {
            Grantee: { ID: 'canonical-user-id', Type: 'CanonicalUser' },
            Permission: 'FULL_CONTROL',
          },
        ],
      },
    });
    const result = await checkBucketAcl(client, BUCKET, REGION);
    assert.equal(result, null);
  });
});

describe('checkEncryption', () => {
  test('flags missing default encryption as medium severity', async () => {
    const client = makeFakeClient({
      GetBucketEncryptionCommand: awsError('ServerSideEncryptionConfigurationNotFoundError'),
    });
    const result = await checkEncryption(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-encryption-disabled');
    assert.equal(result.severity, 'medium');
  });

  test('returns null when encryption is configured', async () => {
    const client = makeFakeClient({
      GetBucketEncryptionCommand: {
        ServerSideEncryptionConfiguration: {
          Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
        },
      },
    });
    const result = await checkEncryption(client, BUCKET, REGION);
    assert.equal(result, null);
  });
});

describe('checkVersioning', () => {
  test('flags missing versioning as low severity', async () => {
    const client = makeFakeClient({
      GetBucketVersioningCommand: {}, // no Status field
    });
    const result = await checkVersioning(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-versioning-disabled');
    assert.equal(result.severity, 'low');
  });

  test('flags suspended versioning', async () => {
    const client = makeFakeClient({
      GetBucketVersioningCommand: { Status: 'Suspended' },
    });
    const result = await checkVersioning(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-versioning-disabled');
  });

  test('returns null when versioning is enabled', async () => {
    const client = makeFakeClient({
      GetBucketVersioningCommand: { Status: 'Enabled' },
    });
    const result = await checkVersioning(client, BUCKET, REGION);
    assert.equal(result, null);
  });
});

describe('checkLogging', () => {
  test('flags missing access logging as low severity', async () => {
    const client = makeFakeClient({
      GetBucketLoggingCommand: {}, // no LoggingEnabled
    });
    const result = await checkLogging(client, BUCKET, REGION);
    assert.equal(result.ruleId, 's3-server-access-logging-disabled');
    assert.equal(result.severity, 'low');
  });

  test('returns null when access logging is enabled', async () => {
    const client = makeFakeClient({
      GetBucketLoggingCommand: { LoggingEnabled: { TargetBucket: 'log-bucket', TargetPrefix: 'logs/' } },
    });
    const result = await checkLogging(client, BUCKET, REGION);
    assert.equal(result, null);
  });
});

describe('resolveBucketRegion', () => {
  test('treats empty LocationConstraint as us-east-1', async () => {
    const client = makeFakeClient({
      GetBucketLocationCommand: { LocationConstraint: '' },
    });
    const region = await resolveBucketRegion(client, BUCKET);
    assert.equal(region, 'us-east-1');
  });

  test('treats EU as eu-west-1 (legacy AWS quirk)', async () => {
    const client = makeFakeClient({
      GetBucketLocationCommand: { LocationConstraint: 'EU' },
    });
    const region = await resolveBucketRegion(client, BUCKET);
    assert.equal(region, 'eu-west-1');
  });

  test('passes through other regions verbatim', async () => {
    const client = makeFakeClient({
      GetBucketLocationCommand: { LocationConstraint: 'ap-southeast-2' },
    });
    const region = await resolveBucketRegion(client, BUCKET);
    assert.equal(region, 'ap-southeast-2');
  });

  test('returns null on error', async () => {
    const client = makeFakeClient({
      GetBucketLocationCommand: awsError('AccessDenied'),
    });
    const region = await resolveBucketRegion(client, BUCKET);
    assert.equal(region, null);
  });
});
