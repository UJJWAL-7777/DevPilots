import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLISHED_SITES_DIR = path.resolve(__dirname, '../published-sites');

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

// Serve published static sites at /sites/:projectId
app.use('/sites/:projectId', (req, res, next) => {
  const { projectId } = req.params;
  // Guard against path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return res.status(400).send('Invalid project identifier');
  }

  const sitePath = path.join(PUBLISHED_SITES_DIR, projectId);
  if (!fs.existsSync(sitePath)) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Site Not Found - DevPilot</title></head>
        <body style="font-family: sans-serif; background: #0b0f19; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; border: 1px solid #1e293b; background: #0f172a; padding: 2.5rem; border-radius: 1rem; max-width: 480px;">
            <h2 style="color: #f8fafc; margin-top: 0;">Site Not Yet Published</h2>
            <p>No active deployment artifacts found for project ID: <code style="color: #38bdf8;">${projectId}</code>.</p>
            <p style="font-size: 0.875rem; color: #64748b;">Trigger a build in your DevPilot Dashboard to compile and publish your application.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Serve static assets from sitePath
  express.static(sitePath, {
    index: 'index.html',
    extensions: ['html', 'htm']
  })(req, res, () => {
    // SPA fallback: if file not found, serve index.html if it exists
    const indexPath = path.join(sitePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
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
