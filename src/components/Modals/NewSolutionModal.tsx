import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Boxes, 
  LayoutGrid, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Sparkles,
  Layers,
  GitBranch,
  FileText
} from 'lucide-react';
import { SolutionBlueprint } from '../../types/solutions';
import { usePlatform } from '../../hooks/usePlatform';
import { queryTemplateCatalog, getTemplateById, getCachedTemplateCatalog } from '../../services/templateService';

export interface NewSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectTemplate: (template: SolutionBlueprint) => void;
}

export const TEMPLATE_SOLUTIONS: SolutionBlueprint[] = [
  {
    id: 'sol_tpl_support_ops',
    name: 'Customer Support & Incident Escalation Suite',
    description: 'End-to-end customer support ticket intake, AI triage copilot, escalation workflow, and SLA resolution tracking.',
    category: 'Customer Operations',
    version: 'v1.0.0',
    status: 'ACTIVE',
    modulesCount: 2,
    workflowsCount: 1,
    formsCount: 1,
    agentsCount: 1,
    metricsCount: 1,
    artifactsCount: 4,
    author: 'Aurora System',
    updatedAt: new Date().toISOString(),
    contextSources: [],
    connectedModules: [
      { id: 'service-requests', name: 'Service Requests', type: 'WORK_ITEM', fieldsCount: 5, linked: true },
      { id: 'people_org', name: 'People & Organisation', type: 'RECORD', fieldsCount: 4, linked: true }
    ],
    artifacts: [
      {
        id: 'art_form_intake',
        name: 'Customer Support Ticket Intake',
        type: 'FORM',
        description: 'Priority support request intake with issue classification.',
        content: {
          layout: [
            { id: 'user_email', label: 'Requester Email', type: 'email', required: true, colSpan: 6 },
            { id: 'category', label: 'Issue Category', type: 'select', options: ['Billing', 'Bug Report', 'Feature Request', 'Account Access'], required: true, colSpan: 6 },
            { id: 'priority', label: 'Urgency', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], required: true, colSpan: 6 },
            { id: 'subject', label: 'Summary', type: 'text', required: true, colSpan: 6 },
            { id: 'issue', label: 'Detailed Description', type: 'textarea', required: true, colSpan: 12 }
          ]
        }
      },
      {
        id: 'art_agent_support',
        name: 'Support & Triage Copilot',
        type: 'AGENT',
        description: 'Autonomous Tier-1 support agent that categorizes tickets, suggests resolution steps, and alerts Slack.',
        content: {
          roleTitle: 'Tier-1 Support & Routing Specialist',
          modelConfig: { model: 'gemini-2.5-flash', temperature: 0.2 },
          systemInstructions: 'Triage customer inquiries, categorize urgency, summarize technical issues, and route to specialized squads.'
        }
      },
      {
        id: 'art_flow_escalation',
        name: 'Ticket Triage & Escalation Pipeline',
        type: 'WORKFLOW',
        description: 'Automated status progression and escalation path for high-priority support issues.',
        content: {
          nodes: [
            { id: 'n1', label: 'Form Submitted', type: 'TRIGGER', status: 'completed' },
            { id: 'n2', label: 'Run AI Urgency Classification', type: 'ACTION', status: 'active' },
            { id: 'n3', label: 'Assign Support Specialist', type: 'ACTION', status: 'pending' }
          ]
        }
      },
      {
        id: 'art_kpi_sla',
        name: 'First Response SLA Rate',
        type: 'KPI',
        description: 'Percentage of customer tickets receiving initial response within 1 hour.',
        content: {
          targetValue: 95,
          trendDirection: 'higher_is_better',
          timeHorizon: 'trailing_30d'
        }
      }
    ]
  },
  {
    id: 'sol_tpl_financial_disputes',
    name: 'Financial Dispute Triage & Reconciliation Hub',
    description: 'Inspect transaction discrepancies, coordinate Stripe reconciliation, and enforce human sign-off for large refunds.',
    category: 'Financial Services & Fintech',
    version: 'v1.0.0',
    status: 'ACTIVE',
    modulesCount: 2,
    workflowsCount: 1,
    formsCount: 1,
    agentsCount: 1,
    metricsCount: 1,
    artifactsCount: 4,
    author: 'Aurora System',
    updatedAt: new Date().toISOString(),
    contextSources: [],
    connectedModules: [
      { id: 'invoices', name: 'Invoices & Disputes', type: 'FINANCIAL', fieldsCount: 6, linked: true },
      { id: 'people_org', name: 'Clients & Accounts', type: 'RECORD', fieldsCount: 4, linked: true }
    ],
    artifacts: [
      {
        id: 'art_form_dispute',
        name: 'Billing Dispute Intake Form',
        type: 'FORM',
        description: 'Collect transaction ID, disputed charge amount, and client statement.',
        content: {
          layout: [
            { id: 'tx_id', label: 'Transaction / Charge ID', type: 'text', required: true, colSpan: 6 },
            { id: 'dispute_amount', label: 'Disputed Amount ($)', type: 'number', required: true, colSpan: 6 },
            { id: 'reason', label: 'Dispute Reason', type: 'select', options: ['Duplicate Charge', 'Unrecognized Charge', 'Service Not Received', 'Incorrect Amount'], required: true, colSpan: 12 },
            { id: 'details', label: 'Dispute Details', type: 'textarea', required: true, colSpan: 12 }
          ]
        }
      },
      {
        id: 'art_agent_disputes',
        name: 'Invoice & Dispute Analyst',
        type: 'AGENT',
        description: 'Autonomous financial auditor cross-referencing ledger records and flagging high-value refunds for approval.',
        content: {
          roleTitle: 'Financial Triage & Disputes Analyst',
          modelConfig: { model: 'gemini-2.5-flash', temperature: 0.15 },
          guardrails: { requireHumanApproval: true, approvalThresholdAmount: 500 }
        }
      },
      {
        id: 'art_flow_dispute_approval',
        name: 'Dispute Review & Sign-Off Pipeline',
        type: 'WORKFLOW',
        description: 'Approval pipeline routing disputes above $500 to Finance Supervisor.',
        content: {
          nodes: [
            { id: 'w1', label: 'Dispute Lodged', type: 'TRIGGER', status: 'completed' },
            { id: 'w2', label: 'Automated Ledger Reconciliation', type: 'ACTION', status: 'active' },
            { id: 'w3', label: 'Supervisor Sign-off', type: 'DECISION', status: 'pending' }
          ]
        }
      },
      {
        id: 'art_kpi_resolution',
        name: 'Dispute Recovery & Resolution Time',
        type: 'KPI',
        description: 'Average business days taken to resolve payment disputes.',
        content: {
          targetValue: 2,
          trendDirection: 'lower_is_better',
          timeHorizon: 'trailing_30d'
        }
      }
    ]
  }
];

export const NewSolutionModal: React.FC<NewSolutionModalProps> = ({
  isOpen,
  onClose,
  onSelectBlank,
  onSelectTemplate
}) => {
  const { tenant } = usePlatform();
  const [view, setView] = useState<'choices' | 'templates'>('choices');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<SolutionBlueprint[]>(() => {
    const cached = getCachedTemplateCatalog({ builderType: 'SOLUTION', includePayload: true }, tenant?.id);
    if (cached?.templates && cached.templates.length > 0) {
      return cached.templates.map((t: any) => {
        const p = (t.payload || t.schemaPayload) || {};
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          version: t.version || 'v1.0.0',
          status: 'ACTIVE',
          modulesCount: p.modulesCount || 2,
          workflowsCount: p.workflowsCount || 1,
          formsCount: p.formsCount || 1,
          agentsCount: p.agentsCount || 1,
          metricsCount: p.metricsCount || 1,
          artifactsCount: p.artifactsCount || 4,
          author: 'Aurora System',
          updatedAt: (t as any).updatedAt || new Date().toISOString(),
          contextSources: [] as any[],
          connectedModules: p.connectedModules || [],
          artifacts: p.artifacts || []
        };
      });
    }
    return TEMPLATE_SOLUTIONS;
  });

  React.useEffect(() => {
    if (isOpen) {
      setView('choices');
      setSearchQuery('');

      queryTemplateCatalog({ builderType: 'SOLUTION', includePayload: true }, undefined, tenant?.id)
        .then(async (res) => {
          if (res.templates && res.templates.length > 0) {
            const loaded: SolutionBlueprint[] = await Promise.all(
              res.templates.map(async (t) => {
                const full = await getTemplateById(t.id, undefined, tenant?.id);
                const p = full?.payload || {};
                return {
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  category: t.category,
                  version: t.version || 'v1.0.0',
                  status: 'ACTIVE',
                  modulesCount: p.modulesCount || 2,
                  workflowsCount: p.workflowsCount || 1,
                  formsCount: p.formsCount || 1,
                  agentsCount: p.agentsCount || 1,
                  metricsCount: p.metricsCount || 1,
                  artifactsCount: p.artifactsCount || 4,
                  author: 'Aurora System',
                  updatedAt: (t as any).updatedAt || new Date().toISOString(),
                  contextSources: [] as any[],
                  connectedModules: p.connectedModules || [],
                  artifacts: p.artifacts || []
                };
              })
            );
            setTemplates(loaded);
          }
        })
        .catch((err) => {
          console.warn('[NewSolutionModal] Failed loading remote solution templates, using local fallback:', err);
        });
    }
  }, [isOpen, tenant?.id]);

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalNode = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="new-solution-modal-container" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Modal Window Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
          >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  {view === 'templates' ? 'Solution Template Library' : 'Create Solution Blueprint'}
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  {view === 'templates'
                    ? 'Select a pre-configured solution bundle to customize in the studio.'
                    : 'Choose how you want to initiate your multi-module application solution.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar relative z-10">
            {view === 'choices' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* 1. Start Blank */}
                <div
                  onClick={onSelectBlank}
                  className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Boxes size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        Blank Solution
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Start Blank Canvas</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Start fresh. Upload your project vision documents, wireframes, and specs, then prompt Aurora AI to build your full solution.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <span>Open Solution Builder Studio</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>

                {/* 2. Start from Template */}
                <div
                  onClick={() => setView('templates')}
                  className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-500/30 dark:hover:border-amber-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LayoutGrid size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        Prebuilt Blueprint
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Start from Blueprint Template</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Choose an enterprise solution blueprint (Incident Management, Intake Portal, Workforce Governance) and customize.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Browse Solution Blueprints</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setView('choices')}
                    className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Options</span>
                  </button>

                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search solution templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => onSelectTemplate(template)}
                      className="p-5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex flex-col justify-between gap-4 hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                          <Boxes size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                              {template.name}
                            </h4>
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              {template.version}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] font-medium text-zinc-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Layers size={13} className="text-indigo-500" /> {template.modulesCount} Modules
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch size={13} className="text-teal-500" /> {template.workflowsCount} Flows
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText size={13} className="text-purple-500" /> {template.formsCount} Forms
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-500 font-bold group-hover:translate-x-1 transition-transform">
                          <span>Use Blueprint</span>
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredTemplates.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-zinc-400 text-xs">
                      No solution templates match "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
