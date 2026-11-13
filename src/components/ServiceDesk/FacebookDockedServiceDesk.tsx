import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Headset,
  Bot,
  User,
  Minus,
  X,
  Send,
  Sparkles,
  PanelRight,
  Maximize2,
  ExternalLink,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Lock,
  ChevronUp,
  ChevronDown,
  UserCheck,
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useServiceDesk } from '../../context/ServiceDeskContext';
import { ServiceDeskMessageBubble } from './ServiceDeskMessageBubble';
import { ServiceDeskOperatorStatus, ServiceDeskSession } from '../../types/serviceDesk';

export const FacebookDockedServiceDesk: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isServiceDeskFacebookDocked,
    setIsServiceDeskFacebookDocked,
    setIsServiceDeskSideDocked
  } = usePlatform();

  const {
    sessions,
    workforce,
    operatorStatus,
    isQueueActive,
    toggleQueuePaused,
    profilePresenceStatus,
    openWrapUpModal,
    dockedHeads,
    openInFacebookHead,
    toggleMinimizeFacebookHead,
    closeFacebookHead,
    activeVoiceCall,
    answerVoiceCall,
    toggleVoiceMute,
    toggleVoiceHold,
    endVoiceCall,
    allocateSession,
    sendMessage,
    decideHitlApproval,
    totalOperatorUnread,
    currentOperatorId,
    currentOperatorName
  } = useServiceDesk();

  const [isRosterExpanded, setIsRosterExpanded] = useState(true);
  const [composerTexts, setComposerTexts] = useState<Record<string, string>>({});
  const [whisperModes, setWhisperModes] = useState<Record<string, boolean>>({});
  const [assignPopoverSessionId, setAssignPopoverSessionId] = useState<string | null>(null);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isOnServiceDeskPage = location.pathname.startsWith('/workspace/apps/service-desk');

  useEffect(() => {
    if (isServiceDeskFacebookDocked && dockedHeads.length === 0) {
      setIsRosterExpanded(true);
    }
  }, [isServiceDeskFacebookDocked, dockedHeads.length]);

  useEffect(() => {
    dockedHeads.forEach(h => {
      const el = scrollRefs.current[h.sessionId];
      if (el && !h.minimized) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [sessions, dockedHeads]);

  if (!isServiceDeskFacebookDocked || isOnServiceDeskPage) return null;

  const activeSessions = sessions.filter(s => s.status !== 'RESOLVED' && s.status !== 'ARCHIVED');

  const handleSendInHead = async (session: ServiceDeskSession) => {
    const text = (composerTexts[session.id] || '').trim();
    if (!text) return;
    const isWhisper = !!whisperModes[session.id];
    setComposerTexts(prev => ({ ...prev, [session.id]: '' }));

    await sendMessage(session.id, {
      senderType: isWhisper ? 'INTERNAL_WHISPER' : 'HUMAN_AGENT',
      content: text,
      messageType: 'TEXT'
    });
  };

  const statusDot = (status: ServiceDeskOperatorStatus) => {
    if (status === 'AVAILABLE') return 'bg-emerald-500';
    if (status === 'ON_CALL' || status === 'BUSY_CHAT') return 'bg-amber-500';
    return 'bg-zinc-400';
  };

  return (
    <div className="fixed bottom-0 right-4 z-40 flex items-end gap-3 pointer-events-none select-none font-sans">
      {/* 1. Active Voice Call Pod */}
      {activeVoiceCall && (
        <div className="pointer-events-auto w-72 rounded-t-xl bg-zinc-900 text-white border border-zinc-800 shadow-2xl overflow-hidden">
          <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="truncate">
                <div className="text-xs font-bold truncate">{activeVoiceCall.callerName}</div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {activeVoiceCall.callerNumber} • {Math.floor(activeVoiceCall.durationSeconds / 60)}:
                  {String(activeVoiceCall.durationSeconds % 60).padStart(2, '0')}
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-medium uppercase">
              {activeVoiceCall.isOnHold ? 'Hold' : 'Live'}
            </span>
          </div>

          <div className="p-3 space-y-2.5 bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={toggleVoiceMute}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  activeVoiceCall.isMuted ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {activeVoiceCall.isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{activeVoiceCall.isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              <button
                onClick={toggleVoiceHold}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  activeVoiceCall.isOnHold ? 'bg-amber-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {activeVoiceCall.isOnHold ? <Play size={13} /> : <Pause size={13} />}
                <span>{activeVoiceCall.isOnHold ? 'Resume' : 'Hold'}</span>
              </button>

              <button
                onClick={endVoiceCall}
                className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                title="End Call"
              >
                <PhoneOff size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Collapsible Customer Chat Heads */}
      {dockedHeads.map(head => {
        const session = sessions.find(s => s.id === head.sessionId);
        if (!session) return null;

        const isAiAssigned = session.allocatedAssigneeType === 'AI_AGENT';
        const isWhisper = !!whisperModes[session.id];

        if (head.minimized) {
          return (
            <div
              key={session.id}
              onClick={() => toggleMinimizeFacebookHead(session.id)}
              className="pointer-events-auto w-56 h-10 rounded-t-xl px-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-b-0 border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                  {isAiAssigned ? <Bot size={12} /> : <User size={12} />}
                </div>
                <span className="text-xs font-semibold truncate">{session.visitorName}</span>
                {session.unreadByOperator > 0 && (
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white shrink-0" />
                )}
              </div>

              <button
                onClick={e => {
                  e.stopPropagation();
                  closeFacebookHead(session.id);
                }}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
              >
                <X size={12} />
              </button>
            </div>
          );
        }

        return (
          <div
            key={session.id}
            className="pointer-events-auto w-80 h-[440px] rounded-t-xl bg-white dark:bg-zinc-950 border border-b-0 border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden relative"
          >
            {/* Chat Head Header */}
            <div className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div
                onClick={() => toggleMinimizeFacebookHead(session.id)}
                className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                  {session.channelType === 'VOICE_CALL' ? (
                    <PhoneCall size={13} />
                  ) : (
                    session.visitorName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {session.visitorName}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {isAiAssigned ? session.allocatedAgentName : session.allocatedMemberName || 'Unassigned'} •{' '}
                    {session.siteName || 'Portal'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => openWrapUpModal(session.id)}
                  className="p-1 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 cursor-pointer"
                  title="Wrap-Up & Resolve"
                >
                  <CheckCircle2 size={12} />
                </button>
                <button
                  onClick={() =>
                    setAssignPopoverSessionId(prev => (prev === session.id ? null : session.id))
                  }
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Reassign"
                >
                  <ArrowRightLeft size={12} />
                </button>
                <button
                  onClick={() => {
                    setIsServiceDeskFacebookDocked(false);
                    setIsServiceDeskSideDocked(true);
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Side Dock"
                >
                  <PanelRight size={12} />
                </button>
                <button
                  onClick={() => navigate('/workspace/apps/service-desk')}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Full Screen"
                >
                  <Maximize2 size={12} />
                </button>
                <button
                  onClick={() => toggleMinimizeFacebookHead(session.id)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Minimize"
                >
                  <Minus size={12} />
                </button>
                <button
                  onClick={() => closeFacebookHead(session.id)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Close"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {assignPopoverSessionId === session.id && (
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      allocateSession(session.id, {
                        targetAssigneeType: 'HUMAN_USER',
                        targetMemberId: currentOperatorId,
                        targetMemberName: currentOperatorName
                      });
                      setAssignPopoverSessionId(null);
                    }}
                    className="p-1.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserCheck size={12} /> Assign to Me
                  </button>
                  {workforce.aiAgents[0] && (
                    <button
                      onClick={() => {
                        const primaryBot = workforce.aiAgents[0];
                        allocateSession(session.id, {
                          targetAssigneeType: 'AI_AGENT',
                          targetAgentId: primaryBot.id,
                          targetAgentName: primaryBot.name
                        });
                        setAssignPopoverSessionId(null);
                      }}
                      className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Bot size={12} /> AI Assistant
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages Stream */}
            <div
              ref={el => {
                scrollRefs.current[session.id] = el;
              }}
              className="flex-1 overflow-y-auto p-3 space-y-1 bg-white dark:bg-zinc-950"
            >
              {(session.messages || []).map(msg => (
                <ServiceDeskMessageBubble
                  key={msg.id}
                  message={msg}
                  viewMode="OPERATOR"
                  compact={true}
                  onApproveHitl={note => decideHitlApproval(session.id, 'APPROVED', note)}
                  onRejectHitl={note => decideHitlApproval(session.id, 'REJECTED', note)}
                  onAnswerCall={() => answerVoiceCall(session)}
                  onOpenRecord={(modId, recId) => navigate(`/workspace/modules/${modId}/records/${recId}`)}
                />
              ))}
            </div>

            {session.aiSuggestedReply && session.status !== 'RESOLVED' && (
              <div className="px-3 py-1.5 bg-indigo-50/60 dark:bg-indigo-950/30 border-t border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 text-[10px] text-zinc-700 dark:text-zinc-200">
                  <Sparkles size={11} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate">{session.aiSuggestedReply}</span>
                </div>
                <button
                  onClick={() =>
                    setComposerTexts(prev => ({
                      ...prev,
                      [session.id]: session.aiSuggestedReply || ''
                    }))
                  }
                  className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-medium shrink-0 cursor-pointer"
                >
                  Use
                </button>
              </div>
            )}

            {/* Compact Composer */}
            <div className="p-2.5 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWhisperModes(prev => ({ ...prev, [session.id]: false }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                    !isWhisper
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Reply
                </button>
                <button
                  onClick={() => setWhisperModes(prev => ({ ...prev, [session.id]: true }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer ${
                    isWhisper
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Lock size={9} /> Note
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={composerTexts[session.id] || ''}
                  onChange={e =>
                    setComposerTexts(prev => ({ ...prev, [session.id]: e.target.value }))
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendInHead(session);
                    }
                  }}
                  placeholder={isWhisper ? 'Internal note...' : `Message ${session.visitorName}...`}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white outline-none"
                />
                <button
                  onClick={() => handleSendInHead(session)}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* 3. Rightmost Service Desk Bar Trigger */}
      <div className="pointer-events-auto flex flex-col items-end">
        {isRosterExpanded && (
          <div className="mb-2 w-76 max-h-[420px] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headset size={15} className="text-zinc-700 dark:text-zinc-200" />
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">Service Desk</div>
                  <div className="text-[10px] text-zinc-500">{activeSessions.length} open conversations</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsServiceDeskFacebookDocked(false);
                    setIsServiceDeskSideDocked(true);
                  }}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                  title="Side Dock"
                >
                  <PanelRight size={13} />
                </button>
                <button
                  onClick={() => navigate('/workspace/apps/service-desk')}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                  title="Full Screen"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  onClick={() => window.open('/workspace/apps/service-desk?standalone=true', '_blank')}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                  title="New Browser Tab"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleQueuePaused()}
                className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                title="Synced with Profile Presence. Click to toggle Queue Active / Paused."
              >
                <span className={`w-2 h-2 rounded-full ${statusDot(operatorStatus)}`} />
                <span>
                  {activeVoiceCall
                    ? 'On Call'
                    : profilePresenceStatus !== 'AVAILABLE'
                    ? 'Away (Profile Status)'
                    : isQueueActive
                    ? 'Queue: Active'
                    : 'Queue: Paused'}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {activeSessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">No open conversations</div>
              ) : (
                activeSessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      openInFacebookHead(s.id);
                      setIsRosterExpanded(false);
                    }}
                    className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                        {s.visitorName}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {s.lastMessagePreview}
                      </p>
                      <div className="mt-0.5 text-[10px] text-zinc-400 truncate">
                        {s.siteName || 'Portal'} •{' '}
                        {s.allocatedAssigneeType === 'AI_AGENT'
                          ? s.allocatedAgentName
                          : s.allocatedMemberName || 'Unassigned'}
                      </div>
                    </div>
                    {s.unreadByOperator > 0 && (
                      <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white shrink-0 mt-1" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Bottom Dock Pill Trigger */}
        <div className="h-10 rounded-t-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 flex items-center gap-2.5 shadow-xl border border-b-0 border-indigo-500 cursor-pointer transition-colors">
          <div
            onClick={() => setIsRosterExpanded(prev => !prev)}
            className="flex items-center gap-2 flex-1"
          >
            <span className={`w-2 h-2 rounded-full ${statusDot(operatorStatus)} ring-1 ring-white/40`} />
            <Headset size={14} />
            <span className="text-xs font-semibold">Service Desk</span>
            {activeSessions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-700/80 text-white text-[10px] font-medium">
                {activeSessions.length}
              </span>
            )}
            {totalOperatorUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-indigo-600 text-[10px] font-bold">
                {totalOperatorUnread}
              </span>
            )}
            {isRosterExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </div>

          <button
            onClick={e => {
              e.stopPropagation();
              setIsServiceDeskFacebookDocked(false);
            }}
            className="p-1 rounded hover:bg-white/15 text-indigo-100 hover:text-white"
            title="Close Dock"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
