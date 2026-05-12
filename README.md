# Cloud Misconfiguration Auditor (CMA)

A read-only AWS security auditing tool built as a COMP3000 Final Year Cyber Security Project at the University of Plymouth.

---

## Project Vision

Cloud environments are increasingly misconfigured by default. The Cloud Misconfiguration Auditor (CMA) was built to give developers and security students a practical, localhost-first tool for identifying real AWS misconfigurations across S3, IAM, EC2, and Secrets Manager — without requiring deep security expertise or expensive third-party tooling.

CMA is intentionally single-user and credential-safe: AWS credentials are supplied per scan, never stored to disk, and the tool runs entirely on localhost. The goal is to make cloud security auditing approachable, transparent, and educational.

---

## Key Features

- **Multi-service scanning** — S3 (public access, encryption, versioning, logging), IAM (root MFA, password policy, unused keys, wildcard policies), EC2 (security group ingress rules, EBS encryption), and Secrets Manager (rotation, KMS key, resource policy)
- **Parallel scan execution** — S3, IAM, EC2, and Secrets scans fire concurrently on each Run Scan click and are stitched into a unified result
- **Dashboard** — posture score (A–F grade), risk breakdown chart, top findings, and remediation tips derived from live scan data
- **Detailed Issues** — expandable per-finding panel with a plain-English "What this means" description and remediation guidance
- **Scan history** — MongoDB-backed report log with per-run grouping via a shared `runId`; credential-free connection test gates every scan
- **Report settings** — severity threshold filter, evidence and remediation toggles, and a toggle to skip persisting a scan to history
- **Credential safety** — AWS credentials are never written to `localStorage` or disk; the settings storage layer strips them on every save and enforces this on load

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| AWS SDK | `@aws-sdk/client-s3`, `@aws-sdk/client-iam`, `@aws-sdk/client-ec2`, `@aws-sdk/client-secrets-manager`, `@aws-sdk/client-sts` |
| Testing | Vitest + Testing Library (frontend), Node.js built-in test runner (backend) |
| Containerisation | Docker, Docker Compose |

---

## Deployment (Docker)

Run these commands from the project root:

Start the frontend and backend containers:

```sh
docker compose up --build
```

Stop the containers:

```sh
docker compose down
```

---

## Project Info

| | |
|---|---|
| **Student** | Chris Bratosin |
| **Supervisor** | Rory Hopcraft |
| **Module** | COMP3000 Final Year Project |
| **Institution** | University of Plymouth |

---

## Commit Type Key

| Prefix | Meaning |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `chore` | Maintenance, config, or tooling changes |
| `refactor` | Code restructured without changing behaviour |
| `docs` | Documentation only |
| `test` | Tests added or updated |
| `style` | Formatting, naming, or UI-only changes |
