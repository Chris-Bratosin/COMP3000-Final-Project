'use strict';

// Unit tests for the IAM scanner check functions.
//
// Same fake-client strategy as s3Scanner.test.js, but extended to handle
// commands sent multiple times in one check (e.g. ListMFADevices fires once
// per IAM user). When a test scripts `responses[name]` as an array, the fake
// consumes successive entries on each call so each user can have a different
// scripted result. Run with `node --test`.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('../iamScanner');

const ALICE = { UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() };
const BOB = { UserName: 'bob', Arn: 'arn:aws:iam::123:user/bob', CreateDate: new Date() };
const CAROL = { UserName: 'carol', Arn: 'arn:aws:iam::123:user/carol', CreateDate: new Date() };
const DAVE = { UserName: 'dave', Arn: 'arn:aws:iam::123:user/dave', CreateDate: new Date() };

// Fake client that scripts a sequence of responses per command class. When the
// same command is sent multiple times (e.g. ListMFADevices once per user), the
// scripted value is returned each call unless `responses[name]` is an array,
// in which case successive entries are consumed.
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

describe('checkRootMfa', () => {
  test('flags missing root MFA as high severity', async () => {
    const client = makeFakeClient({
      GetAccountSummaryCommand: { SummaryMap: { AccountMFAEnabled: 0 } },
    });
    const result = await checkRootMfa(client, '123456789012');
    assert.equal(result.ruleId, 'iam-root-mfa-disabled');
    assert.equal(result.severity, 'high');
    assert.equal(result.resourceId, '123456789012');
  });

  test('returns null when root MFA is enabled', async () => {
    const client = makeFakeClient({
      GetAccountSummaryCommand: { SummaryMap: { AccountMFAEnabled: 1 } },
    });
    const result = await checkRootMfa(client, '123456789012');
    assert.equal(result, null);
  });

  test('returns denied outcome when GetAccountSummary is forbidden', async () => {
    const client = makeFakeClient({
      GetAccountSummaryCommand: awsError('AccessDenied'),
    });
    const result = await checkRootMfa(client);
    assert.equal(result.__denied, true);
  });
});

describe('checkPasswordPolicy', () => {
  test('flags missing policy when AWS returns NoSuchEntity', async () => {
    const client = makeFakeClient({
      GetAccountPasswordPolicyCommand: awsError('NoSuchEntity'),
    });
    const result = await checkPasswordPolicy(client, '123456789012');
    assert.equal(result.ruleId, 'iam-password-policy-missing');
    assert.equal(result.severity, 'medium');
  });

  test('flags weak policy when minimum length is below 14', async () => {
    const client = makeFakeClient({
      GetAccountPasswordPolicyCommand: {
        PasswordPolicy: {
          MinimumPasswordLength: 8,
          RequireUppercaseCharacters: true,
          RequireLowercaseCharacters: true,
          RequireNumbers: true,
          RequireSymbols: true,
          MaxPasswordAge: 90,
        },
      },
    });
    const result = await checkPasswordPolicy(client, '123456789012');
    assert.equal(result.ruleId, 'iam-password-policy-weak');
    assert.ok(result.evidence.weaknesses.some((w) => w.startsWith('MinimumPasswordLength')));
  });

  test('returns null when policy meets all recommended thresholds', async () => {
    const client = makeFakeClient({
      GetAccountPasswordPolicyCommand: {
        PasswordPolicy: {
          MinimumPasswordLength: 14,
          RequireUppercaseCharacters: true,
          RequireLowercaseCharacters: true,
          RequireNumbers: true,
          RequireSymbols: true,
          MaxPasswordAge: 90,
        },
      },
    });
    const result = await checkPasswordPolicy(client, '123456789012');
    assert.equal(result, null);
  });
});

describe('listIamUsers', () => {
  test('returns users array on success', async () => {
    const client = makeFakeClient({
      ListUsersCommand: { Users: [ALICE, BOB] },
    });
    const result = await listIamUsers(client);
    assert.deepEqual(result.users, [ALICE, BOB]);
    assert.equal(result.denied, undefined);
    assert.equal(result.error, undefined);
  });

  test('returns empty users array when account has no users', async () => {
    const client = makeFakeClient({
      ListUsersCommand: { Users: [] },
    });
    const result = await listIamUsers(client);
    assert.deepEqual(result.users, []);
  });

  test('returns denied marker on AccessDenied', async () => {
    const client = makeFakeClient({
      ListUsersCommand: awsError('AccessDenied'),
    });
    const result = await listIamUsers(client);
    assert.equal(result.denied, true);
    assert.equal(result.users, undefined);
  });

  test('returns error marker on other AWS errors', async () => {
    const client = makeFakeClient({
      ListUsersCommand: awsError('NetworkingError', 'connect ETIMEDOUT'),
    });
    const result = await listIamUsers(client);
    assert.equal(result.error.name, 'NetworkingError');
    assert.equal(result.users, undefined);
  });
});

describe('checkUsersWithoutMfa', () => {
  test('produces one finding per user without MFA devices', async () => {
    const client = makeFakeClient({
      ListMFADevicesCommand: [
        { MFADevices: [] }, // alice has none
        { MFADevices: [{ SerialNumber: 'arn:aws:iam::123:mfa/bob' }] }, // bob has one
      ],
    });
    const outcomes = await checkUsersWithoutMfa(client, [ALICE, BOB]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].resourceId, 'alice');
    assert.equal(findings[0].severity, 'high');
  });

  test('returns empty list when users array is empty', async () => {
    const client = makeFakeClient({});
    const outcomes = await checkUsersWithoutMfa(client, []);
    assert.equal(outcomes.length, 0);
  });
});

describe('checkUnusedAccessKeys', () => {
  test('flags an active key never used', async () => {
    const client = makeFakeClient({
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Active', UserName: 'alice' }],
      },
      GetAccessKeyLastUsedCommand: {
        AccessKeyLastUsed: {}, // no LastUsedDate => never used
      },
    });
    const outcomes = await checkUnusedAccessKeys(client, [ALICE]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.match(findings[0].title, /never been used/);
    assert.equal(findings[0].severity, 'medium');
  });

  test('flags an active key last used over 90 days ago', async () => {
    const oneHundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const client = makeFakeClient({
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Active', UserName: 'alice' }],
      },
      GetAccessKeyLastUsedCommand: {
        AccessKeyLastUsed: { LastUsedDate: oneHundredDaysAgo },
      },
    });
    const outcomes = await checkUnusedAccessKeys(client, [ALICE]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.match(findings[0].title, /not been used for over 90 days/);
  });

  test('returns no findings when active key was used recently', async () => {
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const client = makeFakeClient({
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Active', UserName: 'alice' }],
      },
      GetAccessKeyLastUsedCommand: {
        AccessKeyLastUsed: { LastUsedDate: yesterday },
      },
    });
    const outcomes = await checkUnusedAccessKeys(client, [ALICE]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 0);
  });

  test('skips inactive keys entirely', async () => {
    const client = makeFakeClient({
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Inactive', UserName: 'alice' }],
      },
    });
    const outcomes = await checkUnusedAccessKeys(client, [ALICE]);
    assert.equal(outcomes.length, 0);
  });
});

describe('checkAdminUsers', () => {
  test('flags users with AdministratorAccess attached directly', async () => {
    const client = makeFakeClient({
      ListAttachedUserPoliciesCommand: [
        {
          AttachedPolicies: [
            { PolicyName: 'AdministratorAccess', PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess' },
          ],
        },
        {
          AttachedPolicies: [
            { PolicyName: 'ReadOnlyAccess', PolicyArn: 'arn:aws:iam::aws:policy/ReadOnlyAccess' },
          ],
        },
      ],
    });
    const outcomes = await checkAdminUsers(client, [ALICE, BOB]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].resourceId, 'alice');
    assert.equal(findings[0].ruleId, 'iam-user-admin-policy-attached');
    assert.equal(findings[0].evidence.policy, 'arn:aws:iam::aws:policy/AdministratorAccess');
  });

  test('flags users with PowerUserAccess as a separate finding', async () => {
    const client = makeFakeClient({
      ListAttachedUserPoliciesCommand: {
        AttachedPolicies: [
          { PolicyName: 'PowerUserAccess', PolicyArn: 'arn:aws:iam::aws:policy/PowerUserAccess' },
        ],
      },
    });
    const outcomes = await checkAdminUsers(client, [CAROL]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'iam-user-power-user-attached');
    assert.equal(findings[0].evidence.policy, 'arn:aws:iam::aws:policy/PowerUserAccess');
  });

  test('emits one finding per matched policy when both are attached', async () => {
    const client = makeFakeClient({
      ListAttachedUserPoliciesCommand: {
        AttachedPolicies: [
          { PolicyName: 'AdministratorAccess', PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess' },
          { PolicyName: 'PowerUserAccess', PolicyArn: 'arn:aws:iam::aws:policy/PowerUserAccess' },
        ],
      },
    });
    const outcomes = await checkAdminUsers(client, [DAVE]);
    const ruleIds = outcomes
      .filter((o) => !o.__denied && !o.__errored)
      .map((o) => o.ruleId)
      .sort();
    assert.deepEqual(ruleIds, ['iam-user-admin-policy-attached', 'iam-user-power-user-attached']);
  });

  test('returns no findings when no user has overprivileged policies attached', async () => {
    const client = makeFakeClient({
      ListAttachedUserPoliciesCommand: {
        AttachedPolicies: [
          { PolicyName: 'ReadOnlyAccess', PolicyArn: 'arn:aws:iam::aws:policy/ReadOnlyAccess' },
        ],
      },
    });
    const outcomes = await checkAdminUsers(client, [ALICE]);
    assert.equal(outcomes.length, 0);
  });
});

describe('findWildcardStatements', () => {
  test('detects wildcard Resource in a single Allow statement', () => {
    const doc = {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Action: 's3:GetObject', Resource: '*' }],
    };
    const result = findWildcardStatements(doc);
    assert.equal(result.length, 1);
    assert.equal(result[0].wildcardResource, true);
    assert.equal(result[0].wildcardAction, false);
  });

  test('detects wildcard Action in a single Allow statement', () => {
    const doc = {
      Statement: [{ Effect: 'Allow', Action: '*', Resource: 'arn:aws:s3:::my-bucket/*' }],
    };
    const result = findWildcardStatements(doc);
    assert.equal(result.length, 1);
    assert.equal(result[0].wildcardAction, true);
    assert.equal(result[0].wildcardResource, false);
  });

  test('detects wildcard inside an array of resources', () => {
    const doc = {
      Statement: [
        { Effect: 'Allow', Action: 's3:GetObject', Resource: ['arn:aws:s3:::a/*', '*'] },
      ],
    };
    const result = findWildcardStatements(doc);
    assert.equal(result.length, 1);
    assert.equal(result[0].wildcardResource, true);
  });

  test('ignores Deny statements even with wildcards', () => {
    const doc = {
      Statement: [{ Effect: 'Deny', Action: '*', Resource: '*' }],
    };
    const result = findWildcardStatements(doc);
    assert.equal(result.length, 0);
  });

  test('handles a single Statement object (not wrapped in array)', () => {
    const doc = {
      Statement: { Effect: 'Allow', Action: '*', Resource: '*' },
    };
    const result = findWildcardStatements(doc);
    assert.equal(result.length, 1);
  });

  test('returns empty list when no wildcards present', () => {
    const doc = {
      Statement: [
        { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::a/b' },
      ],
    };
    const result = findWildcardStatements(doc);
    assert.equal(result.length, 0);
  });
});

describe('checkWildcardInlinePolicies', () => {
  test('flags an inline policy with Resource: "*"', async () => {
    const policyDoc = {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Action: 's3:GetObject', Resource: '*' }],
    };
    const client = makeFakeClient({
      ListUserPoliciesCommand: { PolicyNames: ['too-open'] },
      GetUserPolicyCommand: {
        UserName: 'alice',
        PolicyName: 'too-open',
        PolicyDocument: encodeURIComponent(JSON.stringify(policyDoc)),
      },
    });
    const outcomes = await checkWildcardInlinePolicies(client, [ALICE]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'iam-inline-policy-wildcard');
    assert.equal(findings[0].severity, 'high');
    assert.equal(findings[0].resourceId, 'alice/too-open');
  });

  test('does NOT flag a tightly scoped inline policy', async () => {
    const policyDoc = {
      Statement: [
        { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::project-bucket/*' },
      ],
    };
    const client = makeFakeClient({
      ListUserPoliciesCommand: { PolicyNames: ['scoped'] },
      GetUserPolicyCommand: {
        PolicyDocument: encodeURIComponent(JSON.stringify(policyDoc)),
      },
    });
    const outcomes = await checkWildcardInlinePolicies(client, [ALICE]);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 0);
  });

  test('returns denied when ListUserPolicies is blocked', async () => {
    const client = makeFakeClient({
      ListUserPoliciesCommand: awsError('AccessDenied'),
    });
    const outcomes = await checkWildcardInlinePolicies(client, [ALICE]);
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].__denied, true);
  });

  test('skips users with no inline policies attached', async () => {
    const client = makeFakeClient({
      ListUserPoliciesCommand: { PolicyNames: [] },
    });
    const outcomes = await checkWildcardInlinePolicies(client, [ALICE]);
    assert.equal(outcomes.length, 0);
  });
});

describe('parseCredentialReport', () => {
  test('parses a typical credential report into row objects', () => {
    const csv = [
      'user,arn,user_creation_time,password_enabled,password_last_used',
      'alice,arn:aws:iam::123:user/alice,2025-01-01T00:00:00+00:00,true,2026-04-01T00:00:00+00:00',
      'bob,arn:aws:iam::123:user/bob,2025-01-01T00:00:00+00:00,false,N/A',
    ].join('\n');
    const rows = parseCredentialReport(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].user, 'alice');
    assert.equal(rows[0].password_enabled, 'true');
    assert.equal(rows[1].password_last_used, 'N/A');
  });

  test('returns empty list for an empty report', () => {
    assert.deepEqual(parseCredentialReport(''), []);
  });
});

describe('checkIdleConsolePasswords', () => {
  function makeReportClient(csv) {
    return makeFakeClient({
      GenerateCredentialReportCommand: { State: 'COMPLETE' },
      GetCredentialReportCommand: { Content: Buffer.from(csv, 'utf-8') },
    });
  }

  test('flags an enabled password that has never been used', async () => {
    const csv = [
      'user,arn,user_creation_time,password_enabled,password_last_used',
      'alice,arn:aws:iam::123:user/alice,2025-01-01T00:00:00+00:00,true,N/A',
    ].join('\n');
    const outcomes = await checkIdleConsolePasswords(makeReportClient(csv));
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'iam-console-password-idle');
    assert.match(findings[0].title, /never signed in/);
    assert.equal(findings[0].resourceId, 'alice');
  });

  test('flags an enabled password idle for over 90 days', async () => {
    const oneHundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const csv = [
      'user,arn,user_creation_time,password_enabled,password_last_used',
      `bob,arn:aws:iam::123:user/bob,2025-01-01T00:00:00+00:00,true,${oneHundredDaysAgo}`,
    ].join('\n');
    const outcomes = await checkIdleConsolePasswords(makeReportClient(csv));
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.match(findings[0].title, /over 90 days/);
    assert.ok(findings[0].evidence.ageDays >= 100);
  });

  test('does NOT flag a password used within 90 days', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const csv = [
      'user,arn,user_creation_time,password_enabled,password_last_used',
      `carol,arn:aws:iam::123:user/carol,2025-01-01T00:00:00+00:00,true,${yesterday}`,
    ].join('\n');
    const outcomes = await checkIdleConsolePasswords(makeReportClient(csv));
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 0);
  });

  test('skips users without console passwords', async () => {
    const csv = [
      'user,arn,user_creation_time,password_enabled,password_last_used',
      'dave,arn:aws:iam::123:user/dave,2025-01-01T00:00:00+00:00,false,N/A',
    ].join('\n');
    const outcomes = await checkIdleConsolePasswords(makeReportClient(csv));
    assert.equal(outcomes.length, 0);
  });

  test('skips the synthetic <root_account> row', async () => {
    const csv = [
      'user,arn,user_creation_time,password_enabled,password_last_used',
      '<root_account>,arn:aws:iam::123:root,2025-01-01T00:00:00+00:00,true,N/A',
    ].join('\n');
    const outcomes = await checkIdleConsolePasswords(makeReportClient(csv));
    assert.equal(outcomes.length, 0);
  });

  test('returns denied when GetCredentialReport is forbidden', async () => {
    const client = makeFakeClient({
      GenerateCredentialReportCommand: { State: 'COMPLETE' },
      GetCredentialReportCommand: awsError('AccessDenied'),
    });
    const outcomes = await checkIdleConsolePasswords(client);
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].__denied, true);
  });

  test('surfaces an errored outcome after the retry budget is exhausted', async () => {
    const client = makeFakeClient({
      GenerateCredentialReportCommand: { State: 'STARTED' },
      // Every poll attempt returns "not ready". With maxAttempts=2 the function
      // gives up and surfaces the last AWS error name with a retry hint.
      GetCredentialReportCommand: [
        awsError('CredentialReportNotReadyException'),
        awsError('CredentialReportNotReadyException'),
      ],
    });
    const outcomes = await checkIdleConsolePasswords(client, { maxAttempts: 2, delayMs: 0 });
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].__errored, true);
    assert.equal(outcomes[0].errorName, 'CredentialReportNotReadyException');
    assert.match(outcomes[0].errorMessage, /not ready after 2 attempt/);
  });

  test('retries past CredentialReportNotPresentException once the report is ready', async () => {
    const csv = [
      'user,arn,user_creation_time,password_enabled,password_last_used',
      'eve,arn:aws:iam::123:user/eve,2025-01-01T00:00:00+00:00,true,N/A',
    ].join('\n');
    const client = makeFakeClient({
      GenerateCredentialReportCommand: { State: 'STARTED' },
      GetCredentialReportCommand: [
        awsError('CredentialReportNotPresentException'),
        { Content: Buffer.from(csv, 'utf-8') },
      ],
    });
    const outcomes = await checkIdleConsolePasswords(client, { maxAttempts: 3, delayMs: 0 });
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].resourceId, 'eve');
  });
});
