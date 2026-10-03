# DevPilot — Personal Developer Deployment Platform (Phase 1)

DevPilot is a personal developer deployment management platform inspired by modern developer clouds like Vercel and Railway. DevPilot allows developers to connect GitHub repositories, configure environment variables, trigger simulated build pipelines, monitor real-time deployment statuses, and manage projects through an intuitive dark-mode dashboard.

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
│   │   │   └── deploymentController.js # Deployment lifecycle simulation & retrieval
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT Bearer token validator
│   │   │   └── errorMiddleware.js    # 404 and global error handlers
│   │   ├── models/
│   │   │   ├── User.js               # User schema with pre-save bcrypt hash
│   │   │   ├── Project.js            # Project schema with env vars & owner ref
│   │   │   └── Deployment.js         # Deployment schema with status enum & logs
│   │   ├── routes/
│   │   │   ├── authRoutes.js         # /api/auth/*
│   │   │   ├── projectRoutes.js      # /api/projects/*
│   │   │   └── deploymentRoutes.js   # /api/deployments/*
│   │   ├── utils/
│   │   │   └── generateToken.js      # Signs JWT with 30d expiry
│   │   ├── app.js                    # Express app & middleware configuration
│   │   └── server.js                 # App entry point & HTTP listener
│   ├── .env                          # Backend environment variables
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top bar with status and user actions
│   │   │   ├── Sidebar.jsx           # Responsive management navigation
│   │   │   ├── ProtectedRoute.jsx    # Authentication route guard
│   │   │   ├── ProjectCard.jsx       # Grid card with status & repository link
│   │   │   ├── StatusBadge.jsx       # Animated status chips (Success, Building, Queued, Failed)
│   │   │   ├── DeploymentTable.jsx   # Tabular history with commit copy & log viewer
│   │   │   ├── LoadingSpinner.jsx    # Clean spinner component
│   │   │   └── Modal.jsx             # Accessible popup modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global auth state & persistent session provider
│   │   ├── pages/
│   │   │   ├── Login.jsx             # User sign-in page with demo credentials
│   │   │   ├── Register.jsx          # New user registration
│   │   │   ├── Dashboard.jsx         # Metrics cards and recent projects
│   │   │   ├── Projects.jsx          # Searchable & filterable project catalog
│   │   │   ├── CreateProject.jsx     # Project creation form with repo parsing
│   │   │   ├── ProjectDetails.jsx    # Overview, deployments, and env variable vault
│   │   │   └── ProjectSettings.jsx   # Edit project details or danger-zone delete
│   │   ├── services/
│   │   │   └── api.js                # Axios client with interceptors
│   │   ├── App.jsx                   # Route hierarchy
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
├── package.json                      # Root workspace scripts
└── README.md
```

---

## 🔑 Environment Variables Setup

### Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/devpilot
JWT_SECRET=devpilot_super_secret_jwt_key_2026
NODE_ENV=development
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🏃 Quick Start: Running the Project Locally

### 1. Prerequisites
- **Node.js**: v18 or newer (tested with v22)
- **MongoDB**: Local MongoDB instance running on port `27017` or a MongoDB Atlas URI

### 2. Start Backend
In terminal 1:
```bash
cd backend
npm install
npm run dev
```
Backend API will start at: `http://localhost:5000`

### 3. Start Frontend
In terminal 2:
```bash
cd frontend
npm install
npm run dev
```
Frontend Web App will start at: `http://localhost:3000`

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user (`name`, `email`, `password`) | Public |
| `POST` | `/api/auth/login` | Login with credentials (`email`, `password`) | Public |
| `GET` | `/api/auth/me` | Fetch currently authenticated user session | Private (Bearer) |

### Projects (`/api/projects`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/projects/dashboard/stats` | Aggregate dashboard metrics & recent projects | Private (Bearer) |
| `POST` | `/api/projects` | Create a new project | Private (Bearer) |
| `GET` | `/api/projects` | List all projects belonging to logged-in user | Private (Bearer) |
| `GET` | `/api/projects/:id` | Fetch single project by ID (verifies ownership) | Private (Bearer) |
| `PUT` | `/api/projects/:id` | Update project metadata | Private (Bearer) |
| `DELETE` | `/api/projects/:id` | Delete project and cascade-delete its deployments | Private (Bearer) |

### Environment Variables
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/projects/:id/env` | Add or update an environment variable (`key`, `value`) | Private (Bearer) |
| `DELETE` | `/api/projects/:id/env/:envId` | Delete environment variable by ID | Private (Bearer) |

### Deployments (`/api/projects/:id/deployments` & `/api/deployments/:id`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/projects/:id/deployments` | Trigger simulated deployment (`QUEUED` → `BUILDING` → `SUCCESS`) | Private (Bearer) |
| `GET` | `/api/projects/:id/deployments` | List all deployments for a project | Private (Bearer) |
| `GET` | `/api/deployments/:id` | Fetch single deployment with terminal build logs | Private (Bearer) |

---

## 🧪 Testing with Postman or cURL

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ujjwal","email":"ujjwal@devpilot.io","password":"password123"}'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ujjwal@devpilot.io","password":"password123"}'
```
*Copy the returned `token` from `data.token`.*

### 3. Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "name": "LegalConnect",
    "description": "AI legal assistant platform",
    "repositoryUrl": "https://github.com/ujjwal/legalconnect",
    "repositoryName": "legalconnect",
    "branch": "main",
    "framework": "React"
  }'
```

### 4. Trigger Deployment
```bash
curl -X POST http://localhost:5000/api/projects/<PROJECT_ID>/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 5. Add Environment Variable
```bash
curl -X POST http://localhost:5000/api/projects/<PROJECT_ID>/env \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{"key": "DATABASE_URL", "value": "your_database_connection_string"}'
```
