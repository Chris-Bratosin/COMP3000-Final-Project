// Shared helpers used by every scanner module (s3Scanner, iamScanner, ...).
//
// All scanners speak the same "outcome" vocabulary so the run-level
// aggregator can summarise results uniformly:
//
//   - Finding         : a real misconfiguration. Has ruleId, severity,
//                       evidence, remediation. Goes into summary.findings.
//   - Denied outcome  : the SDK call returned an AccessDenied-style error.
//                       The check could not run because the credentials lack
//                       the required permission. Goes into summary.checksDenied.
//   - Errored outcome : the SDK call failed for any other reason (network,
//                       throttling, malformed response). Goes into
//                       summary.checksErrored.
//
// Keeping these three buckets separate is important: a "0 findings" result
// only means "good posture" if it came from checks that actually ran, not
// from checks that were silently denied.

// Wraps a promise so a rejection becomes a sentinel object rather than an
// exception. Lets the per-check helpers branch on `result.__error` instead of
// wrapping every SDK call in its own try/catch.
async function safeCall(promise) {
  try {
    return await promise;
  } catch (error) {
    return { __error: error };
  }
}

// Each AWS service signals "you don't have permission" with its own error
// name. S3 / IAM use AccessDenied(/Exception); EC2 uses UnauthorizedOperation
// for the dry-run-style denial and AuthFailure when the credential itself is
// rejected. Treat all of them as denied so partial-permission sandboxes are
// reflected in the "denied" column rather than the "errored" column.
const ACCESS_DENIED_ERROR_NAMES = new Set([
  'AccessDenied',
  'AccessDeniedException',
  'UnauthorizedOperation',
  'AuthFailure',
]);

function isAccessDenied(result) {
  return Boolean(
    result && result.__error && ACCESS_DENIED_ERROR_NAMES.has(result.__error.name),
  );
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

// Canonical finding shape used by every scanner. The composite `id`
// (ruleId:resourceId) uniquely identifies a finding within a scan and is
// what the dashboard uses as a React key.
function makeFinding({ ruleId, title, severity, service, resourceId, region, evidence, remediation }) {
  return {
    id: `${ruleId}:${resourceId}`,
    ruleId,
    title,
    severity,
    service,
    region: region || 'global',
    resourceId,
    evidence: evidence || null,
    remediation: remediation || '',
  };
}

// Post-processes a scan envelope to honour the user's report-shaping settings.
// Persistence happens with the unfiltered scan so the history view stays
// truthful; only the response sent back to the dashboard is shaped here.
function applyReportOptions(scan, opts) {
  const {
    severityThreshold = 'all',
    includeEvidence = true,
    includeRemediationAdvice = true,
  } = opts || {};

  let findings = scan.findings || [];

  if (severityThreshold === 'medium-and-above') {
    findings = findings.filter(
      (f) => f.severity === 'high' || f.severity === 'medium' || f.severity === 'critical',
    );
  } else if (severityThreshold === 'high-only') {
    findings = findings.filter((f) => f.severity === 'high' || f.severity === 'critical');
  }

  if (!includeEvidence || !includeRemediationAdvice) {
    findings = findings.map((f) => ({
      ...f,
      ...(includeEvidence ? {} : { evidence: null }),
      ...(includeRemediationAdvice ? {} : { remediation: '' }),
    }));
  }

  const high = findings.filter((f) => f.severity === 'high' || f.severity === 'critical').length;
  const medium = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;

  return {
    ...scan,
    findings,
    summary: {
      ...scan.summary,
      issuesFound: findings.length,
      high,
      medium,
      low,
    },
  };
}

module.exports = {
  safeCall,
  isAccessDenied,
  isErrorCode,
  deniedOutcome,
  erroredOutcome,
  makeFinding,
  applyReportOptions,
};
