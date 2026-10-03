import express from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  getIntegrationStatus,
  disconnectGitHub,
  getUserRepos,
  getRepoBranches,
  getRepoCommits,
  handleWebhook
} from '../controllers/githubController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GitHub OAuth & Status
router.get('/auth-url', protect, getAuthUrl);
router.post('/callback', protect, handleOAuthCallback);
router.get('/status', protect, getIntegrationStatus);
router.post('/disconnect', protect, disconnectGitHub);

// Repository, Branch & Commit discovery
router.get('/repos', protect, getUserRepos);
router.get('/repos/:owner/:repo/branches', protect, getRepoBranches);
router.get('/repos/:owner/:repo/commits', protect, getRepoCommits);

// Webhook endpoint for GitHub push events
router.post('/webhook', handleWebhook);

export default router;
