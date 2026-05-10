const {
  IAMClient,
  GetAccountSummaryCommand,
  GetAccountPasswordPolicyCommand,
  ListUsersCommand,
  ListMFADevicesCommand,
  ListAccessKeysCommand,
  GetAccessKeyLastUsedCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  GetUserPolicyCommand,
  GenerateCredentialReportCommand,
  GetCredentialReportCommand,
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
const CONSOLE_PASSWORD_IDLE_DAYS = 90;

// AWS managed policies that grant excessive permissions when attached directly
// to a user. AdministratorAccess is full unrestricted; PowerUserAccess grants
// full access to every service except IAM, which is still enough to spin up
// arbitrary infra and exfiltrate data. Each entry produces its own finding so
// a user with both attached gets two distinct line items.
const OVERPRIVILEGED_POLICIES = new Map([
  [
    'arn:aws:iam::aws:policy/AdministratorAccess',
    {
      ruleId: 'iam-user-admin-policy-attached',
      title: 'IAM user has AdministratorAccess attached directly',
      severity: 'medium',
      remediation:
        'Detach AdministratorAccess from individual users. Grant administrative permissions through a group, an IAM role assumed when needed, or a least-privilege custom policy. Direct admin attachment makes credential leaks catastrophic.',
    },
  ],
  [
    'arn:aws:iam::aws:policy/PowerUserAccess',
    {
      ruleId: 'iam-user-power-user-attached',
      title: 'IAM user has PowerUserAccess attached directly',
      severity: 'medium',
      remediation:
        'Detach PowerUserAccess from individual users. PowerUser grants full access to every AWS service except IAM — enough for an attacker with the credential to spin up infrastructure or exfiltrate data. Replace with a least-privilege custom policy or group-based assignment.',
    },
  ],
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

// Wraps ListUsers so runIamScan can call it exactly once and pass the result
// to every per-user check. This used to be repeated inside each check, which
// meant a 4-user account incurred 4 separate ListUsers calls — wasteful, and
// 4x the chance of being throttled. Returns a discriminated union: at most one
// of `denied`, `error`, or `users` will be set.
async function listIamUsers(client) {
  const result = await safeCall(client.send(new ListUsersCommand({})));
  if (isAccessDenied(result)) return { denied: true };
  if (result && result.__error) return { error: result.__error };
  return { users: (result && result.Users) || [] };
}

async function checkUsersWithoutMfa(client, users) {
  const ruleId = 'iam-user-mfa-disabled';
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

async function checkUnusedAccessKeys(client, users) {
  const ruleId = 'iam-access-key-unused';
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

async function checkAdminUsers(client, users) {
  // Generic ruleId used only for per-user denied/errored outcomes from the
  // ListAttachedUserPolicies call; individual findings carry the per-policy
  // ruleId from OVERPRIVILEGED_POLICIES.
  const listRuleId = 'iam-user-admin-policy-attached';
  const outcomes = [];
  for (const user of users) {
    const policiesResult = await safeCall(
      client.send(new ListAttachedUserPoliciesCommand({ UserName: user.UserName })),
    );
    if (isAccessDenied(policiesResult)) {
      outcomes.push(deniedOutcome(listRuleId));
      continue;
    }
    if (policiesResult && policiesResult.__error) {
      outcomes.push(erroredOutcome(listRuleId, policiesResult.__error));
      continue;
    }
    const attached = (policiesResult && policiesResult.AttachedPolicies) || [];
    for (const policy of attached) {
      const meta = OVERPRIVILEGED_POLICIES.get(policy.PolicyArn);
      if (!meta) continue;
      outcomes.push(
        makeFinding({
          ruleId: meta.ruleId,
          title: meta.title,
          severity: meta.severity,
          resourceId: user.UserName,
          evidence: { policy: policy.PolicyArn },
          remediation: meta.remediation,
        }),
      );
    }
  }
  return outcomes;
}

// Walk an IAM policy document and return any Allow statements that use a
// wildcard Action ("*") or wildcard Resource ("*"). Both are treated as
// wildcard because either alone collapses the principle of least privilege:
// "Allow *:* on resource X" lets anyone do anything to X, and "Allow s3:* on
// *" lets the principal touch every bucket in the account.
function findWildcardStatements(doc) {
  if (!doc) return [];
  let statements = doc.Statement;
  if (!statements) return [];
  if (!Array.isArray(statements)) statements = [statements];

  const findings = [];
  for (const stmt of statements) {
    if (!stmt || stmt.Effect !== 'Allow') continue;
    const resources = Array.isArray(stmt.Resource) ? stmt.Resource : stmt.Resource ? [stmt.Resource] : [];
    const actions = Array.isArray(stmt.Action) ? stmt.Action : stmt.Action ? [stmt.Action] : [];
    const wildcardResource = resources.includes('*');
    const wildcardAction = actions.includes('*');
    if (wildcardResource || wildcardAction) {
      findings.push({
        sid: stmt.Sid || null,
        wildcardResource,
        wildcardAction,
        actions,
        resources,
      });
    }
  }
  return findings;
}

async function checkWildcardInlinePolicies(client, users) {
  const ruleId = 'iam-inline-policy-wildcard';
  const outcomes = [];
  for (const user of users) {
    const namesResult = await safeCall(
      client.send(new ListUserPoliciesCommand({ UserName: user.UserName })),
    );
    if (isAccessDenied(namesResult)) {
      outcomes.push(deniedOutcome(ruleId));
      continue;
    }
    if (namesResult && namesResult.__error) {
      outcomes.push(erroredOutcome(ruleId, namesResult.__error));
      continue;
    }
    const policyNames = (namesResult && namesResult.PolicyNames) || [];
    for (const policyName of policyNames) {
      const docResult = await safeCall(
        client.send(new GetUserPolicyCommand({ UserName: user.UserName, PolicyName: policyName })),
      );
      if (isAccessDenied(docResult)) {
        outcomes.push(deniedOutcome(ruleId));
        continue;
      }
      if (docResult && docResult.__error) {
        outcomes.push(erroredOutcome(ruleId, docResult.__error));
        continue;
      }
      // PolicyDocument comes back URL-encoded JSON.
      let parsed;
      try {
        parsed = JSON.parse(decodeURIComponent(docResult.PolicyDocument));
      } catch {
        outcomes.push(
          erroredOutcome(ruleId, { name: 'PolicyParseError', message: `Could not parse inline policy ${policyName} for user ${user.UserName}.` }),
        );
        continue;
      }
      const wildcards = findWildcardStatements(parsed);
      if (wildcards.length > 0) {
        outcomes.push(
          makeFinding({
            ruleId,
            title: `IAM inline policy "${policyName}" grants wildcard access`,
            severity: 'high',
            resourceId: `${user.UserName}/${policyName}`,
            evidence: { wildcardStatements: wildcards },
            remediation:
              'Replace Resource: "*" or Action: "*" with explicit ARNs and actions. Wildcard inline policies bypass guardrails and effectively grant administrative access for the actions or resources they cover.',
          }),
        );
      }
    }
  }
  return outcomes;
}

// Parse an IAM credential report CSV. The report has a fixed header row and
// one row per user (plus a synthetic <root_account> row that we skip).
function parseCredentialReport(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = values[j];
    rows.push(row);
  }
  return rows;
}

// AWS-side names for the credential-report state errors. Spelt out fully
// because the SDK error shape uses these exact strings — using a shorter alias
// (e.g. "ReportInProgress") silently misses the match and surfaces as a raw
// errored outcome.
const CREDENTIAL_REPORT_PENDING_ERRORS = [
  'CredentialReportNotPresentException',
  'CredentialReportNotReadyException',
];

async function getCredentialReport(client, { maxAttempts = 5, delayMs = 1500 } = {}) {
  // Kick off (or refresh) generation. AWS returns instantly with State STARTED
  // / INPROGRESS / COMPLETE; the actual CSV may take 1-3s to appear. We then
  // poll GetCredentialReport with a short backoff rather than failing the
  // first time we see "not present yet" — that error is transient by design.
  await safeCall(client.send(new GenerateCredentialReportCommand({})));

  let lastPendingError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await safeCall(client.send(new GetCredentialReportCommand({})));
    if (isAccessDenied(result)) return { denied: true };
    if (isErrorCode(result, ...CREDENTIAL_REPORT_PENDING_ERRORS)) {
      lastPendingError = result.__error;
      if (attempt < maxAttempts - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      continue;
    }
    if (isErrorCode(result, 'CredentialReportExpiredException')) {
      // Trigger a fresh generation and try again on the next loop iteration.
      await safeCall(client.send(new GenerateCredentialReportCommand({})));
      lastPendingError = result.__error;
      if (attempt < maxAttempts - 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      continue;
    }
    if (result && result.__error) return { error: result.__error };
    if (!result || !result.Content) {
      return { error: { name: 'EmptyResponse', message: 'No credential report content returned.' } };
    }
    return { csv: Buffer.from(result.Content).toString('utf-8') };
  }

  return {
    error: {
      name: lastPendingError?.name || 'CredentialReportTimeout',
      message: `Credential report was not ready after ${maxAttempts} attempt(s). Re-run the scan in a few seconds.`,
    },
  };
}

async function checkIdleConsolePasswords(client, options = {}) {
  const ruleId = 'iam-console-password-idle';
  const report = await getCredentialReport(client, options);
  if (report.denied) return [deniedOutcome(ruleId)];
  if (report.error) return [erroredOutcome(ruleId, report.error)];
  const rows = parseCredentialReport(report.csv);
  const outcomes = [];
  const cutoff = Date.now() - CONSOLE_PASSWORD_IDLE_DAYS * 24 * 60 * 60 * 1000;
  for (const row of rows) {
    if (row.user === '<root_account>') continue; // Root MFA covered separately.
    if (row.password_enabled !== 'true') continue;
    const lastUsedRaw = row.password_last_used;
    let neverUsed = false;
    let staleSince = null;
    if (lastUsedRaw === 'N/A' || lastUsedRaw === 'no_information' || !lastUsedRaw) {
      neverUsed = true;
    } else {
      const ms = new Date(lastUsedRaw).getTime();
      if (Number.isFinite(ms) && ms < cutoff) staleSince = lastUsedRaw;
    }
    if (!neverUsed && !staleSince) continue;
    outcomes.push(
      makeFinding({
        ruleId,
        title: neverUsed
          ? 'IAM user has a console password but has never signed in'
          : `IAM user has not signed in to the console for over ${CONSOLE_PASSWORD_IDLE_DAYS} days`,
        severity: 'medium',
        resourceId: row.user,
        evidence: {
          userName: row.user,
          passwordLastUsed: staleSince || null,
          ageDays: staleSince
            ? Math.floor((Date.now() - new Date(staleSince).getTime()) / (24 * 60 * 60 * 1000))
            : null,
        },
        remediation:
          'Disable console access for users who no longer sign in. Idle console passwords are common targets for credential stuffing; remove or rotate them on a 90-day cycle.',
      }),
    );
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

  // Per-user checks (variable number of outcomes). All four checks need the
  // same ListUsers result, so we fetch it exactly once and pass it through.
  // If the listing itself is denied/errored, we fan that single outcome out to
  // each per-user rule so the dashboard correctly reflects "all four checks
  // could not run" rather than "one denied and three succeeded".
  const PER_USER_RULES = [
    'iam-user-mfa-disabled',
    'iam-access-key-unused',
    'iam-user-admin-policy-attached',
    'iam-inline-policy-wildcard',
  ];
  const userListing = await listIamUsers(client);
  if (userListing.denied) {
    for (const r of PER_USER_RULES) outcomes.push(deniedOutcome(r));
  } else if (userListing.error) {
    for (const r of PER_USER_RULES) outcomes.push(erroredOutcome(r, userListing.error));
  } else {
    outcomes.push(...(await checkUsersWithoutMfa(client, userListing.users)));
    outcomes.push(...(await checkUnusedAccessKeys(client, userListing.users)));
    outcomes.push(...(await checkAdminUsers(client, userListing.users)));
    outcomes.push(...(await checkWildcardInlinePolicies(client, userListing.users)));
  }
  outcomes.push(...(await checkIdleConsolePasswords(client)));

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

  if (errored.length > 0) {
    console.warn(
      `[iamScanner]: ${errored.length} check(s) errored:`,
      errored.map((e) => `${e.ruleId}=${e.errorName}:${e.errorMessage}`).join(' | '),
    );
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
    scanner: 'IAM',
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
  checkWildcardInlinePolicies,
  checkIdleConsolePasswords,
  findWildcardStatements,
  parseCredentialReport,
  listIamUsers,
};
