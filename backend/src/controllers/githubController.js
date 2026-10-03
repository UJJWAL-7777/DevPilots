import User from '../models/User.js';
import Project from '../models/Project.js';
import Deployment from '../models/Deployment.js';
import githubService from '../services/githubService.js';

// @desc    Get GitHub OAuth authorization URL
// @route   GET /api/github/auth-url
// @access  Private
export const getAuthUrl = async (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/settings/integrations';

    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'GitHub OAuth Client ID is not configured on server (.env).'
      });
    }

    const scope = 'repo,read:user';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle OAuth code exchange and link GitHub account
// @route   POST /api/github/callback
// @access  Private
export const handleOAuthCallback = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    // 1. Exchange code for access token
    const accessToken = await githubService.exchangeCodeForToken(code);

    // 2. Fetch GitHub user profile with the token
    const githubUser = await githubService.getAuthenticatedUser(accessToken);

    // 3. Attach token securely to user record (with select: false)
    const user = await User.findById(req.user._id).select('+github.accessToken');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.github = {
      connected: true,
      username: githubUser.username,
      githubUserId: githubUser.githubUserId,
      accessToken,
      avatarUrl: githubUser.avatarUrl,
      connectedAt: new Date()
    };

    await user.save();

    // 4. Return sanitized response (never return accessToken)
    res.json({
      success: true,
      message: 'GitHub account connected successfully',
      data: {
        connected: true,
        username: githubUser.username,
        avatarUrl: githubUser.avatarUrl,
        connectedAt: user.github.connectedAt
      }
    });
  } catch (error) {
    console.error('[GitHub Callback Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to authenticate with GitHub'
    });
  }
};

// @desc    Get current user's GitHub connection status
// @route   GET /api/github/status
// @access  Private
export const getIntegrationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        connected: user.github?.connected || false,
        username: user.github?.username || null,
        avatarUrl: user.github?.avatarUrl || null,
        connectedAt: user.github?.connectedAt || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Disconnect GitHub account
// @route   POST /api/github/disconnect
// @access  Private
export const disconnectGitHub = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+github.accessToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.github = {
      connected: false,
      username: null,
      githubUserId: null,
      accessToken: null,
      avatarUrl: null,
      connectedAt: null
    };

    await user.save();

    res.json({
      success: true,
      message: 'GitHub account disconnected successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get list of repositories for connected GitHub account
// @route   GET /api/github/repos
// @access  Private
export const getUserRepos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+github.accessToken');

    if (!user?.github?.connected || !user.github.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub account is not connected. Please connect your GitHub account first.'
      });
    }

    const repos = await githubService.getUserRepositories(user.github.accessToken);

    res.json({
      success: true,
      count: repos.length,
      data: repos
    });
  } catch (error) {
    console.error('[GitHub Repos Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch GitHub repositories'
    });
  }
};

// @desc    Get branches for a repository
// @route   GET /api/github/repos/:owner/:repo/branches
// @access  Private
export const getRepoBranches = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const user = await User.findById(req.user._id).select('+github.accessToken');

    if (!user?.github?.connected || !user.github.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub account is not connected.'
      });
    }

    const branches = await githubService.getRepositoryBranches(user.github.accessToken, owner, repo);

    res.json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    console.error('[GitHub Branches Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || `Failed to fetch branches for ${req.params.owner}/${req.params.repo}`
    });
  }
};

// @desc    Get recent commits for a repository and branch
// @route   GET /api/github/repos/:owner/:repo/commits
// @access  Private
export const getRepoCommits = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branch = req.query.branch || 'main';
    const limit = parseInt(req.query.limit, 10) || 10;

    const user = await User.findById(req.user._id).select('+github.accessToken');

    if (!user?.github?.connected || !user.github.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'GitHub account is not connected.'
      });
    }

    const commits = await githubService.getBranchCommits(
      user.github.accessToken,
      owner,
      repo,
      branch,
      limit
    );

    res.json({
      success: true,
      count: commits.length,
      data: commits
    });
  } catch (error) {
    console.error('[GitHub Commits Error]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || `Failed to fetch commits for ${req.params.owner}/${req.params.repo}`
    });
  }
};

// @desc    Receive and process GitHub push webhooks
// @route   POST /api/github/webhook
// @access  Public (Signature Verified)
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    // 1. Verify GitHub event type
    if (event === 'ping') {
      return res.status(200).json({ success: true, message: 'Pong! Webhook active.' });
    }

    if (event !== 'push') {
      return res.status(200).json({
        success: true,
        message: `Ignored event '${event}'. DevPilot listens for 'push' events.`
      });
    }

    // 2. Verify signature if webhook secret is configured
    if (webhookSecret) {
      const isValid = githubService.verifyWebhookSignature(req.rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn('[Webhook Warning] Invalid signature rejected.');
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }
    }

    const payload = req.body;
    if (!payload.repository) {
      return res.status(400).json({ success: false, message: 'Invalid payload: missing repository' });
    }

    // 3. Extract repository and branch information
    const repoFullName = payload.repository.full_name; // e.g. "UJJWAL-7777/TestingRepo"
    const repoName = payload.repository.name;           // e.g. "TestingRepo"
    const ref = payload.ref || '';                     // e.g. "refs/heads/main"
    const branch = ref.replace('refs/heads/', '');
    const headCommit = payload.head_commit;

    if (!headCommit) {
      return res.status(200).json({
        success: true,
        message: 'No new commits detected in push payload'
      });
    }

    const commitHash = headCommit.id;
    const commitMessage = headCommit.message || 'Commit via Git Push';

    // 4. Find matching DevPilot project
    const project = await Project.findOne({
      $or: [
        { repositoryUrl: { $regex: new RegExp(repoFullName, 'i') } },
        { repositoryName: { $regex: new RegExp(`^${repoName}$`, 'i') } }
      ],
      branch: branch
    });

    if (!project) {
      return res.status(200).json({
        success: true,
        message: `No active project configured for repository '${repoFullName}' on branch '${branch}'.`
      });
    }

    // 5. Duplicate Webhook Protection: Check if commit already triggered a deployment
    const existingDeployment = await Deployment.findOne({
      project: project._id,
      commitHash: commitHash
    });

    if (existingDeployment) {
      return res.status(200).json({
        success: true,
        message: `Deployment already exists for commit ${commitHash.substring(0, 7)} (Duplicate ignored).`
      });
    }

    // 6. Create Deployment record with REAL commit details
    const totalPrevious = await Deployment.countDocuments({ project: project._id });
    const versionNumber = `v${totalPrevious + 1}`;

    const deployment = await Deployment.create({
      project: project._id,
      version: versionNumber,
      commitHash,
      commitMessage,
      branch,
      trigger: 'WEBHOOK',
      status: 'QUEUED',
      startedAt: new Date(),
      logs: [
        {
          timestamp: new Date(),
          message: `[GitHub Webhook] Push event received from ${payload.pusher?.name || 'GitHub user'}`
        },
        {
          timestamp: new Date(),
          message: `[Git Commit] ${commitHash.substring(0, 7)} - ${commitMessage}`
        },
        {
          timestamp: new Date(),
          message: `[Queue] Job queued automatically for branch '${branch}'`
        }
      ]
    });

    project.status = 'BUILDING';
    await project.save();

    // Trigger build simulation lifecycle
    simulateDeploymentPipeline(deployment._id, project._id);

    res.status(201).json({
      success: true,
      message: `Automatic deployment ${versionNumber} queued from GitHub push`,
      data: deployment
    });
  } catch (error) {
    console.error('[GitHub Webhook Error]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to simulate build pipeline with time progression
const simulateDeploymentPipeline = (deploymentId, projectId) => {
  setTimeout(async () => {
    try {
      const dep = await Deployment.findById(deploymentId);
      if (!dep) return;

      dep.status = 'BUILDING';
      dep.logs.push({
        timestamp: new Date(),
        message: `[Build] Environment initialized for repository source code.`
      });
      dep.logs.push({
        timestamp: new Date(),
        message: `[Git] Checking out commit ${dep.commitHash.substring(0, 7)}...`
      });
      dep.logs.push({
        timestamp: new Date(),
        message: `[Build] Compiling bundle from commit: "${dep.commitMessage}"`
      });
      await dep.save();

      setTimeout(async () => {
        try {
          const finalDep = await Deployment.findById(deploymentId);
          if (!finalDep) return;

          finalDep.status = 'SUCCESS';
          finalDep.completedAt = new Date();
          finalDep.logs.push({
            timestamp: new Date(),
            message: `[Build] Build completed in 5.82s without errors.`
          });
          finalDep.logs.push({
            timestamp: new Date(),
            message: `[Edge] Application live and updated.`
          });
          await finalDep.save();

          const proj = await Project.findById(projectId);
          if (proj) {
            proj.status = 'ACTIVE';
            await proj.save();
          }
        } catch (err) {
          console.error('[Sim Step 2 Error]', err);
        }
      }, 3500);
    } catch (err) {
      console.error('[Sim Step 1 Error]', err);
    }
  }, 2500);
};
