import React, { useState } from 'react';
import {
  Bot,
  User,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  BookOpen,
  Calendar,
  FileText,
  CreditCard,
  Database,
  PhoneCall,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock
} from 'lucide-react';
import { ServiceDeskMessage } from '../../types/serviceDesk';

interface ServiceDeskMessageBubbleProps {
  message: ServiceDeskMessage;
  viewMode: 'OPERATOR' | 'VISITOR';
  accentColor?: string;
  onApproveHitl?: (note?: string) => void;
  onRejectHitl?: (note?: string) => void;
  onCardAction?: (
    messageId: string,
    actionType: 'SUBMIT_FORM' | 'CONFIRM_BOOKING' | 'COMPLETE_PAYMENT',
    data?: Record<string, any>
  ) => void;
  onOpenRecord?: (moduleId: string, recordId: string) => void;
  onAnswerCall?: () => void;
  compact?: boolean;
}

export const ServiceDeskMessageBubble: React.FC<ServiceDeskMessageBubbleProps> = ({
  message,
  viewMode,
  accentColor,
  onApproveHitl,
  onRejectHitl,
  onCardAction,
  onOpenRecord,
  onAnswerCall,
  compact = false
}) => {
  const [showTrace, setShowTrace] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [hitlNote, setHitlNote] = useState('');

  if (viewMode === 'VISITOR' && message.senderType === 'INTERNAL_WHISPER') {
    return null;
  }

  const formatRichText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-zinc-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 font-mono text-[11px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (message.senderType === 'SYSTEM' && message.messageType !== 'CALL_EVENT') {
    return (
      <div className="flex justify-center my-2.5">
        <div className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 max-w-[90%] text-center">
          <span>{formatRichText(message.content)}</span>
        </div>
      </div>
    );
  }

  const isOwnSide =
    viewMode === 'OPERATOR'
      ? message.senderType === 'HUMAN_AGENT' ||
        message.senderType === 'AI_AGENT' ||
        message.senderType === 'INTERNAL_WHISPER'
      : message.senderType === 'VISITOR';

  const isWhisper = message.senderType === 'INTERNAL_WHISPER';
  const isAi = message.senderType === 'AI_AGENT';
  const payload = message.payload || {};

  return (
    <div className={`flex flex-col ${isOwnSide ? 'items-end' : 'items-start'} my-2`}>
      {/* Clean Neutral Sender Header */}
      <div className="flex items-center gap-1.5 mb-1 px-1">
        {isWhisper ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium">
            <Lock size={10} /> Internal Note • {message.senderName}
          </span>
        ) : isAi ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            <Bot size={12} className="text-indigo-600 dark:text-indigo-400" /> {message.senderName}
            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-[9px] font-semibold">
              AI
            </span>
          </span>
        ) : message.senderType === 'HUMAN_AGENT' ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            <User size={12} className="text-indigo-600 dark:text-indigo-400" /> {message.senderName}
            {message.senderRole && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[9px] font-medium">
                {message.senderRole}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
            {message.senderName}
          </span>
        )}
        <span className="text-[10px] text-zinc-400">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Main Message Container */}
      <div
        className={`max-w-[90%] ${compact ? 'p-2.5 text-xs' : 'p-3 text-[13px]'} rounded-xl leading-relaxed transition-all ${
          isWhisper
            ? 'bg-zinc-50 dark:bg-zinc-900/70 border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            : isOwnSide
            ? viewMode === 'VISITOR' && accentColor
              ? 'text-white rounded-br-xs shadow-xs'
              : 'bg-indigo-50/75 dark:bg-indigo-950/35 border border-indigo-200/80 dark:border-indigo-800/60 text-zinc-900 dark:text-zinc-100 rounded-br-xs'
            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs shadow-2xs'
        }`}
        style={isOwnSide && viewMode === 'VISITOR' && accentColor ? { backgroundColor: accentColor } : undefined}
      >
        {message.content && <div className="whitespace-pre-wrap">{formatRichText(message.content)}</div>}

        {/* 1. KB_CITATION Interactive Card */}
        {message.messageType === 'KB_CITATION' &&
          Array.isArray(payload.articles) &&
          payload.articles.length > 0 && (
            <div className="mt-2.5 space-y-1.5 pt-2.5 border-t border-zinc-200 dark:border-zinc-700/80">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <BookOpen size={11} /> Knowledge Base Sources
              </div>
              {payload.articles.map(art => (
                <div
                  key={art.id}
                  className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-white">{art.title}</span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] font-medium shrink-0">
                      {art.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{art.excerpt}</p>
                </div>
              ))}
            </div>
          )}

        {/* 2. HITL_APPROVAL_REQUEST Card */}
        {message.messageType === 'HITL_APPROVAL_REQUEST' && payload.hitlRequest && (
          <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-zinc-900 dark:text-white font-semibold text-xs">
                <ShieldAlert size={14} className="text-zinc-500" />
                <span>{payload.hitlRequest.toolName}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium uppercase">
                {payload.hitlRequest.status}
              </span>
            </div>

            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{payload.hitlRequest.description}</p>

            {payload.hitlRequest.parameters && Object.keys(payload.hitlRequest.parameters).length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 p-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-[11px]">
                {Object.entries(payload.hitlRequest.parameters).map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="text-zinc-400 capitalize">{k}: </span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'OPERATOR' && payload.hitlRequest.status === 'PENDING' && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={hitlNote}
                  onChange={e => setHitlNote(e.target.value)}
                  placeholder="Optional approval note..."
                  className="w-full px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApproveHitl?.(hitlNote)}
                    className="flex-1 py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button
                    onClick={() => onRejectHitl?.(hitlNote)}
                    className="py-1.5 px-3 rounded-md bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <XCircle size={13} /> Decline
                  </button>
                </div>
              </div>
            )}

            {payload.hitlRequest.executionResult && (
              <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 pt-1">
                {payload.hitlRequest.executionResult}
              </div>
            )}
          </div>
        )}

        {/* 3. BOOKING_CARD Interactive Slot Picker */}
        {message.messageType === 'BOOKING_CARD' && (
          <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-left space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-white font-semibold text-xs">
              <Calendar size={13} className="text-zinc-500" />
              <span>{payload.bookingServiceName || 'Schedule Appointment'}</span>
            </div>

            {payload.selectedSlot ? (
              <div className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs space-y-0.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-zinc-600 dark:text-zinc-400" /> Confirmed #
                  {payload.selectedSlot.confirmationCode}
                </div>
                <div className="text-zinc-500 dark:text-zinc-400">
                  {payload.selectedSlot.date} at {payload.selectedSlot.time} • {payload.selectedSlot.resourceName}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(payload.availableSlots || []).map(slot => (
                  <div
                    key={slot.id}
                    className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-medium text-xs">
                        {slot.date} • {slot.time} ({slot.durationMinutes}m)
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{slot.resourceName}</div>
                    </div>
                    <button
                      onClick={() => onCardAction?.(message.id, 'CONFIRM_BOOKING', { slot })}
                      className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium cursor-pointer shrink-0 transition-colors"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. RECORD_CARD Status Viewer */}
        {message.messageType === 'RECORD_CARD' && (
          <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-left space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white">
                <Database size={13} className="text-zinc-500" />
                <span>{payload.recordKey || 'Record'}</span>
                <span className="text-zinc-400 font-normal">• {payload.moduleName || 'Module'}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-medium">
                {payload.recordStatus || 'Active'}
              </span>
            </div>

            <div className="font-medium text-xs">{payload.recordTitle}</div>

            {payload.recordFields && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                {Object.entries(payload.recordFields).map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="text-zinc-400">{k}: </span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'OPERATOR' && payload.moduleId && payload.recordId && onOpenRecord && (
              <button
                onClick={() => onOpenRecord(payload.moduleId!, payload.recordId!)}
                className="mt-1 w-full py-1.5 px-2.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ExternalLink size={12} /> Open Record
              </button>
            )}
          </div>
        )}

        {/* 5. FORM_CARD Interactive Form */}
        {message.messageType === 'FORM_CARD' && (
          <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-left space-y-2.5">
            <div className="flex items-center gap-1.5 text-zinc-900 dark:text-white font-semibold text-xs">
              <FileText size={13} className="text-zinc-500" />
              <span>{payload.formTitle || 'Form'}</span>
            </div>

            {payload.isSubmitted ? (
              <div className="p-2.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 size={14} className="text-zinc-500" /> Submitted & Linked to Record
              </div>
            ) : (
              <div className="space-y-2">
                {(payload.formFields || []).map(field => (
                  <div key={field.id}>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      {field.label} {field.required && '*'}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formValues[field.id] || ''}
                        onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                      >
                        <option value="">Select {field.label}...</option>
                        {(field.options || []).map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        value={formValues[field.id] || ''}
                        onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formValues[field.id] || ''}
                        onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => onCardAction?.(message.id, 'SUBMIT_FORM', formValues)}
                  className="w-full py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs cursor-pointer transition-colors"
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. PAYMENT_CARD Interactive Invoice Card */}
        {message.messageType === 'PAYMENT_CARD' && (
          <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white">
                <CreditCard size={13} className="text-zinc-500" />
                <span>{payload.invoiceNumber || 'Invoice'}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-medium">
                {payload.paymentStatus || 'UNPAID'}
              </span>
            </div>

            <div className="text-base font-bold">
              ${Number(payload.amount || 0).toFixed(2)} {payload.currency || 'AUD'}
            </div>
            {payload.paymentDescription && (
              <div className="text-[11px] text-zinc-500">{payload.paymentDescription}</div>
            )}

            {payload.paymentStatus !== 'PAID' ? (
              <button
                onClick={() => onCardAction?.(message.id, 'COMPLETE_PAYMENT', {})}
                className="w-full py-1.5 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <CreditCard size={13} /> Pay ${Number(payload.amount || 0).toFixed(2)} {payload.currency || 'AUD'}
              </button>
            ) : (
              <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Paid
              </div>
            )}
          </div>
        )}

        {/* 7. CALL_EVENT Voice Queue Card */}
        {message.messageType === 'CALL_EVENT' && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <PhoneCall size={13} />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                  {payload.queueName || 'Voice Queue'} • {payload.callerNumber || 'Voice Line'}
                </div>
                {payload.callDurationSeconds !== undefined && (
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Clock size={10} /> Duration: {payload.callDurationSeconds}s
                  </div>
                )}
              </div>
            </div>
            {viewMode === 'OPERATOR' &&
              (payload.callEventType === 'INBOUND_RINGING' || payload.callEventType === 'WARM_TRANSFER') &&
              onAnswerCall && (
                <button
                  onClick={onAnswerCall}
                  className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                >
                  <PhoneCall size={12} /> Answer
                </button>
              )}
          </div>
        )}
      </div>

      {/* Operator-Only Expandable AI Grounding & Tool Trace */}
      {viewMode === 'OPERATOR' && message.aiTrace && (
        <div className="mt-1 max-w-[90%]">
          <button
            onClick={() => setShowTrace(prev => !prev)}
            className="text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 px-1 cursor-pointer"
          >
            <Sparkles size={10} />
            <span>
              AI Context ({Math.round((message.aiTrace.confidenceScore || 0.9) * 100)}%
              {message.aiTrace.ragSources?.length ? ` • ${message.aiTrace.ragSources.length} sources` : ''})
            </span>
            {showTrace ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>

          {showTrace && (
            <div className="mt-1 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
              {message.aiTrace.intent && (
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Intent: </span>
                  <span className="font-mono text-[10px]">{message.aiTrace.intent}</span>
                </div>
              )}
              {message.aiTrace.companyContextUsed && message.aiTrace.companyContextUsed.length > 0 && (
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Context: </span>
                  <span>{message.aiTrace.companyContextUsed.join(' • ')}</span>
                </div>
              )}
              {message.aiTrace.toolsInvoked && message.aiTrace.toolsInvoked.length > 0 && (
                <div className="space-y-0.5 pt-0.5">
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">Tools:</div>
                  {message.aiTrace.toolsInvoked.map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      <span>{t.name}:</span>
                      <span className="text-zinc-500">{t.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
