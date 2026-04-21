import React, { useState, useEffect } from 'react';
import { 
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Building2,
  GitBranch,
  ShieldCheck,
  Search
} from 'lucide-react';
import { Modal } from '../UI/TabsAndModal';
import { Button, Input, Select } from '../UI/Primitives';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';

interface AddRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourcePartyId: string;
}

export const AddRelationshipModal = ({ isOpen, onClose, onSuccess, sourcePartyId }: AddRelationshipModalProps) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    targetPartyId: '',
    relationshipType: 'EMPLOYEE',
    ownershipPercentage: 0,
  });

  const [relTypes, setRelTypes] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchParties();
      fetchRelTypes();
    }
  }, [isOpen]);

  const fetchRelTypes = async () => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/taxonomies?category=RELATIONSHIP_TYPE`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        if (data.length > 0) {
          setRelTypes(data.map((t: any) => ({ label: t.name, value: t.slug })));
          setFormData(prev => ({ ...prev, relationshipType: data[0].slug }));
        } else {
          // Fallback
          setRelTypes([
            { label: 'Employee', value: 'EMPLOYEE' },
            { label: 'Contractor', value: 'CONTRACTOR' },
            { label: 'Partner', value: 'PARTNER' },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rel types:', err);
    }
  };

  const fetchParties = async () => {
    try {
      setIsSearching(true);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      const data = await res.json();
      if (res.ok) {
        setParties(data.filter((p: any) => p.id !== sourcePartyId));
      }
    } catch (err) {
      console.error('Failed to fetch parties:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetPartyId) {
      setError('Please select a target party');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/${sourcePartyId}/relationships`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          targetPartyId: formData.targetPartyId,
          relationshipType: formData.relationshipType,
          ownershipPercentage: formData.relationshipType === 'OWNER' || formData.relationshipType === 'SUBSIDIARY' ? Number(formData.ownershipPercentage) : null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create relationship');
      }

      toast.success('Relationship added successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter(p => {
    const name = p.partyType === 'PERSON' ? `${p.person?.firstName} ${p.person?.lastName}` : p.organization?.legalName;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Entity" size="md">
      <form onSubmit={handleSubmit} className="space-y-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Select Entity</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search entities..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-inner">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-zinc-500">Searching...</div>
              ) : filteredParties.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">No entities found</div>
              ) : (
                filteredParties.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, targetPartyId: p.id })}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                      formData.targetPartyId === p.id ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      p.partyType === 'PERSON' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                    }`}>
                      {p.partyType === 'PERSON' ? <User size={14} /> : <Building2 size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {p.partyType === 'PERSON' ? `${p.person?.firstName} ${p.person?.lastName}` : p.organization?.legalName}
                      </p>
                      <p className="text-[10px] text-zinc-500">{p.partyType}</p>
                    </div>
                    {formData.targetPartyId === p.id && <CheckCircle2 size={16} className="ml-auto text-indigo-500" />}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Relationship Type"
              value={formData.relationshipType}
              onChange={e => setFormData({ ...formData, relationshipType: e.target.value })}
              options={relTypes}
            />
            {(formData.relationshipType === 'OWNER' || formData.relationshipType === 'SUBSIDIARY') && (
              <Input 
                label="Ownership %"
                type="number"
                min="0"
                max="100"
                value={formData.ownershipPercentage}
                onChange={e => setFormData({ ...formData, ownershipPercentage: Number(e.target.value) })}
              />
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} className="gap-2">
            Add Connection
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
};
