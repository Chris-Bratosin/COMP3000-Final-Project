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
};

export function getIssueDescription(ruleId: string | undefined): string | null {
  if (!ruleId) return null;
  return issueDescriptions[ruleId] ?? null;
}
