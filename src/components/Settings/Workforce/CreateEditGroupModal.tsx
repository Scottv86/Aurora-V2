import React, { useState, useEffect } from 'react';
import { X, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../../UI/TabsAndModal';
import { Button, Input } from '../../UI/Primitives';
import { usePermissionGroups, PermissionGroup } from '../../../hooks/usePermissionGroups';
import { toast } from 'sonner';

interface CreateEditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: PermissionGroup | null;
}

const CAPABILITIES = [
  { 
    category: 'Staff Management', 
    items: [
      { key: 'view:staff', label: 'View Employee Directory', description: 'Can see all staff profiles, teams, and contact info.' },
      { key: 'manage:staff', label: 'Modify Personnel Records', description: 'Permission to edit profiles, change titles, and update personal data.' },
      { key: 'invite:staff', label: 'Invite & Onboard', description: 'Can send invites to new people and add AI agents.' },
      { key: 'decommission:staff', label: 'Decommission Staff', description: 'Permission to disable accounts and offboard staff members.' }
    ] 
  },
  { 
    category: 'Team & Structure', 
    items: [
      { key: 'view:teams', label: 'View Teams', description: 'Can browse the organizational structure and team memberships.' },
      { key: 'manage:teams', label: 'Manage Teams', description: 'Can create new teams, change managers, and reassign members.' },
      { key: 'view:positions', label: 'View Positions', description: 'Access to browse position descriptions and pay grades.' },
      { key: 'manage:positions', label: 'Manage Positions', description: 'Can create and refine position definitions across the org.' }
    ] 
  },
  { 
    category: 'Platform & Security', 
    items: [
      { key: 'view:audit_logs', label: 'View Audit Logs', description: 'Access to system-wide activity, security events, and change history.' },
      { key: 'manage:settings', label: 'Core Platform Settings', description: 'Can change organization branding, site settings, and global defaults.' },
      { key: 'manage:billing', label: 'Billing & Financials', description: 'Access to subscription management, invoices, and plan upgrades.' }
    ] 
  },
  { 
    category: 'Data & Modules', 
    items: [
      { key: 'manage:modules', label: 'Application Builder', description: 'Full access to the Module Builder to create and modify apps.' },
      { key: 'create:records', label: 'Create New Records', description: 'General permission to add new entries to active modules.' },
      { key: 'delete:records', label: 'Delete Records', description: 'Permission to permanently remove data entries.' }
    ] 
  }
];

export const CreateEditGroupModal = ({ isOpen, onClose, group }: CreateEditGroupModalProps) => {
  const { groups, createGroup, updateGroup } = usePermissionGroups();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentGroupId, setParentGroupId] = useState<string>('');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
      setParentGroupId(group.parentGroupId || '');
      setSelectedCaps(group.capabilities || []);
    } else {
      setName('');
      setDescription('');
      setParentGroupId('');
      setSelectedCaps([]);
    }
  }, [group, isOpen]);

  const toggleCap = (cap: string) => {
    setSelectedCaps(prev => 
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error('Group name is required');
    
    setIsSubmitting(true);
    try {
      const data = { 
        name, 
        description, 
        capabilities: selectedCaps,
        parentGroupId: parentGroupId || null
      };
      if (group) {
        await updateGroup(group.id, data);
        toast.success('Permission group updated');
      } else {
        await createGroup(data);
        toast.success('Permission group created');
      }
      onClose();
    } catch (err) {
      // toast handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryFromKey = (key: string) => key.split(':')[0];

  const toggleCategoryMaster = (category: string) => {
    // Current keys for this category in our CAPABILITIES list
    const categoryPrefixMap: Record<string, string> = {
      'Staff Management': 'staff',
      'Team & Structure': 'teams', // simplified for matching
      'Platform & Security': 'settings', // simplified
      'Data & Modules': 'records' // simplified
    };
    
    // Actually, it's easier to find the items in the cat
    const catObj = CAPABILITIES.find(c => c.category === category);
    if (!catObj) return;

    const catKey = catObj.items[0].key.split(':')[0]; // get 'staff', 'teams', etc
    const wildcard = `${catKey}:*`;
    
    setSelectedCaps(prev => 
      prev.includes(wildcard) ? prev.filter(c => c !== wildcard) : [...prev, wildcard]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={group ? 'Edit Group' : 'Create Group'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input 
            label="Group Name" 
            placeholder="e.g. Content Managers"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Description</label>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 min-h-[80px]"
              placeholder="What access does this group provide?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Parent Group (Inherit From)</label>
            <select
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900"
              value={parentGroupId}
              onChange={(e) => setParentGroupId(e.target.value)}
            >
              <option value="">None (Base Group)</option>
              {groups.filter(g => g.id !== group?.id).map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Permissions</label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400">{selectedCaps.length} ACTIVE</span>
              <div className="h-1 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300" 
                  style={{ width: `${(selectedCaps.length / 15) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {CAPABILITIES.map((cat) => {
              const catKey = cat.items[0].key.split(':')[0];
              const isMasterActive = selectedCaps.includes(`${catKey}:*`);
              
              return (
              <div key={cat.category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em]">{cat.category}</h4>
                    <div className="h-px w-8 bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategoryMaster(cat.category)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all border ${
                      isMasterActive
                        ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                        : 'text-zinc-400 border-zinc-200 hover:border-zinc-300 dark:border-zinc-800'
                    }`}
                  >
                    {isMasterActive ? 'ALL SELECTED' : 'SELECT ALL'}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {cat.items.map((cap) => {
                    const isActive = selectedCaps.includes(cap.key);
                    return (
                      <button
                        key={cap.key}
                        type="button"
                        onClick={() => toggleCap(cap.key)}
                        className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                          isActive
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5 ring-1 ring-blue-500'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                          isActive 
                            ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                            : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 group-hover:border-zinc-400'
                        }`}>
                          {isActive && <CheckCircle2 size={12} strokeWidth={3} />}
                        </div>
                        <div className="space-y-1">
                          <div className={`text-sm font-bold transition-colors ${
                            isActive ? 'text-blue-900 dark:text-blue-200' : 'text-zinc-900 dark:text-zinc-100'
                          }`}>
                            {cap.label}
                          </div>
                          <div className={`text-xs leading-relaxed transition-colors ${
                            isActive ? 'text-blue-700/80 dark:text-blue-300/60' : 'text-zinc-500 dark:text-zinc-400'
                          }`}>
                            {cap.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="secondary" onClick={onClose} className="flex-1" type="button">Cancel</Button>
          <Button variant="primary" className="flex-1" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : group ? 'Update Group' : 'Create Group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
