// EC2 scanner.
//
// Two per-region inspections:
//   - Security groups: any ingress rule from 0.0.0.0/0 (or ::/0) is
//     classified as port 22 (SSH) public, port 3389 (RDP) public, all-ports
//     public, or broad ingress (a wide port span that doesn't match the
//     specific rules above). Most-specific finding wins to avoid duplicate
//     noise on the dashboard.
//   - EBS volumes: any volume with Encrypted=false is flagged.
//
// Region targeting: if the request lists explicit regions we use those,
// otherwise we DescribeRegions(AllRegions=false) to enumerate the account's
// enabled regions. The two regional scans run concurrently per region.

const {
  EC2Client,
  DescribeRegionsCommand,
  DescribeSecurityGroupsCommand,
  DescribeVolumesCommand,
} = require('@aws-sdk/client-ec2');

const {
  safeCall,
  isAccessDenied,
  deniedOutcome,
  erroredOutcome,
  makeFinding: baseMakeFinding,
} = require('./utils');

const PUBLIC_IPV4 = '0.0.0.0/0';
const PUBLIC_IPV6 = '::/0';
const RISKY_PORTS = [
  { port: 22, name: 'SSH', ruleId: 'ec2-sg-port-22-public' },
  { port: 3389, name: 'RDP', ruleId: 'ec2-sg-port-3389-public' },
];
// Anything wider than this counts as a "broad" rule. 100 is generous enough to
// avoid flagging common multi-port app rules (e.g. ephemeral 49152-65535) but
// catches anything resembling an open firewall.
const BROAD_PORT_SPAN_THRESHOLD = 100;

function buildClient({ region, credentials }) {
  return new EC2Client({ region, credentials });
}

function makeFinding({ ruleId, title, severity, resourceId, region, evidence, remediation }) {
  return baseMakeFinding({
    ruleId,
    title,
    severity,
    service: 'EC2',
    resourceId,
    region: region || 'unknown',
    evidence,
    remediation,
  });
}

function isPublicIngress(rule) {
  const ipv4 = (rule.IpRanges || []).some((r) => r.CidrIp === PUBLIC_IPV4);
  const ipv6 = (rule.Ipv6Ranges || []).some((r) => r.CidrIpv6 === PUBLIC_IPV6);
  return ipv4 || ipv6;
}

function ruleCoversPort(rule, port) {
  if (rule.IpProtocol === '-1') return true;
  if (rule.IpProtocol !== 'tcp' && rule.IpProtocol !== 'udp') return false;
  const from = rule.FromPort ?? 0;
  const to = rule.ToPort ?? 65535;
  return from <= port && port <= to;
}

function rulePortSpan(rule) {
  if (rule.IpProtocol === '-1') return 65536;
  const from = rule.FromPort ?? 0;
  const to = rule.ToPort ?? 65535;
  return Math.max(0, to - from + 1);
}

function describeRule(rule) {
  return {
    protocol: rule.IpProtocol,
    fromPort: rule.FromPort ?? null,
    toPort: rule.ToPort ?? null,
  };
}

// Each SG runs four rule-level inspections per public-ingress rule. We surface
// the most specific finding only — e.g. an "all ports" rule shouldn't ALSO
// produce a "port 22" duplicate, since fixing the all-ports rule resolves both.
function inspectSecurityGroup(sg, region) {
  const findings = [];
  const evidenceBase = {
    groupName: sg.GroupName || '',
    vpcId: sg.VpcId || '',
    description: sg.Description || '',
  };

  for (const rule of sg.IpPermissions || []) {
    if (!isPublicIngress(rule)) continue;

    if (rule.IpProtocol === '-1') {
      findings.push(
        makeFinding({
          ruleId: 'ec2-sg-all-ports-public',
          title: 'Security group allows all protocols and ports from 0.0.0.0/0',
          severity: 'high',
          resourceId: sg.GroupId,
          region,
          evidence: { ...evidenceBase, rule: describeRule(rule) },
          remediation:
            'Replace the all-traffic rule with explicit per-port rules scoped to specific source CIDRs. An open all-ports rule effectively disables the firewall for that group.',
        }),
      );
      continue;
    }

    let matchedRiskyPort = false;
    for (const { port, name, ruleId } of RISKY_PORTS) {
      if (!ruleCoversPort(rule, port)) continue;
      matchedRiskyPort = true;
      findings.push(
        makeFinding({
          ruleId,
          title: `Security group allows ${name} (port ${port}) from 0.0.0.0/0`,
          severity: 'high',
          resourceId: sg.GroupId,
          region,
          evidence: { ...evidenceBase, rule: describeRule(rule) },
          remediation:
            port === 22
              ? 'Restrict SSH ingress to your bastion or office CIDR. Public SSH is a leading source of brute-force compromise on AWS.'
              : 'Restrict RDP ingress to a known IP range, or replace it with AWS Systems Manager Session Manager which removes the need for an open RDP port.',
        }),
      );
    }

    if (!matchedRiskyPort && rulePortSpan(rule) > BROAD_PORT_SPAN_THRESHOLD) {
      findings.push(
        makeFinding({
          ruleId: 'ec2-sg-broad-ingress',
          title: `Security group exposes ${rulePortSpan(rule)} ports to 0.0.0.0/0 (${rule.FromPort}-${rule.ToPort}/${rule.IpProtocol})`,
          severity: 'medium',
          resourceId: sg.GroupId,
          region,
          evidence: { ...evidenceBase, rule: describeRule(rule), portSpan: rulePortSpan(rule) },
          remediation:
            'Narrow the port range to only the ports actually required by the service running behind this security group.',
        }),
      );
    }
  }

  return findings;
}

async function scanSecurityGroupsInRegion(client, region) {
  const ruleId = 'ec2-security-groups-list';
  const result = await safeCall(client.send(new DescribeSecurityGroupsCommand({})));
  if (isAccessDenied(result)) return { findings: [], denied: [ruleId], errored: [], totalChecks: 1 };
  if (result && result.__error) {
    return {
      findings: [],
      denied: [],
      errored: [{ ruleId, errorName: result.__error.name, errorMessage: result.__error.message }],
      totalChecks: 1,
    };
  }
  const sgs = (result && result.SecurityGroups) || [];
  const findings = [];
  for (const sg of sgs) findings.push(...inspectSecurityGroup(sg, region));
  // Each security group counts as four rule inspections (port 22, port 3389,
  // all-ports, broad-ingress) so totalChecks scales with how much we actually
  // looked at, not just how many SDK calls we made.
  return { findings, denied: [], errored: [], totalChecks: Math.max(1, sgs.length * 4) };
}

async function scanVolumesInRegion(client, region) {
  const ruleId = 'ec2-ebs-encryption';
  const result = await safeCall(client.send(new DescribeVolumesCommand({})));
  if (isAccessDenied(result)) return { findings: [], denied: [ruleId], errored: [], totalChecks: 1 };
  if (result && result.__error) {
    return {
      findings: [],
      denied: [],
      errored: [{ ruleId, errorName: result.__error.name, errorMessage: result.__error.message }],
      totalChecks: 1,
    };
  }
  const volumes = (result && result.Volumes) || [];
  const findings = [];
  for (const vol of volumes) {
    if (vol.Encrypted) continue;
    findings.push(
      makeFinding({
        ruleId: 'ec2-ebs-unencrypted',
        title: 'EBS volume is not encrypted at rest',
        severity: 'medium',
        resourceId: vol.VolumeId,
        region,
        evidence: {
          state: vol.State,
          sizeGiB: vol.Size,
          attachments: (vol.Attachments || []).map((a) => a.InstanceId).filter(Boolean),
        },
        remediation:
          'Enable EBS default encryption for this region, then re-create unencrypted volumes via snapshot copy with KMS encryption enabled.',
      }),
    );
  }
  return { findings, denied: [], errored: [], totalChecks: Math.max(1, volumes.length) };
}

async function listEnabledRegions(credentials) {
  const client = buildClient({ region: 'us-east-1', credentials });
  const result = await safeCall(
    client.send(new DescribeRegionsCommand({ AllRegions: false })),
  );
  if (!result || result.__error) return [];
  return (result.Regions || []).map((r) => r.RegionName).filter(Boolean);
}

async function runEc2Scan({ credentials, regions }) {
  const startedAt = new Date();

  let targetRegions = Array.isArray(regions) ? regions.filter(Boolean) : [];
  let regionDiscoveryError = null;
  if (targetRegions.length === 0) {
    targetRegions = await listEnabledRegions(credentials);
    if (targetRegions.length === 0) {
      // Fall back to a single sensible default so the scan still produces
      // a result envelope rather than failing silently.
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

  await Promise.all(
    targetRegions.map(async (region) => {
      const client = buildClient({ region, credentials });
      const [sgOutcome, volOutcome] = await Promise.all([
        scanSecurityGroupsInRegion(client, region),
        scanVolumesInRegion(client, region),
      ]);
      findings.push(...sgOutcome.findings, ...volOutcome.findings);
      denied.push(...sgOutcome.denied, ...volOutcome.denied);
      errored.push(...sgOutcome.errored, ...volOutcome.errored);
      totalChecks += sgOutcome.totalChecks + volOutcome.totalChecks;
      regionResults.push({
        region,
        securityGroupChecks: sgOutcome.totalChecks,
        volumeChecks: volOutcome.totalChecks,
        findings: sgOutcome.findings.length + volOutcome.findings.length,
      });
      const regionErrors = [...sgOutcome.errored, ...volOutcome.errored];
      if (regionErrors.length > 0) {
        console.warn(
          `[ec2Scanner] ${region}: ${regionErrors.length} check(s) errored:`,
          regionErrors.map((e) => `${e.ruleId}=${e.errorName}:${e.errorMessage}`).join(' | '),
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
    issuesFound: findings.length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
  };

  return {
    scanner: 'EC2',
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
  runEc2Scan,
  // Exported for unit tests:
  inspectSecurityGroup,
  scanSecurityGroupsInRegion,
  scanVolumesInRegion,
  isPublicIngress,
  ruleCoversPort,
  rulePortSpan,
};
