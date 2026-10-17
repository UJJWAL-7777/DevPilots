import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { validatePathSafety, scrubLogs } from '../src/services/buildWorker.js';

describe('Security & Path Traversal Protections', () => {
  const baseDir = path.resolve('C:/DevPilot/backend/build-workspace/test-dep-123');

  it('allows safe relative subpaths inside the workspace', () => {
    const safePaths = ['', './', 'frontend', 'packages/web', 'src/assets'];
    for (const p of safePaths) {
      const resolved = validatePathSafety(baseDir, p, 'Root Directory');
      assert.ok(resolved.startsWith(baseDir));
    }
  });

  it('rejects path traversal attempting to escape the workspace with parent directory (..)', () => {
    const maliciousPaths = [
      '../',
      '../../',
      '../outside',
      'frontend/../../outside',
      '..\\..\\windows\\system32'
    ];

    for (const p of maliciousPaths) {
      assert.throws(
        () => validatePathSafety(baseDir, p, 'Root Directory'),
        /Security Violation/i,
        `Expected path '${p}' to throw Security Violation`
      );
    }
  });

  it('scrubs GitHub Personal Access Tokens and OAuth tokens from log output', () => {
    const rawLog = 'Fetching https://x-access-token:ghp_1234567890abcdef1234567890abcdef1234@github.com/org/repo.git';
    const clean = scrubLogs(rawLog);

    assert.ok(!clean.includes('ghp_1234567890abcdef1234567890abcdef1234'));
    assert.ok(clean.includes('[REDACTED_GH_TOKEN]') || clean.includes('[REDACTED_TOKEN]') || clean.includes('x-access-token:[REDACTED]@'));
  });

  it('scrubs custom sensitive environment values from log output', () => {
    const secretApiKey = 'sk_live_very_secret_key_123456789';
    const rawLog = `Connecting to database with key: ${secretApiKey} on port 5432`;
    const clean = scrubLogs(rawLog, [secretApiKey]);

    assert.ok(!clean.includes(secretApiKey));
    assert.ok(clean.includes('[REDACTED_SECRET]'));
  });
});
