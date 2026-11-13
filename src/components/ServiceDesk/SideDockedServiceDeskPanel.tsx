import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Headset,
  Bot,
  User,
  X,
  Maximize2,
  ExternalLink,
  MessageSquare,
  Send,
  Sparkles,
  Lock,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Database,
  Link2,
  Share2,
  Calendar,
  FileText,
  CreditCard,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useServiceDesk } from '../../context/ServiceDeskContext';
import { ServiceDeskMessageBubble } from './ServiceDeskMessageBubble';
import { ServiceDeskOperatorStatus } from '../../types/serviceDesk';

export const SideDockedServiceDeskPanel: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isServiceDeskSideDocked,
    setIsServiceDeskSideDocked,
    dockedServiceDeskWidth,
    setDockedServiceDeskWidth,
    setIsServiceDeskFacebookDocked,
    modules
  } = usePlatform();

  const {
    sessions,
    activeSession,
    setActiveSessionId,
    workforce,
    isQueueActive,
    toggleQueuePaused,
    profilePresenceStatus,
    openWrapUpModal,
    activeVoiceCall,
    answerVoiceCall,
    toggleVoiceMute,
    toggleVoiceHold,
    endVoiceCall,
    allocateSession,
    sendMessage,
    decideHitlApproval,
    linkOrCreateRecord,
    resolveOrReopenSession,
    currentOperatorName
  } = useServiceDesk();

  const [isResizing, setIsResizing] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const [activeWorkspaceRecord, setActiveWorkspaceRecord] = useState<{
    moduleId: string;
    moduleName: string;
    recordId: string;
    recordKey: string;
    title: string;
    status: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isOnServiceDeskPage = location.pathname.startsWith('/workspace/apps/service-desk');

  useEffect(() => {
    const match = location.pathname.match(/\/modules\/([^/]+)\/records\/([^/]+)/);
    if (!match) {
      setActiveWorkspaceRecord(null);
      return;
    }

    const [, modId, recId] = match;
    const modName =
      modules?.find((m: any) => m.id === modId || m.slug === modId)?.name || 'Record';

    const fetchOpenRecord = async () => {
      try {
        const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
        const token = localStorage.getItem('aurora_auth_token') || '';
        const res = await fetch(`/api/data/modules/${modId}/records/${recId}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-tenant-id': tenantId
          }
        });
        if (res.ok) {
          const rec = await res.json();
          const d = rec?.data || {};
          setActiveWorkspaceRecord({
            moduleId: modId,
            moduleName: modName,
            recordId: recId,
            recordKey: d.referenceNumber || d._customerRef || recId.slice(0, 8).toUpperCase(),
            title: d.title || d.name || d.subject || `${modName} #${recId.slice(0, 6)}`,
            status: rec.status || d.status || 'Active'
          });
          return;
        }
      } catch {}

      setActiveWorkspaceRecord({
        moduleId: modId,
        moduleName: modName,
        recordId: recId,
        recordKey: recId.slice(0, 8).toUpperCase(),
        title: `${modName} (${recId.slice(0, 8)})`,
        status: 'Active'
      });
    };

    fetchOpenRecord();
  }, [location.pathname, modules]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(640, Math.max(360, window.innerWidth - e.clientX));
      setDockedServiceDeskWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setDockedServiceDeskWidth]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  if (!isServiceDeskSideDocked || isOnServiceDeskPage) return null;

  const activeSessions = sessions.filter(s => s.status !== 'RESOLVED' && s.status !== 'ARCHIVED');

  const handleSend = async () => {
    if (!activeSession || !composerText.trim()) return;
    const text = composerText.trim();
    setComposerText('');
    await sendMessage(activeSession.id, {
      senderType: isWhisperMode ? 'INTERNAL_WHISPER' : 'HUMAN_AGENT',
      content: text,
      messageType: 'TEXT'
    });
  };

  const handleQuickPushCard = async (cardType: 'BOOKING' | 'FORM' | 'PAYMENT') => {
    if (!activeSession) return;
    if (cardType === 'BOOKING') {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await sendMessage(activeSession.id, {
        senderType: 'HUMAN_AGENT',
        content: 'Please select an appointment time below:',
        messageType: 'BOOKING_CARD',
        payload: {
          bookingServiceName: 'Consultation',
          availableSlots: [
            { id: `slot-a-${Date.now()}`, date: tomorrow, time: '10:00 AM', durationMinutes: 30, resourceName: currentOperatorName },
            { id: `slot-b-${Date.now()}`, date: tomorrow, time: '02:30 PM', durationMinutes: 30, resourceName: currentOperatorName }
          ]
        }
      });
    } else if (cardType === 'FORM') {
      const targetForm = workforce.forms[0];
      const fields =
        targetForm?.fields && targetForm.fields.length > 0
          ? targetForm.fields
          : [
              { id: 'subject', label: 'Subject', type: 'text' as const, required: true },
              { id: 'details', label: 'Details', type: 'textarea' as const, required: true }
            ];
      await sendMessage(activeSession.id, {
        senderType: 'HUMAN_AGENT',
        content: `Please complete **${targetForm?.name || 'Service Request'}** below:`,
        messageType: 'FORM_CARD',
        payload: {
          formId: targetForm?.id || 'default-form',
          moduleId: targetForm?.moduleId || workforce.modules[0]?.id,
          formTitle: targetForm?.name || 'Service Request',
          isSubmitted: false,
          formFields: fields
        }
      });
    } else if (cardType === 'PAYMENT') {
      const inv = (workforce.invoices || [])[0];
      if (!inv) return;
      await sendMessage(activeSession.id, {
        senderType: 'HUMAN_AGENT',
        content: `Here is invoice **${inv.invoiceNumber}** for **$${Number(inv.amount).toFixed(2)} ${inv.currency}**:`,
        messageType: 'PAYMENT_CARD',
        payload: {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          currency: inv.currency,
          paymentStatus: inv.status === 'PAID' ? 'PAID' : 'UNPAID'
        }
      });
    }
  };

  return (
    <aside
      style={{ width: `${dockedServiceDeskWidth}px` }}
      className="fixed right-0 top-[52px] bottom-0 z-30 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col font-sans select-none"
    >
      {/* Left-Edge Resize Drag Handle */}
      <div
        onMouseDown={startResizing}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-zinc-400/50 active:bg-zinc-600 transition-colors z-40"
        title="Drag to resize Service Desk panel"
      />

      {/* Clean Header */}
      <div className="px-4 py-3 bg-zinc-50/80 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Headset size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                Service Desk
              </h3>
              <button
                type="button"
                onClick={() => toggleQueuePaused()}
                className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium cursor-pointer"
                title="Synced with Profile Presence. Click to toggle Queue Active / Paused."
              >
                {activeVoiceCall
                  ? 'On Call'
                  : profilePresenceStatus !== 'AVAILABLE'
                  ? 'Away'
                  : isQueueActive
                  ? 'Queue: Active'
                  : 'Queue: Paused'}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              {activeSessions.length} open
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setIsServiceDeskSideDocked(false);
              setIsServiceDeskFacebookDocked(true);
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Switch to Bottom Chat Bar"
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={() => navigate('/workspace/apps/service-desk')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Expand to Full Console"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => window.open('/workspace/apps/service-desk?standalone=true', '_blank')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Open in New Browser Tab"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => setIsServiceDeskSideDocked(false)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Active Workspace Record Context Binding Bar */}
      {activeWorkspaceRecord && activeSession && (
        <div className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Database size={13} className="text-zinc-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-zinc-900 dark:text-white truncate">
                {activeWorkspaceRecord.recordKey} • {activeWorkspaceRecord.title}
              </div>
              <div className="text-[9px] text-zinc-500 truncate">
                {activeWorkspaceRecord.moduleName} ({activeWorkspaceRecord.status})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() =>
                linkOrCreateRecord(activeSession.id, {
                  mode: 'LINK_EXISTING',
                  moduleId: activeWorkspaceRecord.moduleId,
                  moduleName: activeWorkspaceRecord.moduleName,
                  recordId: activeWorkspaceRecord.recordId,
                  recordKey: activeWorkspaceRecord.recordKey,
                  title: activeWorkspaceRecord.title,
                  status: activeWorkspaceRecord.status,
                  shareCardInChat: false
                })
              }
              className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
            >
              <Link2 size={10} /> Link
            </button>
            <button
              onClick={() =>
                linkOrCreateRecord(activeSession.id, {
                  mode: 'LINK_EXISTING',
                  moduleId: activeWorkspaceRecord.moduleId,
                  moduleName: activeWorkspaceRecord.moduleName,
                  recordId: activeWorkspaceRecord.recordId,
                  recordKey: activeWorkspaceRecord.recordKey,
                  title: activeWorkspaceRecord.title,
                  status: activeWorkspaceRecord.status,
                  shareCardInChat: true
                })
              }
              className="px-2 py-1 rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-medium flex items-center gap-1 cursor-pointer"
            >
              <Share2 size={10} /> Share
            </button>
          </div>
        </div>
      )}

      {/* Active Voice Call Softphone Strip */}
      {activeVoiceCall && (
        <div className="px-3.5 py-2.5 bg-zinc-900 text-white border-b border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">
                {activeVoiceCall.callerName} ({activeVoiceCall.callerNumber})
              </div>
              <div className="text-[10px] text-zinc-400">
                {activeVoiceCall.queueName} • {Math.floor(activeVoiceCall.durationSeconds / 60)}:
                {String(activeVoiceCall.durationSeconds % 60).padStart(2, '0')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleVoiceMute}
              className={`p-1.5 rounded-lg cursor-pointer ${
                activeVoiceCall.isMuted ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-white'
              }`}
            >
              {activeVoiceCall.isMuted ? <MicOff size={13} /> : <Mic size={13} />}
            </button>
            <button
              onClick={toggleVoiceHold}
              className={`p-1.5 rounded-lg cursor-pointer ${
                activeVoiceCall.isOnHold ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-white'
              }`}
            >
              {activeVoiceCall.isOnHold ? <Play size={13} /> : <Pause size={13} />}
            </button>
            <button
              onClick={endVoiceCall}
              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              <PhoneOff size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Horizontal Queue Switcher Pills */}
      {activeSessions.length > 0 && (
        <div className="px-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto">
          {activeSessions.map(s => {
            const isSelected = activeSession?.id === s.id;
            const isHitl = s.status === 'AWAITING_HITL_APPROVAL';
            return (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {s.channelType === 'VOICE_CALL' ? (
                  <PhoneCall size={11} />
                ) : s.allocatedAssigneeType === 'AI_AGENT' ? (
                  <Bot size={11} />
                ) : (
                  <User size={11} />
                )}
                <span className="truncate max-w-[95px]">{s.visitorName}</span>
                {isHitl && <ShieldAlert size={11} />}
              </button>
            );
          })}
        </div>
      )}

      {activeSession ? (
        <>
          <div className="px-3.5 py-2 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-900 dark:text-white truncate">
                  {activeSession.visitorName}
                </span>
                {activeSession.currentPageSlug && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-mono">
                    {activeSession.currentPageSlug}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                {activeSession.siteName || 'Portal'} •{' '}
                {activeSession.allocatedAssigneeType === 'AI_AGENT'
                  ? activeSession.allocatedAgentName
                  : activeSession.allocatedMemberName || 'Unassigned'}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <select
                value={
                  activeSession.allocatedAssigneeType === 'AI_AGENT'
                    ? `AI:${activeSession.allocatedAgentId}`
                    : `HUMAN:${activeSession.allocatedMemberId}`
                }
                onChange={e => {
                  const val = e.target.value;
                  if (val.startsWith('AI:')) {
                    const id = val.replace('AI:', '');
                    const bot = workforce.aiAgents.find(a => a.id === id);
                    allocateSession(activeSession.id, {
                      targetAssigneeType: 'AI_AGENT',
                      targetAgentId: id,
                      targetAgentName: bot?.name || 'AI Assistant'
                    });
                  } else if (val.startsWith('HUMAN:')) {
                    const id = val.replace('HUMAN:', '');
                    const op = workforce.humanOperators.find(h => h.id === id);
                    allocateSession(activeSession.id, {
                      targetAssigneeType: 'HUMAN_USER',
                      targetMemberId: id,
                      targetMemberName: op?.name || currentOperatorName
                    });
                  }
                }}
                className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer max-w-[130px]"
              >
                {workforce.aiAgents.length > 0 && (
                  <optgroup label="AI Agents">
                    {workforce.aiAgents.map(bot => (
                      <option key={bot.id} value={`AI:${bot.id}`}>
                        {bot.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {workforce.humanOperators.length > 0 && (
                  <optgroup label="Team Members">
                    {workforce.humanOperators.map(op => (
                      <option key={op.id} value={`HUMAN:${op.id}`}>
                        {op.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                onClick={() =>
                  activeSession.status === 'RESOLVED'
                    ? resolveOrReopenSession(activeSession.id, 'ASSIGNED_HUMAN')
                    : openWrapUpModal(activeSession.id)
                }
                className="p-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 cursor-pointer"
                title={activeSession.status === 'RESOLVED' ? 'Reopen Session' : 'Wrap-Up & Resolve'}
              >
                <CheckCircle2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-1 bg-white dark:bg-zinc-950 select-text">
            {(activeSession.messages || []).map(msg => (
              <ServiceDeskMessageBubble
                key={msg.id}
                message={msg}
                viewMode="OPERATOR"
                onApproveHitl={note => decideHitlApproval(activeSession.id, 'APPROVED', note)}
                onRejectHitl={note => decideHitlApproval(activeSession.id, 'REJECTED', note)}
                onAnswerCall={() => answerVoiceCall(activeSession)}
                onOpenRecord={(modId, recId) => navigate(`/workspace/modules/${modId}/records/${recId}`)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {activeSession.aiSuggestedReply && activeSession.status !== 'RESOLVED' && (
            <div className="px-3.5 py-2 bg-indigo-50/60 dark:bg-indigo-950/30 border-t border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between gap-2">
              <div className="text-[11px] text-zinc-700 dark:text-zinc-200 line-clamp-2 flex-1">
                <Sparkles size={11} className="inline mr-1 text-indigo-600 dark:text-indigo-400" />
                {activeSession.aiSuggestedReply}
              </div>
              <button
                onClick={() => setComposerText(activeSession.aiSuggestedReply || '')}
                className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-medium shrink-0 cursor-pointer"
              >
                Insert
              </button>
            </div>
          )}

          <div className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsWhisperMode(false)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                    !isWhisperMode
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Reply
                </button>
                <button
                  onClick={() => setIsWhisperMode(true)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer ${
                    isWhisperMode
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Lock size={10} /> Note
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleQuickPushCard('BOOKING')}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                  title="Send Booking Card"
                >
                  <Calendar size={13} />
                </button>
                {workforce.forms.length > 0 && (
                  <button
                    onClick={() => handleQuickPushCard('FORM')}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    title="Send Form Card"
                  >
                    <FileText size={13} />
                  </button>
                )}
                {(workforce.invoices || []).length > 0 && (
                  <button
                    onClick={() => handleQuickPushCard('PAYMENT')}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    title="Send Invoice Card"
                  >
                    <CreditCard size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={composerText}
                onChange={e => setComposerText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isWhisperMode ? 'Internal note...' : `Message ${activeSession.visitorName}...`
                }
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white outline-none"
              />
              <button
                onClick={handleSend}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-zinc-400">
          <MessageSquare className="w-6 h-6 mb-2 text-zinc-300 dark:text-zinc-700" />
          <p>No active conversations</p>
        </div>
      )}
    </aside>
  );
};
