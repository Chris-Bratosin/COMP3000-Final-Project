const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    scanRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScanRun',
      required: true,
      index: true,
    },
    awsConnection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AwsConnection',
      required: true,
    },
    ruleId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'informational'],
      required: true,
      index: true,
    },
    service: {
      type: String,
      required: true,
      index: true,
    },
    region: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      required: true,
      trim: true,
    },
    fingerprint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved', 'false-positive'],
      default: 'open',
      index: true,
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    remediation: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

findingSchema.index({ workspace: 1, scanRun: 1, severity: 1 });
findingSchema.index({ workspace: 1, service: 1, resourceId: 1 });
findingSchema.index({ scanRun: 1, fingerprint: 1 }, { unique: true });

module.exports = mongoose.model('Finding', findingSchema);
