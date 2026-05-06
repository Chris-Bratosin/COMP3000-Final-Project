export interface LawPolicy {
  id: string;
  short: string;
  name: string;
  jurisdiction: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

export const lawPolicies: LawPolicy[] = [
  {
    id: "gdpr",
    short: "GDPR",
    name: "General Data Protection Regulation",
    jurisdiction: "EU / EEA",
    summary:
      "The GDPR governs the collection, storage, and processing of personal data belonging to EU/EEA residents. CMA is designed to operate without collecting or retaining personal data.",
    sections: [
      {
        heading: "No personal data collected",
        body: "CMA does not ask for, store, or transmit any personal information about its users. There is no registration, login, or user profile. The tool operates entirely under a single-user, localhost model.",
      },
      {
        heading: "AWS credentials handling",
        body: "AWS access keys and session tokens are held only in React component state for the duration of the browser session. They are explicitly stripped before any data is written to localStorage and are never sent to any third-party service. The backend forwards credentials directly to the AWS SDK and does not log or persist them.",
      },
      {
        heading: "Scan findings",
        body: "Scan results stored in MongoDB contain AWS resource configuration metadata (bucket names, ACL settings, encryption status, etc.). This is infrastructure data, not personal data. No names, email addresses, IP addresses of individuals, or other data categories covered by GDPR Article 4(1) are collected.",
      },
      {
        heading: "Data minimisation (Article 5(1)(c))",
        body: "CMA uses read-only AWS API calls (s3:Get*, s3:List*, sts:GetCallerIdentity). It does not read object contents and requests only the minimum configuration metadata needed to perform each security check.",
      },
      {
        heading: "Right to erasure",
        body: "Because no personal data is stored, a formal erasure request under Article 17 is not applicable. Scan records in MongoDB can be dropped at any time by the account owner without affecting any individual's rights.",
      },
    ],
  },
  {
    id: "ukdpa",
    short: "UK DPA 2018",
    name: "UK Data Protection Act 2018",
    jurisdiction: "United Kingdom",
    summary:
      "The UK DPA 2018 retains the principles of the EU GDPR in UK domestic law following Brexit. The same analysis that applies to GDPR applies here.",
    sections: [
      {
        heading: "UK GDPR alignment",
        body: "The UK DPA 2018 incorporates the UK GDPR, which mirrors the EU GDPR in all material respects for the data types CMA handles. CMA's position under UK DPA 2018 is identical to its position under EU GDPR: no personal data is collected, stored, or processed.",
      },
      {
        heading: "Academic and educational use",
        body: "CMA is developed as an academic prototype (COMP3000 Final Year Project) at the University of Plymouth. Use is restricted to personal AWS sandbox accounts. This falls within the 'personal, family, or household activity' exemption under UK GDPR Article 2(2)(c) and is not a commercial data processing activity.",
      },
      {
        heading: "No automated decision-making",
        body: "CMA produces findings and a risk score for informational purposes only. No decisions with legal or similarly significant effect on any individual are made automatically. Article 22 does not apply.",
      },
    ],
  },
  {
    id: "cma1990",
    short: "CMA 1990",
    name: "Computer Misuse Act 1990",
    jurisdiction: "United Kingdom",
    summary:
      "The Computer Misuse Act 1990 makes it a criminal offence to access computer systems without authorisation. CMA is a read-only auditing tool; its lawful use depends entirely on the operator having authorised access to the scanned AWS account.",
    sections: [
      {
        heading: "Authorised access requirement",
        body: "CMA must only be run against AWS accounts the operator owns or has explicit written authorisation to audit. Running CMA against a third-party AWS account without permission constitutes unauthorised access under Section 1 of the Act and may constitute a further offence under Sections 2 and 3.",
      },
      {
        heading: "Read-only operations",
        body: "CMA calls only read-only AWS APIs (s3:GetBucketAcl, s3:GetBucketEncryption, s3:GetBucketPolicy, s3:GetBucketVersioning, s3:GetBucketLogging, s3:GetBucketPublicAccessBlock, sts:GetCallerIdentity). It does not modify, delete, or create any AWS resource, limiting the scope of any accidental or misuse scenario.",
      },
      {
        heading: "No exploitation capability",
        body: "CMA detects misconfigurations and reports them; it does not attempt to exploit findings (e.g., it does not attempt to read bucket objects, exfiltrate data, or escalate privileges). The tool is purely diagnostic.",
      },
      {
        heading: "User responsibility",
        body: "The operator is responsible for ensuring they hold the necessary authorisation before initiating a scan. The AWS credential fields accept only credentials the user supplies; CMA has no mechanism to bypass AWS IAM controls or obtain credentials independently.",
      },
    ],
  },
  {
    id: "awsaup",
    short: "AWS AUP",
    name: "AWS Acceptable Use Policy",
    jurisdiction: "Amazon Web Services",
    summary:
      "The AWS Acceptable Use Policy prohibits using AWS services to harm others, conduct unauthorised security testing, or violate laws. CMA is designed to comply with these terms when used as intended.",
    sections: [
      {
        heading: "No harmful use",
        body: "CMA does not perform any action that could degrade, damage, or disrupt AWS services. All operations are standard, low-frequency API calls well within normal SDK usage patterns.",
      },
      {
        heading: "Security testing scope",
        body: "AWS explicitly permits customers to perform security assessments of their own AWS infrastructure. CMA is a self-assessment tool — it analyses the operator's own account configuration. Scanning accounts not owned by the operator is outside the intended use and would violate both the AWS AUP and the Computer Misuse Act 1990.",
      },
      {
        heading: "Rate limiting",
        body: "CMA scans buckets sequentially and does not implement concurrent bulk API calls that could trigger AWS throttling. The scanner respects AWS SDK default retry and backoff behaviour.",
      },
      {
        heading: "No resource modification",
        body: "CMA never calls write-path AWS APIs. It holds no IAM permissions beyond read access (s3:Get*, s3:List*, sts:GetCallerIdentity). It cannot create, modify, or delete any AWS resource.",
      },
    ],
  },
  {
    id: "iso27001",
    short: "ISO 27001",
    name: "ISO/IEC 27001:2022",
    jurisdiction: "International",
    summary:
      "ISO/IEC 27001 defines requirements for an information security management system (ISMS). While CMA is an academic prototype and is not formally certified, its design reflects several Annex A controls.",
    sections: [
      {
        heading: "Access control (A.5.15, A.8.3)",
        body: "CMA supports read-only IAM policies, reducing the blast radius of a compromised credential. The recommended IAM policy grants only s3:Get*, s3:List*, and sts:GetCallerIdentity — no write or admin permissions.",
      },
      {
        heading: "Cryptography (A.8.24)",
        body: "The s3-encryption-disabled check verifies that all scanned buckets have SSE-S3 or SSE-KMS default encryption enabled, helping operators meet the spirit of A.8.24 (Use of cryptography).",
      },
      {
        heading: "Logging and monitoring (A.8.15, A.8.16)",
        body: "The s3-server-access-logging-disabled check ensures that access log streams exist for each bucket, supporting the audit and event logging controls in Annex A.",
      },
      {
        heading: "Information backup (A.8.13)",
        body: "The s3-versioning-disabled check highlights buckets where accidental deletion or overwrite cannot be recovered, directly supporting the backup and recovery requirements of A.8.13.",
      },
      {
        heading: "Prototype limitations",
        body: "CMA is an academic proof-of-concept. It has no formal ISMS, no certified audit trail, and no change management process. It should not be represented as ISO 27001 certified or compliant in any formal assessment.",
      },
    ],
  },
  {
    id: "nist",
    short: "NIST CSF",
    name: "NIST Cybersecurity Framework 2.0",
    jurisdiction: "United States (voluntary)",
    summary:
      "The NIST CSF 2.0 organises cybersecurity activities across six functions: Govern, Identify, Protect, Detect, Respond, and Recover. CMA's checks map directly onto several of these functions.",
    sections: [
      {
        heading: "Identify (ID)",
        body: "CMA's bucket enumeration and configuration checks support the asset management and risk assessment sub-categories (ID.AM, ID.RA). It surfaces what S3 resources exist and which are misconfigured.",
      },
      {
        heading: "Protect (PR)",
        body: "The public access block, encryption, and ACL checks align with PR.AC (Access Control) and PR.DS (Data Security) sub-categories, verifying that protective controls are in place.",
      },
      {
        heading: "Detect (DE)",
        body: "The server access logging check supports DE.AE (Anomalies and Events) and DE.CM (Continuous Monitoring) by confirming that log streams exist for forensic and detection purposes.",
      },
      {
        heading: "Recover (RC)",
        body: "The versioning check supports RC.RP (Recovery Planning) and PR.IP-4 (Backups) by ensuring that overwrite recovery is possible for critical buckets.",
      },
      {
        heading: "Govern (GV) — new in CSF 2.0",
        body: "CMA supports the Govern function by providing a repeatable, documented audit process. Running CMA periodically gives an organisation evidence of ongoing oversight of its S3 security posture.",
      },
    ],
  },
];
