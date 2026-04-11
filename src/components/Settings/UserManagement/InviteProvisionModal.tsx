import React, { useState } from 'react';
import { Modal } from '../../UI/TabsAndModal';
import { Button, Input, Select } from '../../UI/Primitives';
import { useUsers } from '../../../hooks/useUsers';
import { useTeams } from '../../../hooks/useTeams';
import { Zap, User, Shield, Users, Mail, Bot, Cpu } from 'lucide-react';

interface InviteProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'human' | 'agent';
}

export const InviteProvisionModal = ({ isOpen, onClose, type }: InviteProvisionModalProps) => {
  const { inviteHuman, provisionAgent } = useUsers();
  const { teams } = useTeams();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Standard');
  const [teamId, setTeamId] = useState('');
  const [modelType, setModelType] = useState('OpenClaw Sweeper');

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
    <>
      <Button variant="ghost" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button variant="primary" type="submit" form="invite-provision-form" loading={submitting}>
        {type === 'human' ? 'Send Invitation' : 'Provision Agent'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'human' ? 'Invite Human Employee' : 'Provision Digital Coworker'}
      footer={footer}
    >
      <form id="invite-provision-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-zinc-900">
            {type === 'human' ? <User className="text-zinc-600" /> : <Bot className="text-blue-600" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {type === 'human' ? 'Secure Invite' : 'Autonomous Provisioning'}
            </p>
            <p className="text-xs text-zinc-500">
              {type === 'human' 
                ? 'Send a secure onboarding link to a new human team member.' 
                : 'Deploy a new AI agent with specific model capabilities and team scope.'}
            </p>
          </div>
        </div>

        {type === 'human' ? (
          <Input 
            label="Email Address" 
            placeholder="e.g. employee@company.ai" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
          />
        ) : (
          <Select 
            label="Agent model / Type" 
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            options={[
              { label: 'OpenClaw Sweeper (Maintenance)', value: 'OpenClaw Sweeper' },
              { label: 'Gemini Analyst (Research)', value: 'Gemini Analyst' },
              { label: 'GPT-4o Architect (Planning)', value: 'GPT-4o Architect' },
              { label: 'Claude Coder (Dev)', value: 'Claude Coder' },
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
           <p className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-400">
             <Shield size={14} /> Security Compliance Note
           </p>
           <p className="mt-1 text-xs text-blue-600/80 dark:text-blue-400/60">
             All {type === 'human' ? 'users' : 'agents'} are subject to tenant isolation and RBAC policies. 
             Provisioning will be logged in the system audit trail.
           </p>
        </div>
      </form>
    </Modal>
  );
};
