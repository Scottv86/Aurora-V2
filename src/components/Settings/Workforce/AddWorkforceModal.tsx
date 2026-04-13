import React, { useState } from 'react';
import { Modal } from '../../UI/TabsAndModal';
import { Button, Input, Select } from '../../UI/Primitives';
import { useUsers } from '../../../hooks/useUsers';
import { useTeams } from '../../../hooks/useTeams';
import { Zap, User, Shield, Users, Mail, Bot, Cpu, ArrowRight, Sparkles } from 'lucide-react';

interface AddWorkforceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'human' | 'agent';
}

export const AddWorkforceModal = ({ isOpen, onClose, type: initialType }: AddWorkforceModalProps) => {
  const { inviteHuman, provisionAgent } = useUsers();
  const { teams } = useTeams();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'select' | 'form'>('form'); // Starting with form directly if triggered from a specific button, or select if general
  const [type, setType] = useState<'human' | 'agent'>(initialType);

  // Form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Standard');
  const [teamId, setTeamId] = useState('');
  const [modelType, setModelType] = useState('Gemini Analyst');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (type === 'human') {
        await inviteHuman({ email, role, teamId });
      } else {
        await provisionAgent({ modelType, teamId, role });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex w-full items-center justify-between">
      <Button variant="ghost" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <div className="flex gap-3">
        <Button variant="primary" type="submit" form="add-workforce-form" loading={submitting} className="gap-2">
          {type === 'human' ? 'Send Invitation' : 'Hire Digital Coworker'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'human' ? 'Add Human Expert' : 'Hire Digital Coworker'}
      footer={footer}
    >
      <form id="add-workforce-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selector (Simple Tabs) */}
        <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
           <button
             type="button"
             onClick={() => setType('human')}
             className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-semibold transition-all ${type === 'human' ? 'bg-white shadow-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 rounded-lg' : 'text-zinc-500 hover:text-zinc-700'}`}
           >
             <User size={16} /> Human
           </button>
           <button
             type="button"
             onClick={() => setType('agent')}
             className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-semibold transition-all ${type === 'agent' ? 'bg-white shadow-sm text-blue-600 dark:bg-zinc-800 dark:text-blue-400 rounded-lg' : 'text-zinc-500 hover:text-zinc-700'}`}
           >
             <Sparkles size={16} /> Digital Coworker
           </button>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-5 dark:bg-zinc-800/50">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-all dark:bg-zinc-900 ${type === 'agent' ? 'ring-2 ring-blue-500/20' : ''}`}>
            {type === 'human' ? <User className="text-zinc-600" size={24} /> : <Bot className="text-blue-600" size={24} />}
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {type === 'human' ? 'Onboard Human' : 'Scale with AI'}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {type === 'human' 
                ? 'Send a secure invitation to a human expert to join your workspace and start collaborating.' 
                : 'Deploy a high-performance digital coworker to automate complex cognitive tasks and data operations.'}
            </p>
          </div>
        </div>

        {type === 'human' ? (
          <Input 
            label="Email Address" 
            placeholder="e.g. expert@yourorg.ai" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            icon={<Mail size={16} />}
          />
        ) : (
          <Select 
            label="Digital Coworker Type" 
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            options={[
              { label: 'Gemini Analyst (Deep Research & Insights)', value: 'Gemini Analyst' },
              { label: 'Claude Strategist (Advanced Logic & Planning)', value: 'Claude Strategist' },
              { label: 'GPT-4o Orchestrator (Coordination & Execution)', value: 'GPT-4o Orchestrator' },
              { label: 'DeepSeek Specialist (Domain Specific Reasoning)', value: 'DeepSeek Specialist' },
            ]}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
           <Select 
             label="Assigned Team" 
             value={teamId}
             onChange={(e) => setTeamId(e.target.value)}
             options={[
               { label: 'Unassigned', value: '' },
               ...teams.map(t => ({ label: t.name, value: t.id }))
             ]}
           />
           <Select 
             label="Platform Role" 
             value={role}
             onChange={(e) => setRole(e.target.value)}
             options={[
               { label: 'Standard', value: 'Standard' },
               { label: 'Lead', value: 'Lead' },
               { label: 'Admin', value: 'Admin' },
             ]}
           />
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/10 dark:bg-blue-500/5">
           <p className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
             <Shield size={14} /> Trust & Compliance
           </p>
           <p className="mt-1 text-[11px] leading-snug text-blue-600/80 dark:text-blue-400/60">
             Compliance policies for {type === 'human' ? 'remote human staff' : 'AI agents'} are automatically applied. 
             All hiring actions are logged in the organization activity trail.
           </p>
        </div>
      </form>
    </Modal>
  );
};

