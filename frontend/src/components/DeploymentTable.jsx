import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import { GitCommit, Clock, Terminal, Check, Copy } from 'lucide-react';

const DeploymentTable = ({ deployments = [] }) => {
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [copiedHash, setCopiedHash] = useState('');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(''), 2000);
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

  if (!deployments.length) {
    return (
      <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8">
        <Terminal className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-300 font-medium text-sm">No deployments yet</p>
        <p className="text-slate-400 text-xs mt-1">
          Trigger your first simulated deployment to view build artifacts and execution logs.
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
              <th className="py-3 px-4">Commit</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {deployments.map((dep) => (
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
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                    <GitCommit className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dep.commitHash || 'latest'}</span>
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
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={dep.status} />
                </td>
                <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(dep.createdAt)}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setSelectedDeployment(dep)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs transition-colors"
                  >
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    <span>View Logs</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deployment Log Viewer Modal */}
      <Modal
        isOpen={!!selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
        title={`Deployment Logs - ${selectedDeployment?.version} (${selectedDeployment?.commitHash})`}
        maxWidth="max-w-2xl"
      >
        {selectedDeployment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedDeployment.status} />
                <span className="text-slate-400 font-mono">
                  Branch: <strong className="text-white">{selectedDeployment.branch}</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Started: {new Date(selectedDeployment.startedAt || selectedDeployment.createdAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Terminal Window */}
            <div className="bg-[#050811] rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto max-h-72">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-900 text-slate-400 text-[10px]">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span>devpilot-build-agent@simulated-runner</span>
              </div>

              {selectedDeployment.logs && selectedDeployment.logs.length > 0 ? (
                <div className="space-y-1.5 text-slate-300">
                  {selectedDeployment.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <span className="text-slate-400 select-none text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-emerald-400 select-none">&gt;</span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))}
                  {selectedDeployment.status === 'BUILDING' && (
                    <div className="flex items-center gap-2 text-amber-400 pt-2 animate-pulse">
                      <span>&gt; Processing build pipeline...</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400">No logs emitted for this deployment run.</p>
              )}
            </div>

            <div className="flex justify-end">
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
