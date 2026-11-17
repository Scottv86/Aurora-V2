import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Pencil, Eye, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RecordCollaborator } from '../../hooks/useRecordPresence';

interface RecordPresenceStackProps {
  collaborators: RecordCollaborator[];
  otherCollaborators: RecordCollaborator[];
  getFieldLabel?: (fieldId: string) => string;
  className?: string;
}

export const RecordPresenceStack: React.FC<RecordPresenceStackProps> = ({
  collaborators,
  otherCollaborators,
  getFieldLabel,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Active collaborators
  const displayCollaborators = otherCollaborators;
  const maxVisible = 4;
  const visible = displayCollaborators.slice(0, maxVisible);
  const overflowCount = Math.max(0, displayCollaborators.length - maxVisible);

  return (
    <div ref={containerRef} className={cn("relative inline-flex items-center", className)}>
      {displayCollaborators.length > 0 ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          onMouseEnter={() => setIsOpen(true)}
          className="flex items-center -space-x-2 hover:space-x-0.5 transition-all p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer group"
          title="View active collaborators on this record"
        >
          {visible.map((collab) => {
            const isAgent = collab.role === 'agent';
            const isEditing = collab.status === 'editing' || Boolean(collab.activeFieldId);

            return (
              <div
                key={collab.socketId || collab.userId}
                className="relative transition-transform group-hover:scale-105"
              style={{ zIndex: 10 }}
            >
              {isAgent ? (
                <div
                  className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 shadow-xs"
                  style={{ borderColor: collab.color }}
                  title={`${collab.name} (AI Co-Pilot)`}
                >
                  <Bot size={13} className="animate-pulse" />
                </div>
              ) : collab.avatarUrl ? (
                <img
                  src={collab.avatarUrl}
                  alt={collab.name}
                  className="w-7 h-7 rounded-full object-cover border-2 shadow-xs bg-zinc-200 dark:bg-zinc-700"
                  style={{ borderColor: collab.color }}
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 shadow-xs"
                  style={{ backgroundColor: collab.color, borderColor: '#ffffff' }}
                >
                  {collab.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              {/* Status Indicator Pill / Dot */}
              {isEditing ? (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-white shadow-2xs animate-pulse"
                  title={`Editing ${collab.activeFieldId ? (getFieldLabel ? getFieldLabel(collab.activeFieldId) : collab.activeFieldId) : 'field'}`}
                >
                  <Pencil size={7} />
                </span>
              ) : (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 shadow-2xs"
                  title="Viewing"
                />
              )}
            </div>
          );
        })}

        {overflowCount > 0 && (
          <div
            className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200 shadow-xs"
            style={{ zIndex: 5 }}
          >
            +{overflowCount}
          </div>
        )}
      </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          onMouseEnter={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100/80 dark:bg-zinc-800/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 text-[11px] text-zinc-500 dark:text-zinc-400 select-none cursor-pointer transition-colors shadow-2xs"
          title="Live collaboration active. Click to see status."
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-medium hidden sm:inline">Live</span>
        </button>
      )}

      {/* Collaborators Popover Card */}
      {isOpen && (
        <div
          onMouseLeave={() => setIsOpen(false)}
          className="absolute right-0 top-full mt-2 w-72 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5"
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
              <Users size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Live Collaborators</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {displayCollaborators.length > 0 ? `${displayCollaborators.length} other online` : 'Viewing solo'}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-0.5">
            {displayCollaborators.length === 0 ? (
              <div className="py-3 px-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
                <p className="font-semibold text-zinc-700 dark:text-zinc-200 mb-1">Real-time presence is active</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                  When team members or AI Assistants view or edit this record, their live avatars and field focus will appear here.
                </p>
              </div>
            ) : (
              displayCollaborators.map((c) => {
                const isAgent = c.role === 'agent';
                const isEditing = c.status === 'editing' || Boolean(c.activeFieldId);
                const fieldName = c.activeFieldId
                  ? getFieldLabel
                    ? getFieldLabel(c.activeFieldId)
                    : c.activeFieldId
                  : null;

                return (
                  <div
                    key={c.socketId || c.userId}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="relative shrink-0">
                      {isAgent ? (
                        <div
                          className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2"
                          style={{ borderColor: c.color }}
                        >
                          <Bot size={15} />
                        </div>
                      ) : c.avatarUrl ? (
                        <img
                          src={c.avatarUrl}
                          alt={c.name}
                          className="w-8 h-8 rounded-full object-cover border-2"
                          style={{ borderColor: c.color }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2"
                          style={{ backgroundColor: c.color, borderColor: '#ffffff' }}
                        >
                          {c.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}

                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900",
                          isEditing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                        )}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {c.name}
                        </span>
                        {isAgent && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Sparkles size={8} /> AI
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] mt-0.5">
                        {isEditing ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium truncate">
                            <Pencil size={10} className="shrink-0" />
                            <span>Editing {fieldName || 'a field'}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1 truncate">
                            <Eye size={10} className="shrink-0" />
                            <span>Viewing record</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
