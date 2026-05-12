// Secrets Manager scanner.
//
// Three per-secret inspections:
//   - Automatic rotation enabled (RotationEnabled). Long-lived secrets
//     accumulate exposure risk and should rotate every 30-90 days.
//   - Encryption uses a customer-managed KMS key, not the default
//     AWS-managed alias/aws/secretsmanager (which can't be scoped via key
//     policy to specific principals).
//   - Resource policy doesn't grant access to wildcard principals.
//
// Secrets are region-scoped, so this follows the same per-region fan-out as
// the EC2 scanner and uses DescribeRegions to discover targets when none are
// explicitly listed.

const {
  SecretsManagerClient,
  ListSecretsCommand,
  DescribeSecretCommand,
  GetResourcePolicyCommand,
} = require('@aws-sdk/client-secrets-manager');
const {
  EC2Client,
  DescribeRegionsCommand,
} = require('@aws-sdk/client-ec2');

const {
  safeCall,
  isAccessDenied,
  isErrorCode,
  makeFinding: baseMakeFinding,
} = require('./utils');

// Default Secrets Manager KMS key alias. When DescribeSecret returns this
// (or no KmsKeyId at all), the secret is encrypted with the AWS-managed key
// rather than a customer-managed CMK. AWS-managed keys can't have key
// policies scoped to specific principals, so a customer-managed CMK is the
// least-privilege choice.
const DEFAULT_KMS_KEY_ALIAS = 'alias/aws/secretsmanager';

function buildClient({ region, credentials }) {
  return new SecretsManagerClient({ region, credentials });
}

function makeFinding({ ruleId, title, severity, resourceId, region, evidence, remediation }) {
  return baseMakeFinding({
    ruleId,
    title,
    severity,
    service: 'SecretsManager',
    resourceId,
    region: region || 'unknown',
    evidence,
    remediation,
  });
}

function isDefaultKmsKey(kmsKeyId) {
  if (!kmsKeyId) return true;
  const id = String(kmsKeyId).trim();
  if (id === '') return true;
  if (id === DEFAULT_KMS_KEY_ALIAS) return true;
  // Some accounts surface the alias ARN form. Either way it indicates the
  // AWS-managed key, not a customer-managed CMK.
  if (id.endsWith(':alias/aws/secretsmanager')) return true;
  return false;
}

// Walk a Secrets Manager resource policy and return any Allow statements that
// grant access to anonymous principals or wildcard principals. AWS treats
// Principal: "*" with no Condition as fully public; we also flag the AWS
// account form `{ "AWS": "*" }` for the same reason.
function findPublicStatements(doc) {
  if (!doc) return [];
  let statements = doc.Statement;
  if (!statements) return [];
  if (!Array.isArray(statements)) statements = [statements];

  const findings = [];
  for (const stmt of statements) {
    if (!stmt || stmt.Effect !== 'Allow') continue;
    const principal = stmt.Principal;
    let isWildcard = false;
    if (principal === '*') {
      isWildcard = true;
    } else if (principal && typeof principal === 'object') {
      // { "AWS": "*" } or { "AWS": ["*", ...] }
      for (const key of Object.keys(principal)) {
        const value = principal[key];
        if (value === '*' || (Array.isArray(value) && value.includes('*'))) {
          isWildcard = true;
          break;
        }
      }
    }
    if (isWildcard) {
      findings.push({
        sid: stmt.Sid || null,
        action: stmt.Action,
        hasCondition: Boolean(stmt.Condition && Object.keys(stmt.Condition).length > 0),
      });
    }
  }
  return findings;
}

function inspectSecret({ description, policyDoc, region }) {
  const findings = [];
  const arn = description.ARN;
  const name = description.Name || arn;

  // Rotation: RotationEnabled is undefined or false on secrets that have never
  // had rotation configured. We treat both the same — no rotation is no
  // rotation. RotationRules.AutomaticallyAfterDays is included as evidence
  // so reviewers can see whether rotation was attempted but disabled.
  if (!description.RotationEnabled) {
    findings.push(
      makeFinding({
        ruleId: 'secrets-rotation-disabled',
        title: 'Secret has automatic rotation disabled',
        severity: 'medium',
        resourceId: name,
        region,
        evidence: {
          arn,
          rotationEnabled: Boolean(description.RotationEnabled),
          lastRotated: description.LastRotatedDate || null,
          rotationRules: description.RotationRules || null,
        },
        remediation:
          'Configure automatic rotation for this secret using a Lambda rotation function. Long-lived secrets accumulate exposure risk; the recommended interval is 30-90 days depending on sensitivity.',
      }),
    );
  }

  if (isDefaultKmsKey(description.KmsKeyId)) {
    findings.push(
      makeFinding({
        ruleId: 'secrets-default-kms-key',
        title: 'Secret is encrypted with the default AWS-managed KMS key',
        severity: 'low',
        resourceId: name,
        region,
        evidence: {
          arn,
          kmsKeyId: description.KmsKeyId || DEFAULT_KMS_KEY_ALIAS,
        },
        remediation:
          'Re-encrypt the secret with a customer-managed KMS key (CMK). Customer-managed keys let you scope access via the key policy, audit usage via CloudTrail, and rotate or revoke independently of the secret itself.',
      }),
    );
  }

  if (policyDoc) {
    const publicStatements = findPublicStatements(policyDoc);
    if (publicStatements.length > 0) {
      findings.push(
        makeFinding({
          ruleId: 'secrets-resource-policy-public',
          title: 'Secret resource policy grants access to a wildcard principal',
          severity: 'high',
          resourceId: name,
          region,
          evidence: { arn, publicStatements },
          remediation:
            'Restrict the resource policy to specific IAM principal ARNs. A wildcard Principal with no Condition allows any AWS account (including ones outside your organisation) to access the secret if they discover the ARN.',
        }),
      );
    }
  }

  return findings;
}

async function scanSecretsInRegion(client, region) {
  const listRuleId = 'secrets-list';
  const listResult = await safeCall(client.send(new ListSecretsCommand({ MaxResults: 100 })));
  if (isAccessDenied(listResult)) {
    return { findings: [], denied: [listRuleId], errored: [], totalChecks: 1, secretsScanned: 0 };
  }
  if (listResult && listResult.__error) {
    return {
      findings: [],
      denied: [],
      errored: [{ ruleId: listRuleId, errorName: listResult.__error.name, errorMessage: listResult.__error.message }],
      totalChecks: 1,
      secretsScanned: 0,
    };
  }

  const secrets = (listResult && listResult.SecretList) || [];
  const findings = [];
  const denied = [];
  const errored = [];
  let secretsScanned = 0;

  for (const summary of secrets) {
    const arn = summary.ARN;
    if (!arn) continue;

    const describeResult = await safeCall(client.send(new DescribeSecretCommand({ SecretId: arn })));
    if (isAccessDenied(describeResult)) {
      denied.push('secrets-describe');
      continue;
    }
    if (describeResult && describeResult.__error) {
      errored.push({
        ruleId: 'secrets-describe',
        errorName: describeResult.__error.name,
        errorMessage: describeResult.__error.message,
      });
      continue;
    }

    const policyResult = await safeCall(client.send(new GetResourcePolicyCommand({ SecretId: arn })));
    let policyDoc = null;
    if (isAccessDenied(policyResult)) {
      denied.push('secrets-resource-policy-read');
    } else if (isErrorCode(policyResult, 'ResourceNotFoundException')) {
      // No resource policy attached — common case, not a finding.
    } else if (policyResult && policyResult.__error) {
      errored.push({
        ruleId: 'secrets-resource-policy-read',
        errorName: policyResult.__error.name,
        errorMessage: policyResult.__error.message,
      });
    } else if (policyResult && policyResult.ResourcePolicy) {
      try {
        policyDoc = JSON.parse(policyResult.ResourcePolicy);
      } catch {
        errored.push({
          ruleId: 'secrets-resource-policy-read',
          errorName: 'PolicyParseError',
          errorMessage: `Could not parse resource policy for ${arn}.`,
        });
      }
    }

    findings.push(...inspectSecret({ description: describeResult, policyDoc, region }));
    secretsScanned += 1;
  }

  // Each scanned secret contributes three rule inspections (rotation, KMS,
  // resource policy). totalChecks reflects the actual amount of inspection
  // performed, not just the SDK call count. Empty regions still cost one
  // check (the ListSecrets call).
  const totalChecks = Math.max(1, secretsScanned * 3);
  return { findings, denied, errored, totalChecks, secretsScanned };
}

async function listEnabledRegions(credentials) {
  const client = new EC2Client({ region: 'us-east-1', credentials });
  const result = await safeCall(client.send(new DescribeRegionsCommand({ AllRegions: false })));
  if (!result || result.__error) return [];
  return (result.Regions || []).map((r) => r.RegionName).filter(Boolean);
}

async function runSecretsScan({ credentials, regions }) {
  const startedAt = new Date();

  let targetRegions = Array.isArray(regions) ? regions.filter(Boolean) : [];
  let regionDiscoveryError = null;
  if (targetRegions.length === 0) {
    targetRegions = await listEnabledRegions(credentials);
    if (targetRegions.length === 0) {
      targetRegions = ['us-east-1'];
      regionDiscoveryError = {
        name: 'RegionDiscoveryFailed',
        message: 'Could not enumerate enabled regions; defaulted to us-east-1.',
      };
    }
  }

  const findings = [];
  const denied = [];
  const errored = [];
  const regionResults = [];
  let totalChecks = 0;
  let totalSecretsScanned = 0;

  await Promise.all(
    targetRegions.map(async (region) => {
      const client = buildClient({ region, credentials });
      const outcome = await scanSecretsInRegion(client, region);
      findings.push(...outcome.findings);
      denied.push(...outcome.denied);
      errored.push(...outcome.errored);
      totalChecks += outcome.totalChecks;
      totalSecretsScanned += outcome.secretsScanned;
      regionResults.push({
        region,
        secretsScanned: outcome.secretsScanned,
        findings: outcome.findings.length,
      });
      if (outcome.errored.length > 0) {
        console.warn(
          `[secretsScanner] ${region}: ${outcome.errored.length} check(s) errored:`,
          outcome.errored.map((e) => `${e.ruleId}=${e.errorName}:${e.errorMessage}`).join(' | '),
        );
      }
    }),
  );

  const completedAt = new Date();
  const summary = {
    totalChecks,
    checksDenied: denied.length,
    checksErrored: errored.length,
    checksSucceeded: totalChecks - denied.length - errored.length,
    bucketsScanned: 0,
    regionsScanned: regionResults.length,
    secretsScanned: totalSecretsScanned,
    issuesFound: findings.length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  return {
    scanner: 'Secrets',
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    region: targetRegions.length === 1 ? targetRegions[0] : 'multi-region',
    summary,
    buckets: [],
    bucketErrors: [],
    findings,
    deniedChecks: denied,
    erroredChecks: errored,
    regions: regionResults,
    regionDiscoveryError,
  };
}

module.exports = {
  runSecretsScan,
  // Exported for unit tests:
  inspectSecret,
  scanSecretsInRegion,
  isDefaultKmsKey,
  findPublicStatements,
};
