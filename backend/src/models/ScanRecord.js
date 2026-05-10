const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    ruleId: { type: String, required: true },
    title: { type: String, required: true },
    severity: { type: String, required: true },
    service: { type: String, required: true },
    region: { type: String, default: '' },
    resourceId: { type: String, required: true },
    evidence: { type: mongoose.Schema.Types.Mixed, default: null },
    remediation: { type: String, default: '' },
  },
  { _id: false },
);

const bucketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    region: { type: String, default: '' },
    status: { type: String, default: '' },
    deniedChecks: { type: [String], default: [] },
    erroredChecks: {
      type: [
        {
          ruleId: String,
          errorName: String,
          errorMessage: String,
          _id: false,
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const scanRecordSchema = new mongoose.Schema(
  {
    scanner: { type: String, enum: ['S3', 'IAM', 'EC2', 'Secrets'], default: null, index: true },
    // Set by the frontend on every Run Scan click and forwarded to each parallel
    // scan endpoint. All ScanRecords sharing a runId came from the same click.
    // Replaces the previous client-side time-window heuristic that grouped scans
    // started within ~30s of each other.
    runId: { type: String, default: null, index: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    durationMs: { type: Number, default: 0 },
    region: { type: String, required: true },
    bucketSource: { type: String, default: 'list-all' },
    listAttempted: { type: Boolean, default: false },
    listError: {
      type: { name: String, message: String, _id: false },
      default: null,
    },
    summary: {
      totalChecks: { type: Number, default: 0 },
      checksDenied: { type: Number, default: 0 },
      checksErrored: { type: Number, default: 0 },
      checksSucceeded: { type: Number, default: 0 },
      bucketsScanned: { type: Number, default: 0 },
      bucketsSkippedOutOfScope: { type: Number, default: 0 },
      regionsScanned: { type: Number, default: 0 },
      secretsScanned: { type: Number, default: 0 },
      issuesFound: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
    buckets: { type: [bucketSchema], default: [] },
    bucketErrors: {
      type: [{ bucket: String, message: String, _id: false }],
      default: [],
    },
    findings: { type: [findingSchema], default: [] },
  },
  { timestamps: true },
);

scanRecordSchema.index({ completedAt: -1 });

module.exports = mongoose.model('ScanRecord', scanRecordSchema);
