const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
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
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    format: {
      type: String,
      enum: ['json', 'html', 'pdf'],
      default: 'json',
    },
    storageLocation: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'generated', 'failed'],
      default: 'pending',
      index: true,
    },
    failureReason: {
      type: String,
      default: '',
    },
    summary: {
      totalChecks: { type: Number, default: 0 },
      issues: { type: Number, default: 0 },
      issuesFound: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      informational: { type: Number, default: 0 },
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

reportSchema.index({ workspace: 1, generatedAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
