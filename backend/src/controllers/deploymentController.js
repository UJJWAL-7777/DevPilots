import Deployment from '../models/Deployment.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import githubService from '../services/githubService.js';
import buildQueue from '../services/buildQueue.js';

// @desc    Trigger a real deployment for a project
// @route   POST /api/projects/:id/deployments
// @access  Private
export const triggerDeployment = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to deploy this project'
      });
    }

    // Determine version number (v1, v2, v3, etc.)
    const totalPrevious = await Deployment.countDocuments({ project: project._id });
    const versionNumber = `v${totalPrevious + 1}`;

    const branch = req.body.branch || project.branch || 'main';
    let commitHash = 'latest';
    let commitMessage = 'Manual deployment trigger';

    // Attempt to fetch REAL commit details from GitHub if connected
    try {
      const user = await User.findById(req.user._id).select('+github.accessToken');
      if (user?.github?.connected && user.github.accessToken) {
        const match = project.repositoryUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          const owner = match[1];
          const repo = match[2].replace(/\.git$/, '');
          const latestCommit = await githubService.getLatestCommit(
            user.github.accessToken,
            owner,
            repo,
            branch
          );
          if (latestCommit) {
            commitHash = latestCommit.sha;
            commitMessage = latestCommit.message;
          }
        }
      }
    } catch (ghErr) {
      console.warn('[Deployment GitHub Info Warning] Could not fetch real commit, using fallback:', ghErr.message);
    }

    const deployment = await Deployment.create({
      project: project._id,
      version: versionNumber,
      commitHash,
      commitMessage,
      branch,
      trigger: 'MANUAL',
      status: 'QUEUED',
      startedAt: new Date(),
      logs: [
        {
          timestamp: new Date(),
          message: `[Deployment Created] Triggered deployment ${versionNumber} on branch '${branch}'`
        },
        {
          timestamp: new Date(),
          message: `[Git Commit] ${commitHash.substring(0, 7)} - ${commitMessage}`
        },
        {
          timestamp: new Date(),
          message: `[Queue] Job queued for build processing with commit ${commitHash.substring(0, 7)}`
        }
      ]
    });

    // Update project status to BUILDING
    project.status = 'BUILDING';
    await project.save();

    // Enqueue into real build runner queue
    await buildQueue.enqueueJob(deployment._id);

    res.status(201).json({
      success: true,
      message: 'Deployment queued successfully',
      data: deployment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel an active or queued deployment
// @route   POST /api/deployments/:id/cancel
// @access  Private
export const cancelDeployment = async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id).populate('project');

    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: 'Deployment not found'
      });
    }

    // Verify ownership
    if (deployment.project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this deployment'
      });
    }

    // Check if can be cancelled
    const activeStatuses = ['QUEUED', 'PREPARING', 'BUILDING', 'PUBLISHING'];
    if (!activeStatuses.includes(deployment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel deployment with current status: ${deployment.status}`
      });
    }

    await buildQueue.cancelJob(deployment._id);

    // Fetch updated deployment
    const updated = await Deployment.findById(deployment._id);

    res.json({
      success: true,
      message: 'Deployment cancellation initiated',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all deployments for a project
// @route   GET /api/projects/:id/deployments
// @access  Private
export const getDeploymentsByProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access deployments for this project'
      });
    }

    const deployments = await Deployment.find({ project: project._id }).sort({
      createdAt: -1
    });

    res.json({
      success: true,
      count: deployments.length,
      data: deployments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single deployment by ID
// @route   GET /api/deployments/:id
// @access  Private
export const getDeploymentById = async (req, res) => {
  try {
    const deployment = await Deployment.findById(req.params.id).populate('project');

    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: 'Deployment not found'
      });
    }

    // Verify ownership of the deployment's project
    if (deployment.project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this deployment'
      });
    }

    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
