import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Calendar, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button, Input, Select } from '../../UI/Primitives';

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  onSuccess: () => void;
}

export const RequestLeaveModal = ({ isOpen, onClose, memberId, onSuccess }: RequestLeaveModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call to request leave
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
                <h2 className="text-2xl font-black">Request Submitted</h2>
                <p className="text-zinc-500">Your leave request has been sent for manager approval.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                    <h2 className="font-black text-lg">Request Time Off</h2>
                  </div>
                  <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <Select 
                    label="Leave Type"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    options={[
                      { label: 'Annual Leave', value: 'Annual Leave' },
                      { label: 'Sick / Carer\'s Leave', value: 'Sick Leave' },
                      { label: 'Unpaid Leave', value: 'Unpaid Leave' },
                      { label: 'Bereavement', value: 'Bereavement' },
                      { label: 'Public Holiday Substitute', value: 'Substitute' }
                    ]}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      icon={<Calendar size={16} />}
                    />
                    <Input 
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      icon={<Calendar size={16} />}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Notes</label>
                    <textarea 
                      className="w-full h-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="Briefly describe your request..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>

                <div className="px-8 py-6 bg-zinc-50/50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                  <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
                  <Button variant="primary" type="submit" loading={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                    Submit
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
