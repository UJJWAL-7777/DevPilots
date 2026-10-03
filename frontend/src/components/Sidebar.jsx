import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  PlusCircle,
  GitBranch,
  Settings,
  ShieldCheck,
  Server
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'New Project', path: '/projects/new', icon: PlusCircle }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-[#0c1220] border-r border-slate-800 flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          <div className="px-3 py-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Management
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="px-3 py-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Developer Features
              </p>
            </div>
            <div className="mt-2 space-y-1">
              <NavLink
                to="/settings/integrations"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <GitBranch className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Git Integration</span>
              </NavLink>
              <div className="flex items-center gap-3 px-3.5 py-2 text-xs text-slate-400 rounded-lg hover:bg-slate-800/40 cursor-default">
                <Server className="w-4 h-4 text-emerald-400/70" />
                <span>Simulated Cloud Edge</span>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-2 text-xs text-slate-400 rounded-lg hover:bg-slate-800/40 cursor-default">
                <ShieldCheck className="w-4 h-4 text-purple-400/70" />
                <span>Encrypted Env Vault</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom platform card */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
            <span>DevPilot Engine</span>
            <span className="text-[10px] text-emerald-400 font-mono">Phase 2</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Real GitHub synchronization, branch tracking, and push webhooks.
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
