import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { githubAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Unlink,
  Link as LinkIcon,
  ShieldCheck,
  Webhook,
  Copy,
  Check
} from 'lucide-react';

const Integrations = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingCode, setIsProcessingCode] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await githubAPI.getStatus();
      setStatus(res.data.data);
    } catch (err) {
      console.error('[Integrations fetch status error]', err);
      setError('Unable to fetch GitHub integration status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      // User redirected back from GitHub OAuth
      handleOAuthCode(code);
    } else {
      fetchStatus();
    }
  }, []);

  const handleOAuthCode = async (code) => {
    setIsProcessingCode(true);
    setError('');
    try {
      const res = await githubAPI.sendCallback(code);
      setStatus(res.data.data);
      setSuccessMsg('GitHub account successfully linked to DevPilot!');
      // Clear code from URL without full reload
      setSearchParams({});
    } catch (err) {
      console.error('[OAuth callback error]', err);
      setError(err.response?.data?.message || 'Failed to exchange GitHub authorization code.');
    } finally {
      setIsProcessingCode(false);
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setError('');
    try {
      const res = await githubAPI.getAuthUrl();
      if (res.data.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to initialize GitHub OAuth. Ensure GITHUB_CLIENT_ID is configured in backend/.env'
      );
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await githubAPI.disconnect();
      setStatus({ connected: false, username: null, avatarUrl: null });
      setShowDisconnectModal(false);
      setSuccessMsg('GitHub account disconnected successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disconnect GitHub.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loading || isProcessingCode) {
    return (
      <LoadingSpinner
        text={isProcessingCode ? 'Linking GitHub Credentials...' : 'Checking Integration Vault...'}
        size="lg"
      />
    );
  }

  const webhookEndpoint = `${window.location.protocol}//${window.location.hostname}:5000/api/github/webhook`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Github className="w-6 h-6 text-emerald-400" />
          <span>Git Integrations</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Connect your GitHub account to import repositories, auto-fetch branches, and trigger automated push webhooks.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Connection Card */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white">
              <Github className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">GitHub Integration</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official GitHub REST API & Webhook synchronization
              </p>
            </div>
          </div>

          <div>
            {status?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected ✓
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Not Connected
              </span>
            )}
          </div>
        </div>

        {status?.connected ? (
          /* Connected State Details */
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-3">
                {status.avatarUrl ? (
                  <img
                    src={status.avatarUrl}
                    alt={status.username}
                    className="w-10 h-10 rounded-full border border-emerald-500/30 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold">
                    {status.username?.charAt(0).toUpperCase() || 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono">{status.username}</span>
                    <a
                      href={`https://github.com/${status.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white"
                      title="View GitHub Profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Connected:{' '}
                    {status.connectedAt
                      ? new Date(status.connectedAt).toLocaleDateString()
                      : 'Active'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDisconnectModal(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Scope / Security verification badge */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Tokens stored securely on backend with strict database exclusion (<code className="font-mono">select: false</code>). No tokens exposed to client.
              </span>
            </div>
          </div>
        ) : (
          /* Disconnected State Callout */
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Linking your GitHub account grants DevPilot read-only repository inspection to list branches, fetch real commit messages, and subscribe to push webhooks.
            </p>

            <button
              onClick={handleConnect}
              id="connect-github-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Github className="w-4 h-4 fill-current" />
              <span>Connect GitHub</span>
            </button>
          </div>
        )}
      </div>

      {/* Webhook Configuration Guide Card */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <Webhook className="w-4 h-4 text-sky-400" />
          <span>GitHub Webhook Configuration (Push Events)</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configure a webhook in your GitHub repository (<code className="font-mono text-slate-300">https://github.com/UJJWAL-7777/TestingRepo/settings/hooks</code>) to automatically trigger deployments whenever you push to <code className="font-mono text-slate-300">main</code>.
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
            <div className="truncate">
              <span className="text-slate-400 select-none block text-[10px]">PAYLOAD URL:</span>
              <span className="text-emerald-400 truncate">{webhookEndpoint}</span>
            </div>
            <button
              onClick={() => copyToClipboard(webhookEndpoint)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
              title="Copy Payload URL"
            >
              {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">CONTENT TYPE:</span>
              <span className="text-slate-200">application/json</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">SECRET:</span>
              <span className="text-slate-200">Matches GITHUB_WEBHOOK_SECRET in .env</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Modal */}
      <Modal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        title="Disconnect GitHub Account"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to disconnect your GitHub account (<strong className="text-white">{status?.username}</strong>)?
            Existing projects will not be deleted, but auto-discovery and webhook verification will be disabled until you reconnect.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowDisconnectModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Confirm Disconnect'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Integrations;
