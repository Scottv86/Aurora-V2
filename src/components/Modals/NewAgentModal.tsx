import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bot, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  CreditCard, 
  ShieldCheck, 
  Headphones, 
  GitFork, 
  Wrench, 
  BookOpen 
} from 'lucide-react';
import { AgentBlueprint } from '../../types/agent';
import { createDefaultAgentBlueprint, DEFAULT_AGENT_TOOLS } from '../../services/agentBuilderService';

export interface NewAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectTemplate: (template: AgentBlueprint) => void;
}

export const TEMPLATE_AGENTS: AgentBlueprint[] = [
  {
    id: 'agent_tpl_disputes',
    name: 'Invoice & Dispute Specialist',
    roleTitle: 'Financial Triage & Disputes Analyst',
    description: 'Inspects payment histories, reconciles transaction discrepancies in Stripe, and drafts resolution proposals.',
    status: 'ACTIVE',
    version: 'v1.0.0',
    updatedAt: new Date().toISOString(),
    modelConfig: {
      model: 'gemini-2.5-flash',
      temperature: 0.15,
      topP: 0.95,
      maxOutputTokens: 2048,
      systemPersona: 'Financial auditor with strict adherence to payment terms and accuracy.'
    },
    systemInstructions: `You are an autonomous Financial Dispute Specialist in Aurora.
Your duties:
1. Inspect invoice records and transaction status via Stripe and the Platform DB.
2. Cross-reference customer billing claims against actual transaction logs.
3. If refund amount > $500, flag for Human Supervisor sign-off.
4. Provide clear breakdown of disputed line items and resolution recommendations.`,
    fewShotExamples: [
      {
        id: 'ex_1',
        userInput: 'Review dispute for transaction tx_88192 for $320.',
        expectedThought: 'Query Stripe connector for tx_88192 and check refund eligibility.',
        expectedOutput: 'Transaction tx_88192 ($320.00) confirmed. Eligible for automated refund under standard 30-day policy.'
      }
    ],
    knowledgeSources: [],
    tools: DEFAULT_AGENT_TOOLS.map(t => ({
      ...t,
      enabled: t.id === 'tool_db_query' || t.id === 'tool_stripe_connector' || t.id === 'tool_doc_parser'
    })),
    guardrails: {
      confidenceThreshold: 0.90,
      requireHumanApproval: true,
      approvalThresholdAmount: 500,
      readOnlyMode: false,
      maxTokensPerExecution: 4096,
      allowedDomains: ['api.stripe.com', 'aurora.platform'],
      sensitiveDataFilter: true
    },
    workforceMapping: {
      role: 'Financial Specialist',
      licenceType: 'AI Agent Seat',
      teamName: 'Finance Squad'
    }
  },
  {
    id: 'agent_tpl_support',
    name: 'Customer Intake & Support Copilot',
    roleTitle: 'Tier-1 Support & Routing Specialist',
    description: 'Triage customer inquiries, categorize urgency, summarize technical issues, and route to specialized teams.',
    status: 'ACTIVE',
    version: 'v1.0.0',
    updatedAt: new Date().toISOString(),
    modelConfig: {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      topP: 0.95,
      maxOutputTokens: 2048,
      systemPersona: 'Empathetic, structured, prompt, and solutions-oriented.'
    },
    systemInstructions: `You are the Aurora Customer Intake & Support Copilot.
Your duties:
1. Analyze user bug reports, feature requests, and account inquiries.
2. Categorize urgency (P1 Critical, P2 High, P3 Normal).
3. Search knowledge base for existing solutions before escalating.
4. Notify assigned operational teams via Slack.`,
    fewShotExamples: [],
    knowledgeSources: [],
    tools: DEFAULT_AGENT_TOOLS.map(t => ({
      ...t,
      enabled: t.id === 'tool_db_query' || t.id === 'tool_slack_notify' || t.id === 'tool_workflow_dispatch'
    })),
    guardrails: {
      confidenceThreshold: 0.80,
      requireHumanApproval: false,
      readOnlyMode: false,
      maxTokensPerExecution: 2048,
      allowedDomains: ['aurora.platform', 'api.slack.com'],
      sensitiveDataFilter: true
    },
    workforceMapping: {
      role: 'Support Copilot',
      licenceType: 'AI Agent Seat',
      teamName: 'Customer Support'
    }
  },
  {
    id: 'agent_tpl_compliance',
    name: 'Compliance & SOP Auditor',
    roleTitle: 'Regulatory Compliance Inspector',
    description: 'Audits records against ISO/HIPAA regulations and uploaded corporate standard operating procedures.',
    status: 'ACTIVE',
    version: 'v1.0.0',
    updatedAt: new Date().toISOString(),
    modelConfig: {
      model: 'gemini-2.5-pro',
      temperature: 0.1,
      topP: 0.90,
      maxOutputTokens: 4096,
      systemPersona: 'Rigorous compliance officer with zero tolerance for policy gaps.'
    },
    systemInstructions: `You are an autonomous Compliance & SOP Auditor.
Your duties:
1. Evaluate platform records against company SOPs and regulatory frameworks.
2. Identify missing mandatory fields, expired certifications, and unauthorized data disclosures.
3. Generate structured audit finding logs.`,
    fewShotExamples: [],
    knowledgeSources: [],
    tools: DEFAULT_AGENT_TOOLS.map(t => ({
      ...t,
      enabled: t.id === 'tool_doc_parser' || t.id === 'tool_db_query'
    })),
    guardrails: {
      confidenceThreshold: 0.95,
      requireHumanApproval: true,
      readOnlyMode: true,
      maxTokensPerExecution: 8192,
      allowedDomains: ['aurora.platform'],
      sensitiveDataFilter: true
    },
    workforceMapping: {
      role: 'Compliance Officer',
      licenceType: 'AI Agent Seat',
      teamName: 'Legal & Risk'
    }
  }
];

export const NewAgentModal: React.FC<NewAgentModalProps> = ({
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

  const filteredTemplates = TEMPLATE_AGENTS.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.roleTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const modalNode = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="new-agent-modal-container" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 relative z-10 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Bot size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                    {view === 'templates' ? 'Agent Template Library' : 'Create Autonomous Agent'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {view === 'templates'
                      ? 'Select a pre-configured AI coworker archetype to customize in the studio.'
                      : 'Choose how you want to initiate your new digital coworker.'}
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

            {/* Body */}
            <div className="p-8 overflow-y-auto">
              {view === 'choices' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Start Blank Agent */}
                  <div
                    onClick={onSelectBlank}
                    className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                        Build with Agent Architect
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                        Start with a blank canvas and use conversational AI co-pilot in the 3-pane Studio to construct persona, tools, and guardrails.
                      </p>
                    </div>

                    <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                      <span>Launch Studio</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>

                  {/* Choose Template */}
                  <div
                    onClick={() => setView('templates')}
                    className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Bot size={24} />
                      </div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                        Choose Pre-Built Template
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                        Pick a specialized agent archetype (Financial Disputes, Support Triage, SOP Compliance) with pre-wired tools and safety rules.
                      </p>
                    </div>

                    <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                      <span>Browse Templates</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ) : (
                /* Templates View */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setView('choices')}
                      className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3.5 top-3 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search agent templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pt-2">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className="p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer group flex items-start justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                            <Bot size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {template.name}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                {template.modelConfig.model}
                              </span>
                            </div>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                              {template.roleTitle}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                              {template.description}
                            </p>
                          </div>
                        </div>

                        <button className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                          Use Template
                        </button>
                      </div>
                    ))}
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
