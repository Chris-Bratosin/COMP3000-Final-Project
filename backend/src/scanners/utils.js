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

function isAccessDenied(result) {
  return (
    result &&
    result.__error &&
    (result.__error.name === 'AccessDenied' ||
      result.__error.name === 'AccessDeniedException')
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

module.exports = {
  safeCall,
  isAccessDenied,
  isErrorCode,
  deniedOutcome,
  erroredOutcome,
  makeFinding,
};
