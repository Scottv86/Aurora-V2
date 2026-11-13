import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Plus,
  ExternalLink,
  Tag,
  Smile,
  Meh,
  Frown,
  Phone,
  MessageSquare,
  ListTodo,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useServiceDesk } from '../../context/ServiceDeskContext';
import { cn } from '../../lib/utils';

export const ServiceDeskWrapUpModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    wrapUpSession,
    acwSeconds,
    closeWrapUpModal,
    resolveOrReopenSession,
    suggestWrapUp,
    addWrapUpCode,
    workforce
  } = useServiceDesk();

  const outcomes = workforce.wrapUpOutcomes || [];
  const topics = workforce.wrapUpTopics || [];

  const [outcome, setOutcome] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [subtopic, setSubtopic] = useState<string>('');
  const [sentiment, setSentiment] = useState<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>('POSITIVE');
  const [firstContactResolution, setFirstContactResolution] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');

  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inline Global List code addition
  const [addingType, setAddingType] = useState<'OUTCOME' | 'TOPIC' | null>(null);
  const [newCodeLabel, setNewCodeLabel] = useState<string>('');
  const [newCodeCategory, setNewCodeCategory] = useState<string>('Resolution');
  const [isAddingCode, setIsAddingCode] = useState<boolean>(false);

  useEffect(() => {
    if (!wrapUpSession) return;

    const defaultOutcome =
      wrapUpSession.wrapUpOutcome || outcomes[0]?.label || 'Resolved — First Contact';
    const defaultTopicObj =
      topics.find(t => t.label === wrapUpSession.wrapUpTopic) || topics[0];
    const defaultTopic =
      wrapUpSession.wrapUpTopic || defaultTopicObj?.label || 'Service Request & Case Status';

    setOutcome(defaultOutcome);
    setTopic(defaultTopic);
    setSubtopic(wrapUpSession.wrapUpSubtopic || defaultTopicObj?.subtopic || '');
    setSentiment(
      (wrapUpSession.wrapUpSentiment as any) ||
        (wrapUpSession.sentiment as any) ||
        'POSITIVE'
    );
    setFirstContactResolution(
      wrapUpSession.firstContactResolution !== undefined
        ? Boolean(wrapUpSession.firstContactResolution)
        : !wrapUpSession.escalatedAt
    );
    setNotes(wrapUpSession.wrapUpNotes || wrapUpSession.aiSummary || '');
    setTags(Array.isArray(wrapUpSession.tags) ? [...wrapUpSession.tags] : []);
  }, [wrapUpSession?.id, outcomes.length, topics.length]);

  if (!wrapUpSession) return null;

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleAiAutoFill = async () => {
    setIsSuggesting(true);
    try {
      const suggestion = await suggestWrapUp(wrapUpSession.id);
      if (suggestion.outcome) setOutcome(suggestion.outcome);
      if (suggestion.topic) setTopic(suggestion.topic);
      if (suggestion.subtopic !== undefined) setSubtopic(suggestion.subtopic);
      if (suggestion.sentiment) setSentiment(suggestion.sentiment);
      if (typeof suggestion.firstContactResolution === 'boolean') {
        setFirstContactResolution(suggestion.firstContactResolution);
      }
      if (suggestion.notes) setNotes(suggestion.notes);
      if (Array.isArray(suggestion.tags) && suggestion.tags.length > 0) {
        setTags(Array.from(new Set([...tags, ...suggestion.tags])));
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleTopicChange = (nextTopic: string) => {
    setTopic(nextTopic);
    const matched = topics.find(t => t.label === nextTopic);
    if (matched?.subtopic && !subtopic) {
      setSubtopic(matched.subtopic);
    }
  };

  const handleOutcomeChange = (nextOutcome: string) => {
    setOutcome(nextOutcome);
    const matched = outcomes.find(o => o.label === nextOutcome);
    if (matched && typeof matched.isFcrEligible === 'boolean') {
      setFirstContactResolution(matched.isFcrEligible);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim();
      if (!tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput('');
    }
  };

  const handleCreateNewCode = async () => {
    if (!addingType || !newCodeLabel.trim()) return;
    setIsAddingCode(true);
    try {
      const clean = newCodeLabel.trim();
      await addWrapUpCode({
        type: addingType,
        label: clean,
        category: newCodeCategory,
        subtopic: addingType === 'TOPIC' ? subtopic : undefined,
        isFcrEligible: true
      });
      if (addingType === 'OUTCOME') {
        setOutcome(clean);
      } else {
        setTopic(clean);
      }
      setNewCodeLabel('');
      setAddingType(null);
    } finally {
      setIsAddingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await resolveOrReopenSession(wrapUpSession.id, 'RESOLVED', {
        wrapUpOutcome: outcome || 'Resolved — First Contact',
        wrapUpTopic: topic || 'General Inquiry',
        wrapUpSubtopic: subtopic.trim() || undefined,
        wrapUpSentiment: sentiment,
        firstContactResolution,
        wrapUpNotes: notes.trim() || undefined,
        wrapUpTags: tags,
        acwDurationSeconds: acwSeconds,
        resolutionSummary: notes.trim() || `${outcome} (${topic})`
      });
      closeWrapUpModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  Wrap-Up & Close Interaction
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  <Clock className="w-3 h-3" /> ACW {formatDuration(acwSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 truncate mt-0.5">
                {wrapUpSession.channelType === 'VOICE_CALL' ? (
                  <Phone className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <MessageSquare className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                )}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {wrapUpSession.visitorName}
                </span>
                <span>•</span>
                <span>{wrapUpSession.siteName || 'Customer Portal'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAiAutoFill}
              disabled={isSuggesting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70 transition-colors disabled:opacity-50"
              title="Auto-classify Outcome, Topic, Sentiment & Summary from the conversation transcript"
            >
              {isSuggesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              AI Auto-Fill
            </button>
            <button
              type="button"
              onClick={closeWrapUpModal}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* 1. Disposition / Outcome */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Disposition / Outcome Code <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddingType(addingType === 'OUTCOME' ? null : 'OUTCOME');
                    setNewCodeCategory('Resolution');
                  }}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add Outcome
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <button
                  type="button"
                  onClick={() => {
                    closeWrapUpModal();
                    navigate('/workspace/platform/global-lists');
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
                  title="Edit Wrap-Up Outcomes & Topics in Global Lists"
                >
                  <ListTodo className="w-3 h-3" /> Global Lists
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            <select
              value={outcome}
              onChange={e => handleOutcomeChange(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
            >
              {outcomes.map(item => (
                <option key={item.id} value={item.label}>
                  {item.label} {item.category ? `(${item.category})` : ''}
                </option>
              ))}
              {outcomes.length === 0 && (
                <option value="Resolved — First Contact">Resolved — First Contact</option>
              )}
            </select>

            {addingType === 'OUTCOME' && (
              <div className="mt-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                <input
                  type="text"
                  value={newCodeLabel}
                  onChange={e => setNewCodeLabel(e.target.value)}
                  placeholder="New outcome label (saved to Global Lists)..."
                  className="flex-1 px-2.5 py-1.5 rounded-md text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
                <select
                  value={newCodeCategory}
                  onChange={e => setNewCodeCategory(e.target.value)}
                  className="px-2 py-1.5 rounded-md text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                >
                  <option value="Resolution">Resolution</option>
                  <option value="Self-Service">Self-Service</option>
                  <option value="Escalation">Escalation</option>
                  <option value="No Action">No Action</option>
                </select>
                <button
                  type="button"
                  onClick={handleCreateNewCode}
                  disabled={isAddingCode || !newCodeLabel.trim()}
                  className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* 2. Primary Topic & Sub-Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Primary Interaction Topic <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAddingType(addingType === 'TOPIC' ? null : 'TOPIC');
                    setNewCodeCategory('Operations');
                  }}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add Topic
                </button>
              </div>
              <select
                value={topic}
                onChange={e => handleTopicChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
              >
                {topics.map(item => (
                  <option key={item.id} value={item.label}>
                    {item.label}
                  </option>
                ))}
                {topics.length === 0 && (
                  <option value="General Product / Policy Inquiry">
                    General Product / Policy Inquiry
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Sub-Topic / Contact Driver
              </label>
              <input
                type="text"
                value={subtopic}
                onChange={e => setSubtopic(e.target.value)}
                placeholder="e.g., Invoice Inquiry, Booking Slot..."
                className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {addingType === 'TOPIC' && (
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
              <input
                type="text"
                value={newCodeLabel}
                onChange={e => setNewCodeLabel(e.target.value)}
                placeholder="New topic label (saved to Global Lists)..."
                className="flex-1 px-2.5 py-1.5 rounded-md text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={handleCreateNewCode}
                disabled={isAddingCode || !newCodeLabel.trim()}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Save Topic
              </button>
            </div>
          )}

          {/* 3. Customer Sentiment & First Contact Resolution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Customer Sentiment
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'POSITIVE', label: 'Positive', icon: Smile },
                    { id: 'NEUTRAL', label: 'Neutral', icon: Meh },
                    { id: 'NEGATIVE', label: 'Frustrated', icon: Frown }
                  ] as const
                ).map(opt => {
                  const Icon = opt.icon;
                  const active = sentiment === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSentiment(opt.id)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors',
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                          : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                First Contact Resolution (FCR)
              </label>
              <button
                type="button"
                onClick={() => setFirstContactResolution(!firstContactResolution)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs border transition-colors',
                  firstContactResolution
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                )}
              >
                <span className="font-medium">
                  {firstContactResolution ? 'Yes — Resolved on 1st Contact' : 'No — Follow-up Needed'}
                </span>
                <span
                  className={cn(
                    'w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold',
                    firstContactResolution
                      ? 'bg-indigo-600 text-white'
                      : 'border border-zinc-300 dark:border-zinc-600'
                  )}
                >
                  {firstContactResolution ? '✓' : ''}
                </span>
              </button>
            </div>
          </div>

          {/* 4. Closing Summary / Resolution Note */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Closing Summary & Resolution Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Summarize the outcome, action taken, or next steps for reporting & audit..."
              className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* 5. Reporting Tags */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Reporting Tags
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  <Tag className="w-2.5 h-2.5 text-indigo-500" />
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter(item => item !== t))}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type tag & press Enter..."
                className="flex-1 min-w-[140px] bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500">
              Available in Query Builder, Report Builder & KPI Library
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeWrapUpModal}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSubmitting ? 'Saving Wrap-Up...' : 'Complete Wrap-Up & Resolve'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
