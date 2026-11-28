import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Sparkles,
  ArrowRight,
  Layers,
  FileText,
  GitBranch,
  Shield,
  Zap,
  Layout,
  Bot,
  SlidersHorizontal,
} from 'lucide-react';

const STANDALONE_TOOLBELT = [
  {
    label: 'Module Builder',
    description: 'Create a standalone data module, fields, and views.',
    icon: Layers,
    to: '/workspace/settings/platform-modules?newModule=true',
  },
  {
    label: 'Form Builder',
    description: 'Design an intake, workspace, or public portal form.',
    icon: FileText,
    to: '/workspace/settings/platform-modules/forms-library',
  },
  {
    label: 'Workflow Builder',
    description: 'Map approval stages, decisions, and lifecycle graphs.',
    icon: GitBranch,
    to: '/workspace/settings/platform-modules/workflows-library',
  },
  {
    label: 'Roles Builder',
    description: 'Configure RBAC policies, field masking, and AI guardrails.',
    icon: Shield,
    to: '/workspace/settings/platform-modules/roles-library',
  },
  {
    label: 'Automations',
    description: 'Set up event triggers, SLA escalations, and notifications.',
    icon: Zap,
    to: '/workspace/settings/platform-modules/automation-management',
  },
  {
    label: 'Page Builder',
    description: 'Compose custom dashboards and workspace pages.',
    icon: Layout,
    to: '/workspace/settings/pages',
  },
  {
    label: 'Agent Builder',
    description: 'Build an autonomous AI digital coworker.',
    icon: Bot,
    to: '/workspace/settings/platform-modules/agents',
  },
  {
    label: 'All 19 Builders',
    description: 'Browse the full Build & Customize toolbelt in Settings.',
    icon: SlidersHorizontal,
    to: '/workspace/settings',
  },
];

export const BuilderChoice: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950 px-6 py-10 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
            What would you like to build?
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Start outcome-first in Solution Studio, or jump directly into any standalone Aurora builder.
          </p>
        </div>

        {/* Hero Card: Solution Studio */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/70 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
              <Sparkles size={12} />
              <span>Recommended Front Door</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Boxes size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                  Solution Studio
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Describe a business system, upload SOPs or spreadsheets, test-drive a live working app in a safe sandbox, and deploy everything together.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">Reuses Platform Core first</span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">All 19 builders in context</span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">Safe draft & rollback</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => navigate('/workspace/settings/platform-modules/solutions?mode=studio')}
              className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Launch Solution Studio</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/workspace/settings/platform-modules/solutions')}
              className="h-9 px-4 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              Browse Saved Solutions
            </button>
          </div>
        </div>

        {/* Secondary Toolbelt: Standalone Builders */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Standalone Builders Toolbelt
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STANDALONE_TOOLBELT.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className="group text-left p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:shadow-sm transition-all cursor-pointer space-y-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/15 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                    <Icon size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                      {item.label}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
