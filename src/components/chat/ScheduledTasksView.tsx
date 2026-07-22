import React, { useState } from 'react';
import { Search, Plus, Clock, Play, Edit2, Trash2, Folder, Sparkles } from 'lucide-react';
import { ScheduledTaskData, AVAILABLE_SCHEDULE_MODELS } from './NewScheduledTaskModal';

interface ScheduledTasksViewProps {
  tasks: ScheduledTaskData[];
  onOpenNewModal: () => void;
  onEditTask: (task: ScheduledTaskData) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  onToggleTaskActive: (taskId: string, isActive: boolean) => Promise<void>;
  onRunTaskNow: (taskId: string) => Promise<void>;
  isLoading?: boolean;
}

export const ScheduledTasksView: React.FC<ScheduledTasksViewProps> = ({
  tasks,
  onOpenNewModal,
  onEditTask,
  onDeleteTask,
  onToggleTaskActive,
  onRunTaskNow,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.prompt.toLowerCase().includes(q) ||
      t.project.toLowerCase().includes(q) ||
      (t.model && t.model.toLowerCase().includes(q))
    );
  });

  const handleRun = async (taskId: string) => {
    try {
      setRunningTaskId(taskId);
      await onRunTaskNow(taskId);
    } finally {
      setRunningTaskId(null);
    }
  };

  const getModelLabel = (modelId: string) => {
    const match = AVAILABLE_SCHEDULE_MODELS.find(
      m => m.id.toLowerCase() === (modelId || '').toLowerCase() || m.value.toLowerCase() === (modelId || '').toLowerCase()
    );
    return match ? match.id : (modelId || 'Default');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent text-zinc-100 overflow-hidden min-w-0">
      {/* Secondary Header Bar (matching main chat header bar style) */}
      <div className="h-12 border-b border-zinc-200/50 dark:border-zinc-800/40 px-6 flex items-center justify-between flex-shrink-0 bg-white/70 dark:bg-zinc-950/50 backdrop-blur-xl z-10">
        {/* Left Side: Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate min-w-0 select-none">
            Scheduled Tasks
          </span>
        </div>

        {/* Right Side: + New Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-650 hover:from-indigo-600 hover:via-purple-600 text-white text-xs py-1.5 px-3 rounded-lg font-semibold transition-all shadow-sm hover:shadow-[0_0_12px_rgba(99,102,241,0.3)] border-none outline-none cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-white" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center max-w-4xl mx-auto w-full space-y-6 scrollbar-thin">
        {/* Search Input Bar */}
        <div className="w-full max-w-md relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-white/60 dark:bg-[#161619]/90 border border-zinc-200/70 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-200 placeholder-zinc-500 outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all backdrop-blur-md"
          />
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-zinc-500 text-xs">
            Loading scheduled tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-3">
            <p className="text-sm text-zinc-500 font-medium">
              {searchQuery ? 'No matching scheduled tasks found.' : 'No scheduled tasks configured.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onOpenNewModal}
                className="mt-2 flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs px-4 py-2 rounded-xl font-semibold transition-all shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create First Task
              </button>
            )}
          </div>
        ) : (
          /* Task List */
          <div className="w-full space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id || task.name}
                className={`bg-white/70 dark:bg-[#141417]/80 backdrop-blur-xl border rounded-xl p-4 transition-all hover:border-zinc-400 dark:hover:border-zinc-700/80 group ${
                  task.isActive !== false ? 'border-zinc-200/80 dark:border-zinc-800/80' : 'border-zinc-200/40 dark:border-zinc-800/40 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Task Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {task.name}
                      </h3>

                      {/* Folder Tag */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50">
                        <Folder className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                        {task.project}
                      </span>

                      {/* Model Tag */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-[10px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <Sparkles className="h-3 w-3" />
                        {getModelLabel(task.model)}
                      </span>
                    </div>

                    {/* Schedule info */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                      <span>
                        {task.scheduleType} around {task.scheduleTime}
                      </span>
                    </div>

                    {/* Prompt Snippet */}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400/90 line-clamp-2 pt-1 font-normal bg-zinc-50/80 dark:bg-zinc-900/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40">
                      "{task.prompt}"
                    </p>
                  </div>

                  {/* Right Actions & Toggle */}
                  <div className="flex items-center gap-3 shrink-0 pt-0.5">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => task.id && onToggleTaskActive(task.id, !task.isActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        task.isActive !== false ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-800'
                      }`}
                      title={task.isActive !== false ? 'Disable task' : 'Enable task'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          task.isActive !== false ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Run Now Button */}
                    <button
                      onClick={() => task.id && handleRun(task.id)}
                      disabled={runningTaskId === task.id}
                      className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-indigo-600 hover:text-white text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 transition-all cursor-pointer disabled:opacity-50"
                      title="Run Task Now"
                    >
                      <Play className={`h-3.5 w-3.5 ${runningTaskId === task.id ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 transition-all cursor-pointer"
                      title="Edit Task"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => task.id && onDeleteTask(task.id)}
                      className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-rose-600 hover:text-white text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 transition-all cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
