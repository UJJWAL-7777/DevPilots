import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import githubService from '../src/services/githubService.js';

describe('GitHub Webhook Verification & Trigger Logic', () => {
  const secret = 'my_super_secret_webhook_key_98765';
  const payloadObject = {
    ref: 'refs/heads/main',
    repository: {
      name: 'TestingRepo',
      full_name: 'UJJWAL-7777/TestingRepo'
    },
    head_commit: {
      id: '2df32f96ff57a2a1ff5d376eef3e2c74e5570156',
      message: 'feat: add production build config'
    },
    pusher: {
      name: 'UJJWAL-7777'
    }
  };
  const rawBody = Buffer.from(JSON.stringify(payloadObject), 'utf8');

  // Compute valid HMAC SHA-256 signature
  const validSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  it('validates authentic webhook payload with matching HMAC signature', () => {
    const isValid = githubService.verifyWebhookSignature(rawBody, validSignature, secret);
    assert.strictEqual(isValid, true);
  });

  it('rejects webhook payload with altered content or invalid signature', () => {
    const tamperedBody = Buffer.from(JSON.stringify({ ...payloadObject, tampered: true }), 'utf8');
    const isValid = githubService.verifyWebhookSignature(tamperedBody, validSignature, secret);
    assert.strictEqual(isValid, false);
  });

  it('rejects signature generated with incorrect webhook secret', () => {
    const wrongSecret = 'wrong_secret_123';
    const wrongSig = 'sha256=' + crypto.createHmac('sha256', wrongSecret).update(rawBody).digest('hex');
    const isValid = githubService.verifyWebhookSignature(rawBody, wrongSig, secret);
    assert.strictEqual(isValid, false);
  });

  it('safely handles missing or malformed signature header without throwing unhandled exceptions', () => {
    assert.strictEqual(githubService.verifyWebhookSignature(rawBody, null, secret), false);
    assert.strictEqual(githubService.verifyWebhookSignature(rawBody, '', secret), false);
    assert.strictEqual(githubService.verifyWebhookSignature(rawBody, 'invalid-signature-format', secret), false);
    assert.strictEqual(githubService.verifyWebhookSignature(null, validSignature, secret), false);
  });

  it('extracts branch name accurately from Git ref', () => {
    const extractBranch = (ref) => ref.replace('refs/heads/', '');
    assert.strictEqual(extractBranch('refs/heads/main'), 'main');
    assert.strictEqual(extractBranch('refs/heads/feature/oauth-v2'), 'feature/oauth-v2');
    assert.strictEqual(extractBranch('refs/heads/release/1.0.0'), 'release/1.0.0');
  });

  it('filters out push events for non-configured branches', () => {
    const projectConfiguredBranch = 'main';
    const pushBranch = 'staging';

    const shouldTrigger = (projectBranch, eventBranch) => projectBranch === eventBranch;

    assert.strictEqual(shouldTrigger(projectConfiguredBranch, 'main'), true);
    assert.strictEqual(shouldTrigger(projectConfiguredBranch, pushBranch), false);
  });
});
