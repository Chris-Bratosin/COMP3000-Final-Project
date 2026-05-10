'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  inspectSecret,
  scanSecretsInRegion,
  isDefaultKmsKey,
  findPublicStatements,
} = require('../secretsScanner');

function makeFakeClient(responses) {
  const consumed = {};
  return {
    async send(command) {
      const name = command.constructor.name;
      if (!(name in responses)) {
        throw new Error(`unscripted command in test: ${name}`);
      }
      const scripted = responses[name];
      if (Array.isArray(scripted)) {
        const idx = consumed[name] || 0;
        consumed[name] = idx + 1;
        const item = scripted[idx];
        if (item instanceof Error) throw item;
        return item;
      }
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

const REGION = 'eu-west-1';

describe('isDefaultKmsKey', () => {
  test('returns true for null/undefined/empty key id', () => {
    assert.equal(isDefaultKmsKey(null), true);
    assert.equal(isDefaultKmsKey(undefined), true);
    assert.equal(isDefaultKmsKey(''), true);
  });

  test('returns true for the bare default alias', () => {
    assert.equal(isDefaultKmsKey('alias/aws/secretsmanager'), true);
  });

  test('returns true for the alias ARN form', () => {
    assert.equal(
      isDefaultKmsKey('arn:aws:kms:eu-west-1:123456789012:alias/aws/secretsmanager'),
      true,
    );
  });

  test('returns false for a customer-managed CMK ARN', () => {
    assert.equal(
      isDefaultKmsKey('arn:aws:kms:eu-west-1:123456789012:key/abcd-1234'),
      false,
    );
  });

  test('returns false for a custom alias', () => {
    assert.equal(isDefaultKmsKey('alias/secrets-cmk'), false);
  });
});

describe('findPublicStatements', () => {
  test('detects Principal: "*"', () => {
    const doc = {
      Statement: [{ Effect: 'Allow', Principal: '*', Action: 'secretsmanager:GetSecretValue' }],
    };
    const result = findPublicStatements(doc);
    assert.equal(result.length, 1);
  });

  test('detects { AWS: "*" } principal', () => {
    const doc = {
      Statement: [
        { Effect: 'Allow', Principal: { AWS: '*' }, Action: 'secretsmanager:GetSecretValue' },
      ],
    };
    const result = findPublicStatements(doc);
    assert.equal(result.length, 1);
  });

  test('detects wildcard inside a principal array', () => {
    const doc = {
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['arn:aws:iam::111:root', '*'] },
          Action: 'secretsmanager:GetSecretValue',
        },
      ],
    };
    const result = findPublicStatements(doc);
    assert.equal(result.length, 1);
  });

  test('ignores Deny statements with wildcard principal', () => {
    const doc = {
      Statement: [{ Effect: 'Deny', Principal: '*', Action: 'secretsmanager:*' }],
    };
    const result = findPublicStatements(doc);
    assert.equal(result.length, 0);
  });

  test('returns empty for a tightly scoped policy', () => {
    const doc = {
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::123:role/app' },
          Action: 'secretsmanager:GetSecretValue',
        },
      ],
    };
    assert.equal(findPublicStatements(doc).length, 0);
  });

  test('handles a single statement object (not wrapped in array)', () => {
    const doc = {
      Statement: { Effect: 'Allow', Principal: '*', Action: 'secretsmanager:*' },
    };
    assert.equal(findPublicStatements(doc).length, 1);
  });

  test('records hasCondition flag for evidence inspection', () => {
    const doc = {
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: 'secretsmanager:GetSecretValue',
          Condition: { StringEquals: { 'aws:SourceVpce': 'vpce-1' } },
        },
      ],
    };
    const result = findPublicStatements(doc);
    assert.equal(result.length, 1);
    assert.equal(result[0].hasCondition, true);
  });
});

describe('inspectSecret', () => {
  test('flags rotation disabled as medium', () => {
    const findings = inspectSecret({
      description: {
        ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:db-creds-AbCdEf',
        Name: 'db-creds',
        RotationEnabled: false,
        KmsKeyId: 'arn:aws:kms:eu-west-1:123:key/cmk-1',
      },
      policyDoc: null,
      region: REGION,
    });
    const ids = findings.map((f) => f.ruleId);
    assert.ok(ids.includes('secrets-rotation-disabled'));
    const rotation = findings.find((f) => f.ruleId === 'secrets-rotation-disabled');
    assert.equal(rotation.severity, 'medium');
    assert.equal(rotation.resourceId, 'db-creds');
  });

  test('flags default KMS key as low when KmsKeyId is absent', () => {
    const findings = inspectSecret({
      description: {
        ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:api-key-XyZ',
        Name: 'api-key',
        RotationEnabled: true,
      },
      policyDoc: null,
      region: REGION,
    });
    const kms = findings.find((f) => f.ruleId === 'secrets-default-kms-key');
    assert.ok(kms);
    assert.equal(kms.severity, 'low');
  });

  test('does NOT flag default KMS key when a CMK is in use', () => {
    const findings = inspectSecret({
      description: {
        ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:s',
        Name: 's',
        RotationEnabled: true,
        KmsKeyId: 'arn:aws:kms:eu-west-1:123:key/cmk-2',
      },
      policyDoc: null,
      region: REGION,
    });
    assert.equal(findings.length, 0);
  });

  test('flags wildcard-principal resource policy as high', () => {
    const findings = inspectSecret({
      description: {
        ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:open',
        Name: 'open',
        RotationEnabled: true,
        KmsKeyId: 'arn:aws:kms:eu-west-1:123:key/cmk-1',
      },
      policyDoc: {
        Statement: [
          { Effect: 'Allow', Principal: '*', Action: 'secretsmanager:GetSecretValue' },
        ],
      },
      region: REGION,
    });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'secrets-resource-policy-public');
    assert.equal(findings[0].severity, 'high');
  });

  test('a fully-misconfigured secret produces all three findings', () => {
    const findings = inspectSecret({
      description: {
        ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:bad',
        Name: 'bad',
        // RotationEnabled missing entirely
        // KmsKeyId missing entirely
      },
      policyDoc: {
        Statement: [{ Effect: 'Allow', Principal: { AWS: '*' }, Action: 'secretsmanager:*' }],
      },
      region: REGION,
    });
    const ids = findings.map((f) => f.ruleId).sort();
    assert.deepEqual(ids, [
      'secrets-default-kms-key',
      'secrets-resource-policy-public',
      'secrets-rotation-disabled',
    ]);
  });
});

describe('scanSecretsInRegion', () => {
  test('routes AccessDenied on ListSecrets to denied bucket', async () => {
    const client = makeFakeClient({
      ListSecretsCommand: awsError('AccessDeniedException'),
    });
    const result = await scanSecretsInRegion(client, REGION);
    assert.equal(result.denied.length, 1);
    assert.equal(result.denied[0], 'secrets-list');
    assert.equal(result.findings.length, 0);
  });

  test('routes a network error on ListSecrets to errored', async () => {
    const client = makeFakeClient({
      ListSecretsCommand: awsError('NetworkingError', 'connect ETIMEDOUT'),
    });
    const result = await scanSecretsInRegion(client, REGION);
    assert.equal(result.errored.length, 1);
    assert.equal(result.errored[0].errorName, 'NetworkingError');
  });

  test('returns no findings when no secrets exist (totalChecks still 1)', async () => {
    const client = makeFakeClient({
      ListSecretsCommand: { SecretList: [] },
    });
    const result = await scanSecretsInRegion(client, REGION);
    assert.equal(result.findings.length, 0);
    assert.equal(result.secretsScanned, 0);
    assert.equal(result.totalChecks, 1);
  });

  test('produces findings across multiple secrets', async () => {
    const client = makeFakeClient({
      ListSecretsCommand: {
        SecretList: [
          { ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:a', Name: 'a' },
          { ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:b', Name: 'b' },
        ],
      },
      DescribeSecretCommand: [
        // Secret a: rotation disabled, default KMS, no policy → 2 findings
        { ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:a', Name: 'a' },
        // Secret b: rotation enabled, CMK, no policy → 0 findings
        {
          ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:b',
          Name: 'b',
          RotationEnabled: true,
          KmsKeyId: 'arn:aws:kms:eu-west-1:123:key/cmk-1',
        },
      ],
      GetResourcePolicyCommand: [
        awsError('ResourceNotFoundException'),
        awsError('ResourceNotFoundException'),
      ],
    });
    const result = await scanSecretsInRegion(client, REGION);
    assert.equal(result.secretsScanned, 2);
    assert.equal(result.findings.length, 2);
    const ids = result.findings.map((f) => f.ruleId).sort();
    assert.deepEqual(ids, ['secrets-default-kms-key', 'secrets-rotation-disabled']);
    assert.equal(result.totalChecks, 6); // 2 secrets * 3 inspections
  });

  test('routes describe-level access denied to denied bucket and skips the secret', async () => {
    const client = makeFakeClient({
      ListSecretsCommand: {
        SecretList: [{ ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:locked', Name: 'locked' }],
      },
      DescribeSecretCommand: awsError('AccessDeniedException'),
    });
    const result = await scanSecretsInRegion(client, REGION);
    assert.equal(result.denied.length, 1);
    assert.equal(result.denied[0], 'secrets-describe');
    assert.equal(result.findings.length, 0);
    assert.equal(result.secretsScanned, 0);
  });

  test('captures wildcard resource policy finding when GetResourcePolicy succeeds', async () => {
    const client = makeFakeClient({
      ListSecretsCommand: {
        SecretList: [{ ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:open', Name: 'open' }],
      },
      DescribeSecretCommand: {
        ARN: 'arn:aws:secretsmanager:eu-west-1:123:secret:open',
        Name: 'open',
        RotationEnabled: true,
        KmsKeyId: 'arn:aws:kms:eu-west-1:123:key/cmk-1',
      },
      GetResourcePolicyCommand: {
        ResourcePolicy: JSON.stringify({
          Statement: [
            { Effect: 'Allow', Principal: '*', Action: 'secretsmanager:GetSecretValue' },
          ],
        }),
      },
    });
    const result = await scanSecretsInRegion(client, REGION);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].ruleId, 'secrets-resource-policy-public');
  });
});
