import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Bot, 
  Shield, 
  Mail, 
  ArrowRight, 
  Sparkles,
  Briefcase,
  UserPlus,
  Smile,
  CheckCircle2,
  HardHat,
  BookOpen,
  Cpu,
  Loader2,
  Check,
  HelpCircle
} from 'lucide-react';
import { Button, Input, Select, cn } from '../../UI/Primitives';
import { Modal } from '../../UI/TabsAndModal';
import { useUsers, TenantMember } from '../../../hooks/useUsers';
import { useTeams } from '../../../hooks/useTeams';
import { usePositions } from '../../../hooks/usePositions';
import { usePlatform } from '../../../hooks/usePlatform';
import { generateTrainingQuestions, compileAgentDirectives, generateAgentAvatar } from '../../../services/aiService';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  cloneFrom?: TenantMember | null;
  defaultType?: 'human' | 'agent';
}

type WizardStep = 'type' | 'identity' | 'knowledge_connect' | 'ai_interview' | 'placement' | 'governance' | 'ai_config' | 'summary';

const SYSTEM_AGENTS = [
  {
    id: 'sec-auditor',
    name: 'Aurora Security Auditor',
    role: 'Security Auditor',
    modelType: 'Gemini 2.0 Flash',
    systemPrompt: 'You are the Aurora Security Auditor. Your primary responsibility is monitoring permission assignments, audit logs, and security compliance. You automatically detect privilege escalations and alert security administrators. You have read-only access to platform modules.',
    description: 'Monitors platform logs, permission updates, and alerts on anomalies.'
  },
  {
    id: 'db-analyzer',
    name: 'Database Schema Analyzer',
    role: 'Database Architect',
    modelType: 'Gemini 1.5 Pro',
    systemPrompt: 'You are the Database Schema Analyzer. Your role is inspecting database structures, indexes, performance traces, and query statistics. You provide suggestions for optimization and detect potential query bottlenecks.',
    description: 'Inspects indices, query speed, and suggests schema improvements.'
  },
  {
    id: 'task-scheduler',
    name: 'Auto-Scheduler Worker',
    role: 'Operations Coordinator',
    modelType: 'Gemini 2.0 Flash',
    systemPrompt: 'You are the Auto-Scheduler Worker. You coordinate background jobs, check service SLAs, monitor calendar events, and trigger notifications when actions are overdue.',
    description: 'Monitors SLA deadlines, schedules platform tasks, and alerts managers.'
  }
];

export const OnboardingWizard = ({ isOpen, onClose, cloneFrom, defaultType }: OnboardingWizardProps) => {
  const { inviteHuman, provisionAgent } = useUsers();
  const { teams } = useTeams();
  const { positions } = usePositions();
  const { tenant } = usePlatform();

  const [step, setStep] = useState<WizardStep>('type');
  const [submitting, setSubmitting] = useState(false);
  const [kbArticles, setKbArticles] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingCompile, setLoadingCompile] = useState(false);

  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) return;
    setGeneratingAvatar(true);
    try {
      const url = await generateAgentAvatar(avatarPrompt);
      updateForm({ avatarUrl: url });
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAvatar(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    type: 'human' as 'human' | 'agent',
    email: '',
    firstName: '',
    familyName: '',
    isContractor: false,
    teamId: '',
    positionId: '',
    role: 'Standard',
    licenceType: 'Standard',
    startDate: new Date().toISOString().split('T')[0],
    modelType: 'Gemini 2.0 Flash',
    aiHumour: 0.5,
    systemPrompt: '',
    agentClassification: 'CUSTOM' as 'SYSTEM' | 'CUSTOM',
    scopeDescription: '',
    selectedArticleIds: [] as string[],
    trainingQuestions: [] as string[],
    trainingAnswers: [] as string[],
    avatarUrl: ''
  });

  // Load articles from localStorage
  useEffect(() => {
    if (isOpen && tenant?.id) {
      const storageKey = `aurora_kb_articles_${tenant.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setKbArticles(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, [isOpen, tenant?.id]);

  useEffect(() => {
    if (isOpen) {
      if (cloneFrom) {
        setFormData({
          type: cloneFrom.isSynthetic ? 'agent' : 'human',
          email: '', // Don't clone email
          firstName: cloneFrom.firstName || '',
          familyName: cloneFrom.familyName || '',
          isContractor: cloneFrom.isContractor || false,
          teamId: cloneFrom.teamId || '',
          positionId: cloneFrom.positionId || '',
          role: cloneFrom.role || 'Standard',
          licenceType: cloneFrom.licenceType || 'Standard',
          startDate: new Date().toISOString().split('T')[0],
          modelType: cloneFrom.modelType || 'Gemini 2.0 Flash',
          aiHumour: cloneFrom.aiHumour || 0.5,
          systemPrompt: cloneFrom.agentConfig?.systemPrompt || '',
          agentClassification: (cloneFrom.agentConfig?.classification || 'CUSTOM') as 'SYSTEM' | 'CUSTOM',
          scopeDescription: cloneFrom.agentConfig?.scopeDescription || '',
          selectedArticleIds: cloneFrom.agentConfig?.kbSources || [],
          trainingQuestions: (cloneFrom.agentConfig?.trainingAnswers || []).map((t: any) => t.question),
          trainingAnswers: (cloneFrom.agentConfig?.trainingAnswers || []).map((t: any) => t.answer),
          avatarUrl: cloneFrom.avatarUrl || ''
        });
        setStep('identity');
      } else {
        setFormData({
          type: defaultType || 'human',
          email: '',
          firstName: '',
          familyName: '',
          isContractor: false,
          teamId: '',
          positionId: '',
          role: 'Standard',
          licenceType: 'Standard',
          startDate: new Date().toISOString().split('T')[0],
          modelType: 'Gemini 2.0 Flash',
          aiHumour: 0.5,
          systemPrompt: '',
          agentClassification: 'CUSTOM',
          scopeDescription: '',
          selectedArticleIds: [],
          trainingQuestions: [],
          trainingAnswers: [],
          avatarUrl: ''
        });
        setStep(defaultType ? 'identity' : 'type');
      }
    }
  }, [isOpen, cloneFrom, defaultType]);

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const loadInterviewQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const qs = await generateTrainingQuestions(formData.firstName, formData.scopeDescription);
      updateForm({ 
        trainingQuestions: qs, 
        trainingAnswers: qs.map(() => '') 
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const compileDirectives = async () => {
    setLoadingCompile(true);
    try {
      const selectedArticles = kbArticles.filter(art => formData.selectedArticleIds.includes(art.id));
      const prompt = await compileAgentDirectives(
        formData.firstName,
        formData.scopeDescription,
        formData.trainingQuestions,
        formData.trainingAnswers,
        selectedArticles
      );
      updateForm({ systemPrompt: prompt });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCompile(false);
    }
  };

  const handleNext = async () => {
    if (step === 'type') setStep('identity');
    else if (step === 'identity') {
      if (formData.type === 'agent') {
        if (formData.agentClassification === 'SYSTEM') {
          setStep('placement');
        } else {
          setStep('knowledge_connect');
        }
      } else {
        setStep('placement');
      }
    }
    else if (step === 'knowledge_connect') {
      setStep('ai_interview');
      await loadInterviewQuestions();
    }
    else if (step === 'ai_interview') {
      setStep('placement');
    }
    else if (step === 'placement') setStep('governance');
    else if (step === 'governance') {
      if (formData.type === 'agent') {
        if (formData.agentClassification === 'SYSTEM') {
          setStep('summary');
        } else {
          setStep('ai_config');
          await compileDirectives();
        }
      } else {
        setStep('summary');
      }
    }
    else if (step === 'ai_config') setStep('summary');
  };

  const handleBack = () => {
    if (step === 'summary') {
      if (formData.type === 'agent') {
        if (formData.agentClassification === 'SYSTEM') {
          setStep('governance');
        } else {
          setStep('ai_config');
        }
      } else {
        setStep('governance');
      }
    }
    else if (step === 'ai_config') setStep('governance');
    else if (step === 'governance') setStep('placement');
    else if (step === 'placement') {
      if (formData.type === 'agent' && formData.agentClassification === 'CUSTOM') {
        setStep('ai_interview');
      } else {
        setStep('identity');
      }
    }
    else if (step === 'ai_interview') setStep('knowledge_connect');
    else if (step === 'knowledge_connect') setStep('identity');
    else if (step === 'identity') {
      setStep(defaultType ? 'identity' : 'type');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (formData.type === 'human') {
        await inviteHuman({
          email: formData.email,
          role: formData.role,
          teamId: formData.teamId || undefined,
          firstName: formData.firstName,
          familyName: formData.familyName,
          isContractor: formData.isContractor,
          licenceType: formData.licenceType,
          workArrangements: `Start Date: ${formData.startDate}`
        });
      } else {
        const agentConfigData = {
          classification: formData.agentClassification,
          kbSources: formData.selectedArticleIds,
          trainingAnswers: formData.trainingQuestions.map((q, idx) => ({
            question: q,
            answer: formData.trainingAnswers[idx] || ''
          })),
          scopeDescription: formData.scopeDescription,
          systemPrompt: formData.systemPrompt
        };

        await provisionAgent({
          modelType: formData.modelType,
          teamId: formData.teamId || undefined,
          role: formData.role,
          name: formData.firstName,
          aiHumour: formData.aiHumour,
          agentConfig: agentConfigData,
          licenceType: 'AI Agent',
          avatarUrl: formData.avatarUrl || undefined
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const steps: WizardStep[] = formData.type === 'agent' 
    ? (formData.agentClassification === 'SYSTEM'
        ? ['type', 'identity', 'placement', 'governance', 'summary']
        : ['type', 'identity', 'knowledge_connect', 'ai_interview', 'placement', 'governance', 'ai_config', 'summary']
      )
    : ['type', 'identity', 'placement', 'governance', 'summary'];

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cloneFrom 
        ? (cloneFrom.isSynthetic ? 'Clone AI Agent' : 'Clone Member') 
        : (formData.type === 'agent' 
            ? (formData.agentClassification === 'SYSTEM' ? 'Provision System Agent' : 'Train & Provision AI Agent') 
            : 'Add to Team'
          )}
      size="lg"
    >
      <div className="space-y-8 py-2">
        {/* Progress Bar */}
        <div className="relative h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            className="absolute left-0 top-0 h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>

        <div className="min-h-[400px] overflow-x-hidden p-1">
          <AnimatePresence mode="wait">
            {step === 'type' && (
              <motion.div 
                key="step-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 px-1"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Select Type</h3>
                  <p className="text-sm text-zinc-500">What kind of member are you adding?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => updateForm({ type: 'human' })}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 text-center",
                      formData.type === 'human' 
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10" 
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors",
                      formData.type === 'human' ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}>
                      <User size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">Person</p>
                      <p className="text-xs text-zinc-500 mt-1">Add a human member to your team.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => updateForm({ type: 'agent' })}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 text-center",
                      formData.type === 'agent' 
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-500/10" 
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center transition-colors",
                      formData.type === 'agent' ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                    )}>
                      <Bot size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">AI Agent</p>
                      <p className="text-xs text-zinc-500 mt-1">Add an AI agent to help with tasks.</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'identity' && (
              <motion.div 
                key="step-identity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 px-1"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm">
                    {formData.type === 'human' ? <UserPlus size={24} /> : <Bot size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">
                      {formData.type === 'human' ? 'Member Details' : 'Agent Identity & Scope'}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {formData.type === 'human' ? 'Enter simple identification details.' : 'Select agent type and configure core details.'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6">
                  {formData.type === 'human' ? (
                    <>
                      <Input 
                        label="Primary Email" 
                        placeholder="expert@yourorg.ai" 
                        value={formData.email}
                        onChange={e => updateForm({ email: e.target.value })}
                        icon={<Mail size={16} />}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="First Name" 
                          placeholder="John" 
                          value={formData.firstName}
                          onChange={e => updateForm({ firstName: e.target.value })}
                        />
                        <Input 
                          label="Family Name" 
                          placeholder="Doe" 
                          value={formData.familyName}
                          onChange={e => updateForm({ familyName: e.target.value })}
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => updateForm({ isContractor: !formData.isContractor })}
                          className={cn(
                            "w-full p-4 rounded-xl border flex items-center justify-between transition-all",
                            formData.isContractor 
                              ? "border-orange-500 bg-orange-50/30 dark:bg-orange-500/5" 
                              : "border-zinc-200 dark:border-zinc-800"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center",
                              formData.isContractor ? "bg-orange-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            )}>
                              <HardHat size={16} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Contractor</p>
                              <p className="text-[10px] text-zinc-500">Check this if they are an external contractor.</p>
                            </div>
                          </div>
                          <div className={cn(
                            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                            formData.isContractor ? "border-orange-500 bg-orange-500" : "border-zinc-300 dark:border-zinc-700"
                          )}>
                            {formData.isContractor && <div className="h-2 w-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      </div>
                    </>
                  ) : (
                    // Agent Identity & Scope Form
                    <>
                      {/* Classification Switcher */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Agent Type</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => updateForm({ agentClassification: 'CUSTOM', firstName: '', systemPrompt: '' })}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3",
                              formData.agentClassification === 'CUSTOM'
                                ? "border-blue-600 bg-blue-50/30 dark:bg-blue-500/10"
                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            )}
                          >
                            <Cpu className="mt-0.5 text-blue-600" size={16} />
                            <div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Custom Business Agent</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Train a digital coworker for specific workflows.</p>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              const first = SYSTEM_AGENTS[0];
                              updateForm({ 
                                agentClassification: 'SYSTEM', 
                                firstName: first.name, 
                                modelType: first.modelType,
                                systemPrompt: first.systemPrompt 
                              });
                            }}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3",
                              formData.agentClassification === 'SYSTEM'
                                ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-500/10"
                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            )}
                          >
                            <Shield className="mt-0.5 text-indigo-600" size={16} />
                            <div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Built-in System Agent</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Deploy pre-configured read-only platform agents.</p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {formData.agentClassification === 'SYSTEM' ? (
                        <Select 
                          label="Select Built-in System Agent"
                          value={SYSTEM_AGENTS.find(s => s.name === formData.firstName)?.id || SYSTEM_AGENTS[0].id}
                          onChange={(e) => {
                            const agent = SYSTEM_AGENTS.find(s => s.id === e.target.value) || SYSTEM_AGENTS[0];
                            updateForm({ 
                              firstName: agent.name, 
                              modelType: agent.modelType,
                              systemPrompt: agent.systemPrompt 
                            });
                          }}
                          options={SYSTEM_AGENTS.map(s => ({ label: `${s.name} (${s.role})`, value: s.id }))}
                        />
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <Input 
                              label="Agent Name" 
                              placeholder="e.g. support-bot" 
                              value={formData.firstName}
                              onChange={e => updateForm({ firstName: e.target.value })}
                            />
                            <Select 
                              label="Base Intelligence Model" 
                              value={formData.modelType}
                              onChange={e => updateForm({ modelType: e.target.value })}
                              options={[
                                { label: 'Gemini 2.0 Flash (Fast & Capable)', value: 'Gemini 2.0 Flash' },
                                { label: 'Gemini 1.5 Pro (Deep Reasoning)', value: 'Gemini 1.5 Pro' },
                                { label: 'Claude 3.5 Sonnet (Logic & Coding)', value: 'Claude 3.5 Sonnet' }
                              ]}
                            />
                          </div>

                          {/* Avatar Generator */}
                          <div className="flex gap-4 items-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="h-16 w-16 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                              {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} alt="Agent Avatar" className="h-full w-full object-cover" />
                              ) : (
                                <Bot size={32} className="text-zinc-400" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1.5 text-left">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Generate Agent Avatar</label>
                              <div className="flex gap-2">
                                <Input 
                                  placeholder="e.g. clean blue robot face vector icon, flat design" 
                                  value={avatarPrompt}
                                  onChange={e => setAvatarPrompt(e.target.value)}
                                  className="h-9 text-xs"
                                />
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  onClick={handleGenerateAvatar} 
                                  loading={generatingAvatar} 
                                  disabled={!avatarPrompt.trim()}
                                  className="h-9 px-4 text-xs font-bold gap-1 shadow-sm shrink-0"
                                >
                                  <Sparkles size={12} /> Generate
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-zinc-500">Agent Task Scope & Description</label>
                            <textarea 
                              className="w-full h-24 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium leading-relaxed"
                              placeholder="Describe what business process this agent runs, what decisions it makes, and what metrics it monitors..."
                              value={formData.scopeDescription}
                              onChange={e => updateForm({ scopeDescription: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'knowledge_connect' && (
              <motion.div 
                key="step-kb"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 px-1"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 shadow-sm">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Knowledge Connection</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400/80">Select documents this agent needs to ingest to perform its task.</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {kbArticles.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                      <p className="text-xs font-bold uppercase tracking-wider">No Knowledge Base Articles Found</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Please add articles in the Knowledge Base Platform Module first.</p>
                    </div>
                  ) : (
                    kbArticles.map(art => {
                      const isSelected = formData.selectedArticleIds.includes(art.id);
                      return (
                        <button
                          key={art.id}
                          onClick={() => {
                            const newIds = isSelected 
                              ? formData.selectedArticleIds.filter(id => id !== art.id)
                              : [...formData.selectedArticleIds, art.id];
                            updateForm({ selectedArticleIds: newIds });
                          }}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left flex items-start justify-between transition-all",
                            isSelected 
                              ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-500/10" 
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                          )}
                        >
                          <div className="space-y-1 pr-4 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                {art.category}
                              </span>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                                {art.title}
                              </h4>
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                              {art.content}
                            </p>
                          </div>
                          <div className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                            isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"
                          )}>
                            {isSelected && <Check size={12} />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {step === 'ai_interview' && (
              <motion.div 
                key="step-interview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 px-1"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 shadow-sm">
                    <HelpCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100">AI-Guided Training Interview</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400/80">Answer these specific questions to program the agent's logic.</p>
                  </div>
                </div>

                {loadingQuestions ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-indigo-600 animate-duration-1000" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">AI is analyzing scope and generating training questions...</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
                    {formData.trainingQuestions.map((q, idx) => (
                      <div key={idx} className="space-y-2">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          {q}
                        </label>
                        <textarea
                          className="w-full h-20 bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium leading-relaxed"
                          placeholder="Provide detailed instructions or constraints for this scenario..."
                          value={formData.trainingAnswers[idx] || ''}
                          onChange={(e) => {
                            const newAnswers = [...formData.trainingAnswers];
                            newAnswers[idx] = e.target.value;
                            updateForm({ trainingAnswers: newAnswers });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 'placement' && (
              <motion.div 
                key="step-placement"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 px-1"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-200/50">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Placement</h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400/80">Assign a team and position.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <Select 
                    label="Assigned Team" 
                    value={formData.teamId}
                    onChange={e => updateForm({ teamId: e.target.value })}
                    options={[{ label: 'Unassigned', value: '' }, ...teams.map(t => ({ label: t.name, value: t.id }))]}
                  />
                  <Select 
                    label="Position Slot" 
                    value={formData.positionId}
                    onChange={e => updateForm({ positionId: e.target.value })}
                    options={[{ label: 'None', value: '' }, ...positions.map(p => ({ label: `${p.title} (${p.positionNumber})`, value: p.id }))]}
                  />
                  <Select 
                    label="Role" 
                    value={formData.role}
                    onChange={e => updateForm({ role: e.target.value })}
                    options={[
                      { label: 'Standard', value: 'Standard' },
                      { label: 'Lead', value: 'Lead' },
                      { label: 'Admin', value: 'Admin' },
                    ]}
                  />
                </div>
              </motion.div>
            )}

            {step === 'governance' && (
              <motion.div 
                key="step-governance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 px-1"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">Setup</h3>
                    <p className="text-xs text-zinc-500">Set license and start date.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    {formData.type === 'agent' ? (
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Aurora Licence Type</label>
                        <div className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-white/5 px-3 flex items-center text-xs font-bold text-zinc-500">
                          AI Agent Seat
                        </div>
                      </div>
                    ) : (
                      <Select 
                        label="Aurora Licence Type" 
                        value={formData.licenceType}
                        onChange={e => updateForm({ licenceType: e.target.value })}
                        options={[
                          { label: 'Standard', value: 'Standard' },
                          { label: 'Admin', value: 'Admin' },
                          { label: 'Enterprise', value: 'Enterprise' },
                        ]}
                      />
                    )}
                    <Input 
                      label="Effective From" 
                      type="date"
                      value={formData.startDate}
                      onChange={e => updateForm({ startDate: e.target.value })}
                    />
                  </div>
                  
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-500/10 dark:bg-blue-500/5">
                    <p className="text-[11px] leading-relaxed text-blue-700 dark:text-blue-400">
                      <strong>Note:</strong> Licences are billed monthly. Ensure your organization quota has available slots before completing this onboarding process.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'ai_config' && (
              <motion.div 
                key="step-ai"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 px-1"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-blue-600 shadow-sm">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 dark:text-blue-100">AI Directives & Configuration</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400/80">Confirm the AI instructions compiled from training.</p>
                  </div>
                </div>

                {loadingCompile ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-blue-600 animate-duration-1000" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Gemini is compiling training responses into system directives...</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-2">
                          <Smile size={14} /> AI Humour / Personality
                        </label>
                        <span className="text-xs font-mono font-bold text-blue-600">{Math.round(formData.aiHumour * 100)}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={formData.aiHumour}
                        onChange={e => updateForm({ aiHumour: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                        <span>STOIC / FORMAL</span>
                        <span>HUMOROUS / ANALOGY-RICH</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-zinc-500">Compiled System Prompt / Directives</label>
                      <textarea 
                        className="w-full h-48 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium leading-relaxed shadow-inner"
                        placeholder="System instructions compiled by AI..."
                        value={formData.systemPrompt}
                        onChange={e => updateForm({ systemPrompt: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'summary' && (
              <motion.div 
                key="step-summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8 px-1"
              >
                <div className="text-center space-y-2 py-4">
                  <div className="h-20 w-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Ready to add!</h3>
                  <p className="text-sm text-zinc-500">Check everything is correct before finishing.</p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase">Classification</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-1">
                        {formData.type === 'human' ? <User size={14} /> : <Bot size={14} />}
                        {formData.type === 'human' ? 'Person' : 'AI Agent'}
                        {formData.isContractor && <span className="text-[10px] bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">Contractor</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase">Identity</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                        {formData.firstName} {formData.familyName || (formData.type === 'human' ? '' : '(AI)')}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase">Placement</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                        {teams.find(t => t.id === formData.teamId)?.name || 'Unassigned'} Team
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase">Platform Access</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                        {formData.role} Role / {formData.licenceType} License
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <Button 
            variant="ghost" 
            onClick={currentStepIndex === 0 ? onClose : handleBack}
            disabled={submitting}
            className="text-zinc-500"
          >
            {currentStepIndex === 0 ? 'Cancel' : 'Previous Step'}
          </Button>
          
          <Button 
            variant="primary" 
            onClick={step === 'summary' ? handleSubmit : handleNext}
            loading={submitting}
            disabled={
              submitting || 
              (step === 'identity' && formData.type === 'human' && !formData.email) ||
              (step === 'identity' && !formData.firstName)
            }
            className="min-w-[140px] gap-2"
          >
            {step === 'summary' ? (cloneFrom ? 'Confirm Clone' : 'Add to Team') : 'Continue'}
            {step !== 'summary' && <ArrowRight size={16} />}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
