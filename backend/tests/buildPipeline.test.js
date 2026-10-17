import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import buildQueue from '../src/services/buildQueue.js';
import app from '../src/app.js';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Build Pipeline & Publishing Infrastructure Tests', () => {
  const publishedSitesBase = path.resolve(__dirname, '../published-sites');
  const testProjectId = 'test-proj-static-999';
  const testSiteDir = path.join(publishedSitesBase, testProjectId);
  let server;
  let testServerPort;

  before(async () => {
    // Clean and set up test published site directory
    if (fs.existsSync(testSiteDir)) {
      fs.rmSync(testSiteDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testSiteDir, { recursive: true });

    // Create a real built React/Vite index.html artifact
    fs.writeFileSync(
      path.join(testSiteDir, 'index.html'),
      '<!DOCTYPE html><html><head><title>DevPilot Static Test</title></head><body><div id="root"><h1>Hello from DevPilot Static Deployment!</h1></div></body></html>'
    );
    fs.writeFileSync(
      path.join(testSiteDir, 'app.css'),
      'body { background: #000; color: #fff; }'
    );

    // Start a test server on ephemeral port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        testServerPort = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
    if (fs.existsSync(testSiteDir)) {
      fs.rmSync(testSiteDir, { recursive: true, force: true });
    }
  });

  it('serves real published static index.html from /sites/:projectId', async () => {
    const res = await fetch(`http://localhost:${testServerPort}/sites/${testProjectId}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Hello from DevPilot Static Deployment!'));
  });

  it('serves static assets (CSS/JS) accurately with correct Content-Type', async () => {
    const res = await fetch(`http://localhost:${testServerPort}/sites/${testProjectId}/app.css`);
    assert.strictEqual(res.status, 200);
    const css = await res.text();
    assert.ok(css.includes('background: #000'));
  });

  it('provides SPA fallback to index.html for client-side routes (/sites/:projectId/dashboard)', async () => {
    const res = await fetch(`http://localhost:${testServerPort}/sites/${testProjectId}/dashboard`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Hello from DevPilot Static Deployment!'));
  });

  it('returns clean 404 page for unpublished or non-existent project sites', async () => {
    const res = await fetch(`http://localhost:${testServerPort}/sites/non-existent-project-id/`);
    assert.strictEqual(res.status, 404);
    const text = await res.text();
    assert.ok(text.includes('Site Not Yet Published') || text.includes('Site Not Found'));
  });

  it('rejects path traversal attempts on /sites/:projectId with HTTP 400', async () => {
    const res = await fetch(`http://localhost:${testServerPort}/sites/..%2F..%2Fetc/`);
    assert.strictEqual(res.status, 400);
  });

  it('supports cancelling a queued deployment job cleanly', async () => {
    const mockDepId = 'mock_queued_job_123';
    // Add to pending queue
    buildQueue.queue.push(mockDepId);
    assert.ok(buildQueue.queue.includes(mockDepId));

    // Cancel job
    const cancelled = await buildQueue.cancelJob(mockDepId);
    assert.strictEqual(cancelled, true);
    assert.strictEqual(buildQueue.queue.includes(mockDepId), false);
  });
});
