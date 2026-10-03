import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI, deploymentsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DeploymentTable from '../components/DeploymentTable';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Rocket,
  Github,
  GitBranch,
  Layers,
  Calendar,
  Settings,
  Plus,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const ProjectDetails = () => {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'deployments' | 'env'
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Environment variables form state
  const [envKey, setEnvKey] = useState('');
  const [envValue, setEnvValue] = useState('');
  const [addingEnv, setAddingEnv] = useState(false);
  const [revealedEnvs, setRevealedEnvs] = useState({});
  const [copiedKey, setCopiedKey] = useState('');

  const fetchProjectData = useCallback(async () => {
    try {
      const [projRes, depRes] = await Promise.all([
        projectsAPI.getProjectById(id),
        deploymentsAPI.getProjectDeployments(id)
      ]);
      setProject(projRes.data.data);
      setDeployments(depRes.data.data);
    } catch (err) {
      console.error('[ProjectDetails fetch error]', err);
      setError('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Real-time polling while any deployment is in QUEUED or BUILDING state
  useEffect(() => {
    const hasActiveDeployment = deployments.some(
      (d) => d.status === 'QUEUED' || d.status === 'BUILDING'
    );

    let interval;
    if (hasActiveDeployment) {
      interval = setInterval(() => {
        fetchProjectData();
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deployments, fetchProjectData]);

  const handleTriggerDeploy = async () => {
    setError('');
    setSuccessMsg('');
    setIsDeploying(true);

    try {
      await deploymentsAPI.triggerDeployment(id, { branch: project.branch });
      setSuccessMsg('Deployment initiated! Build engine is processing artifacts.');
      await fetchProjectData();
      setActiveTab('deployments');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to trigger deployment. Please try again.'
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAddEnv = async (e) => {
    e.preventDefault();
    if (!envKey || !envValue) return;

    setAddingEnv(true);
    try {
      const res = await projectsAPI.addEnvVar(id, { key: envKey.trim(), value: envValue });
      setProject((prev) => ({ ...prev, environmentVariables: res.data.data }));
      setEnvKey('');
      setEnvValue('');
      setSuccessMsg('Environment variable added to project vault.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add environment variable.');
    } finally {
      setAddingEnv(false);
    }
  };

  const handleDeleteEnv = async (envId) => {
    try {
      const res = await projectsAPI.deleteEnvVar(id, envId);
      setProject((prev) => ({ ...prev, environmentVariables: res.data.data }));
    } catch (err) {
      setError('Failed to delete environment variable.');
    }
  };

  const toggleReveal = (envId) => {
    setRevealedEnvs((prev) => ({ ...prev, [envId]: !prev[envId] }));
  };

  const copyEnvValue = (envId, val) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(envId);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  if (loading) {
    return <LoadingSpinner text="Fetching Project Blueprint & History..." size="lg" />;
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Project not found or you are not authorized to view it.</p>
        <Link to="/projects" className="text-emerald-400 hover:underline mt-2 inline-block text-xs">
          Return to Projects
        </Link>
      </div>
    );
  }

  const latestDeployment = deployments[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Projects</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={`/projects/${project._id}/settings`}
            id="project-settings-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-medium text-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>

          <button
            onClick={handleTriggerDeploy}
            disabled={isDeploying || latestDeployment?.status === 'BUILDING'}
            id="deploy-project-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Rocket className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isDeploying ? 'Deploying...' : 'Deploy Project'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
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

      {/* Project Banner Header */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:text-white transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span>{project.repositoryName}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Branch:</span>
            <span className="font-mono text-slate-200">{project.branch}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">Framework:</span>
            <span className="text-slate-200">{project.framework}</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Created:</span>
            <span className="text-slate-200">
              {new Date(project.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          id="tab-overview"
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab('deployments')}
          id="tab-deployments"
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'deployments'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <span>Deployments</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {deployments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('env')}
          id="tab-env"
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'env'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Environment Variables</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
            {project.environmentVariables?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Latest Deployment Quick Card */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-xs font-semibold text-white tracking-tight">
                  Latest Deployment Status
                </span>
                <button
                  onClick={fetchProjectData}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Refresh status"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {latestDeployment ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {latestDeployment.version}
                    </span>
                    <StatusBadge status={latestDeployment.status} />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Commit:</span>
                      <span className="text-slate-300">{latestDeployment.commitHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Branch:</span>
                      <span className="text-slate-300">{latestDeployment.branch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Triggered:</span>
                      <span className="text-slate-300">
                        {new Date(latestDeployment.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('deployments')}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    View All Deployments ({deployments.length})
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">No deployments triggered yet.</p>
                  <button
                    onClick={handleTriggerDeploy}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                  >
                    <Rocket className="w-3 h-3" />
                    <span>Trigger First Deploy</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Environment Vault Summary */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-xs font-semibold text-white tracking-tight">
                  Environment Configuration
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {project.environmentVariables?.length || 0} variables
                </span>
              </div>

              {project.environmentVariables && project.environmentVariables.length > 0 ? (
                <div className="space-y-2">
                  {project.environmentVariables.slice(0, 3).map((env) => (
                    <div
                      key={env._id}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-emerald-400 font-semibold">{env.key}</span>
                      <span className="font-mono text-slate-400">••••••••</span>
                    </div>
                  ))}
                  <button
                    onClick={() => setActiveTab('env')}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Manage Environment Variables
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">No environment variables defined.</p>
                  <button
                    onClick={() => setActiveTab('env')}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Variable</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Deployments */}
      {activeTab === 'deployments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white tracking-tight">
              Deployment History
            </h2>
            <button
              onClick={handleTriggerDeploy}
              disabled={isDeploying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors"
            >
              <Rocket className="w-3 h-3 stroke-[2.5]" />
              <span>{isDeploying ? 'Queuing...' : 'Deploy Now'}</span>
            </button>
          </div>

          <DeploymentTable deployments={deployments} />
        </div>
      )}

      {/* Tab 3: Environment Variables */}
      {activeTab === 'env' && (
        <div className="space-y-6">
          {/* Add Env Variable Form */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white tracking-tight uppercase">
              Add New Environment Variable
            </h3>

            <form onSubmit={handleAddEnv} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="KEY (e.g. MONGO_URI)"
                  value={envKey}
                  onChange={(e) => setEnvKey(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="VALUE (e.g. your_secret_value_here)"
                  value={envValue}
                  onChange={(e) => setEnvValue(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-slate-400 outline-none transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={addingEnv}
                id="add-env-btn"
                className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{addingEnv ? 'Saving...' : 'Add Variable'}</span>
              </button>
            </form>
          </div>

          {/* Environment Variables Table */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white tracking-tight uppercase">
              Project Secrets & Configuration
            </h3>

            {project.environmentVariables && project.environmentVariables.length > 0 ? (
              <div className="divide-y divide-slate-800/80">
                {project.environmentVariables.map((env) => {
                  const isRevealed = revealedEnvs[env._id];
                  return (
                    <div
                      key={env._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="font-mono text-emerald-400 font-semibold block">
                          {env.key}
                        </span>
                        <span className="font-mono text-slate-300 text-[11px] truncate block mt-0.5">
                          {isRevealed ? env.value : '••••••••••••••••'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Reveal/Hide Button */}
                        <button
                          onClick={() => toggleReveal(env._id)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title={isRevealed ? 'Hide secret' : 'Show secret'}
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Copy Value Button */}
                        <button
                          onClick={() => copyEnvValue(env._id, env.value)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Copy Value"
                        >
                          {copiedKey === env._id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Variable Button */}
                        <button
                          onClick={() => handleDeleteEnv(env._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Delete Variable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                No environment variables configured yet for this project.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
