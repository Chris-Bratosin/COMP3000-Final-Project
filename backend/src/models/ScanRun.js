const mongoose = require('mongoose');

const policySnapshotSchema = new mongoose.Schema(
  {
    scanLevel: {
      type: String,
      enum: ['quick', 'standard', 'deep'],
      default: 'standard',
    },
    regionScope: {
      type: String,
      enum: ['single-region', 'multi-region', 'all-enabled'],
      default: 'single-region',
    },
    selectedRegions: {
      type: [String],
      default: [],
    },
    enabledChecks: {
      type: [String],
      default: [],
    },
    severityThreshold: {
      type: String,
      enum: ['all', 'medium-and-above', 'high-only'],
      default: 'medium-and-above',
    },
    includeEvidence: {
      type: Boolean,
      default: true,
    },
    includeRemediationAdvice: {
      type: Boolean,
      default: true,
    },
    saveScanLogs: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const scanRunSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    awsConnection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AwsConnection',
      required: true,
      index: true,
    },
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScanPolicy',
      default: null,
    },
    policySnapshot: {
      type: policySnapshotSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'partial-failed'],
      default: 'queued',
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    scannerVersion: {
      type: String,
      default: '0.1.0',
    },
    summary: {
      totalChecks: { type: Number, default: 0 },
      issuesFound: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      informational: { type: Number, default: 0 },
    },
    failureReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

scanRunSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('ScanRun', scanRunSchema);
