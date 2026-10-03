import crypto from 'crypto';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';

class GitHubService {
  /**
   * Exchange OAuth authorization code for access token
   */
  async exchangeCodeForToken(code) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth credentials (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) are missing.');
    }

    const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return data.access_token;
  }

  /**
   * Retrieve authenticated GitHub user profile
   */
  async getAuthenticatedUser(accessToken) {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevPilot-Deployment-Platform'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch GitHub user (HTTP ${response.status})`);
    }

    const user = await response.json();
    return {
      githubUserId: String(user.id),
      username: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url
    };
  }

  /**
   * Retrieve repositories accessible to the user
   */
  async getUserRepositories(accessToken) {
    const response = await fetch(`${GITHUB_API_URL}/user/repos?sort=updated&per_page=100&type=all`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevPilot-Deployment-Platform'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch repositories (HTTP ${response.status})`);
    }

    const repos = await response.json();
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch || 'main',
      description: repo.description || '',
      owner: repo.owner ? repo.owner.login : ''
    }));
  }

  /**
   * Retrieve branches for a specific repository
   */
  async getRepositoryBranches(accessToken, owner, repo) {
    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/branches?per_page=100`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DevPilot-Deployment-Platform'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch branches for ${owner}/${repo} (HTTP ${response.status})`);
    }

    const branches = await response.json();
    return branches.map((b) => ({
      name: b.name,
      protected: b.protected || false,
      commitSha: b.commit ? b.commit.sha : ''
    }));
  }

  /**
   * Retrieve recent commits for a repository branch
   */
  async getBranchCommits(accessToken, owner, repo, branch = 'main', limit = 15) {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevPilot-Deployment-Platform'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch commits for ${owner}/${repo} (HTTP ${response.status})`);
    }

    const commits = await response.json();
    return commits.map((item) => ({
      sha: item.sha,
      shortSha: item.sha.substring(0, 7),
      message: item.commit.message,
      author: item.commit.author?.name || item.author?.login || 'Unknown',
      date: item.commit.author?.date || item.commit.committer?.date,
      url: item.html_url
    }));
  }

  /**
   * Get latest commit for a specific branch
   */
  async getLatestCommit(accessToken, owner, repo, branch = 'main') {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DevPilot-Deployment-Platform'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch latest commit for ${owner}/${repo} on ${branch}`);
    }

    const item = await response.json();
    return {
      sha: item.sha,
      shortSha: item.sha.substring(0, 7),
      message: item.commit.message,
      author: item.commit.author?.name || item.author?.login || 'Unknown',
      date: item.commit.author?.date || item.commit.committer?.date
    };
  }

  /**
   * Validate incoming GitHub webhook signature (HMAC SHA-256)
   */
  verifyWebhookSignature(rawBodyBuffer, signatureHeader, secret) {
    if (!signatureHeader || !secret || !rawBodyBuffer) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBodyBuffer);
      const computedSignature = `sha256=${hmac.digest('hex')}`;

      const sigBuffer = Buffer.from(signatureHeader, 'utf8');
      const compBuffer = Buffer.from(computedSignature, 'utf8');

      if (sigBuffer.length !== compBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, compBuffer);
    } catch (err) {
      console.error('[Webhook Signature Error]', err.message);
      return false;
    }
  }
}

export default new GitHubService();
