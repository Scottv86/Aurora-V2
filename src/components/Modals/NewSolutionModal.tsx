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

export interface NewSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectTemplate: (template: SolutionBlueprint) => void;
}

export const TEMPLATE_SOLUTIONS: SolutionBlueprint[] = [
  {
    id: 'sol_case_management',
    name: 'Enterprise Case & Incident Management',
    description: 'Pre-configured blueprint combining triage modules, SLA escalation workflows, intake forms, and resolution analytics.',
    category: 'Governance & Operations',
    version: 'v2.4.0',
    status: 'ACTIVE',
    modulesCount: 4,
    workflowsCount: 8,
    formsCount: 5,
    author: 'Aurora Platform Team',
    updatedAt: '2 hours ago',
    icon: 'Boxes',
    contextSources: [
      { id: 'src_1', name: 'Project_Vision.docx', type: 'docx', size: '245 KB', uploadedAt: '10 mins ago', status: 'PROCESSED', contentSummary: 'Enterprise incident management specification' },
      { id: 'src_2', name: 'Client_Form_Wireframe.png', type: 'png', size: '1.2 MB', uploadedAt: '8 mins ago', status: 'PROCESSED', contentSummary: 'Wireframe for intake form layout' },
      { id: 'src_3', name: 'CRM_Integration_Spec.pdf', type: 'pdf', size: '512 KB', uploadedAt: '5 mins ago', status: 'PROCESSED', contentSummary: 'API specification for CRM syncing' }
    ],
    connectedModules: [
      { id: 'mod_clients', name: 'Clients', type: 'RECORD', fieldsCount: 12, linked: true },
      { id: 'mod_services', name: 'Services', type: 'REGISTRY', fieldsCount: 8, linked: true },
      { id: 'mod_crm', name: 'CRM Integration', type: 'CUSTOM', fieldsCount: 6, linked: true }
    ],
    chatHistory: [
      {
        id: 'msg_1',
        role: 'aurora',
        text: "I've analyzed your context documents. Based on 'Project_Vision.docx', you need a multi-stage workflow with intake triage and automated SLA escalations. Let's start by reviewing the Client Onboarding Module and intake form.",
        timestamp: 'Just now',
        suggestedActions: ['Add custom field to form', 'Configure SLA escalation trigger', 'Connect CRM webhook']
      }
    ],
    artifacts: [
      {
        id: 'art_form_1',
        name: 'Client Intake Form',
        type: 'FORM',
        description: 'Interactive client onboarding intake form with dynamic dropdowns.',
        content: {
          title: 'Client Intake Form',
          subtitle: 'Full screen, well-designed built-in form components.',
          fields: [
            { id: 'f_fname', label: 'First Name', type: 'text', placeholder: 'Enter first name', required: true, colSpan: 6 },
            { id: 'f_lname', label: 'Last Name', type: 'text', placeholder: 'Enter last name', required: true, colSpan: 6 },
            { id: 'f_email', label: 'Email', type: 'email', placeholder: 'client@company.com', required: true, colSpan: 12 },
            { 
              id: 'f_tier', 
              label: 'Desired Service Tier', 
              type: 'select', 
              options: ['Standard Support', 'Premium Onboarding', 'Enterprise SLA'],
              colSpan: 12 
            }
          ]
        }
      },
      {
        id: 'art_flow_1',
        name: 'Automated Intake Flow',
        type: 'WORKFLOW',
        description: 'Multi-node visual workflow triggered on submission.',
        content: {
          nodes: [
            { id: 'node_1', label: 'Form Submitted', type: 'TRIGGER', status: 'completed' },
            { id: 'node_2', label: 'Assign Service', type: 'ACTION', status: 'active' },
            { id: 'node_3', label: 'Generate Welcome Pack', type: 'AUTOMATION', status: 'pending' }
          ]
        }
      }
    ],
    activeArtifactId: 'art_form_1'
  },
  {
    id: 'sol_onboarding_portal',
    name: 'Customer Onboarding & Intake Portal',
    description: 'Complete solution bundle with self-service public intake, identity validation rulesets, and automated welcome triggers.',
    category: 'Customer Experience',
    version: 'v1.8.2',
    status: 'ACTIVE',
    modulesCount: 3,
    workflowsCount: 5,
    formsCount: 6,
    author: 'Platform Architecture',
    updatedAt: '1 day ago',
    icon: 'Globe',
    contextSources: [],
    connectedModules: [
      { id: 'mod_customers', name: 'Customers', type: 'RECORD', fieldsCount: 15, linked: true },
      { id: 'mod_kyc', name: 'Identity Verification', type: 'REGISTRY', fieldsCount: 5, linked: true }
    ],
    chatHistory: [],
    artifacts: [
      {
        id: 'art_onb_form',
        name: 'Customer Registration Form',
        type: 'FORM',
        description: 'Self-service registration form',
        content: {
          title: 'Customer Self-Service Onboarding',
          subtitle: 'Verify identity and select product subscriptions.',
          fields: [
            { id: 'f_company', label: 'Company Name', type: 'text', required: true, colSpan: 12 },
            { id: 'f_contact', label: 'Primary Contact', type: 'text', required: true, colSpan: 12 }
          ]
        }
      }
    ],
    activeArtifactId: 'art_onb_form'
  },
  {
    id: 'sol_workforce_governance',
    name: 'Workforce Operations & Access Suite',
    description: 'Integrated organizational hierarchy, position assignment rules, synthetic member provisioning, and audit tracking.',
    category: 'HR & Workforce',
    version: 'v3.1.0',
    status: 'ACTIVE',
    modulesCount: 5,
    workflowsCount: 6,
    formsCount: 4,
    author: 'Governance Group',
    updatedAt: '3 days ago',
    icon: 'ShieldCheck',
    contextSources: [],
    connectedModules: [],
    chatHistory: [],
    artifacts: [],
    activeArtifactId: undefined
  },
  {
    id: 'sol_procurement_pipeline',
    name: 'Financial Audit & Procurement Pipeline',
    description: 'Multi-stage vendor registration, purchase order approval matrix, tax validation, and invoice document generation.',
    category: 'Finance & Compliance',
    version: 'v1.0.5',
    status: 'DRAFT',
    modulesCount: 3,
    workflowsCount: 4,
    formsCount: 3,
    author: 'Finance Ops',
    updatedAt: '5 days ago',
    icon: 'Package',
    contextSources: [],
    connectedModules: [],
    chatHistory: [],
    artifacts: [],
    activeArtifactId: undefined
  }
];

export const NewSolutionModal: React.FC<NewSolutionModalProps> = ({
  isOpen,
  onClose,
  onSelectBlank,
  onSelectTemplate
}) => {
  const [view, setView] = useState<'choices' | 'templates'>('choices');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setView('choices');
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredTemplates = TEMPLATE_SOLUTIONS.filter(t =>
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
            className="relative w-full max-w-3xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[32px] shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
          >
          {/* Ambient Radial Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20" />

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
