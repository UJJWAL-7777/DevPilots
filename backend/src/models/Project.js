import mongoose from 'mongoose';

const envVarSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true
    }
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    repositoryUrl: {
      type: String,
      required: [true, 'Please provide a GitHub repository URL'],
      trim: true
    },
    repositoryName: {
      type: String,
      required: [true, 'Please provide a repository name'],
      trim: true
    },
    repositoryOwner: {
      type: String,
      trim: true,
      default: ''
    },
    repositoryId: {
      type: String,
      trim: true,
      default: ''
    },
    branch: {
      type: String,
      default: 'main',
      trim: true
    },
    framework: {
      type: String,
      required: [true, 'Please select a framework'],
      enum: ['React', 'Node.js', 'Express', 'Next.js', 'Other'],
      default: 'React'
    },
    rootDir: {
      type: String,
      trim: true,
      default: ''
    },
    buildCommand: {
      type: String,
      trim: true,
      default: 'npm run build'
    },
    installCommand: {
      type: String,
      trim: true,
      default: 'npm install'
    },
    outputDir: {
      type: String,
      trim: true,
      default: 'dist'
    },
    deploymentUrl: {
      type: String,
      trim: true,
      default: ''
    },
    environmentVariables: [envVarSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BUILDING', 'FAILED', 'SUCCESS'],
      default: 'ACTIVE'
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index to ensure project name or search queries are fast per user
projectSchema.index({ owner: 1, name: 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;
