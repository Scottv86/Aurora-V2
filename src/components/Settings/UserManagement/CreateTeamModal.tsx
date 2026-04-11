import React, { useState } from 'react';
import { Modal } from '../../UI/TabsAndModal';
import { Button, Input } from '../../UI/Primitives';
import { useTeams } from '../../../hooks/useTeams';
import { Users, Shield, LayoutGrid, Type } from 'lucide-react';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTeamModal = ({ isOpen, onClose }: CreateTeamModalProps) => {
  const { createTeam } = useTeams();
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitting(true);
    try {
      await createTeam({ name, description });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      // toast is handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button variant="primary" type="submit" form="create-team-form" loading={submitting}>
        Create Team
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Team"
      footer={footer}
    >
      <form id="create-team-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-zinc-900">
            <Users className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              New Department / Squad
            </p>
            <p className="text-xs text-zinc-500">
              Define a high-level organizational unit for human staff and AI agents.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Input 
            label="Team Name" 
            placeholder="e.g. Platform Engineering, Marketing AI" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</label>
            <textarea 
              className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Briefly describe the focus of this team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/10 dark:bg-indigo-500/5">
           <p className="flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-400">
             <LayoutGrid size={14} /> Organization Architecture
           </p>
           <p className="mt-1 text-xs text-indigo-600/80 dark:text-indigo-400/60">
             Teams help organize permissions and communication flows within the Aurora platform. 
             You can assign members to this team immediately after creation.
           </p>
        </div>
      </form>
    </Modal>
  );
};
