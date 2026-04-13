import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Receipt, Calendar, Briefcase, DollarSign, CheckCircle2 } from 'lucide-react';
import { Button, Input, Select, Badge } from '../../UI/Primitives';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  onSuccess: () => void;
}

export const CreateContractModal = ({ isOpen, onClose, memberId, memberName, onSuccess }: CreateContractModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [type, setType] = useState('Permanent');
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call to create contract
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setIsSuccess(false);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
          >
            {isSuccess ? (
              <div className="p-12 text-center space-y-4 flex flex-col items-center">
                <div className="h-20 w-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={48} className="animate-in zoom-in duration-500" />
                </div>
                <h2 className="text-2xl font-black">Contract Established</h2>
                <p className="text-zinc-500">Employment agreement for {memberName} has been securely registered.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <h2 className="font-black text-lg">New Employment Agreement</h2>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-0.5">Member: {memberName}</p>
                    </div>
                  </div>
                  <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <Select 
                    label="Contract Type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    options={[
                      { label: 'Permanent Full-Time', value: 'Permanent' },
                      { label: 'Fixed Term Contract', value: 'Fixed Term' },
                      { label: 'Casual / Contractor', value: 'Casual' },
                      { label: 'Zero Hours', value: 'Zero Hours' }
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Base Salary (Annual equivalent)</label>
                       <div className="relative">
                          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input 
                            type="number" 
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0.00"
                            value={salary}
                            onChange={(e) => setSalary(e.target.value)}
                            required
                          />
                       </div>
                    </div>
                    <Select 
                      label="Currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      options={[
                        { label: 'AUD ($)', value: 'AUD' },
                        { label: 'USD ($)', value: 'USD' },
                        { label: 'EUR (€)', value: 'EUR' },
                        { label: 'GBP (£)', value: 'GBP' }
                      ]}
                    />
                  </div>

                  <Input 
                    label="Contract Commencement Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    icon={<Calendar size={16} />}
                  />

                  <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 flex gap-3">
                     <Briefcase size={18} className="text-blue-500 shrink-0 mt-0.5" />
                     <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                       Establishing a contract will automatically trigger onboarding tasks and provision the necessary payroll integrations for this member.
                     </p>
                  </div>
                </div>

                <div className="px-8 py-6 bg-zinc-50/50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                  <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
                  <Button variant="primary" type="submit" loading={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                    Register Agreement
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
