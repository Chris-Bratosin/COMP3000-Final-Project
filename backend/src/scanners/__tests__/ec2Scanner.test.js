'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  inspectSecurityGroup,
  scanSecurityGroupsInRegion,
  scanVolumesInRegion,
  isPublicIngress,
  ruleCoversPort,
  rulePortSpan,
} = require('../ec2Scanner');

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

const REGION = 'eu-west-1';

describe('rule helpers', () => {
  test('isPublicIngress detects 0.0.0.0/0 in IpRanges', () => {
    assert.equal(
      isPublicIngress({ IpRanges: [{ CidrIp: '0.0.0.0/0' }], Ipv6Ranges: [] }),
      true,
    );
  });

  test('isPublicIngress detects ::/0 in Ipv6Ranges', () => {
    assert.equal(
      isPublicIngress({ IpRanges: [], Ipv6Ranges: [{ CidrIpv6: '::/0' }] }),
      true,
    );
  });

  test('isPublicIngress returns false for narrow CIDRs', () => {
    assert.equal(
      isPublicIngress({ IpRanges: [{ CidrIp: '10.0.0.0/8' }], Ipv6Ranges: [] }),
      false,
    );
  });

  test('ruleCoversPort: -1 protocol covers any port', () => {
    assert.equal(ruleCoversPort({ IpProtocol: '-1' }, 22), true);
    assert.equal(ruleCoversPort({ IpProtocol: '-1' }, 65000), true);
  });

  test('ruleCoversPort: tcp range includes endpoints', () => {
    assert.equal(
      ruleCoversPort({ IpProtocol: 'tcp', FromPort: 20, ToPort: 25 }, 22),
      true,
    );
    assert.equal(
      ruleCoversPort({ IpProtocol: 'tcp', FromPort: 80, ToPort: 80 }, 22),
      false,
    );
  });

  test('rulePortSpan computes inclusive range', () => {
    assert.equal(rulePortSpan({ IpProtocol: 'tcp', FromPort: 80, ToPort: 80 }), 1);
    assert.equal(rulePortSpan({ IpProtocol: 'tcp', FromPort: 1, ToPort: 1000 }), 1000);
    assert.equal(rulePortSpan({ IpProtocol: '-1' }), 65536);
  });
});

describe('inspectSecurityGroup', () => {
  test('flags SSH open to the world as high severity', () => {
    const findings = inspectSecurityGroup(
      {
        GroupId: 'sg-1',
        GroupName: 'web',
        VpcId: 'vpc-1',
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            Ipv6Ranges: [],
          },
        ],
      },
      REGION,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'ec2-sg-port-22-public');
    assert.equal(findings[0].severity, 'high');
    assert.equal(findings[0].resourceId, 'sg-1');
  });

  test('flags RDP open to the world as high severity', () => {
    const findings = inspectSecurityGroup(
      {
        GroupId: 'sg-2',
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 3389,
            ToPort: 3389,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            Ipv6Ranges: [],
          },
        ],
      },
      REGION,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'ec2-sg-port-3389-public');
  });

  test('flags an all-protocols rule as high severity and skips per-port duplicates', () => {
    const findings = inspectSecurityGroup(
      {
        GroupId: 'sg-3',
        IpPermissions: [
          {
            IpProtocol: '-1',
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            Ipv6Ranges: [],
          },
        ],
      },
      REGION,
    );
    // Should be exactly one finding (the all-ports one) — not three (all-ports + 22 + 3389).
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'ec2-sg-all-ports-public');
  });

  test('flags a wide port range that does NOT include 22/3389 as medium broad-ingress', () => {
    const findings = inspectSecurityGroup(
      {
        GroupId: 'sg-4',
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 8000,
            ToPort: 8500, // 501 ports, doesn't include 22 or 3389
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            Ipv6Ranges: [],
          },
        ],
      },
      REGION,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'ec2-sg-broad-ingress');
    assert.equal(findings[0].severity, 'medium');
  });

  test('does NOT flag a narrow rule like 443/443', () => {
    const findings = inspectSecurityGroup(
      {
        GroupId: 'sg-5',
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            Ipv6Ranges: [],
          },
        ],
      },
      REGION,
    );
    assert.equal(findings.length, 0);
  });

  test('does NOT flag rules whose source is an internal CIDR', () => {
    const findings = inspectSecurityGroup(
      {
        GroupId: 'sg-6',
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            IpRanges: [{ CidrIp: '10.0.0.0/8' }],
            Ipv6Ranges: [],
          },
        ],
      },
      REGION,
    );
    assert.equal(findings.length, 0);
  });

  test('a single rule covering both 22 and 3389 produces both findings', () => {
    const findings = inspectSecurityGroup(
      {
        GroupId: 'sg-7',
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 1,
            ToPort: 5000, // includes 22 and 3389
            IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            Ipv6Ranges: [],
          },
        ],
      },
      REGION,
    );
    const ruleIds = findings.map((f) => f.ruleId).sort();
    assert.deepEqual(ruleIds, ['ec2-sg-port-22-public', 'ec2-sg-port-3389-public']);
    // Should NOT also be flagged as broad-ingress, because matchedRiskyPort short-circuits it.
    assert.ok(!ruleIds.includes('ec2-sg-broad-ingress'));
  });
});

describe('scanSecurityGroupsInRegion', () => {
  test('routes UnauthorizedOperation to denied (EC2 access-denied flavour)', async () => {
    const client = makeFakeClient({
      DescribeSecurityGroupsCommand: awsError('UnauthorizedOperation'),
    });
    const result = await scanSecurityGroupsInRegion(client, REGION);
    assert.equal(result.denied.length, 1);
    assert.equal(result.denied[0], 'ec2-security-groups-list');
    assert.equal(result.errored.length, 0);
  });

  test('routes AuthFailure to denied', async () => {
    const client = makeFakeClient({
      DescribeSecurityGroupsCommand: awsError('AuthFailure'),
    });
    const result = await scanSecurityGroupsInRegion(client, REGION);
    assert.equal(result.denied.length, 1);
    assert.equal(result.errored.length, 0);
  });

  test('routes a real network error to errored, not denied', async () => {
    const client = makeFakeClient({
      DescribeSecurityGroupsCommand: awsError('NetworkingError', 'connect ETIMEDOUT'),
    });
    const result = await scanSecurityGroupsInRegion(client, REGION);
    assert.equal(result.errored.length, 1);
    assert.equal(result.errored[0].errorName, 'NetworkingError');
    assert.equal(result.denied.length, 0);
  });

  test('returns denied bucket on AccessDenied', async () => {
    const client = makeFakeClient({
      DescribeSecurityGroupsCommand: awsError('AccessDenied'),
    });
    const result = await scanSecurityGroupsInRegion(client, REGION);
    assert.equal(result.denied.length, 1);
    assert.equal(result.denied[0], 'ec2-security-groups-list');
  });

  test('produces findings across multiple security groups', async () => {
    const client = makeFakeClient({
      DescribeSecurityGroupsCommand: {
        SecurityGroups: [
          {
            GroupId: 'sg-a',
            IpPermissions: [
              {
                IpProtocol: 'tcp',
                FromPort: 22,
                ToPort: 22,
                IpRanges: [{ CidrIp: '0.0.0.0/0' }],
              },
            ],
          },
          {
            GroupId: 'sg-b',
            IpPermissions: [
              {
                IpProtocol: 'tcp',
                FromPort: 443,
                ToPort: 443,
                IpRanges: [{ CidrIp: '0.0.0.0/0' }],
              },
            ],
          },
        ],
      },
    });
    const result = await scanSecurityGroupsInRegion(client, REGION);
    assert.equal(result.findings.length, 1); // only sg-a
    assert.equal(result.findings[0].resourceId, 'sg-a');
    assert.equal(result.totalChecks, 8); // 2 SGs * 4 rule inspections
  });
});

describe('scanVolumesInRegion', () => {
  test('flags unencrypted volumes', async () => {
    const client = makeFakeClient({
      DescribeVolumesCommand: {
        Volumes: [
          { VolumeId: 'vol-1', Encrypted: false, State: 'in-use', Size: 8, Attachments: [] },
          { VolumeId: 'vol-2', Encrypted: true, State: 'in-use', Size: 8, Attachments: [] },
        ],
      },
    });
    const result = await scanVolumesInRegion(client, REGION);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].resourceId, 'vol-1');
    assert.equal(result.findings[0].ruleId, 'ec2-ebs-unencrypted');
    assert.equal(result.totalChecks, 2);
  });

  test('returns denied on AccessDenied', async () => {
    const client = makeFakeClient({
      DescribeVolumesCommand: awsError('AccessDenied'),
    });
    const result = await scanVolumesInRegion(client, REGION);
    assert.equal(result.denied.length, 1);
    assert.equal(result.denied[0], 'ec2-ebs-encryption');
  });

  test('counts at least one check even when no volumes exist', async () => {
    const client = makeFakeClient({
      DescribeVolumesCommand: { Volumes: [] },
    });
    const result = await scanVolumesInRegion(client, REGION);
    assert.equal(result.findings.length, 0);
    assert.equal(result.totalChecks, 1);
  });
});
