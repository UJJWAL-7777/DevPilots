import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { GitBranch, Github, Layers, ArrowUpRight, Calendar } from 'lucide-react';

const ProjectCard = ({ project }) => {
  const formattedDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recently';

  return (
    <div className="glass-card rounded-xl p-5 flex flex-col justify-between group hover:border-slate-700 transition-all duration-200">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <Link
              to={`/projects/${project._id}`}
              className="font-semibold text-white text-base hover:text-emerald-400 transition-colors truncate block group-hover:translate-x-0.5 transform duration-150"
            >
              {project.name}
            </Link>
            {project.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>

        {/* Repository details */}
        <div className="space-y-2 mt-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <Github className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-200 truncate hover:underline flex items-center gap-1 font-mono text-[11px]"
            >
              <span>{project.repositoryName || project.repositoryUrl}</span>
              <ArrowUpRight className="w-3 h-3 shrink-0 opacity-60" />
            </a>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 font-mono text-slate-400">
              <GitBranch className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{project.branch || 'main'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{project.framework || 'React'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
          <Calendar className="w-3 h-3 text-slate-400" />
          {formattedDate}
        </span>

        <Link
          to={`/projects/${project._id}`}
          className="inline-flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 transition-colors group/btn"
        >
          <span>View Project</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default ProjectCard;
