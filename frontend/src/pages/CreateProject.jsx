import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import {
  FolderPlus,
  Github,
  GitBranch,
  Layers,
  FileText,
  AlertCircle,
  ArrowLeft,
  Check
} from 'lucide-react';

const CreateProject = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    repositoryUrl: '',
    repositoryName: '',
    branch: 'main',
    framework: 'React'
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto extract repository name if user pastes github URL
  const handleRepoUrlChange = (e) => {
    const url = e.target.value;
    let repoName = formData.repositoryName;

    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match && match[2]) {
        repoName = match[2].replace(/\.git$/, '');
      }
    } catch {
      // ignore regex error
    }

    setFormData((prev) => ({
      ...prev,
      repositoryUrl: url,
      repositoryName: prev.repositoryName || repoName,
      name: prev.name || repoName
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.repositoryUrl || !formData.repositoryName) {
      setError('Please provide project name, repository URL, and repository name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await projectsAPI.createProject(formData);
      const newProjectId = res.data.data._id;
      navigate(`/projects/${newProjectId}`);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to create project. Please verify inputs.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const frameworkList = [
    { id: 'React', name: 'React', desc: 'Client-side SPA with Vite/Webpack' },
    { id: 'Node.js', name: 'Node.js', desc: 'Standard backend runtime' },
    { id: 'Express', name: 'Express', desc: 'Lightweight REST API service' },
    { id: 'Next.js', name: 'Next.js', desc: 'Full-stack React framework' },
    { id: 'Other', name: 'Other', desc: 'Static or custom architecture' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Breadcrumb / Back button */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Projects</span>
      </Link>

      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <FolderPlus className="w-6 h-6 text-emerald-400" />
          <span>Create New Project</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure repository links and framework presets for deployment management.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white tracking-tight pb-2 border-b border-slate-800/80">
            Project Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="name">
                Project Name <span className="text-emerald-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. LegalConnect"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="repositoryName">
                Repository Name <span className="text-emerald-400">*</span>
              </label>
              <input
                id="repositoryName"
                name="repositoryName"
                type="text"
                placeholder="e.g. legalconnect"
                value={formData.repositoryName}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="description">
              Description <span className="text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Brief summary of what this application does..."
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Git Configuration Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white tracking-tight pb-2 border-b border-slate-800/80">
            Source Control (GitHub)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="repositoryUrl">
                GitHub Repository URL <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <Github className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="repositoryUrl"
                  name="repositoryUrl"
                  type="url"
                  placeholder="https://github.com/username/project"
                  value={formData.repositoryUrl}
                  onChange={handleRepoUrlChange}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="branch">
                Production Branch
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="branch"
                  name="branch"
                  type="text"
                  placeholder="main"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Framework Selection Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white tracking-tight pb-2 border-b border-slate-800/80">
            Build & Framework Preset
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {frameworkList.map((fw) => {
              const isSelected = formData.framework === fw.id;
              return (
                <div
                  key={fw.id}
                  onClick={() => setFormData((prev) => ({ ...prev, framework: fw.id }))}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs">{fw.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{fw.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/projects"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            id="create-project-submit-btn"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
            ) : (
              <span>Create Project</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProject;
