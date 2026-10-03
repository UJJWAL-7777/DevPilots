import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Settings,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Save,
  Github,
  GitBranch
} from 'lucide-react';

const ProjectSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    repositoryUrl: '',
    repositoryName: '',
    branch: 'main',
    framework: 'React'
  });

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await projectsAPI.getProjectById(id);
        const p = res.data.data;
        setFormData({
          name: p.name,
          description: p.description || '',
          repositoryUrl: p.repositoryUrl,
          repositoryName: p.repositoryName,
          branch: p.branch || 'main',
          framework: p.framework || 'React'
        });
      } catch (err) {
        setError('Failed to load project settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');
    setSuccessMsg('');

    try {
      await projectsAPI.updateProject(id, formData);
      setSuccessMsg('Project configuration updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project settings.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== formData.name) {
      setError('Please type the exact project name to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      await projectsAPI.deleteProject(id);
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project.');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Project Settings..." size="lg" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Back Link */}
      <Link
        to={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Project Overview</span>
      </Link>

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>Project Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Update repository configuration, branch defaults, or permanently delete this project.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {successMsg}
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white tracking-tight pb-2 border-b border-slate-800/80">
            General Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="name">
                Project Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="repositoryName">
                Repository Name
              </label>
              <input
                id="repositoryName"
                name="repositoryName"
                type="text"
                value={formData.repositoryName}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="repositoryUrl">
                GitHub Repository URL
              </label>
              <div className="relative">
                <Github className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="repositoryUrl"
                  name="repositoryUrl"
                  type="url"
                  value={formData.repositoryUrl}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="branch">
                Default Branch
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="branch"
                  name="branch"
                  type="text"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              id="save-settings-btn"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-[#0f172a] border border-rose-900/40 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-rose-400 tracking-tight pb-2 border-b border-rose-900/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Danger Zone</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white">Delete this project</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Permanently remove this project, all associated deployments, logs, and environment variables.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            id="delete-project-trigger-btn"
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-xs transition-colors shrink-0"
          >
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Project Deletion"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            This action cannot be undone. To confirm, please type the project name{' '}
            <strong className="text-white font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              {formData.name}
            </strong>{' '}
            below:
          </p>

          <input
            type="text"
            placeholder={formData.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-xs text-white outline-none font-mono"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={confirmName !== formData.name || isDeleting}
              id="confirm-delete-btn"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectSettings;
