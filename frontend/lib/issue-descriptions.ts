export const issueDescriptions: Record<string, string> = {
  "s3-public-access-block-missing":
    "The bucket has no Public Access Block configuration at all. This protection is the safety net that prevents a misconfigured ACL or bucket policy from accidentally exposing the bucket to the entire internet. Without it, a single mistake (a wrong policy paste, or a developer enabling public-read for a quick test) can expose every object inside.",

  "s3-public-access-block-incomplete":
    "A Public Access Block exists but one or more of its four flags (BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, RestrictPublicBuckets) is disabled. Each flag closes a different exposure path; turning any of them off creates a gap where an ACL or policy could still grant public access. The protection is only effective when all four are enabled.",

  "s3-bucket-policy-public":
    "The bucket policy grants access to anonymous (Principal \"*\") or unauthenticated users. This means anyone on the internet can read, and potentially list, objects in the bucket without AWS credentials. Public buckets are a leading cause of real-world data breaches, often exposing logs, backups, or customer data that was never meant to leave the account.",

  "s3-acl-public-grant":
    "The bucket's ACL grants permissions to the AllUsers or AuthenticatedUsers groups. AllUsers means anyone on the public internet; AuthenticatedUsers means any AWS account holder anywhere, not just users in your account. Both are dangerous: the second is frequently mistaken for a private setting but actually exposes data to every AWS customer in the world.",

  "s3-encryption-disabled":
    "The bucket has no default server-side encryption set. Objects can still be encrypted by individual upload requests, but if a client forgets to specify encryption, or a misconfigured tool uploads in plaintext, those objects sit unencrypted at rest. Default encryption guarantees that every object is encrypted regardless of how it was uploaded.",

  "s3-versioning-disabled":
    "Versioning is suspended or has never been enabled on this bucket. Without versioning, an accidental overwrite or a malicious delete is permanent. There is no copy of the previous object to restore from. For any bucket holding non-ephemeral data, this is a silent risk that only becomes visible after data is already lost.",

  "s3-server-access-logging-disabled":
    "Server access logging is not enabled, so there is no per-request audit trail for this bucket. If a security incident occurs (credential leak, unauthorised download, ransomware-style mass delete), there is no record of who accessed what and when. The forensic gap can turn a contained incident into an unanswered question.",

  "iam-root-mfa-disabled":
    "The root user of this AWS account has no MFA device registered. The root user has unrestricted access to every resource and every billing setting in the account, and its credentials cannot be revoked the way an IAM user's can. If the root password leaks and MFA is not enabled, the entire account is compromised. AWS lists root MFA as the single most important IAM control.",

  "iam-password-policy-missing":
    "The account has no IAM password policy configured. Without one, IAM users with console access can set arbitrarily weak passwords, never rotate them, and reuse old ones. A password policy is the baseline mechanism for enforcing credential hygiene across every human user in the account.",

  "iam-password-policy-weak":
    "An IAM password policy exists but falls short of widely accepted thresholds (at least 14 characters, all four character classes, and a 90-day rotation window). Weak password policies are routinely cited in compliance findings (CIS, ISO 27001) because they let credential-stuffing and brute-force attacks succeed against accounts that should have been protected.",

  "iam-user-mfa-disabled":
    "This IAM user has no MFA device registered. If the user's password or access key is ever leaked (in a phishing email, a checked-in commit, a breached third-party service), the attacker can log in or call the API directly. MFA reduces the value of a leaked credential to near-zero by requiring a second factor the attacker does not hold.",

  "iam-access-key-unused":
    "This active IAM access key has either never been used or has not been used for over 90 days. Long-lived credentials that no one is actively using are a recurring source of breaches: they sit forgotten in old config files, dotfiles, and CI variables, and are rarely rotated. AWS recommends rotating access keys every 90 days and disabling or deleting any key with no recent activity.",

  "iam-user-admin-policy-attached":
    "This IAM user has the AWS-managed AdministratorAccess policy attached directly to their identity. Direct admin attachment makes a leaked credential catastrophic: any attacker with the user's keys gets full account control with no escalation needed. Best practice is to grant administrative permissions through an IAM role assumed only when needed, or through a group with auditable membership, so that day-to-day credentials carry the minimum permissions required.",

  "ec2-sg-all-ports-public":
    "This security group contains an inbound rule that allows all protocols and all ports from 0.0.0.0/0 (any IP address on the internet). An all-traffic rule effectively disables the firewall for every instance in the group: any port, any protocol, any service running on those instances is reachable from the public internet. This is the most dangerous security group configuration possible and is typically the result of troubleshooting a connection issue and forgetting to revert the rule.",

  "ec2-sg-port-22-public":
    "This security group allows inbound SSH (TCP port 22) from 0.0.0.0/0, meaning any host on the internet can attempt to connect. SSH is the primary remote administration protocol for Linux instances and is a constant target for automated credential-stuffing and brute-force attacks. Even with key-based auth, exposing port 22 publicly widens the attack surface unnecessarily. The recommended alternative is to restrict the source CIDR to a known IP range, or to remove the rule entirely and use AWS Systems Manager Session Manager for shell access without an open inbound port.",
};

export function getIssueDescription(ruleId: string | undefined): string | null {
  if (!ruleId) return null;
  return issueDescriptions[ruleId] ?? null;
}
