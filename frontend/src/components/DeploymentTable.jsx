import React, { useState, useEffect, useRef } from 'react';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import { GitCommit, Clock, Terminal, Check, Copy, ExternalLink, XCircle, Timer, AlertTriangle } from 'lucide-react';

const DeploymentTable = ({ deployments = [], onCancelDeployment, repositoryUrl = '' }) => {
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [copiedHash, setCopiedHash] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const logsEndRef = useRef(null);

  // Sync selectedDeployment with incoming deployments prop for real-time log streaming in modal
  useEffect(() => {
    if (selectedDeployment) {
      const updated = deployments.find((d) => d._id === selectedDeployment._id);
      if (updated) {
        setSelectedDeployment(updated);
      }
    }
  }, [deployments]);

  // Auto-scroll logs to bottom as new logs arrive
  useEffect(() => {
    if (selectedDeployment && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedDeployment?.logs?.length]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(''), 2000);
  };

  const copyAllLogs = () => {
    if (!selectedDeployment?.logs) return;
    const logText = selectedDeployment.logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleCancel = async (deploymentId) => {
    if (!onCancelDeployment) return;
    setCancellingId(deploymentId);
    try {
      await onCancelDeployment(deploymentId);
    } finally {
      setCancellingId('');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (dep) => {
    if (dep.durationMs) {
      return `${(dep.durationMs / 1000).toFixed(1)}s`;
    }
    if (dep.startedAt && dep.completedAt) {
      const ms = new Date(dep.completedAt) - new Date(dep.startedAt);
      return `${(ms / 1000).toFixed(1)}s`;
    }
    if (['QUEUED', 'PREPARING', 'BUILDING', 'PUBLISHING'].includes(dep.status)) {
      return 'Running...';
    }
    return '--';
  };

  // Helper to extract clean GitHub commit URL
  const getCommitUrl = (commitHash) => {
    if (!repositoryUrl || !commitHash || commitHash === 'latest') return null;
    const cleanRepo = repositoryUrl.replace(/\.git$/, '');
    return `${cleanRepo}/commit/${commitHash}`;
  };

  if (!deployments.length) {
    return (
      <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8">
        <Terminal className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium text-sm">No deployments yet</p>
        <p className="text-slate-400 text-xs mt-1">
          Trigger your first deployment to run the build pipeline and publish your application.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4">Commit & Message</th>
              <th className="py-3 px-4">Trigger</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {deployments.map((dep) => {
              const commitUrl = getCommitUrl(dep.commitHash);
              const isActive = ['QUEUED', 'PREPARING', 'BUILDING', 'PUBLISHING'].includes(dep.status);

              return (
                <tr
                  key={dep._id}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                    {dep.version}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                    {dep.branch || 'main'}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                      <GitCommit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {commitUrl ? (
                        <a
                          href={commitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white hover:text-emerald-400 font-medium inline-flex items-center gap-1 transition-colors"
                          title="Open commit on GitHub"
                        >
                          <span>{dep.commitHash ? dep.commitHash.substring(0, 7) : 'latest'}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-white font-medium">
                          {dep.commitHash ? dep.commitHash.substring(0, 7) : 'latest'}
                        </span>
                      )}
                      <button
                        onClick={() => copyToClipboard(dep.commitHash || '')}
                        title="Copy Commit Hash"
                        className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-0.5 rounded"
                      >
                        {copiedHash === dep.commitHash ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    {dep.commitMessage && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5" title={dep.commitMessage}>
                        {dep.commitMessage}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {dep.trigger === 'WEBHOOK' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        Webhook
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={dep.status} />
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    <div className="flex items-center gap-1">
                      <Timer className="w-3 h-3 text-slate-400" />
                      <span>{formatDuration(dep)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(dep.createdAt)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      {dep.status === 'SUCCESS' && dep.deploymentUrl && (
                        <a
                          href={dep.deploymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-xs transition-colors border border-emerald-500/20"
                          title="Visit Published Site"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visit Site</span>
                        </a>
                      )}

                      {isActive && onCancelDeployment && (
                        <button
                          onClick={() => handleCancel(dep._id)}
                          disabled={cancellingId === dep._id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium text-xs transition-colors border border-rose-500/20 disabled:opacity-50"
                          title="Cancel Build"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>{cancellingId === dep._id ? 'Cancelling...' : 'Cancel'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedDeployment(dep)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs transition-colors"
                      >
                        <Terminal className="w-3 h-3 text-emerald-400" />
                        <span>View Logs</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Deployment Log Viewer Modal */}
      <Modal
        isOpen={!!selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
        title={`Deployment Logs - ${selectedDeployment?.version} (${selectedDeployment?.commitHash ? selectedDeployment.commitHash.substring(0, 7) : 'latest'})`}
        maxWidth="max-w-3xl"
      >
        {selectedDeployment && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs gap-2">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedDeployment.status} />
                <span className="text-slate-400 font-mono">
                  Branch: <strong className="text-white">{selectedDeployment.branch}</strong>
                </span>
                <span className="text-slate-400 font-mono">
                  Duration: <strong className="text-white">{formatDuration(selectedDeployment)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedDeployment.status === 'SUCCESS' && selectedDeployment.deploymentUrl && (
                  <a
                    href={selectedDeployment.deploymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium text-xs border border-emerald-500/30 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Live Site</span>
                  </a>
                )}
                <button
                  onClick={copyAllLogs}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
                  title="Copy full logs"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
                </button>
              </div>
            </div>

            {/* If Failed, show error callout */}
            {selectedDeployment.status === 'FAILED' && selectedDeployment.error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Build Failed:</strong>
                  <span className="font-mono text-[11px] break-all">{selectedDeployment.error}</span>
                </div>
              </div>
            )}

            {/* Terminal Window */}
            <div className="bg-[#050811] rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto max-h-96">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-900 text-slate-400 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span>devpilot-worker-agent@isolated-workspace</span>
                </div>
                <span>{selectedDeployment.logs?.length || 0} log lines</span>
              </div>

              {selectedDeployment.logs && selectedDeployment.logs.length > 0 ? (
                <div className="space-y-1 text-slate-300">
                  {selectedDeployment.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="text-slate-400 select-none text-[10px] shrink-0 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-emerald-400 select-none shrink-0">&gt;</span>
                      <span className="break-all whitespace-pre-wrap">{log.message}</span>
                    </div>
                  ))}
                  {['QUEUED', 'PREPARING', 'BUILDING', 'PUBLISHING'].includes(selectedDeployment.status) && (
                    <div className="flex items-center gap-2 text-amber-400 pt-2 animate-pulse">
                      <span>&gt; Processing stage: {selectedDeployment.status}...</span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              ) : (
                <p className="text-slate-400">Waiting for runner logs to emit...</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Started: {new Date(selectedDeployment.startedAt || selectedDeployment.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DeploymentTable;
