# Security Policy

This project is an academic prototype (COMP3000 Final Year Project). It is intended for local, single-user use against a personal AWS sandbox account. The notes below describe the security model, known limitations, and how to report issues.

## Responsible Use

The Cloud Misconfiguration Auditor (CMA) reads AWS configuration via read-only API calls (`s3:Get*`, `sts:GetCallerIdentity`, etc.). It does not modify any AWS resources.

You should only run scans against:

- AWS accounts you own, or
- An AWS Academy / voclabs sandbox account, or
- Any account where you have explicit written authorisation from the account owner.

Scanning third-party AWS accounts without permission may violate the AWS Acceptable Use Policy and applicable computer-misuse laws.

## Credentials

CMA never persists AWS credentials.

- The `accessKeyId`, `secretAccessKey`, `sessionToken`, and `assumeRoleArn` fields are kept in React component state only.
- Scan settings are persisted to browser `localStorage` for convenience, but credential fields are explicitly stripped before saving and forced empty on load.
- Credentials are sent from browser to backend over the `Content-Type: application/json` body of a POST request. On `localhost` this travels over plain HTTP. If you ever deploy this beyond localhost, terminate TLS in front of the backend.
- The backend forwards credentials directly to the AWS SDK and does not log them. `ScanRecord` documents in MongoDB store findings, evidence (AWS config snapshots), region, and timing — no credential material.

If you suspect a credential has been logged or persisted unintentionally, rotate it immediately in the AWS console and open an issue.

## Known Security Limitations

These are deliberate choices for the local-prototype scope. They are NOT acceptable for any deployment beyond a single user on `localhost`.

- **No authentication on the backend API.** `POST /api/scan/s3`, `POST /api/aws/test-connection`, and `GET /api/scans` are all reachable by anything that can connect to port 3001. The scan endpoint operates on credentials supplied per-request, so abuse is limited to a caller's own AWS account, but `GET /api/scans` exposes the full scan history with no auth.
- **MongoDB has no authentication** and is bound to `27017:27017` on the host in `compose.yaml`. This is fine on a developer laptop; if the machine is on an untrusted network, bind to `127.0.0.1:27017` and add a username/password.
- **No rate limit on `/api/scan/s3` or `/api/scans`.** Only `/api/aws/test-connection` is rate-limited (10/min/IP).
- **CORS is restricted to `FRONTEND_ORIGIN`** (default `http://localhost:3000`). Cross-origin requests from anywhere else are rejected.

## Reporting Issues

If you find a security issue in this project:

- Open a GitHub issue at <https://github.com/Chris-Bratosin/COMP3000-Final-Project/issues> with the label `security`, or
- Email <chris.bratosin@students.plymouth.ac.uk>.

Please do not open pull requests for unpatched vulnerabilities — describe the issue first so it can be triaged.
