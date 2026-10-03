import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addEnvironmentVariable,
  deleteEnvironmentVariable,
  getDashboardStats
} from '../controllers/projectController.js';
import {
  triggerDeployment,
  getDeploymentsByProject
} from '../controllers/deploymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Dashboard metrics
router.get('/dashboard/stats', protect, getDashboardStats);

// Projects CRUD
router
  .route('/')
  .post(protect, createProject)
  .get(protect, getProjects);

router
  .route('/:id')
  .get(protect, getProjectById)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

// Environment variables
router.post('/:id/env', protect, addEnvironmentVariable);
router.delete('/:id/env/:envId', protect, deleteEnvironmentVariable);

// Deployments under project
router
  .route('/:id/deployments')
  .post(protect, triggerDeployment)
  .get(protect, getDeploymentsByProject);

export default router;
