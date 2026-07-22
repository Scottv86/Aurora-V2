import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, Cpu, Sparkles } from 'lucide-react';

export interface ScheduledTaskData {
  id?: string;
  name: string;
  project: string; // Folder name
  scheduleType: string;
  scheduleTime: string;
  cronExpression?: string;
  prompt: string;
  model: string;
  isActive?: boolean;
}

export const AVAILABLE_SCHEDULE_MODELS = [
  { id: 'Default', label: 'Default (Gemini 3.1 Flash-Lite)', value: 'default' },
  { id: 'Low', label: 'Low (Gemini 3.1 Flash-Lite)', value: 'low' },
  { id: 'Medium', label: 'Medium (Claude 3.5 Sonnet)', value: 'medium' },
  { id: 'High', label: 'High (GPT-4o / DeepSeek R1)', value: 'high' }
];

interface NewScheduledTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: ScheduledTaskData) => Promise<void>;
  initialTask?: ScheduledTaskData | null;
  projects?: string[];
}

export const NewScheduledTaskModal: React.FC<NewScheduledTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask = null,
  projects = ['aurora']
}) => {
  const [name, setName] = useState('');
  const [project, setProject] = useState('aurora');
  const [scheduleType, setScheduleType] = useState('Daily');
  const [scheduleTime, setScheduleTime] = useState('9:00 AM');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('Default');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setName(initialTask.name || '');
        setProject(initialTask.project || 'aurora');
        setScheduleType(initialTask.scheduleType || 'Daily');
        setScheduleTime(initialTask.scheduleTime || '9:00 AM');
        setPrompt(initialTask.prompt || '');
        setModel(initialTask.model || 'Default');
      } else {
        setName('');
        setProject(projects[0] || 'aurora');
        setScheduleType('Daily');
        setScheduleTime('9:00 AM');
        setPrompt('');
        setModel('Default');
      }
    }
  }, [isOpen, initialTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialTask?.id,
        name: name.trim(),
        project,
        scheduleType,
        scheduleTime,
        prompt: prompt.trim(),
        model,
        isActive: initialTask?.isActive ?? true
      });
      onClose();
    } catch (err) {
      console.error('Failed to save scheduled task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim().length > 0 && prompt.trim().length > 0;
  const currentModelObj = AVAILABLE_SCHEDULE_MODELS.find(
    m => m.id.toLowerCase() === model.toLowerCase() || m.value.toLowerCase() === model.toLowerCase()
  ) || AVAILABLE_SCHEDULE_MODELS[0];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Fullscreen Backdrop with Blur covering header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[#141417]/95 dark:bg-[#141417]/95 text-zinc-100 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
              <h2 className="text-base font-semibold text-zinc-100">
                {initialTask ? 'Edit Scheduled Task' : 'New Scheduled Task'}
              </h2>
              <button 
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Name
                </label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter scheduled task name..."
                  required
                  className="w-full bg-[#1c1c1f] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              {/* Folder & Model Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Folder Field */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-300">
                    Folder
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                      <Folder className="h-4 w-4 text-indigo-400" />
                    </div>
                    <select
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-800 rounded-xl pl-9 pr-8 py-2.5 text-sm text-zinc-100 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p} value={p} className="bg-[#1c1c1f] text-zinc-100">
                          {p}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Model Field */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-300 flex items-center justify-between">
                    <span>Model</span>
                    <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Selected
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-purple-400">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-800 rounded-xl pl-9 pr-8 py-2.5 text-sm text-zinc-100 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer font-medium"
                    >
                      {AVAILABLE_SCHEDULE_MODELS.map((m) => (
                        <option key={m.id} value={m.id} className="bg-[#1c1c1f] text-zinc-100 py-1">
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Field */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Schedule
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Hourly">Hourly</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400 text-xs">
                      ▼
                    </div>
                  </div>

                  <span className="text-xs text-zinc-400 font-medium">around</span>

                  <div className="relative flex-1">
                    <select
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-[#1c1c1f] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="8:00 AM">8:00 AM</option>
                      <option value="9:00 AM">9:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="2:00 PM">2:00 PM</option>
                      <option value="6:00 PM">6:00 PM</option>
                      <option value="9:00 PM">9:00 PM</option>
                      <option value="12:00 AM">12:00 AM</option>
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Prompt Field */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Prompt
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a prompt for the agent to run..."
                  rows={4}
                  required
                  className="w-full bg-[#1c1c1f] border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                />
              </div>

              {/* Footer Notice & Submit Button */}
              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/50 mt-4">
                <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                  <span>Task will run using</span>
                  <span className="text-purple-400 font-semibold">{currentModelObj.id}</span>
                </span>

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                    isFormValid && !isSubmitting
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 cursor-pointer border border-zinc-700'
                      : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800/50'
                  }`}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : initialTask
                    ? 'Save Changes'
                    : 'Add Scheduled Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
