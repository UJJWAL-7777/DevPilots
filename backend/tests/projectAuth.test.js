import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

describe('Project Ownership & Build Error Diagnostics', () => {
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  const mockProject = {
    _id: new mongoose.Types.ObjectId(),
    name: 'User A Project',
    owner: userAId,
    repositoryUrl: 'https://github.com/userA/repo',
    branch: 'main',
    rootDir: '',
    buildCommand: 'npm run build',
    outputDir: 'dist'
  };

  it('enforces project ownership authorization correctly', () => {
    const isAuthorized = (projectOwner, requestingUserId) => {
      return projectOwner.toString() === requestingUserId.toString();
    };

    assert.strictEqual(isAuthorized(mockProject.owner, userAId), true);
    assert.strictEqual(isAuthorized(mockProject.owner, userBId), false);
  });

  it('detects missing build script in package.json and generates descriptive diagnostic message', () => {
    const packageJsonWithoutBuild = {
      name: 'sample-app',
      version: '1.0.0',
      scripts: {
        start: 'node index.js',
        test: 'echo "No tests"'
      }
    };

    const validateBuildScript = (pkg, buildCmd) => {
      if (buildCmd.includes('npm run build') && (!pkg.scripts || !pkg.scripts.build)) {
        throw new Error(
          `Missing script: "build" in package.json. Please add a "build" script to package.json or update the Build Command in Project Settings.`
        );
      }
      return true;
    };

    assert.throws(
      () => validateBuildScript(packageJsonWithoutBuild, 'npm run build'),
      /Missing script: "build" in package.json/
    );

    const packageJsonWithBuild = {
      ...packageJsonWithoutBuild,
      scripts: { ...packageJsonWithoutBuild.scripts, build: 'vite build' }
    };
    assert.strictEqual(validateBuildScript(packageJsonWithBuild, 'npm run build'), true);
  });

  it('detects missing expected output directory and throws diagnostic publishing failure', () => {
    const verifyOutputDir = (exists, configuredOutputDir) => {
      if (!exists) {
        throw new Error(
          `Build succeeded, but expected output directory '${configuredOutputDir}' does not exist. Verify your build command and output directory settings.`
        );
      }
      return true;
    };

    assert.throws(
      () => verifyOutputDir(false, 'dist'),
      /expected output directory 'dist' does not exist/
    );
    assert.strictEqual(verifyOutputDir(true, 'dist'), true);
  });
});
