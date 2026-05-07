const {
  IAMClient,
  GetAccountSummaryCommand,
  GetAccountPasswordPolicyCommand,
  ListUsersCommand,
  ListMFADevicesCommand,
  ListAccessKeysCommand,
  GetAccessKeyLastUsedCommand,
  ListAttachedUserPoliciesCommand,
} = require('@aws-sdk/client-iam');

const {
  safeCall,
  isAccessDenied,
  isErrorCode,
  deniedOutcome,
  erroredOutcome,
  makeFinding: baseMakeFinding,
} = require('./utils');

const ACCESS_KEY_UNUSED_DAYS = 90;
const ADMIN_POLICY_ARNS = new Set([
  'arn:aws:iam::aws:policy/AdministratorAccess',
]);

function buildClient({ credentials }) {
  // IAM is a global service. Region only affects the endpoint URL; the data
  // returned is account-wide regardless of which region the client targets.
  return new IAMClient({ region: 'us-east-1', credentials });
}

function makeFinding({ ruleId, title, severity, resourceId, evidence, remediation }) {
  return baseMakeFinding({
    ruleId,
    title,
    severity,
    service: 'IAM',
    resourceId,
    region: 'global',
    evidence,
    remediation,
  });
}

async function checkRootMfa(client, accountId) {
  const ruleId = 'iam-root-mfa-disabled';
  const result = await safeCall(client.send(new GetAccountSummaryCommand({})));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  if (!result || !result.SummaryMap) {
    return erroredOutcome(ruleId, { name: 'EmptyResponse', message: 'No SummaryMap in GetAccountSummary response.' });
  }
  // SummaryMap.AccountMFAEnabled is 1 when the root user has MFA enabled, 0 otherwise.
  if (result.SummaryMap.AccountMFAEnabled !== 1) {
    return makeFinding({
      ruleId,
      title: 'Root account does not have MFA enabled',
      severity: 'high',
      resourceId: accountId || 'root-account',
      evidence: { accountMfaEnabled: result.SummaryMap.AccountMFAEnabled || 0 },
      remediation:
        'Enable a hardware or virtual MFA device on the root user. The root account has unrestricted access to the entire AWS account; protecting it with MFA is the single highest-impact IAM control.',
    });
  }
  return null;
}

async function checkPasswordPolicy(client, accountId) {
  const ruleId = 'iam-password-policy-weak';
  const result = await safeCall(client.send(new GetAccountPasswordPolicyCommand({})));
  if (isAccessDenied(result)) return deniedOutcome(ruleId);
  if (isErrorCode(result, 'NoSuchEntity', 'NoSuchEntityException')) {
    return makeFinding({
      ruleId: 'iam-password-policy-missing',
      title: 'Account has no IAM password policy configured',
      severity: 'medium',
      resourceId: accountId || 'account',
      evidence: { passwordPolicy: 'not-configured' },
      remediation:
        'Set an account-level IAM password policy with a minimum length of 14 characters, a 90-day rotation window, and complexity requirements (uppercase, lowercase, numbers, symbols).',
    });
  }
  if (result && result.__error) return erroredOutcome(ruleId, result.__error);
  if (!result || !result.PasswordPolicy) return null;
  const p = result.PasswordPolicy;
  const weaknesses = [];
  if ((p.MinimumPasswordLength || 0) < 14) weaknesses.push(`MinimumPasswordLength=${p.MinimumPasswordLength || 0}`);
  if (!p.RequireUppercaseCharacters) weaknesses.push('RequireUppercaseCharacters=false');
  if (!p.RequireLowercaseCharacters) weaknesses.push('RequireLowercaseCharacters=false');
  if (!p.RequireNumbers) weaknesses.push('RequireNumbers=false');
  if (!p.RequireSymbols) weaknesses.push('RequireSymbols=false');
  if (!p.MaxPasswordAge || p.MaxPasswordAge > 90) weaknesses.push(`MaxPasswordAge=${p.MaxPasswordAge || 'unset'}`);
  if (weaknesses.length > 0) {
    return makeFinding({
      ruleId,
      title: 'IAM password policy is below recommended strength',
      severity: 'medium',
      resourceId: accountId || 'account',
      evidence: { weaknesses, policy: p },
      remediation:
        'Raise the password policy to require at least 14-character passwords, all four character classes (upper, lower, number, symbol), and a maximum age of 90 days.',
    });
  }
  return null;
}

async function checkUsersWithoutMfa(client) {
  const ruleId = 'iam-user-mfa-disabled';
  const usersResult = await safeCall(client.send(new ListUsersCommand({})));
  if (isAccessDenied(usersResult)) return [deniedOutcome(ruleId)];
  if (usersResult && usersResult.__error) return [erroredOutcome(ruleId, usersResult.__error)];
  const users = (usersResult && usersResult.Users) || [];
  const outcomes = [];
  for (const user of users) {
    const mfaResult = await safeCall(client.send(new ListMFADevicesCommand({ UserName: user.UserName })));
    if (isAccessDenied(mfaResult)) {
      outcomes.push(deniedOutcome(ruleId));
      continue;
    }
    if (mfaResult && mfaResult.__error) {
      outcomes.push(erroredOutcome(ruleId, mfaResult.__error));
      continue;
    }
    const devices = (mfaResult && mfaResult.MFADevices) || [];
    if (devices.length === 0) {
      outcomes.push(
        makeFinding({
          ruleId,
          title: 'IAM user has no MFA device registered',
          severity: 'high',
          resourceId: user.UserName,
          evidence: { userArn: user.Arn, createdAt: user.CreateDate },
          remediation:
            'Register a virtual or hardware MFA device for this user. Enforce MFA for every IAM user that has console access or programmatic access to sensitive resources.',
        }),
      );
    }
  }
  return outcomes;
}

async function checkUnusedAccessKeys(client) {
  const ruleId = 'iam-access-key-unused';
  const usersResult = await safeCall(client.send(new ListUsersCommand({})));
  if (isAccessDenied(usersResult)) return [deniedOutcome(ruleId)];
  if (usersResult && usersResult.__error) return [erroredOutcome(ruleId, usersResult.__error)];
  const users = (usersResult && usersResult.Users) || [];
  const outcomes = [];
  const cutoff = Date.now() - ACCESS_KEY_UNUSED_DAYS * 24 * 60 * 60 * 1000;
  for (const user of users) {
    const keysResult = await safeCall(client.send(new ListAccessKeysCommand({ UserName: user.UserName })));
    if (isAccessDenied(keysResult)) {
      outcomes.push(deniedOutcome(ruleId));
      continue;
    }
    if (keysResult && keysResult.__error) {
      outcomes.push(erroredOutcome(ruleId, keysResult.__error));
      continue;
    }
    const keys = (keysResult && keysResult.AccessKeyMetadata) || [];
    for (const key of keys) {
      if (key.Status !== 'Active') continue;
      const lastUsedResult = await safeCall(
        client.send(new GetAccessKeyLastUsedCommand({ AccessKeyId: key.AccessKeyId })),
      );
      if (lastUsedResult && lastUsedResult.__error) continue; // best-effort
      const lastUsedDate = lastUsedResult?.AccessKeyLastUsed?.LastUsedDate;
      const lastUsedMs = lastUsedDate ? new Date(lastUsedDate).getTime() : null;
      const neverUsed = !lastUsedDate;
      const stale = lastUsedMs !== null && lastUsedMs < cutoff;
      if (neverUsed || stale) {
        outcomes.push(
          makeFinding({
            ruleId,
            title: neverUsed
              ? 'Active IAM access key has never been used'
              : `Active IAM access key has not been used for over ${ACCESS_KEY_UNUSED_DAYS} days`,
            severity: 'medium',
            resourceId: `${user.UserName}/${key.AccessKeyId}`,
            evidence: {
              userName: user.UserName,
              accessKeyId: key.AccessKeyId,
              lastUsedDate: lastUsedDate || null,
              ageDays: lastUsedMs
                ? Math.floor((Date.now() - lastUsedMs) / (24 * 60 * 60 * 1000))
                : null,
            },
            remediation:
              'Rotate or delete unused access keys. Long-lived credentials that are not in use are a leading source of credential leaks; if the key is needed, rotate it on a 90-day cycle.',
          }),
        );
      }
    }
  }
  return outcomes;
}

async function checkAdminUsers(client) {
  const ruleId = 'iam-user-admin-policy-attached';
  const usersResult = await safeCall(client.send(new ListUsersCommand({})));
  if (isAccessDenied(usersResult)) return [deniedOutcome(ruleId)];
  if (usersResult && usersResult.__error) return [erroredOutcome(ruleId, usersResult.__error)];
  const users = (usersResult && usersResult.Users) || [];
  const outcomes = [];
  for (const user of users) {
    const policiesResult = await safeCall(
      client.send(new ListAttachedUserPoliciesCommand({ UserName: user.UserName })),
    );
    if (isAccessDenied(policiesResult)) {
      outcomes.push(deniedOutcome(ruleId));
      continue;
    }
    if (policiesResult && policiesResult.__error) {
      outcomes.push(erroredOutcome(ruleId, policiesResult.__error));
      continue;
    }
    const attached = (policiesResult && policiesResult.AttachedPolicies) || [];
    const adminAttached = attached.filter((p) => ADMIN_POLICY_ARNS.has(p.PolicyArn));
    if (adminAttached.length > 0) {
      outcomes.push(
        makeFinding({
          ruleId,
          title: 'IAM user has AdministratorAccess attached directly',
          severity: 'medium',
          resourceId: user.UserName,
          evidence: { policies: adminAttached.map((p) => p.PolicyArn) },
          remediation:
            'Detach AdministratorAccess from individual users. Grant administrative permissions through a group, an IAM role assumed when needed, or a least-privilege custom policy. Direct admin attachment makes credential leaks catastrophic.',
        }),
      );
    }
  }
  return outcomes;
}

async function runIamScan({ credentials, accountId }) {
  const startedAt = new Date();
  const client = buildClient({ credentials });

  const outcomes = [];

  // Account-level checks (single outcome each).
  outcomes.push(await checkRootMfa(client, accountId));
  outcomes.push(await checkPasswordPolicy(client, accountId));

  // Per-user checks (variable number of outcomes).
  outcomes.push(...(await checkUsersWithoutMfa(client)));
  outcomes.push(...(await checkUnusedAccessKeys(client)));
  outcomes.push(...(await checkAdminUsers(client)));

  const findings = [];
  const denied = [];
  const errored = [];
  let totalChecks = 0;

  for (const outcome of outcomes) {
    if (outcome === null || outcome === undefined) continue;
    totalChecks += 1;
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

  const completedAt = new Date();
  const summary = {
    totalChecks,
    checksDenied: denied.length,
    checksErrored: errored.length,
    checksSucceeded: totalChecks - denied.length - errored.length,
    bucketsScanned: 0,
    issuesFound: findings.length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  return {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    region: 'global',
    summary,
    buckets: [],
    bucketErrors: [],
    findings,
    deniedChecks: denied,
    erroredChecks: errored,
  };
}

module.exports = {
  runIamScan,
  // Exported for unit tests:
  checkRootMfa,
  checkPasswordPolicy,
  checkUsersWithoutMfa,
  checkUnusedAccessKeys,
  checkAdminUsers,
};
