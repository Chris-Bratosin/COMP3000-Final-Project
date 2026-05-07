# AWS Sandbox Setup

This document describes how the Cloud Misconfiguration Auditor (CMA) is exercised against an AWS sandbox account during development and demonstration. It covers the demo bucket fixtures, the read-only IAM policy CMA expects, and the practical caveats when using an AWS Academy / Voclabs lab session.

## Why a sandbox

CMA reads AWS configuration via read-only API calls (`s3:Get*`, `s3:List*`, `sts:GetCallerIdentity`). Although the tool never modifies resources, demonstrating it requires real S3 buckets in known states so that each detection rule can fire. Doing this in a personal AWS account would mean creating intentionally insecure buckets next to whatever else lives in that account. A short-lived sandbox isolates the bad configurations to a disposable environment.

## Account options

| Option | Lifetime | Notes |
|---|---|---|
| AWS Academy / Voclabs lab | Hours per session | Credentials rotate every session, no persistence across sessions, region locked to `us-east-1` |
| Personal AWS account | Persistent | Use a dedicated IAM user with the read-only policy below; budget alert recommended |
| LocalStack | Local | Free, but `GetBucketPolicyStatus` is partially implemented; encryption rules behave differently from real AWS |

The current setup targets a personal AWS sandbox account in `eu-west-1`. The lab option is documented because the original development was bootstrapped against Voclabs and the credential-rotation behaviour shaped CMA's design (no persistence of credentials, settings reset on reload).

## Demo bucket fixtures

Each bucket below is intentionally misconfigured to trigger one or more of CMA's detection rules. Names are prefixed with `cma-demo-` so they are easy to identify and bulk-delete at the end of a session.

| Bucket | Intended findings | How to set up |
|---|---|---|
| `cma-demo-vulnerable-public` | `s3-public-access-block-missing` (high), `s3-bucket-policy-public` (high), `s3-versioning-disabled` (low), `s3-server-access-logging-disabled` (low) | Disable Block Public Access on the bucket. Add a bucket policy granting `s3:GetObject` to `Principal: "*"`. Leave versioning and access logging off. |
| `cma-demo-no-versioning` | `s3-versioning-disabled` (low), `s3-server-access-logging-disabled` (low) | Default bucket creation. Do not enable versioning or access logging. |
| `cma-demo-no-encryption` | `s3-versioning-disabled` (low), `s3-server-access-logging-disabled` (low) | Default bucket creation. Note that AWS now auto-enables SSE-S3 on all new buckets, so the `s3-encryption-disabled` rule will not fire here without a CLI override (see Caveats). |
| `cma-demo-secure-baseline` | `s3-server-access-logging-disabled` (low) only | Enable Block Public Access (all four flags), enable versioning, leave access logging off. Acts as the baseline a "clean" bucket should resemble. |

### Recommended additions

To exercise the remaining detection rules, add:

| Bucket | Adds | How |
|---|---|---|
| `cma-demo-acl-public` | `s3-acl-public-grant` (high) | Disable Block Public Access, then via the AWS CLI: `aws s3api put-bucket-acl --bucket cma-demo-acl-public --grant-read uri=http://acs.amazonaws.com/groups/global/AllUsers`. The console UI no longer exposes ACL public grants directly. |
| `cma-demo-pab-partial` | `s3-public-access-block-incomplete` (high) | Enable Block Public Access but turn off one flag, e.g. `aws s3api put-public-access-block --bucket cma-demo-pab-partial --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`. |

With these two added, all seven detection rules in `backend/src/scanners/s3Scanner.js` have at least one bucket that triggers them.

## IAM policy

CMA needs read-only access to S3 metadata, IAM metadata, and STS for caller-identity verification. Create an IAM user (or role) with this policy attached. **Do not** attach `AdministratorAccess`; the security model documented in `SECURITY INFO.md` assumes the credentials supplied to CMA are genuinely read-only.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyS3Configuration",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketAcl",
        "s3:GetBucketEncryption",
        "s3:GetBucketLocation",
        "s3:GetBucketLogging",
        "s3:GetBucketPolicyStatus",
        "s3:GetBucketPublicAccessBlock",
        "s3:GetBucketVersioning",
        "s3:ListAllMyBuckets"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ReadOnlyIamMetadata",
      "Effect": "Allow",
      "Action": [
        "iam:GetAccountSummary",
        "iam:GetAccountPasswordPolicy",
        "iam:ListUsers",
        "iam:ListMFADevices",
        "iam:ListAccessKeys",
        "iam:GetAccessKeyLastUsed",
        "iam:ListAttachedUserPolicies"
      ],
      "Resource": "*"
    },
    {
      "Sid": "STSCallerIdentity",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

If the user wants to scan a specific list of buckets without granting `s3:ListAllMyBuckets`, that permission can be removed. CMA detects the `AccessDenied` response from `ListBuckets` and falls back to the explicit bucket list provided in the Scan Settings UI. Removing any IAM permission causes the corresponding rule to be reported as denied rather than failing the scan.

## IAM scanner rules

CMA's IAM scanner runs the following five account-wide checks. They can be exercised against any AWS account (no fixture buckets required); the lab/sandbox account itself is the test subject.

| Rule | Severity | What it detects |
|---|---|---|
| `iam-root-mfa-disabled` | high | The root user has no MFA device registered. Read via `GetAccountSummary` (`AccountMFAEnabled`). |
| `iam-password-policy-missing` | medium | The account has no IAM password policy at all. |
| `iam-password-policy-weak` | medium | A password policy exists but is below recommended thresholds: minimum length 14, all four character classes, max age 90 days. |
| `iam-user-mfa-disabled` | high | An IAM user has no virtual or hardware MFA device registered. One finding per user. |
| `iam-access-key-unused` | medium | An active IAM access key has either never been used or has not been used in over 90 days. One finding per key. |
| `iam-user-admin-policy-attached` | medium | An IAM user has `arn:aws:iam::aws:policy/AdministratorAccess` attached directly to their identity rather than via a group or assumed role. |

To demonstrate findings against a personal sandbox: temporarily detach root MFA (and re-enable immediately after scanning), or create a throwaway IAM user (`cma-demo-noMfa`) without an MFA device and with `AdministratorAccess` attached directly. Voclabs labs typically already contain at least one user without MFA and several never-used access keys, so the IAM scanner produces findings out of the box.

## Generating credentials

For an IAM user with the policy above:

1. AWS Console → IAM → Users → select the user → Security credentials → Create access key.
2. Choose "Application running outside AWS".
3. Copy the access key ID and secret access key into CMA's Scan Settings panel.
4. Click Test Connection. A successful response shows the resolved AWS account ID.

For an AWS Academy lab session, copy the temporary credentials block from the Voclabs "AWS Details" pane and paste it into CMA's three credential fields (access key, secret key, session token).

## Running a demo scan

1. Frontend: `npm run dev` in `frontend/`.
2. Backend: `npm run dev` in `backend/` (or `docker compose up` for the full stack including MongoDB).
3. Open `http://localhost:3000/scan-settings`.
4. Paste credentials, set the primary region (`eu-west-1` for the fixtures above).
5. List the demo bucket names in the bucket-names field, comma-separated.
6. Click Test Connection, then Run Scan.
7. The dashboard, Reports, and Logs pages all populate from the live scan.

## Caveats

- **Encryption rule rarely fires.** AWS enabled default SSE-S3 encryption for all new buckets in January 2023. To trigger `s3-encryption-disabled` on a real bucket, the encryption configuration has to be explicitly removed via the CLI (`aws s3api delete-bucket-encryption --bucket <name>`), and even then AWS will re-apply default encryption on subsequent uploads. The rule is retained in the scanner because it remains correct for legacy buckets and accounts that opted out of the default.
- **Voclabs region lock.** Voclabs labs are region-restricted to `us-east-1`. Buckets created in a Voclabs session cannot be scanned in `eu-west-1` without manual region overrides.
- **Lab credential rotation.** Voclabs credentials rotate every session. CMA never persists credentials (see `SECURITY INFO.md`), so the user must paste fresh credentials at the start of each session. The `.env` in the backend is intentionally empty of AWS credentials for this reason.
- **`s3:ListAllMyBuckets` is a coarse permission.** It returns every bucket in the account regardless of region. CMA handles per-region lookups internally via `GetBucketLocation`, but the IAM policy itself cannot scope `ListAllMyBuckets` to a subset of buckets.
- **Bucket cleanup.** At the end of a demo session, delete the `cma-demo-*` buckets. For Voclabs the lab teardown handles this automatically; for personal accounts, an explicit `aws s3 rb s3://cma-demo-*` is required.
