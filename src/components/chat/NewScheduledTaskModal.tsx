import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, Cpu, Sparkles, ChevronDown, Calendar, RotateCw, Clock } from 'lucide-react';

export interface ScheduledTaskData {
  id?: string;
  name: string;
  project: string; // Folder name
  frequency?: string; // 'Recurring' | 'Once'
  scheduleType: string; // 'Daily' | 'Weekly' | 'Monthly' | 'Hourly' | 'Once'
  scheduleTime: string; // e.g. "9:05 AM"
  cronExpression?: string;
  runDate?: string;
  startDate?: string;
  endDate?: string;
  prompt: string;
  model: string;
  isActive?: boolean;
  status?: string;
  lastRunAt?: string | Date;
  lastResult?: string;
}

export const AVAILABLE_SCHEDULE_MODELS = [
  { id: 'Default', label: 'Default (Gemini 3.1 Flash-Lite)', value: 'default' },
  { id: 'Low', label: 'Low (Gemini 3.1 Flash-Lite)', value: 'low' },
  { id: 'Medium', label: 'Medium (Claude 3.5 Sonnet)', value: 'medium' },
  { id: 'High', label: 'High (GPT-4o / DeepSeek R1)', value: 'high' }
];

// Generate 5-minute increment time options (12:00 AM to 11:55 PM)
const TIME_OPTIONS_5MIN = (() => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const period = h < 12 ? 'AM' : 'PM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const displayMinute = m.toString().padStart(2, '0');
      options.push(`${displayHour}:${displayMinute} ${period}`);
    }
  }
  return options;
})();

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
  const [frequency, setFrequency] = useState<'Recurring' | 'Once'>('Recurring');
  const [scheduleType, setScheduleType] = useState('Daily');
  const [scheduleTime, setScheduleTime] = useState('9:00 AM');
  const [runDate, setRunDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('Default');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const todayIso = new Date().toISOString().split('T')[0];
      if (initialTask) {
        setName(initialTask.name || '');
        setProject(initialTask.project || 'aurora');
        setFrequency((initialTask.frequency as any) || (initialTask.scheduleType === 'Once' ? 'Once' : 'Recurring'));
        setScheduleType(initialTask.scheduleType || 'Daily');
        setScheduleTime(initialTask.scheduleTime || '9:00 AM');
        setRunDate(initialTask.runDate || todayIso);
        setStartDate(initialTask.startDate || '');
        setEndDate(initialTask.endDate || '');
        setPrompt(initialTask.prompt || '');
        setModel(initialTask.model || 'Default');
      } else {
        setName('');
        setProject(projects[0] || 'aurora');
        setFrequency('Recurring');
        setScheduleType('Daily');
        setScheduleTime('9:00 AM');
        setRunDate(todayIso);
        setStartDate('');
        setEndDate('');
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
        frequency,
        scheduleType: frequency === 'Once' ? 'Once' : scheduleType,
        scheduleTime,
        runDate: frequency === 'Once' ? runDate : undefined,
        startDate: frequency === 'Recurring' ? startDate || undefined : undefined,
        endDate: frequency === 'Recurring' ? endDate || undefined : undefined,
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

          {/* Modal Container (Glassmorphic) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-zinc-950/85 text-zinc-100 border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
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
                  Task Name
                </label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter scheduled task name..."
                  required
                  className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10 text-zinc-400">
                      <Folder className="h-4 w-4 text-indigo-400" />
                    </div>
                    <select
                      style={{ colorScheme: 'dark' }}
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl pl-10 pr-9 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
                    >
                      {projects.map((p) => (
                        <option key={p} value={p} className="bg-[#141417] text-zinc-100 font-sans py-1.5">
                          {p}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-10 text-zinc-400">
                      <ChevronDown className="h-3.5 w-3.5" />
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
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10 text-purple-400">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <select
                      style={{ colorScheme: 'dark' }}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl pl-10 pr-9 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer font-medium font-sans"
                    >
                      {AVAILABLE_SCHEDULE_MODELS.map((m) => (
                        <option key={m.id} value={m.id} className="bg-[#141417] text-zinc-100 font-sans py-1.5">
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-10 text-zinc-400">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Type / Mode Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Execution Mode
                </label>
                <div className="flex items-center p-1 bg-zinc-900/60 border border-zinc-800/80 rounded-xl backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setFrequency('Recurring')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      frequency === 'Recurring'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Recurring
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('Once')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      frequency === 'Once'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" /> Once Off
                  </button>
                </div>
              </div>

              {/* Dynamic Schedule Fields depending on Mode */}
              {frequency === 'Once' ? (
                /* ONCE OFF FIELDS: Execution Date & 5-Min Time Selector */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Execution Date */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-300">
                      Run Date
                    </label>
                    <input
                      style={{ colorScheme: 'dark' }}
                      type="date"
                      value={runDate}
                      onChange={(e) => setRunDate(e.target.value)}
                      required
                      className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans cursor-pointer"
                    />
                  </div>

                  {/* 5-Min Increment Time Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-300 flex items-center justify-between">
                      <span>Execution Time</span>
                      <span className="text-[10px] text-zinc-500">5-min steps</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 z-10">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      <select
                        style={{ colorScheme: 'dark' }}
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl pl-9 pr-8 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
                      >
                        {TIME_OPTIONS_5MIN.map((t) => (
                          <option key={t} value={t} className="bg-[#141417] text-zinc-100 font-sans py-1.5">
                            {t}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-10 text-zinc-400">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* RECURRING FIELDS: Pattern, 5-Min Time Selector, Start & Finish Dates */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pattern Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-zinc-300">
                        Frequency Pattern
                      </label>
                      <div className="relative">
                        <select
                          style={{ colorScheme: 'dark' }}
                          value={scheduleType}
                          onChange={(e) => setScheduleType(e.target.value)}
                          className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl pl-3.5 pr-8 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
                        >
                          <option value="Daily" className="bg-[#141417] text-zinc-100 font-sans py-1.5">Daily</option>
                          <option value="Weekly" className="bg-[#141417] text-zinc-100 font-sans py-1.5">Weekly</option>
                          <option value="Monthly" className="bg-[#141417] text-zinc-100 font-sans py-1.5">Monthly</option>
                          <option value="Hourly" className="bg-[#141417] text-zinc-100 font-sans py-1.5">Hourly</option>
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-10 text-zinc-400">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* 5-Min Increment Time Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-zinc-300 flex items-center justify-between">
                        <span>Execution Time</span>
                        <span className="text-[10px] text-zinc-500">5-min steps</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 z-10">
                          <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <select
                          style={{ colorScheme: 'dark' }}
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl pl-9 pr-8 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer font-sans"
                        >
                          {TIME_OPTIONS_5MIN.map((t) => (
                            <option key={t} value={t} className="bg-[#141417] text-zinc-100 font-sans py-1.5">
                              {t}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-10 text-zinc-400">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optional Start & Finish Date Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Start Date */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-zinc-300 flex items-center justify-between">
                        <span>Start Date</span>
                        <span className="text-[10px] text-zinc-500">Optional</span>
                      </label>
                      <input
                        style={{ colorScheme: 'dark' }}
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Starts immediately"
                        className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans cursor-pointer"
                      />
                    </div>

                    {/* Finish Date */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-zinc-300 flex items-center justify-between">
                        <span>Finish Date</span>
                        <span className="text-[10px] text-zinc-500">Optional</span>
                      </label>
                      <input
                        style={{ colorScheme: 'dark' }}
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="Runs indefinitely"
                        className="w-full bg-[#141417] dark:bg-[#141417] text-zinc-100 border border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-sm appearance-none backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-500 backdrop-blur-md focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
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
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md ${
                    isFormValid && !isSubmitting
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:via-purple-700 text-white cursor-pointer shadow-indigo-500/20 hover:shadow-indigo-500/35'
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
