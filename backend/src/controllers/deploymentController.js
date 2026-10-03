import Deployment from '../models/Deployment.js';
import Project from '../models/Project.js';

// @desc    Trigger a simulated deployment for a project
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

    const commitHash = Math.random().toString(16).substring(2, 9);
    const branch = req.body.branch || project.branch || 'main';

    const deployment = await Deployment.create({
      project: project._id,
      version: versionNumber,
      commitHash,
      branch,
      status: 'QUEUED',
      startedAt: new Date(),
      logs: [
        {
          timestamp: new Date(),
          message: `[Deployment Created] Triggered deployment ${versionNumber} on branch '${branch}'`
        },
        {
          timestamp: new Date(),
          message: `[Queue] Job queued for build processing with commit ${commitHash}`
        }
      ]
    });

    // Update project status to BUILDING
    project.status = 'BUILDING';
    await project.save();

    // Asynchronously simulate the deployment build pipeline
    simulateDeploymentPipeline(deployment._id, project._id);

    res.status(201).json({
      success: true,
      message: 'Deployment triggered successfully',
      data: deployment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to simulate build pipeline with time progression
const simulateDeploymentPipeline = (deploymentId, projectId) => {
  // Step 1: Transition to BUILDING after 2.5 seconds
  setTimeout(async () => {
    try {
      const dep = await Deployment.findById(deploymentId);
      if (!dep) return;

      dep.status = 'BUILDING';
      dep.logs.push({
        timestamp: new Date(),
        message: `[Build] Initializing build environment. Node.js runtime loaded.`
      });
      dep.logs.push({
        timestamp: new Date(),
        message: `[Git] Cloning repository at commit ${dep.commitHash}...`
      });
      dep.logs.push({
        timestamp: new Date(),
        message: `[Build] Resolving dependencies and compiling application...`
      });
      await dep.save();

      // Step 2: Transition to SUCCESS after another 3.5 seconds
      setTimeout(async () => {
        try {
          const finalDep = await Deployment.findById(deploymentId);
          if (!finalDep) return;

          finalDep.status = 'SUCCESS';
          finalDep.completedAt = new Date();
          finalDep.logs.push({
            timestamp: new Date(),
            message: `[Build] Build succeeded in 6.02s without errors.`
          });
          finalDep.logs.push({
            timestamp: new Date(),
            message: `[Deployment] Artifacts bundled and live at internal edge endpoint.`
          });
          await finalDep.save();

          // Mark project status as ACTIVE
          const proj = await Project.findById(projectId);
          if (proj) {
            proj.status = 'ACTIVE';
            await proj.save();
          }
        } catch (err) {
          console.error('[Deployment Simulation Step 2 Error]', err);
        }
      }, 3500);
    } catch (err) {
      console.error('[Deployment Simulation Step 1 Error]', err);
    }
  }, 2500);
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
