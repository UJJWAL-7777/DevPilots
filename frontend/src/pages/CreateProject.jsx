import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { projectsAPI, githubAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FolderPlus,
  Github,
  GitBranch,
  Layers,
  AlertCircle,
  ArrowLeft,
  Check,
  Search,
  ExternalLink,
  GitCommit,
  Sparkles,
  RefreshCw
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

  // GitHub Integration state
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [gitHubUsername, setGitHubUsername] = useState('');
  const [repos, setRepos] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [latestCommit, setLatestCommit] = useState(null);
  const [loadingGitHub, setLoadingGitHub] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [inputMode, setInputMode] = useState('github'); // 'github' | 'manual'

  useEffect(() => {
    const initializeGitHub = async () => {
      try {
        const statusRes = await githubAPI.getStatus();
        if (statusRes.data.data.connected) {
          setIsGitHubConnected(true);
          setGitHubUsername(statusRes.data.data.username);
          setInputMode('github');

          // Load user repos
          const reposRes = await githubAPI.getRepos();
          setRepos(reposRes.data.data || []);
        } else {
          setIsGitHubConnected(false);
          setInputMode('manual');
        }
      } catch (err) {
        console.warn('[GitHub Init Notice] GitHub not connected or unavailable:', err.message);
        setInputMode('manual');
      } finally {
        setLoadingGitHub(false);
      }
    };

    initializeGitHub();
  }, []);

  // When user selects a repository from GitHub dropdown
  const handleSelectRepository = async (repo) => {
    setSelectedRepo(repo);
    setBranches([]);
    setLatestCommit(null);

    setFormData((prev) => ({
      ...prev,
      name: prev.name || repo.name,
      repositoryName: repo.name,
      repositoryUrl: repo.htmlUrl,
      description: prev.description || repo.description || '',
      branch: repo.defaultBranch || 'main'
    }));

    // Fetch branches for this repo
    setLoadingBranches(true);
    try {
      const branchesRes = await githubAPI.getBranches(repo.owner, repo.name);
      const branchList = branchesRes.data.data || [];
      setBranches(branchList);

      // Fetch latest commit for default branch
      fetchLatestCommit(repo.owner, repo.name, repo.defaultBranch || 'main');
    } catch (err) {
      console.error('[Fetch Branches Error]', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleBranchChange = (e) => {
    const newBranch = e.target.value;
    setFormData((prev) => ({ ...prev, branch: newBranch }));

    if (selectedRepo) {
      fetchLatestCommit(selectedRepo.owner, selectedRepo.name, newBranch);
    }
  };

  const fetchLatestCommit = async (owner, repo, branch) => {
    try {
      const commitsRes = await githubAPI.getCommits(owner, repo, branch);
      if (commitsRes.data.data && commitsRes.data.data.length > 0) {
        setLatestCommit(commitsRes.data.data[0]);
      } else {
        setLatestCommit(null);
      }
    } catch {
      setLatestCommit(null);
    }
  };

  // Manual URL input fallback
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

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

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
          Connect your GitHub repository, configure target branches, and prepare deployment pipeline.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* GitHub Integration Status Banner */}
      {!loadingGitHub && !isGitHubConnected && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Github className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Connect your GitHub account to auto-select repositories and branches directly from the GitHub API.
            </span>
          </div>
          <Link
            to="/settings/integrations"
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs whitespace-nowrap self-start sm:self-auto"
          >
            Connect GitHub
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Control (GitHub) Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-300" />
              <span>Source Control (GitHub)</span>
            </h2>

            {isGitHubConnected && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('github')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    inputMode === 'github'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GitHub Selector
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    inputMode === 'manual'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual URL
                </button>
              </div>
            )}
          </div>

          {/* Mode 1: Real GitHub Selector */}
          {inputMode === 'github' && isGitHubConnected ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Repository ({gitHubUsername})
                </label>

                {/* Repository Search input */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search repositories (e.g. TestingRepo)..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-400 outline-none"
                  />
                </div>

                {/* Repositories List */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-2">
                  {filteredRepos.length > 0 ? (
                    filteredRepos.map((repo) => {
                      const isSelected = selectedRepo?.id === repo.id;
                      return (
                        <div
                          key={repo.id}
                          onClick={() => handleSelectRepository(repo)}
                          className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-white'
                              : 'hover:bg-slate-800/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Github className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="font-mono font-medium truncate">{repo.fullName}</span>
                            {repo.private && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400">
                                Private
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center py-4 text-xs text-slate-400">
                      No matching repositories found on GitHub.
                    </p>
                  )}
                </div>
              </div>

              {/* Branch Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="branch">
                    Production Branch
                  </label>
                  {loadingBranches ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Loading real branches from GitHub...</span>
                    </div>
                  ) : branches.length > 0 ? (
                    <div className="relative">
                      <GitBranch className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        id="branch"
                        name="branch"
                        value={formData.branch}
                        onChange={handleBranchChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white outline-none font-mono"
                      >
                        {branches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name} {b.protected ? '(Protected)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="relative">
                      <GitBranch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="branch"
                        name="branch"
                        type="text"
                        placeholder="main"
                        value={formData.branch}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Latest Commit Preview */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Latest Commit on Branch
                  </label>
                  {latestCommit ? (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                          <GitCommit className="w-3.5 h-3.5" />
                          {latestCommit.shortSha}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {latestCommit.author}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate">{latestCommit.message}</p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                      Select a repository to preview commit.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Manual Git URL input */
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
                    placeholder="https://github.com/UJJWAL-7777/TestingRepo"
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
          )}
        </div>

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
                placeholder="e.g. TestingRepo App"
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
                placeholder="e.g. TestingRepo"
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
