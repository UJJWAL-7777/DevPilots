import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Middlewares
app.use(cors());

// Capture rawBody buffer for GitHub Webhook HMAC SHA-256 verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true }));

// Health / root endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DevPilot API',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/github', githubRoutes);

// Error Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;
