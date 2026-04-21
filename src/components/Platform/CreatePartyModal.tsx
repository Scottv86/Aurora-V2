import React, { useState } from 'react';
import { 
  User, 
  Building2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  X,
  Mail,
  Briefcase,
  Globe,
  Calendar
} from 'lucide-react';
import { Modal } from '../UI/TabsAndModal';
import { Button, Input, Select } from '../UI/Primitives';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'type' | 'details' | 'success';
type PartyType = 'PERSON' | 'ORGANIZATION';

export const CreatePartyModal = ({ isOpen, onClose, onSuccess }: CreatePartyModalProps) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<PartyType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgTypes, setOrgTypes] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchOrgTypes();
    }
  }, [isOpen]);

  const fetchOrgTypes = async () => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/taxonomies?category=ORG_TYPE`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '' 
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        if (data.length > 0) {
          setOrgTypes(data.map((t: any) => ({ label: `${t.name} (${t.slug})`, value: t.slug })));
          setFormData(prev => ({ ...prev, orgType: data[0].slug }));
        } else {
          // Fallback if no custom types defined yet
          setOrgTypes([
            { label: 'Private Limited Company (PTE LTD)', value: 'PTE_LTD' },
            { label: 'Public Listed Company (PLC)', value: 'PLC' },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch org types:', err);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    legalName: '',
    orgType: 'PTE_LTD',
    email: '',
    phone: '',
  });

  const resetForm = () => {
    setStep('type');
    setType(null);
    setError(null);
    setFormData({
      firstName: '',
      lastName: '',
      legalName: '',
      orgType: 'PTE_LTD',
      email: '',
      phone: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (selectedType: PartyType) => {
    setType(selectedType);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        partyType: type,
        status: 'ACTIVE',
        ...(type === 'PERSON' ? {
          person: {
            firstName: formData.firstName,
            lastName: formData.lastName,
          }
        } : {
          organization: {
            legalName: formData.legalName,
            orgStructureType: formData.orgType,
          }
        })
      };

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('A similar record already exists in the global registry.');
        }
        throw new Error(data.error || 'Failed to create record');
      }

      setStep('success');
      onSuccess();
      toast.success(`${type === 'PERSON' ? 'Person' : 'Organisation'} added successfully`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={step === 'success' ? '' : 'Add to Global Registry'}
      size="md"
    >
      <div className="min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-4"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">What would you like to add?</h2>
                <p className="text-sm text-zinc-500">Choose the entity type to begin the onboarding process.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TypeCard 
                  icon={User}
                  title="Individual Person"
                  description="Staff members, consultants, or external contacts."
                  onClick={() => handleTypeSelect('PERSON')}
                  color="amber"
                />
                <TypeCard 
                  icon={Building2}
                  title="Organisation"
                  description="Companies, trusts, non-profits, or agencies."
                  onClick={() => handleTypeSelect('ORGANIZATION')}
                  color="indigo"
                />
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    type === 'PERSON' ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-600'
                  }`}>
                    {type === 'PERSON' ? <User size={24} /> : <Building2 size={24} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      {type === 'PERSON' ? 'New Individual' : 'New Organisation'}
                    </p>
                    <p className="text-xs text-zinc-500">Global Registry Entry</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setStep('type')}
                    className="ml-auto text-xs font-bold text-indigo-600 hover:text-indigo-500"
                  >
                    Change Type
                  </button>
                </div>

                <div className="space-y-4">
                  {type === 'PERSON' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="First Name"
                        placeholder="e.g. John"
                        required
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      />
                      <Input 
                        label="Last Name"
                        placeholder="e.g. Doe"
                        required
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Input 
                        label="Legal Entity Name"
                        placeholder="e.g. Acme Corp Pty Ltd"
                        required
                        value={formData.legalName}
                        onChange={e => setFormData({ ...formData, legalName: e.target.value })}
                      />
                      <Select 
                        label="Organisation Type"
                        value={formData.orgType}
                        onChange={e => setFormData({ ...formData, orgType: e.target.value })}
                        options={orgTypes}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Contact Email"
                      type="email"
                      placeholder="email@example.com"
                      icon={<Mail size={16} />}
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input 
                      label="Primary Phone"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-bold text-red-900 dark:text-red-200">Action Required</p>
                      <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed mt-1">{error}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="ghost" type="button" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" loading={loading} className="px-8">
                    Create Entry
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-center py-12 space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {type === 'PERSON' ? 'Person added' : 'Organisation added'}
                </h2>
                <p className="text-sm text-zinc-500 max-w-xs">
                  The new {type === 'PERSON' ? 'person' : 'organisation'} has been added to the platform's global registry and is now active.
                </p>
              </div>
              <Button onClick={handleClose} className="px-12">Done</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

const TypeCard = ({ icon: Icon, title, description, onClick, color }: { 
  icon: any, 
  title: string, 
  description: string, 
  onClick: () => void,
  color: 'amber' | 'indigo'
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-start p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group text-left"
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
      color === 'amber' 
        ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white' 
        : 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white'
    }`}>
      <Icon size={24} />
    </div>
    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">{title}</h3>
    <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
  </button>
);
