# DevPilot — Personal Developer Deployment Platform (Phase 1, 2 & 3)

DevPilot is a developer deployment platform inspired by modern developer clouds like Vercel and Railway. DevPilot allows developers to connect GitHub repositories, configure build environments, trigger automated or manual deployment jobs, run isolated build workers, stream live execution logs, publish React/Vite static applications, and view live sites.

---

## 🚀 Tech Stack

### Frontend
- **React.js 18** (Vite SPA)
- **Tailwind CSS** (Custom dark developer design system)
- **React Router DOM v6** (Client-side routing with protected routes)
- **Axios** (With interceptors for JWT bearer tokens and 401 handling)
- **Lucide React** (Clean developer icons)

### Backend
- **Node.js & Express.js** (REST API)
- **MongoDB & Mongoose** (Data persistence with indexed schemas)
- **Isolated Build Worker & Queue** (Independent subprocesses with token masking, timeout protection, and concurrency controls)
- **Static Edge Publisher** (Hosts built static sites directly at `/sites/:projectId/`)
- **JSON Web Tokens (JWT)** (Secure stateless session management)
- **bcryptjs** (Password hashing with salt rounds)
- **GitHub REST API & Webhooks** (HMAC SHA-256 signature verification)
- **Node.js Built-in Test Runner** (Zero-dependency test suite via `node --test`)

---

## 📁 Project Architecture & Folder Structure

```text
c:\DevPilot\
├── backend/
│   ├── build-workspace/          # Ephemeral isolated build folders per deployment (cleaned automatically)
│   ├── published-sites/          # Live static application bundles served at /sites/:projectId/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Mongoose connection logic
│   │   ├── controllers/
│   │   │   ├── authController.js     # Register, login, getMe
│   │   │   ├── projectController.js  # Project CRUD, build configuration, stats, env vars
│   │   │   ├── deploymentController.js # Real deployment queueing, status, cancellation
│   │   │   └── githubController.js   # OAuth callback, repos, branches, commits, webhooks
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT Bearer token validator
│   │   │   └── errorMiddleware.js    # 404 and global error handlers
│   │   ├── models/
│   │   │   ├── User.js               # Extended with secure github subdocument (select: false)
│   │   │   ├── Project.js            # Extended with rootDir, buildCommand, installCommand, outputDir, deploymentUrl
│   │   │   └── Deployment.js         # 7-state pipeline (QUEUED, PREPARING, BUILDING, PUBLISHING, SUCCESS, FAILED, CANCELLED)
│   │   ├── routes/
│   │   │   ├── authRoutes.js         # /api/auth/*
│   │   │   ├── projectRoutes.js      # /api/projects/*
│   │   │   ├── deploymentRoutes.js   # /api/deployments/* (including /:id/cancel)
│   │   │   └── githubRoutes.js       # /api/github/*
│   │   ├── services/
│   │   │   ├── buildQueue.js         # Persistent concurrency queue, cancellation, and startup recovery
│   │   │   ├── buildWorker.js        # Git revision checkout, npm ci/install, build execution, static publishing
│   │   │   └── githubService.js      # GitHub REST API client & HMAC SHA-256 verification
│   │   ├── utils/
│   │   │   └── generateToken.js      # Signs JWT with 30d expiry
│   │   ├── app.js                    # Express app, static site host (/sites/:projectId), rawBody buffer middleware
│   │   └── server.js                 # App entry point, DB connect & queue recovery
│   ├── tests/
│   │   ├── buildPipeline.test.js     # Static publishing, SPA fallback, path safety, and queue cancellation
│   │   ├── projectAuth.test.js       # Project ownership, missing scripts, and output directory diagnostics
│   │   ├── security.test.js          # Path traversal prevention and credential log scrubbing
│   │   └── webhook.test.js           # HMAC SHA-256 signature verification & duplicate event prevention
│   ├── .env                          # Backend environment variables (gitignored)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top bar with status and user actions
│   │   │   ├── Sidebar.jsx           # Responsive management navigation
│   │   │   ├── StatusBadge.jsx       # 7-state animated status chips (Queued, Preparing, Building, Publishing, Success, Failed, Cancelled)
│   │   │   ├── DeploymentTable.jsx   # Live history with duration, commit link, live site link, cancel action, and terminal log modal
│   │   │   └── Modal.jsx             # Accessible popup modal
│   │   ├── pages/
│   │   │   ├── CreateProject.jsx     # GitHub repo selector + Build & Output configuration
│   │   │   ├── ProjectDetails.jsx    # Real-time polling, live site button, build config summary, and deployments tab
│   │   │   └── ProjectSettings.jsx   # Project & build pipeline configuration editor
│   │   ├── services/
│   │   │   └── api.js                # Axios client with cancelDeployment and build configurations
│   │   └── ...
```

---

## ⚙️ Deployment Pipeline Lifecycle

Each deployment transitions through a 7-stage state machine:

1. **`QUEUED`**: The deployment job is registered in MongoDB and placed into `buildQueue`.
2. **`PREPARING`**: A dedicated workspace folder (`backend/build-workspace/<deploymentId>`) is created. The repository is cloned shallowly (`--depth 50`) using the user's secure GitHub access token and checked out to the exact commit SHA.
3. **`BUILDING`**:
   - Path traversal checks ensure `rootDir` does not escape the workspace.
   - Lockfile detection selects `npm ci`, `yarn`, or `pnpm`.
   - Dependencies are installed in an isolated child process with stripped server environment variables.
   - The build command (e.g., `npm run build`) is executed. Real-time stdout/stderr is scrubbed of credentials and streamed into MongoDB deployment logs.
4. **`PUBLISHING`**:
   - The output directory (e.g., `dist`) is verified for generated assets (e.g. `index.html`).
   - Static files are published to `backend/published-sites/<projectId>/`.
   - The live deployment URL is generated (`http://localhost:5000/sites/<projectId>/`).
5. **`SUCCESS`**: Duration is recorded, deployment status is marked `SUCCESS`, and project status is updated to `ACTIVE`.
6. **`FAILED`**: If scripts fail, commands time out, or directories are missing, clear diagnostic logs are captured, workspace is cleaned, and status is marked `FAILED`.
7. **`CANCELLED`**: If cancelled by user while queued or running, the child process tree is cleanly terminated via OS task management and status is marked `CANCELLED`.

---

## 🔒 Security & Process Isolation Boundaries

DevPilot enforces the following security controls:
1. **Subprocess Separation**: Repository build code never executes inside the main Express event loop. It runs in independent child processes (`child_process.spawn`).
2. **Environment Sanitization**: Server secrets (`JWT_SECRET`, `MONGO_URI`, `GITHUB_CLIENT_SECRET`) are stripped from the build environment. Only standard system paths and user-configured `project.environmentVariables` are passed to the worker.
3. **Path Traversal Protection**: Both `rootDir` and `outputDir` are validated using strict relative path checks to prevent escaping the workspace directory.
4. **Credential Log Scrubbing**: Standard regex and token masking scrub GitHub tokens (`x-access-token`, `ghp_`, `gho_`) and project secret values before storing them in logs.
5. **Execution Timeouts**: Builds time out automatically after 10 minutes (`BUILD_TIMEOUT_MS`).
6. **Current Isolation Limitations**: Builds execute on the host operating system with child process boundaries. They share the host kernel, file system access outside the sandbox, and host network stack. *Complete multi-tenant isolation requires containerization (Docker) and virtualized sandboxing (Kubernetes/Firecracker), scheduled for subsequent phases.*

---

## 📡 REST API Endpoints

### Deployments (`/api/deployments` & `/api/projects/:id/deployments`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/projects/:id/deployments` | Enqueue a new deployment build job | Private (Bearer) |
| `GET` | `/api/projects/:id/deployments` | List all historical deployments for a project | Private (Bearer) |
| `GET` | `/api/deployments/:id` | Fetch deployment details, status, duration, and logs | Private (Bearer) |
| `POST` | `/api/deployments/:id/cancel` | Cancel an active or queued deployment job | Private (Bearer) |

### Static Sites (`/sites/:projectId`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/sites/:projectId/*` | Serve published static application assets with SPA fallback | Public |

### GitHub Webhooks (`/api/github/webhook`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/github/webhook` | Process GitHub `push` events with HMAC SHA-256 signature verification | Public (Signed) |

---

## 🧪 Running Automated Tests

Run the complete 19-test test suite using Node.js built-in runner:

```bash
cd backend
npm test
```

### Test Coverage Summary:
- **`tests/security.test.js`**: Path traversal escape prevention (`../`), log credential scrubbing.
- **`tests/webhook.test.js`**: HMAC SHA-256 signature verification, branch filtering, payload tamper detection.
- **`tests/buildPipeline.test.js`**: Static site hosting, asset delivery, SPA fallback, 404 handling, queue cancellation.
- **`tests/projectAuth.test.js`**: User ownership authorization, missing build script diagnostic detection, missing output directory detection.

---

## 🏃 Running the Application Locally

1. **Start MongoDB**:
   ```bash
   mongod --dbpath <data-dir>
   ```

2. **Start Backend Server**:
   ```bash
   cd backend
   npm install
   npm start
   # Server listens on http://localhost:5000
   ```

3. **Start Frontend Client**:
   ```bash
   cd frontend
   npm install
   npm run dev
   # Client runs on http://localhost:3000
   ```

```

---

## 🔑 Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/devpilot
JWT_SECRET=devpilot_super_secret_jwt_key_2026
NODE_ENV=development

# GitHub OAuth Integration (Phase 2)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/settings/integrations

# GitHub Webhook Secret (Phase 2)
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here
```

---

## ⚙️ How to Set Up Real GitHub OAuth

1. Go to **GitHub Settings** → **Developer Settings** → **OAuth Apps** (`https://github.com/settings/developers`).
2. Click **New OAuth App**:
   - **Application name:** `DevPilot`
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/settings/integrations`
3. Click **Register application**.
4. Copy the **Client ID** and generate a **Client Secret**.
5. Paste them into `backend/.env`:
   ```env
   GITHUB_CLIENT_ID=Ov23li...
   GITHUB_CLIENT_SECRET=8f4a...
   ```
6. Save the file. Nodemon will automatically reload.

---

## 📡 REST API Reference

### GitHub Integration (`/api/github`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/github/auth-url` | Generate GitHub OAuth authorization URL | Private (Bearer) |
| `POST` | `/api/github/callback` | Exchange OAuth code for secure backend access token | Private (Bearer) |
| `GET` | `/api/github/status` | Get connection status and connected username | Private (Bearer) |
| `POST` | `/api/github/disconnect` | Disconnect GitHub account and clear tokens | Private (Bearer) |
| `GET` | `/api/github/repos` | Retrieve real repositories accessible to user | Private (Bearer) |
| `GET` | `/api/github/repos/:owner/:repo/branches` | Retrieve real branches for selected repository | Private (Bearer) |
| `GET` | `/api/github/repos/:owner/:repo/commits` | Retrieve real recent commits for selected branch | Private (Bearer) |
| `POST` | `/api/github/webhook` | Process GitHub `push` events with HMAC SHA-256 verification | Public (Signed) |

---

## 🌐 Local Webhook Testing Guide

Because GitHub webhooks originate from GitHub's servers, GitHub needs a publicly accessible URL to reach your local backend.

### 1. Expose Localhost Port 5000
Using any tunnel of your choice (e.g., `localtunnel`, `ngrok`, or `cloudflared`):

```bash
# Using npx localtunnel:
npx localtunnel --port 5000

# Or using ngrok:
ngrok http 5000
```

You will receive a public tunnel URL (e.g., `https://funny-cat-42.loca.lt`).

### 2. Configure Webhook in GitHub Repository
1. Open your repository on GitHub:
   `https://github.com/UJJWAL-7777/TestingRepo/settings/hooks`
2. Click **Add webhook**:
   - **Payload URL:** `https://<YOUR-TUNNEL-URL>/api/github/webhook`
   - **Content type:** `application/json`
   - **Secret:** Enter the value from `GITHUB_WEBHOOK_SECRET` in your `backend/.env` (e.g., `devpilot_webhook_secret_2026`)
   - **Which events?** Select **"Just the push event"**
   - Check **Active**
3. Click **Add webhook**.

### 3. Verify Automatic Deployment on Git Push
1. Make a harmless change in `TestingRepo` (e.g. edit README or a test file).
2. Commit and push:
   ```bash
   git commit -am "chore: test automated DevPilot webhook deployment"
   git push origin main
   ```
3. GitHub sends the webhook to DevPilot.
4. DevPilot:
   - Verifies the HMAC SHA-256 signature.
   - Matches the repository and branch to your project.
   - Checks for duplicate commits.
   - Automatically creates a new deployment with status `QUEUED` containing the real commit SHA and commit message!
