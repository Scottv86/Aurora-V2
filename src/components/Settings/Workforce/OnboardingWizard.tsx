import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Bot, 
  Shield, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Briefcase,
  Calendar,
  CreditCard,
  UserPlus,
  Smile,
  CheckCircle2,
  HardHat
} from 'lucide-react';
import { Button, Input, Select, cn } from '../../UI/Primitives';
import { Modal } from '../../UI/TabsAndModal';
import { useUsers, TenantMember } from '../../../hooks/useUsers';
import { useTeams } from '../../../hooks/useTeams';
import { usePositions } from '../../../hooks/usePositions';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  cloneFrom?: TenantMember | null;
}

type WizardStep = 'type' | 'identity' | 'placement' | 'governance' | 'ai_config' | 'summary';

export const OnboardingWizard = ({ isOpen, onClose, cloneFrom }: OnboardingWizardProps) => {
  const { inviteHuman, provisionAgent } = useUsers();
  const { teams } = useTeams();
  const { positions } = usePositions();

  const [step, setStep] = useState<WizardStep>('type');
  const [submitting, setSubmitting] = useState(false);

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
    systemPrompt: ''
  });

  useEffect(() => {
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
        systemPrompt: cloneFrom.agentConfig?.systemPrompt || ''
      });
      setStep('identity');
    }
  }, [cloneFrom]);

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step === 'type') setStep('identity');
    else if (step === 'identity') setStep('placement');
    else if (step === 'placement') setStep('governance');
    else if (step === 'governance') {
      if (formData.type === 'agent') setStep('ai_config');
      else setStep('summary');
    }
    else if (step === 'ai_config') setStep('summary');
  };

  const handleBack = () => {
    if (step === 'summary') {
      if (formData.type === 'agent') setStep('ai_config');
      else setStep('governance');
    }
    else if (step === 'ai_config') setStep('governance');
    else if (step === 'governance') setStep('placement');
    else if (step === 'placement') setStep('identity');
    else if (step === 'identity') setStep('type');
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
        await provisionAgent({
          modelType: formData.modelType,
          teamId: formData.teamId || undefined,
          role: formData.role,
          name: formData.firstName, // Using First Name field for Bot name
          aiHumour: formData.aiHumour,
          agentConfig: { systemPrompt: formData.systemPrompt }
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
    ? ['type', 'identity', 'placement', 'governance', 'ai_config', 'summary']
    : ['type', 'identity', 'placement', 'governance', 'summary'];

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cloneFrom ? 'Clone Member' : 'Add to Team'}
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

        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 'type' && (
              <motion.div 
                key="step-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
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
                className="space-y-6"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shadow-sm">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">Details</h3>
                    <p className="text-xs text-zinc-500">Enter simple identification details.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  {formData.type === 'human' && (
                    <Input 
                      label="Primary Email" 
                      placeholder="expert@yourorg.ai" 
                      value={formData.email}
                      onChange={e => updateForm({ email: e.target.value })}
                      icon={<Mail size={16} />}
                      required
                    />
                  )}
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
                </div>
              </motion.div>
            )}

            {step === 'placement' && (
              <motion.div 
                key="step-placement"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
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
                className="space-y-6"
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
                className="space-y-6"
              >
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                  <div className="h-12 w-12 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-blue-600 shadow-sm">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 dark:text-blue-100">AI Settings</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400/80">Adjust how this AI agent works.</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <Select 
                    label="Base Intelligence Model" 
                    value={formData.modelType}
                    onChange={e => updateForm({ modelType: e.target.value })}
                    options={[
                      { label: 'Gemini 2.0 Flash (Fast & Capable)', value: 'Gemini 2.0 Flash' },
                      { label: 'Claude 3.5 Sonnet (Nuanced)', value: 'Claude 3.5 Sonnet' },
                      { label: 'DeepSeek R1 (Logical)', value: 'DeepSeek R1' },
                    ]}
                  />

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
                    <label className="text-xs font-bold uppercase text-zinc-500">System Directives</label>
                    <textarea 
                      className="w-full h-24 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="e.g. You are a meticulous financial analyst..."
                      value={formData.systemPrompt}
                      onChange={e => updateForm({ systemPrompt: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'summary' && (
              <motion.div 
                key="step-summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
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
