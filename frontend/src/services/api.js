import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token to every request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('devpilot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthenticated responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear stored credentials
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('devpilot_token');
        localStorage.removeItem('devpilot_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me')
};

// Projects Service
export const projectsAPI = {
  getProjects: () => api.get('/projects'),
  getProjectById: (id) => api.get(`/projects/${id}`),
  createProject: (projectData) => api.post('/projects', projectData),
  updateProject: (id, projectData) => api.put(`/projects/${id}`, projectData),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  getDashboardStats: () => api.get('/projects/dashboard/stats'),
  addEnvVar: (id, envData) => api.post(`/projects/${id}/env`, envData),
  deleteEnvVar: (id, envId) => api.delete(`/projects/${id}/env/${envId}`)
};

// Deployments Service
export const deploymentsAPI = {
  triggerDeployment: (projectId, data = {}) =>
    api.post(`/projects/${projectId}/deployments`, data),
  getProjectDeployments: (projectId) =>
    api.get(`/projects/${projectId}/deployments`),
  getDeploymentById: (id) => api.get(`/deployments/${id}`)
};

export default api;
