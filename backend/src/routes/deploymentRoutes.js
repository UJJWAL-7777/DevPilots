import express from 'express';
import { getDeploymentById, cancelDeployment } from '../controllers/deploymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id', protect, getDeploymentById);
router.post('/:id/cancel', protect, cancelDeployment);

export default router;
