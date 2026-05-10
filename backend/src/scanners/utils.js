// Shared helpers used by every scanner module (s3Scanner, iamScanner, ...).
// Each scanner produces three kinds of outcome: a finding, a "denied" marker
// when AWS rejects the read with AccessDenied, or an "errored" marker when
// AWS responds with any other error. Aggregators in runS3Scan / runIamScan
// route each outcome to the right summary bucket.

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
