const mongoose = require('mongoose');

const scanPolicySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
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
      default: ['us-east-1'],
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
  { timestamps: true },
);

module.exports = mongoose.model('ScanPolicy', scanPolicySchema);
