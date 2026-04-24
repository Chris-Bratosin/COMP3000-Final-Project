# Database Schema

The database is designed around user data separation. Each user belongs to a workspace, and scan data is linked back to that workspace so results, reports, AWS connections, and logs do not leak between users.

## Collections

### users
Stores application users and authentication-related profile data.

Key fields: `email`, `passwordHash`, `displayName`, `status`, `mfaEnabled`, `lastLoginAt`.

Security note: store only password hashes, never plaintext passwords.

### workspaces
Groups users and their cloud security data into a separate ownership boundary.

Key fields: `name`, `owner`, `members`.

### awsconnections
Stores metadata about AWS accounts connected to CMA.

Key fields: `workspace`, `createdBy`, `name`, `connectionMethod`, `accountId`, `accessKeyLastFour`, `assumeRoleArn`, `primaryRegion`, `allowedRegions`, `status`, `lastValidatedAt`, `validationMessage`.

Security note: do not store raw AWS secret keys or session tokens in MongoDB unless encryption and expiry handling are implemented.

### scanpolicies
Stores reusable scan settings.

Key fields: `workspace`, `createdBy`, `name`, `scanLevel`, `regionScope`, `selectedRegions`, `enabledChecks`, `severityThreshold`, `includeEvidence`, `includeRemediationAdvice`, `saveScanLogs`.

### scanruns
Tracks each scan execution.

Key fields: `workspace`, `requestedBy`, `awsConnection`, `policy`, `status`, `startedAt`, `completedAt`, `scannerVersion`, `summary`, `failureReason`.

### findings
Stores individual misconfiguration findings produced by scans.

Key fields: `workspace`, `scanRun`, `awsConnection`, `ruleId`, `title`, `severity`, `service`, `region`, `resourceId`, `status`, `evidence`, `remediation`.

### reports
Stores generated report metadata.

Key fields: `workspace`, `scanRun`, `generatedBy`, `name`, `format`, `storageLocation`, `summary`, `generatedAt`.

### auditlogs
Records important user and system events.

Key fields: `workspace`, `actor`, `action`, `targetType`, `targetId`, `ipAddress`, `userAgent`, `metadata`.

### authsessions
Stores refresh/session tracking data for login sessions.

Key fields: `user`, `refreshTokenHash`, `expiresAt`, `revokedAt`, `ipAddress`, `userAgent`.

Security note: store only hashed refresh tokens, never raw tokens.

## Authentication Plan

The first login implementation should use:

- bcrypt password hashing for registration
- JWT access tokens for authenticated API requests
- refresh token tracking through `authsessions`
- middleware that verifies the token and attaches `req.user`
- workspace checks on every scan, report, finding, and log query

Every user-owned query should filter by `workspace` or authenticated `user` to keep data separated.
