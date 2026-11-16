import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StickyNote, Copy, Check, Trash2, SlidersHorizontal, Cloud, CloudCheck, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WidgetCommonProps } from './types';
import { NotesClientService } from '../../../services/notesService';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';

export const ScratchpadWidget: React.FC<WidgetCommonProps> = ({ onOpenCustomize, isCompact }) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string>('');
  const [noteId, setNoteId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
  const tenantId = tenant?.id;

  // Hydrate note from backend database
  useEffect(() => {
    if (!tenantId) return;

    NotesClientService.getNotes(
      { isPersonal: true, tag: 'header-scratchpad' },
      token,
      tenantId
    )
      .then((notes) => {
        if (Array.isArray(notes) && notes.length > 0) {
          const scratchNote = notes[0];
          setNoteId(scratchNote.id);
          setContent(scratchNote.body || '');
          setSyncStatus('saved');
        }
      })
      .catch((err) => {
        console.warn('[ScratchpadWidget] Could not load database note:', err);
      });
  }, [tenantId, token]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Persist edits to database
  const saveToDatabase = useCallback(
    (text: string) => {
      if (!tenantId) return;
      setSyncStatus('saving');

      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);

      saveDebounceRef.current = setTimeout(async () => {
        try {
          if (noteId) {
            await NotesClientService.updateNote(
              noteId,
              { body: text },
              token,
              tenantId
            );
          } else if (text.trim()) {
            const created = await NotesClientService.createNote(
              {
                title: 'Quick Scratchpad',
                body: text,
                isPersonal: true,
                tags: ['header-scratchpad'],
                color: 'amber'
              },
              token,
              tenantId
            );
            setNoteId(created.id);
          }
          setSyncStatus('saved');
        } catch (err) {
          console.error('[ScratchpadWidget] Failed to save note to DB:', err);
          setSyncStatus('error');
        }
      }, 500);
    },
    [noteId, tenantId, token]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    setContent(nextText);
    saveToDatabase(nextText);
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = async () => {
    if (confirm('Clear scratchpad note?')) {
      setContent('');
      saveToDatabase('');
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-left select-none cursor-pointer group",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800/70",
          isOpen && "bg-zinc-100 dark:bg-zinc-800"
        )}
        title={content ? "Quick Scratchpad (has notes, synced to cloud)" : "Quick Scratchpad"}
      >
        <div className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
          <StickyNote size={12} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1">
            Notes
            {content.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </span>
          {!isCompact && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 tracking-tight">
              {wordCount > 0 ? `${wordCount} words` : 'Empty'}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/15 dark:shadow-black/50 overflow-hidden z-[65] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <StickyNote size={13} className="text-amber-500" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Quick Scratchpad</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!content.trim()}
                className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-40"
                title="Copy note"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!content.trim()}
                className="p-1 rounded text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
                title="Clear note"
              >
                <Trash2 size={12} />
              </button>
              {onOpenCustomize && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCustomize();
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors ml-0.5"
                  title="Customize widgets"
                >
                  <SlidersHorizontal size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="p-2.5">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              placeholder="Jot down quick thoughts, phone numbers, or scratch tasks here..."
              rows={5}
              className="w-full text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-2.5 outline-none resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-sans"
            />
            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              <span>{wordCount} words • {content.length} chars</span>
              <span className="flex items-center gap-1 font-sans">
                {syncStatus === 'saving' && (
                  <>
                    <Loader2 size={10} className="animate-spin text-amber-500" />
                    <span className="text-amber-500">Saving...</span>
                  </>
                )}
                {syncStatus === 'saved' && (
                  <span className="text-emerald-500">Synced to Cloud</span>
                )}
                {syncStatus === 'error' && (
                  <span className="text-red-400">Offline</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
