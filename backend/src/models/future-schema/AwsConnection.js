const mongoose = require('mongoose');

const awsConnectionSchema = new mongoose.Schema(
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
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    connectionMethod: {
      type: String,
      enum: ['temporary-credentials', 'assume-role', 'env-vars'],
      required: true,
    },
    accountId: {
      type: String,
      trim: true,
      index: true,
    },
    accessKeyLastFour: {
      type: String,
      trim: true,
    },
    assumeRoleArn: {
      type: String,
      trim: true,
    },
    primaryRegion: {
      type: String,
      required: true,
      default: 'us-east-1',
    },
    allowedRegions: {
      type: [String],
      default: ['us-east-1'],
    },
    status: {
      type: String,
      enum: ['pending', 'connected', 'failed', 'expired'],
      default: 'pending',
      index: true,
    },
    lastValidatedAt: {
      type: Date,
      default: null,
    },
    validationMessage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

awsConnectionSchema.index(
  { workspace: 1, accountId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      accountId: { $gt: '' },
    },
  },
);

module.exports = mongoose.model('AwsConnection', awsConnectionSchema);
