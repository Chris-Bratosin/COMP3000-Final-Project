'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  checkRootMfa,
  checkPasswordPolicy,
  checkUsersWithoutMfa,
  checkUnusedAccessKeys,
  checkAdminUsers,
} = require('../iamScanner');

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

describe('checkUsersWithoutMfa', () => {
  test('produces one finding per user without MFA devices', async () => {
    const client = makeFakeClient({
      ListUsersCommand: {
        Users: [
          { UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() },
          { UserName: 'bob', Arn: 'arn:aws:iam::123:user/bob', CreateDate: new Date() },
        ],
      },
      ListMFADevicesCommand: [
        { MFADevices: [] }, // alice has none
        { MFADevices: [{ SerialNumber: 'arn:aws:iam::123:mfa/bob' }] }, // bob has one
      ],
    });
    const outcomes = await checkUsersWithoutMfa(client);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].resourceId, 'alice');
    assert.equal(findings[0].severity, 'high');
  });

  test('returns empty list when no users exist', async () => {
    const client = makeFakeClient({
      ListUsersCommand: { Users: [] },
    });
    const outcomes = await checkUsersWithoutMfa(client);
    assert.equal(outcomes.length, 0);
  });
});

describe('checkUnusedAccessKeys', () => {
  test('flags an active key never used', async () => {
    const client = makeFakeClient({
      ListUsersCommand: {
        Users: [{ UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() }],
      },
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Active', UserName: 'alice' }],
      },
      GetAccessKeyLastUsedCommand: {
        AccessKeyLastUsed: {}, // no LastUsedDate => never used
      },
    });
    const outcomes = await checkUnusedAccessKeys(client);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.match(findings[0].title, /never been used/);
    assert.equal(findings[0].severity, 'medium');
  });

  test('flags an active key last used over 90 days ago', async () => {
    const oneHundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const client = makeFakeClient({
      ListUsersCommand: {
        Users: [{ UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() }],
      },
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Active', UserName: 'alice' }],
      },
      GetAccessKeyLastUsedCommand: {
        AccessKeyLastUsed: { LastUsedDate: oneHundredDaysAgo },
      },
    });
    const outcomes = await checkUnusedAccessKeys(client);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.match(findings[0].title, /not been used for over 90 days/);
  });

  test('returns no findings when active key was used recently', async () => {
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const client = makeFakeClient({
      ListUsersCommand: {
        Users: [{ UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() }],
      },
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Active', UserName: 'alice' }],
      },
      GetAccessKeyLastUsedCommand: {
        AccessKeyLastUsed: { LastUsedDate: yesterday },
      },
    });
    const outcomes = await checkUnusedAccessKeys(client);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 0);
  });

  test('skips inactive keys entirely', async () => {
    const client = makeFakeClient({
      ListUsersCommand: {
        Users: [{ UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() }],
      },
      ListAccessKeysCommand: {
        AccessKeyMetadata: [{ AccessKeyId: 'AKIATEST', Status: 'Inactive', UserName: 'alice' }],
      },
    });
    const outcomes = await checkUnusedAccessKeys(client);
    assert.equal(outcomes.length, 0);
  });
});

describe('checkAdminUsers', () => {
  test('flags users with AdministratorAccess attached directly', async () => {
    const client = makeFakeClient({
      ListUsersCommand: {
        Users: [
          { UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() },
          { UserName: 'bob', Arn: 'arn:aws:iam::123:user/bob', CreateDate: new Date() },
        ],
      },
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
    const outcomes = await checkAdminUsers(client);
    const findings = outcomes.filter((o) => !o.__denied && !o.__errored);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].resourceId, 'alice');
    assert.deepEqual(findings[0].evidence.policies, ['arn:aws:iam::aws:policy/AdministratorAccess']);
  });

  test('returns no findings when no user has AdministratorAccess attached', async () => {
    const client = makeFakeClient({
      ListUsersCommand: {
        Users: [{ UserName: 'alice', Arn: 'arn:aws:iam::123:user/alice', CreateDate: new Date() }],
      },
      ListAttachedUserPoliciesCommand: {
        AttachedPolicies: [
          { PolicyName: 'ReadOnlyAccess', PolicyArn: 'arn:aws:iam::aws:policy/ReadOnlyAccess' },
        ],
      },
    });
    const outcomes = await checkAdminUsers(client);
    assert.equal(outcomes.length, 0);
  });
});
