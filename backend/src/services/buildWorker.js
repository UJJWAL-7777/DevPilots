import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import Deployment from '../models/Deployment.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directories for workspaces and published static sites
const WORKSPACE_BASE = path.resolve(__dirname, '../../build-workspace');
const PUBLISHED_SITES_BASE = path.resolve(__dirname, '../../published-sites');

// Default build timeout: 10 minutes (600,000 ms)
const BUILD_TIMEOUT_MS = parseInt(process.env.BUILD_TIMEOUT_MS, 10) || 600000;

/**
 * Cleanly kill a child process and its child processes cross-platform
 */
export const killProcessTree = (child) => {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  } catch (err) {
    console.warn(`[killProcessTree Warning] PID ${child?.pid}:`, err.message);
  }
};

/**
 * Scrub sensitive credentials from logs
 */
export const scrubLogs = (text, sensitiveList = []) => {
  if (!text || typeof text !== 'string') return '';
  let clean = text;

  // Mask GitHub tokens in URLs
  clean = clean.replace(/https:\/\/[^@\s]+@github\.com/gi, 'https://[REDACTED_TOKEN]@github.com');
  clean = clean.replace(/x-access-token:[^@\s]+@/gi, 'x-access-token:[REDACTED]@');
  clean = clean.replace(/ghp_[a-zA-Z0-9]{36,}/g, '[REDACTED_GH_TOKEN]');
  clean = clean.replace(/gho_[a-zA-Z0-9]{36,}/g, '[REDACTED_GH_TOKEN]');

  // Mask any specific sensitive strings passed in
  for (const item of sensitiveList) {
    if (item && typeof item === 'string' && item.length > 3) {
      const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      clean = clean.replace(new RegExp(escaped, 'g'), '[REDACTED_SECRET]');
    }
  }

  return clean;
};

/**
 * Validate that targetPath does not escape baseDir (Path Traversal Protection)
 */
export const validatePathSafety = (baseDir, targetPath, label = 'Path') => {
  const resolved = path.resolve(baseDir, targetPath || '');
  const relative = path.relative(baseDir, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Security Violation: ${label} '${targetPath}' attempts to navigate outside the build workspace.`);
  }

  return resolved;
};

class BuildWorker {
  constructor() {
    // Ensure base directories exist
    if (!fs.existsSync(WORKSPACE_BASE)) {
      fs.mkdirSync(WORKSPACE_BASE, { recursive: true });
    }
    if (!fs.existsSync(PUBLISHED_SITES_BASE)) {
      fs.mkdirSync(PUBLISHED_SITES_BASE, { recursive: true });
    }
  }

  /**
   * Append a log entry to the deployment document in MongoDB
   */
  async appendLog(deploymentId, message, sensitiveList = []) {
    const cleanMsg = scrubLogs(message, sensitiveList);
    try {
      await Deployment.findByIdAndUpdate(deploymentId, {
        $push: {
          logs: {
            timestamp: new Date(),
            message: cleanMsg
          }
        }
      });
    } catch (err) {
      console.error(`[AppendLog Error] Dep ${deploymentId}:`, err.message);
    }
  }

  /**
   * Run a child command safely with streaming logs and timeout
   */
  async runCommand(commandStr, cwd, env, deploymentId, sensitiveList, activeProcessesMap) {
    return new Promise((resolve, reject) => {
      let isSettled = false;

      // Split command string into executable and arguments or use platform shell
      const isWindows = process.platform === 'win32';
      const shellCmd = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['/d', '/s', '/c', commandStr] : ['-c', commandStr];

      const child = spawn(shellCmd, shellArgs, {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsVerbatimArguments: isWindows
      });

      if (activeProcessesMap) {
        activeProcessesMap.set(deploymentId, child);
      }

      // Timeout safety mechanism
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          killProcessTree(child);
          this.appendLog(
            deploymentId,
            `[Error] Command timed out after ${BUILD_TIMEOUT_MS / 1000} seconds: "${commandStr}"`,
            sensitiveList
          );
          reject(new Error(`Command timed out after ${BUILD_TIMEOUT_MS / 1000} seconds`));
        }
      }, BUILD_TIMEOUT_MS);

      // Handle standard output stream
      child.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
          this.appendLog(deploymentId, line, sensitiveList);
        }
      });

      // Handle standard error stream
      child.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
          this.appendLog(deploymentId, line, sensitiveList);
        }
      });

      child.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      child.on('close', (code, signal) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          if (activeProcessesMap) {
            activeProcessesMap.delete(deploymentId);
          }

          if (signal === 'SIGKILL' || signal === 'SIGTERM') {
            return reject(new Error(`Command terminated by signal ${signal}`));
          }

          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Command failed with exit code ${code}: "${commandStr}"`));
          }
        }
      });
    });
  }

  /**
   * Execute the full deployment build pipeline for a deployment
   */
  async executeBuild(deploymentId, activeProcessesMap, isCancelledFn) {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const project = await Project.findById(deployment.project);
    if (!project) {
      throw new Error(`Project ${deployment.project} not found`);
    }

    const workspaceDir = path.join(WORKSPACE_BASE, String(deployment._id));
    const startTime = Date.now();
    const sensitiveTokens = [];

    // Fetch user GitHub access token if available for authenticated git clone
    let githubAccessToken = null;
    try {
      const user = await User.findById(project.owner).select('+github.accessToken');
      if (user?.github?.connected && user.github.accessToken) {
        githubAccessToken = user.github.accessToken;
        sensitiveTokens.push(githubAccessToken);
      }
    } catch (err) {
      console.warn('[BuildWorker User Token Warning]:', err.message);
    }

    // Add project environment variable values to sensitive list for log scrubbing
    if (project.environmentVariables && project.environmentVariables.length > 0) {
      for (const envVar of project.environmentVariables) {
        if (envVar.value && envVar.value.length > 3) {
          sensitiveTokens.push(envVar.value);
        }
      }
    }

    try {
      if (isCancelledFn && isCancelledFn(deploymentId)) {
        throw new Error('Deployment cancelled before preparation');
      }

      // ==========================================
      // PHASE 1: PREPARING WORKSPACE & FETCHING REPO
      // ==========================================
      deployment.status = 'PREPARING';
      await deployment.save();
      await this.appendLog(
        deploymentId,
        `[DevPilot Build Pipeline] Initializing deployment ${deployment.version} for '${project.name}'`,
        sensitiveTokens
      );

      // Clean/create workspace folder
      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
      fs.mkdirSync(workspaceDir, { recursive: true });

      // Determine clone URL with secure auth token if available
      let cloneUrl = project.repositoryUrl;
      const match = project.repositoryUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match && githubAccessToken) {
        const owner = match[1];
        const repo = match[2].replace(/\.git$/, '');
        cloneUrl = `https://x-access-token:${githubAccessToken}@github.com/${owner}/${repo}.git`;
      }

      const targetBranch = deployment.branch || project.branch || 'main';
      await this.appendLog(
        deploymentId,
        `[Git] Fetching repository '${project.repositoryName}' on branch '${targetBranch}'...`,
        sensitiveTokens
      );

      // Prepare isolated child process environment
      // Never pass server secrets (MONGO_URI, JWT_SECRET, GITHUB_CLIENT_SECRET)
      const isolatedEnv = {
        PATH: process.env.PATH || '',
        PATHEXT: process.env.PATHEXT || '',
        SYSTEMROOT: process.env.SYSTEMROOT || '',
        TEMP: process.env.TEMP || '',
        TMP: process.env.TMP || '',
        USERPROFILE: process.env.USERPROFILE || '',
        APPDATA: process.env.APPDATA || '',
        LOCALAPPDATA: process.env.LOCALAPPDATA || '',
        HOME: process.env.HOME || '',
        NODE_ENV: 'production',
        CI: 'true'
      };

      // Inject project custom environment variables
      if (project.environmentVariables && project.environmentVariables.length > 0) {
        for (const ev of project.environmentVariables) {
          isolatedEnv[ev.key] = ev.value;
        }
      }

      // Clone repository shallowly
      await this.runCommand(
        `git clone --depth 50 --branch ${targetBranch} "${cloneUrl}" .`,
        workspaceDir,
        isolatedEnv,
        deploymentId,
        sensitiveTokens,
        activeProcessesMap
      );

      // If specific commit SHA is requested, checkout exact commit
      if (deployment.commitHash && deployment.commitHash.length >= 7 && deployment.commitHash !== 'latest') {
        try {
          await this.runCommand(
            `git checkout ${deployment.commitHash}`,
            workspaceDir,
            isolatedEnv,
            deploymentId,
            sensitiveTokens,
            activeProcessesMap
          );
          await this.appendLog(
            deploymentId,
            `[Git] Checked out commit ${deployment.commitHash.substring(0, 7)}: "${deployment.commitMessage || ''}"`,
            sensitiveTokens
          );
        } catch (checkoutErr) {
          await this.appendLog(
            deploymentId,
            `[Git Notice] Staying on branch HEAD for commit ${deployment.commitHash.substring(0, 7)}: ${checkoutErr.message}`,
            sensitiveTokens
          );
        }
      }

      if (isCancelledFn && isCancelledFn(deploymentId)) {
        throw new Error('Deployment cancelled during checkout');
      }

      // ==========================================
      // PHASE 2: BUILDING APPLICATION
      // ==========================================
      deployment.status = 'BUILDING';
      await deployment.save();

      // Resolve root directory and guard against path traversal
      const projectRootDir = project.rootDir ? project.rootDir.trim() : '';
      const effectiveWorkDir = validatePathSafety(workspaceDir, projectRootDir, 'Root directory');

      if (!fs.existsSync(effectiveWorkDir)) {
        throw new Error(`Configured root directory '${projectRootDir}' does not exist in the repository.`);
      }

      const packageJsonPath = path.join(effectiveWorkDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(
          `package.json not found in root directory '${projectRootDir || './'}'. Please configure the correct Root Directory in project settings.`
        );
      }

      // Inspect package.json for available scripts and package manager
      let packageJson = {};
      try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      } catch (parseErr) {
        throw new Error(`Invalid package.json file: ${parseErr.message}`);
      }

      await this.appendLog(
        deploymentId,
        `[Environment] Detected Node.js application: '${packageJson.name || project.name}' (v${packageJson.version || '1.0.0'})`,
        sensitiveTokens
      );

      // Lockfile-aware dependency installation
      let defaultInstallCmd = 'npm install';
      if (fs.existsSync(path.join(effectiveWorkDir, 'package-lock.json'))) {
        defaultInstallCmd = 'npm ci';
      } else if (fs.existsSync(path.join(effectiveWorkDir, 'yarn.lock'))) {
        defaultInstallCmd = 'yarn install --frozen-lockfile';
      } else if (fs.existsSync(path.join(effectiveWorkDir, 'pnpm-lock.yaml'))) {
        defaultInstallCmd = 'pnpm install --frozen-lockfile';
      }

      const installCommand = (project.installCommand && project.installCommand.trim()) || defaultInstallCmd;
      await this.appendLog(
        deploymentId,
        `[Install] Installing dependencies with: "${installCommand}"...`,
        sensitiveTokens
      );

      await this.runCommand(
        installCommand,
        effectiveWorkDir,
        isolatedEnv,
        deploymentId,
        sensitiveTokens,
        activeProcessesMap
      );

      if (isCancelledFn && isCancelledFn(deploymentId)) {
        throw new Error('Deployment cancelled after dependency installation');
      }

      // Check build command and verify build script
      const buildCommand = (project.buildCommand && project.buildCommand.trim()) || 'npm run build';

      if (buildCommand.includes('npm run build') && (!packageJson.scripts || !packageJson.scripts.build)) {
        throw new Error(
          `Missing script: "build" in package.json. Please add a "build" script to package.json or update the Build Command in Project Settings.`
        );
      }

      await this.appendLog(
        deploymentId,
        `[Build] Executing build command: "${buildCommand}"...`,
        sensitiveTokens
      );

      await this.runCommand(
        buildCommand,
        effectiveWorkDir,
        isolatedEnv,
        deploymentId,
        sensitiveTokens,
        activeProcessesMap
      );

      if (isCancelledFn && isCancelledFn(deploymentId)) {
        throw new Error('Deployment cancelled during build execution');
      }

      // ==========================================
      // PHASE 3: PUBLISHING APPLICATION
      // ==========================================
      deployment.status = 'PUBLISHING';
      await deployment.save();

      const configuredOutputDir = (project.outputDir && project.outputDir.trim()) || 'dist';
      const effectiveOutputDir = validatePathSafety(effectiveWorkDir, configuredOutputDir, 'Output directory');

      if (!fs.existsSync(effectiveOutputDir)) {
        throw new Error(
          `Build succeeded, but expected output directory '${configuredOutputDir}' does not exist. Verify your build command and output directory settings.`
        );
      }

      const outputFiles = fs.readdirSync(effectiveOutputDir);
      if (outputFiles.length === 0) {
        throw new Error(`Output directory '${configuredOutputDir}' is empty. No deployable artifacts generated.`);
      }

      await this.appendLog(
        deploymentId,
        `[Publish] Verified output directory '${configuredOutputDir}' (${outputFiles.length} files/folders generated).`,
        sensitiveTokens
      );

      // Copy static build artifacts to dedicated published-sites directory
      const sitePublishDir = path.join(PUBLISHED_SITES_BASE, String(project._id));
      if (fs.existsSync(sitePublishDir)) {
        fs.rmSync(sitePublishDir, { recursive: true, force: true });
      }
      fs.mkdirSync(sitePublishDir, { recursive: true });

      // Recursively copy build output into published site folder
      fs.cpSync(effectiveOutputDir, sitePublishDir, { recursive: true });

      // Verify publishing operation succeeded
      const publishedFiles = fs.readdirSync(sitePublishDir);
      if (publishedFiles.length === 0) {
        throw new Error('Publishing failed: Site directory could not be populated with build artifacts.');
      }

      // Generate the verified live deployment URL
      const port = process.env.PORT || 5000;
      const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
      const deploymentUrl = `${baseUrl}/sites/${project._id}/`;

      const durationMs = Date.now() - startTime;
      const durationSeconds = (durationMs / 1000).toFixed(2);

      await this.appendLog(
        deploymentId,
        `[Publish] Application artifacts successfully published to internal edge server.`,
        sensitiveTokens
      );
      await this.appendLog(
        deploymentId,
        `[Live URL] Deployment accessible at: ${deploymentUrl}`,
        sensitiveTokens
      );
      await this.appendLog(
        deploymentId,
        `[Success] Deployment completed in ${durationSeconds}s.`,
        sensitiveTokens
      );

      // ==========================================
      // PHASE 4: SUCCESS COMPLETION
      // ==========================================
      deployment.status = 'SUCCESS';
      deployment.completedAt = new Date();
      deployment.durationMs = durationMs;
      deployment.outputDir = configuredOutputDir;
      deployment.deploymentUrl = deploymentUrl;
      deployment.error = null;
      await deployment.save();

      project.status = 'ACTIVE';
      project.deploymentUrl = deploymentUrl;
      await project.save();

      return deployment;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const isCancelled = isCancelledFn && isCancelledFn(deploymentId);
      const finalStatus = isCancelled ? 'CANCELLED' : 'FAILED';
      const errorMessage = err.message || 'Unknown build error occurred';

      await this.appendLog(
        deploymentId,
        `[${finalStatus}] ${errorMessage}`,
        sensitiveTokens
      );

      deployment.status = finalStatus;
      deployment.completedAt = new Date();
      deployment.durationMs = durationMs;
      deployment.error = errorMessage;
      await deployment.save();

      project.status = finalStatus === 'CANCELLED' ? 'ACTIVE' : 'FAILED';
      await project.save();

      throw err;
    } finally {
      // Clean up isolated build workspace
      try {
        if (fs.existsSync(workspaceDir)) {
          fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.warn(`[Workspace Cleanup Warning] ${workspaceDir}:`, cleanupErr.message);
      }
    }
  }
}

export default new BuildWorker();
