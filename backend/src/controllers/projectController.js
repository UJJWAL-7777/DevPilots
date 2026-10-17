import Project from '../models/Project.js';
import Deployment from '../models/Deployment.js';

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      repositoryUrl,
      repositoryName,
      repositoryOwner,
      repositoryId,
      branch,
      framework,
      rootDir,
      buildCommand,
      installCommand,
      outputDir,
      environmentVariables
    } = req.body;

    if (!name || !repositoryUrl || !repositoryName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide project name, repository URL, and repository name'
      });
    }

    const project = await Project.create({
      name,
      description: description || '',
      repositoryUrl,
      repositoryName,
      repositoryOwner: repositoryOwner || '',
      repositoryId: repositoryId || '',
      branch: branch || 'main',
      framework: framework || 'React',
      rootDir: rootDir ? rootDir.trim() : '',
      buildCommand: (buildCommand && buildCommand.trim()) || 'npm run build',
      installCommand: (installCommand && installCommand.trim()) || 'npm install',
      outputDir: (outputDir && outputDir.trim()) || 'dist',
      environmentVariables: environmentVariables || [],
      owner: req.user._id,
      status: 'ACTIVE'
    });

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all projects for the logged-in user
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).sort({
      createdAt: -1
    });

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Ensure the project belongs to the user
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
export const updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    const {
      name,
      description,
      repositoryUrl,
      repositoryName,
      branch,
      framework,
      rootDir,
      buildCommand,
      installCommand,
      outputDir,
      status
    } = req.body;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (repositoryUrl) project.repositoryUrl = repositoryUrl;
    if (repositoryName) project.repositoryName = repositoryName;
    if (branch) project.branch = branch;
    if (framework) project.framework = framework;
    if (rootDir !== undefined) project.rootDir = rootDir.trim();
    if (buildCommand !== undefined) project.buildCommand = buildCommand.trim();
    if (installCommand !== undefined) project.installCommand = installCommand.trim();
    if (outputDir !== undefined) project.outputDir = outputDir.trim();
    if (status) project.status = status;

    const updatedProject = await project.save();

    res.json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res) => {
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
        message: 'Not authorized to delete this project'
      });
    }

    // Cascade delete all deployments associated with this project
    await Deployment.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Project and associated deployments removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add or update environment variables for a project
// @route   POST /api/projects/:id/env
// @access  Private
export const addEnvironmentVariable = async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both key and value'
      });
    }

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
        message: 'Not authorized to modify this project'
      });
    }

    const existingIndex = project.environmentVariables.findIndex(
      (env) => env.key === key.trim()
    );

    if (existingIndex > -1) {
      project.environmentVariables[existingIndex].value = value;
    } else {
      project.environmentVariables.push({
        key: key.trim(),
        value
      });
    }

    await project.save();

    res.json({
      success: true,
      data: project.environmentVariables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete environment variable from project
// @route   DELETE /api/projects/:id/env/:envId
// @access  Private
export const deleteEnvironmentVariable = async (req, res) => {
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
        message: 'Not authorized to modify this project'
      });
    }

    project.environmentVariables = project.environmentVariables.filter(
      (env) => env._id.toString() !== req.params.envId
    );

    await project.save();

    res.json({
      success: true,
      message: 'Environment variable deleted successfully',
      data: project.environmentVariables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get dashboard metrics for user
// @route   GET /api/projects/dashboard/stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userProjects = await Project.find({ owner: req.user._id }).sort({
      createdAt: -1
    });
    const projectIds = userProjects.map((p) => p._id);

    const totalDeployments = await Deployment.countDocuments({
      project: { $in: projectIds }
    });
    const successfulDeployments = await Deployment.countDocuments({
      project: { $in: projectIds },
      status: 'SUCCESS'
    });
    const failedDeployments = await Deployment.countDocuments({
      project: { $in: projectIds },
      status: 'FAILED'
    });

    const recentProjects = userProjects.slice(0, 5);

    res.json({
      success: true,
      data: {
        totalProjects: userProjects.length,
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        recentProjects
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
