import express from 'express';
import { getDeploymentById } from '../controllers/deploymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id', protect, getDeploymentById);

export default router;
