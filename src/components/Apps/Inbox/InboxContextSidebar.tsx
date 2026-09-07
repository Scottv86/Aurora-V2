import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  User, 
  ExternalLink, 
  Layers, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Zap, 
  Phone, 
  Mail, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { EmailThread } from '../../../types/inbox';
import { InboxService } from '../../../services/inboxService';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface InboxContextSidebarProps {
  thread: EmailThread;
  onOpenConvertModal: (thread: EmailThread) => void;
  onThreadUpdated?: () => void;
  width?: number;
}

export const InboxContextSidebar: React.FC<InboxContextSidebarProps> = ({
  thread,
  onOpenConvertModal,
  onThreadUpdated,
  width = 340
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenant } = usePlatform();

  // Resolved Contact
  const [contactParty, setContactParty] = useState<any | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  // Active Tab: 'ai' | 'crm' | 'notes'
  const [activeTab, setActiveTab] = useState<'ai' | 'crm' | 'notes'>('ai');

  // AI Summary
  const [aiSummary, setAiSummary] = useState<{ summary: string; actionItems: string[]; sentiment: string; urgencyScore: number } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Internal Notes
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    // 1. Resolve Contact
    setLoadingContact(true);
    InboxService.resolvePartyByEmail(thread.from.address, tenant?.id)
      .then(party => setContactParty(party))
      .catch(() => setContactParty(null))
      .finally(() => setLoadingContact(false));

    // 2. Fetch AI Insights
    setLoadingAi(true);
    InboxService.generateThreadSummary(thread)
      .then(res => setAiSummary(res))
      .catch(() => setAiSummary(null))
      .finally(() => setLoadingAi(false));
  }, [thread.id, thread.from.address]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      setAddingNote(true);
      await InboxService.addInternalNote(thread.id, newNoteContent.trim(), {
        id: user?.id,
        name: (user as any)?.name || (user as any)?.firstName || 'Staff Member',
        email: user?.email
      }, tenant?.id);

      setNewNoteContent('');
      toast.success('Internal note added to thread');
      if (onThreadUpdated) onThreadUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleTriggerWorkflow = (workflowName: string) => {
    toast.success(`Workflow "${workflowName}" initiated for this thread!`);
  };

  return (
    <div 
      style={{ width: `${width}px` }}
      className="h-full bg-zinc-50/70 dark:bg-zinc-900/60 backdrop-blur-xl flex flex-col justify-between shrink-0 overflow-hidden select-none text-xs border-l border-zinc-200 dark:border-zinc-800"
    >
      
      {/* Top Segmented Tab Switcher */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60">
        <div className="grid grid-cols-3 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('ai')}
            className={cn(
              "py-1.5 px-2 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === 'ai'
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-600/50 font-bold"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <Sparkles size={12} className="text-zinc-500 dark:text-zinc-400" />
            <span>AI Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={cn(
              "py-1.5 px-2 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === 'crm'
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-600/50 font-bold"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <Layers size={12} className="text-zinc-500 dark:text-zinc-400" />
            <span>Records</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              "py-1.5 px-2 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activeTab === 'notes'
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-600/50 font-bold"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            <MessageSquare size={12} className="text-zinc-500 dark:text-zinc-400" />
            <span>Notes {thread.internalNotes?.length ? `(${thread.internalNotes.length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* TAB 1: AI & Insights */}
        {activeTab === 'ai' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* AI Co-pilot Insights */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                AI Co-Pilot Insights
              </h3>

              <div className="p-3.5 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:bg-white/[0.02] rounded-2xl border border-indigo-500/20 shadow-sm space-y-3">
                {loadingAi ? (
                  <div className="flex items-center gap-2 text-zinc-400 py-4 justify-center">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    <span>Generating AI thread analysis...</span>
                  </div>
                ) : aiSummary ? (
                  <>
                    {/* Summary */}
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                        Executive Summary
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                        {aiSummary.summary}
                      </p>
                    </div>

                    {/* Urgency & Sentiment Meter */}
                    <div className="pt-2 border-t border-indigo-500/10 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-semibold">Urgency Score</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(score => (
                          <span
                            key={score}
                            className={cn(
                              "w-2 h-2 rounded-full",
                              score <= aiSummary.urgencyScore ? "bg-amber-500" : "bg-zinc-200 dark:bg-zinc-800"
                            )}
                          />
                        ))}
                        <span className="ml-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                          {aiSummary.urgencyScore}/5
                        </span>
                      </div>
                    </div>

                    {/* Action Items */}
                    {aiSummary.actionItems && aiSummary.actionItems.length > 0 && (
                      <div className="pt-2 border-t border-indigo-500/10 space-y-1.5">
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                          Action Items
                        </span>
                        {aiSummary.actionItems.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <CheckCircle2 size={13} className="text-purple-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-zinc-500">AI analysis unavailable.</p>
                )}
              </div>
            </div>

            {/* Quick Automations */}
            <div className="space-y-2.5 pt-2">
              <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-amber-500" />
                Quick Automations
              </h3>

              <div className="space-y-1.5">
                <button
                  onClick={() => handleTriggerWorkflow('Auto-Triage & Assign')}
                  className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left font-semibold transition-all cursor-pointer"
                >
                  <span>Auto-Triage & Assign</span>
                  <ChevronRight size={13} className="text-zinc-400" />
                </button>
                <button
                  onClick={() => handleTriggerWorkflow('Escalate to Tier 2')}
                  className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left font-semibold transition-all cursor-pointer"
                >
                  <span>Escalate to Tier 2</span>
                  <ChevronRight size={13} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CRM & Aurora Records */}
        {activeTab === 'crm' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* People & Organisations CRM Profile */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={13} className="text-blue-500" />
                  People & Organisations
                </h3>
                {contactParty && (
                  <button
                    onClick={() => navigate(`/workspace/platform/people-organisations/${contactParty.id}`)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View CRM</span>
                    <ExternalLink size={10} />
                  </button>
                )}
              </div>

              {loadingContact ? (
                <div className="p-4 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center gap-2 text-zinc-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Resolving party identity...</span>
                </div>
              ) : contactParty ? (
                <div className="p-3.5 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-500/20">
                      {contactParty.partyType === 'ORGANIZATION' ? <Building2 size={18} /> : <User size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {contactParty.partyType === 'PERSON'
                          ? `${contactParty.person?.firstName || ''} ${contactParty.person?.lastName || ''}`
                          : contactParty.organization?.legalName}
                      </h4>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {contactParty.person?.jobTitle || contactParty.organization?.industry || 'Registered Party'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 space-y-1 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-zinc-400" />
                      <span className="truncate">{thread.from.address}</span>
                    </div>
                    {contactParty.person?.contactDetails?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-zinc-400" />
                        <span>{contactParty.person.contactDetails.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-white dark:bg-zinc-950 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 space-y-2 text-center">
                  <p className="text-[11px] text-zinc-500">
                    Sender not registered in People & Organisations.
                  </p>
                  <button
                    onClick={() => navigate('/workspace/platform/people-organisations')}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold transition-all cursor-pointer text-[11px]"
                  >
                    <Plus size={12} />
                    <span>Add to Directory</span>
                  </button>
                </div>
              )}
            </div>

            {/* Linked Aurora Module Records */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-purple-500" />
                  Linked Module Records
                </h3>
                <button
                  onClick={() => onOpenConvertModal(thread)}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Link Record</span>
                </button>
              </div>

              {thread.linkedRecords && thread.linkedRecords.length > 0 ? (
                <div className="space-y-2">
                  {thread.linkedRecords.map(rec => (
                    <div
                      key={rec.id}
                      onClick={() => navigate(`/workspace/modules/${rec.moduleId}/records/${rec.id}`)}
                      className="p-3 bg-white dark:bg-zinc-950 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            {rec.recordKey || rec.moduleName}
                          </span>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                            {rec.title}
                          </h4>
                        </div>
                        <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 text-center space-y-2">
                  <p className="text-[11px] text-zinc-500">
                    No active Aurora records linked to this thread.
                  </p>
                  <button
                    onClick={() => onOpenConvertModal(thread)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold border border-zinc-200 dark:border-zinc-700/80 transition-all cursor-pointer text-xs"
                  >
                    <Layers size={13} />
                    <span>Convert to Module Record</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Private Team Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={13} className="text-zinc-400" />
                Internal Team Notes
              </h3>

              <div className="space-y-2.5">
                {thread.internalNotes && thread.internalNotes.length > 0 ? (
                  thread.internalNotes.map(note => (
                    <div key={note.id} className="p-3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">{note.authorName}</span>
                        <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                        {note.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-zinc-400 italic py-2 text-center">No internal notes on this thread yet.</p>
                )}

                {/* Add note input */}
                <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-400 font-semibold">@Mention:</span>
                    {['@Sarah', '@Alex', '@David', '@AI-Agent'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewNoteContent(prev => prev ? `${prev} ${tag} ` : `${tag} `)}
                        className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write private team note or @mention colleague..."
                    rows={3}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={addingNote || !newNoteContent.trim()}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 text-zinc-800 dark:text-zinc-200 font-bold text-xs border border-zinc-200 dark:border-zinc-700/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {addingNote ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>Add Private Note</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
