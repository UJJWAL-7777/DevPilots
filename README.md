# DevPilot — Personal Developer Deployment Platform (Phase 1 & Phase 2)

DevPilot is a developer deployment management platform inspired by modern developer clouds like Vercel and Railway. DevPilot allows developers to connect GitHub repositories, configure environment variables, trigger simulated build pipelines, monitor real-time deployment statuses, view real GitHub branch commits, and automatically trigger deployments on `git push` via verified webhooks.

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
- **JSON Web Tokens (JWT)** (Secure stateless session management)
- **bcryptjs** (Password hashing with salt rounds)
- **GitHub REST API & Webhooks** (HMAC SHA-256 signature verification)
- **dotenv & cors**

---

## 📁 Project Architecture & Folder Structure

```text
c:\DevPilot\
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Mongoose connection logic
│   │   ├── controllers/
│   │   │   ├── authController.js     # Register, login, getMe
│   │   │   ├── projectController.js  # Project CRUD, stats, env vars
│   │   │   ├── deploymentController.js # Deployment lifecycle & real GitHub commit lookup
│   │   │   └── githubController.js   # [Phase 2] OAuth callback, repos, branches, commits, webhooks
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT Bearer token validator
│   │   │   └── errorMiddleware.js    # 404 and global error handlers
│   │   ├── models/
│   │   │   ├── User.js               # Extended with secure github subdocument (select: false)
│   │   │   ├── Project.js            # Project schema with env vars & owner ref
│   │   │   └── Deployment.js         # Extended with commitMessage and trigger fields
│   │   ├── routes/
│   │   │   ├── authRoutes.js         # /api/auth/*
│   │   │   ├── projectRoutes.js      # /api/projects/*
│   │   │   ├── deploymentRoutes.js   # /api/deployments/*
│   │   │   └── githubRoutes.js       # [Phase 2] /api/github/*
│   │   ├── services/
│   │   │   └── githubService.js      # [Phase 2] GitHub REST API client & HMAC verification
│   │   ├── utils/
│   │   │   └── generateToken.js      # Signs JWT with 30d expiry
│   │   ├── app.js                    # Express app & rawBody buffer middleware
│   │   └── server.js                 # App entry point & HTTP listener
│   ├── .env                          # Backend environment variables (gitignored)
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top bar with status and user actions
│   │   │   ├── Sidebar.jsx           # Responsive management navigation (with Git Integration link)
│   │   │   ├── ProtectedRoute.jsx    # Authentication route guard
│   │   │   ├── ProjectCard.jsx       # Grid card with status & repository link
│   │   │   ├── StatusBadge.jsx       # Animated status chips (Success, Building, Queued, Failed)
│   │   │   ├── DeploymentTable.jsx   # Tabular history with commit copy, message, & log viewer
│   │   │   ├── LoadingSpinner.jsx    # Clean spinner component
│   │   │   └── Modal.jsx             # Accessible popup modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global auth state & persistent session provider
│   │   ├── pages/
│   │   │   ├── Login.jsx             # User sign-in page with demo credentials
│   │   │   ├── Register.jsx          # New user registration
│   │   │   ├── Dashboard.jsx         # Metrics cards and recent projects
│   │   │   ├── Projects.jsx          # Searchable & filterable project catalog
│   │   │   ├── CreateProject.jsx     # [Phase 2] Real GitHub repo & branch selector dropdowns
│   │   │   ├── ProjectDetails.jsx    # [Phase 2] Overview, real commits tab, and env variable vault
│   │   │   ├── ProjectSettings.jsx   # Edit project details or danger-zone delete
│   │   │   └── Integrations.jsx      # [Phase 2] Connect/disconnect GitHub & webhook setup guide
│   │   ├── services/
│   │   │   └── api.js                # Axios client with auth and githubAPI services
│   │   ├── App.jsx                   # Route hierarchy with /settings/integrations
│   │   ├── main.jsx                  # React DOM mount point
│   │   └── index.css                 # Tailwind directives and dark theme styles
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore                        # Root gitignore protecting secrets
├── package.json                      # Root workspace scripts
└── README.md
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
