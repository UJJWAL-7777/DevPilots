import mongoose from 'mongoose';

const deploymentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    version: {
      type: String,
      required: true
    },
    commitHash: {
      type: String,
      default: () => Math.random().toString(16).substring(2, 9)
    },
    branch: {
      type: String,
      required: true,
      default: 'main'
    },
    status: {
      type: String,
      enum: ['QUEUED', 'BUILDING', 'SUCCESS', 'FAILED'],
      default: 'QUEUED'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    logs: [
      {
        timestamp: { type: Date, default: Date.now },
        message: { type: String, required: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

deploymentSchema.index({ project: 1, createdAt: -1 });

const Deployment = mongoose.model('Deployment', deploymentSchema);

export default Deployment;
