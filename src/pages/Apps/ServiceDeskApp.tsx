import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Headset,
  Settings,
  Bot,
  User,
  Users,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Calendar,
  CreditCard,
  BookOpen,
  Database,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  Lock,
  RefreshCw,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Globe,
  Trash2,
  X,
  RotateCcw,
  ListOrdered,
  Sliders,
  Star,
  Zap
} from 'lucide-react';
import { useServiceDesk } from '../../context/ServiceDeskContext';
import { usePlatform } from '../../hooks/usePlatform';
import { ServiceDeskMessageBubble } from '../../components/ServiceDesk/ServiceDeskMessageBubble';
import { ServiceDeskOperatorStatus } from '../../types/serviceDesk';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';

const ResizeHandle: React.FC<{ onResize: (delta: number) => void; onReset?: () => void }> = ({
  onResize,
  onReset
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    let lastX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - lastX;
      lastX = moveEvent.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      className={`w-[3px] hover:w-[4px] active:w-[4px] h-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-400 dark:hover:bg-zinc-600 active:bg-zinc-500 transition-all cursor-col-resize z-20 shrink-0 relative group flex items-center justify-center select-none ${
        isDragging ? 'w-[4px] bg-zinc-600 dark:bg-zinc-400' : ''
      }`}
      title="Drag to resize"
    >
      <div className="opacity-0 group-hover:opacity-100 w-[2px] h-6 rounded-full bg-zinc-400 dark:bg-zinc-500 transition-opacity pointer-events-none" />
    </div>
  );
};

type QueueFilter = 'ALL_ACTIVE' | 'ESCALATED_HITL' | 'MINE' | 'AI_HANDLED' | 'VOICE_QUEUE' | 'RESOLVED' | string;

export const ServiceDeskApp: React.FC = () => {
  const {
    sessions,
    activeSession,
    setActiveSessionId,
    workforce,
    metrics,
    operatorStatus,
    isQueueActive,
    isQueuePaused,
    toggleQueuePaused,
    profilePresenceStatus,
    openWrapUpModal,
    openInFacebookHead,
    activeVoiceCall,
    answerVoiceCall,
    toggleVoiceMute,
    toggleVoiceHold,
    endVoiceCall,
    createSession,
    deleteSession,
    allocateSession,
    sendMessage,
    decideHitlApproval,
    linkOrCreateRecord,
    resolveOrReopenSession,
    refreshServiceDesk,
    currentOperatorId
  } = useServiceDesk();

  const {
    tenant,
    setIsServiceDeskFacebookDocked,
    setIsServiceDeskSideDocked,
    setIsServiceDeskLaunchModalOpen
  } = usePlatform();
  const navigate = useNavigate();

  const handleSwitchToDock = () => {
    setIsServiceDeskSideDocked(false);
    setIsServiceDeskFacebookDocked(true);
    if (activeSession) openInFacebookHead(activeSession.id);
    navigate('/workspace');
  };

  const handleSwitchToSide = () => {
    setIsServiceDeskFacebookDocked(false);
    setIsServiceDeskSideDocked(true);
    navigate('/workspace');
  };

  // Resizable pane widths matching InboxApp.tsx
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [listWidth, setListWidth] = useState(320);
  const [showContextDrawer, setShowContextDrawer] = useState(true);
  const [contextTab, setContextTab] = useState<'overview' | 'records' | 'routing'>('overview');

  // Filters
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('ALL_ACTIVE');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [channelTab, setChannelTab] = useState<'ALL' | 'UNREAD' | 'SITE_CHAT' | 'VOICE_CALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer State
  const [composerText, setComposerText] = useState('');
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [insertPickerType, setInsertPickerType] = useState<'FORM' | 'KB' | 'INVOICE' | 'BOOKING' | null>(null);

  // Header Menus & Modals
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [handoverNote, setHandoverNote] = useState('');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionChannel, setNewSessionChannel] = useState<'SITE_CHAT' | 'VOICE_CALL'>('SITE_CHAT');
  const [newSessionSiteId, setNewSessionSiteId] = useState('');
  const [newSessionPartyId, setNewSessionPartyId] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionEmail, setNewSessionEmail] = useState('');
  const [newSessionPhone, setNewSessionPhone] = useState('');
  const [newSessionMessage, setNewSessionMessage] = useState('');
  const [newSessionAssigneeType, setNewSessionAssigneeType] = useState<'AI_AGENT' | 'HUMAN_USER'>('AI_AGENT');
  const [newSessionQueueId, setNewSessionQueueId] = useState('');

  // Create Record Drawer State
  const [showNewRecordForm, setShowNewRecordForm] = useState(false);
  const [newRecordModuleId, setNewRecordModuleId] = useState('');
  const [newRecordTitle, setNewRecordTitle] = useState('');

  // Booking Card Custom Input State
  const [bookingServiceTitle, setBookingServiceTitle] = useState('');

  // Canned Responses / Macros State
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [showCannedPicker, setShowCannedPicker] = useState(false);

  useEffect(() => {
    ServiceDeskService.getCannedResponses(tenant?.id)
      .then(res => setCannedResponses(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, [tenant?.id]);

  const applyCannedMacro = (macro: any) => {
    if (!activeSession) return;
    let text = macro.content || '';
    text = text.replace(/\{\{customerName\}\}/g, activeSession.visitorName || 'there');
    text = text.replace(/\{\{operatorName\}\}/g, 'Team Member');
    text = text.replace(/\{\{siteName\}\}/g, activeSession.siteName || 'our team');
    text = text.replace(/\{\{ticketId\}\}/g, activeSession.id || '');
    setComposerText(text);
    setShowCannedPicker(false);
  };

  const matchingCanned = useMemo(() => {
    if (!composerText.startsWith('/')) return [];
    const query = composerText.slice(1).toLowerCase();
    return cannedResponses.filter(c =>
      c.shortcut.toLowerCase().includes(query) ||
      c.title.toLowerCase().includes(query)
    );
  }, [composerText, cannedResponses]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.id, activeSession?.messages?.length]);

  const counts = useMemo(() => {
    const active = sessions.filter(s => s.status !== 'RESOLVED' && s.status !== 'ARCHIVED');
    return {
      allActive: active.length,
      escalated: active.filter(
        s => s.status === 'AWAITING_HITL_APPROVAL' || s.status === 'QUEUED_FOR_HUMAN'
      ).length,
      mine: active.filter(
        s => s.allocatedAssigneeType === 'HUMAN_USER' && (!s.allocatedMemberId || s.allocatedMemberId === currentOperatorId)
      ).length,
      aiHandled: active.filter(s => s.allocatedAssigneeType === 'AI_AGENT' && s.status === 'ACTIVE_AI').length,
      voice: active.filter(s => s.channelType === 'VOICE_CALL').length,
      resolved: sessions.filter(s => s.status === 'RESOLVED').length
    };
  }, [sessions, currentOperatorId]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (selectedSiteId !== 'ALL' && s.siteId !== selectedSiteId) return false;

      if (channelTab === 'UNREAD' && (s.unreadByOperator || 0) === 0) return false;
      if (channelTab === 'SITE_CHAT' && s.channelType !== 'SITE_CHAT') return false;
      if (channelTab === 'VOICE_CALL' && s.channelType !== 'VOICE_CALL') return false;

      if (queueFilter === 'ALL_ACTIVE' && (s.status === 'RESOLVED' || s.status === 'ARCHIVED')) return false;
      if (
        queueFilter === 'ESCALATED_HITL' &&
        s.status !== 'AWAITING_HITL_APPROVAL' &&
        s.status !== 'QUEUED_FOR_HUMAN'
      ) {
        return false;
      }
      if (
        queueFilter === 'MINE' &&
        (s.allocatedAssigneeType !== 'HUMAN_USER' ||
          (s.allocatedMemberId && s.allocatedMemberId !== currentOperatorId))
      ) {
        return false;
      }
      if (queueFilter === 'AI_HANDLED' && (s.allocatedAssigneeType !== 'AI_AGENT' || s.status === 'RESOLVED')) {
        return false;
      }
      if (queueFilter === 'VOICE_QUEUE' && s.channelType !== 'VOICE_CALL') return false;
      if (queueFilter === 'RESOLVED' && s.status !== 'RESOLVED') return false;

      // Dispatched Queue Filter
      const isStandardView = ['ALL_ACTIVE', 'ESCALATED_HITL', 'MINE', 'AI_HANDLED', 'VOICE_QUEUE', 'RESOLVED'].includes(queueFilter);
      if (!isStandardView) {
        const targetQ = (workforce.queues || []).find(q => q.id === queueFilter);
        const matchesQueue = (
          s.allocatedQueueId === queueFilter ||
          s.allocatedQueueName === queueFilter ||
          (targetQ && (s.allocatedQueueId === targetQ.slug || s.allocatedQueueName === targetQ.name))
        );
        if (!matchesQueue) return false;
        if (s.status === 'RESOLVED' || s.status === 'ARCHIVED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${s.visitorName} ${s.visitorEmail || ''} ${s.siteName || ''} ${s.lastMessagePreview || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, selectedSiteId, channelTab, queueFilter, searchQuery, currentOperatorId]);

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

  const handleInsertFormCard = async (form: NonNullable<typeof workforce.forms>[number]) => {
    if (!activeSession) return;
    const fields =
      form.fields && form.fields.length > 0
        ? form.fields
        : [
            { id: 'subject', label: 'Subject', type: 'text' as const, required: true },
            { id: 'details', label: 'Details', type: 'textarea' as const, required: true }
          ];

    await sendMessage(activeSession.id, {
      senderType: 'HUMAN_AGENT',
      content: `Please complete **${form.name}** below:`,
      messageType: 'FORM_CARD',
      payload: {
        formId: form.id,
        moduleId: form.moduleId || workforce.modules[0]?.id,
        formTitle: form.name,
        formDescription: form.description,
        isSubmitted: false,
        formFields: fields
      }
    });
    setInsertPickerType(null);
    setShowInsertMenu(false);
  };

  const handleInsertKbCard = async (article: NonNullable<typeof workforce.kbArticles>[number]) => {
    if (!activeSession) return;
    await sendMessage(activeSession.id, {
      senderType: 'HUMAN_AGENT',
      content: `Here is the guide from our knowledge base regarding **${article.title}**:`,
      messageType: 'KB_CITATION',
      payload: {
        articles: [
          {
            id: article.id,
            title: article.title,
            category: article.category,
            excerpt: article.content.slice(0, 220)
          }
        ]
      }
    });
    setInsertPickerType(null);
    setShowInsertMenu(false);
  };

  const handleInsertInvoiceCard = async (invoice: NonNullable<typeof workforce.invoices>[number]) => {
    if (!activeSession) return;
    await sendMessage(activeSession.id, {
      senderType: 'HUMAN_AGENT',
      content: `Here is invoice **${invoice.invoiceNumber}** for **$${Number(invoice.amount).toFixed(2)} ${invoice.currency}**:`,
      messageType: 'PAYMENT_CARD',
      payload: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        paymentStatus: invoice.status === 'PAID' ? 'PAID' : 'UNPAID'
      }
    });
    setInsertPickerType(null);
    setShowInsertMenu(false);
  };

  const handleInsertBookingCard = async () => {
    if (!activeSession) return;
    const title = bookingServiceTitle.trim() || 'Consultation & Appointment';
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];
    await sendMessage(activeSession.id, {
      senderType: 'HUMAN_AGENT',
      content: `Please select an available time for **${title}**:`,
      messageType: 'BOOKING_CARD',
      payload: {
        bookingServiceName: title,
        availableSlots: [
          { id: `slot-1-${Date.now()}`, date: tomorrow, time: '10:00 AM', durationMinutes: 30, resourceName: title },
          { id: `slot-2-${Date.now()}`, date: tomorrow, time: '02:30 PM', durationMinutes: 30, resourceName: title },
          { id: `slot-3-${Date.now()}`, date: dayAfter, time: '11:00 AM', durationMinutes: 45, resourceName: title }
        ]
      }
    });
    setBookingServiceTitle('');
    setInsertPickerType(null);
    setShowInsertMenu(false);
  };

  const handleCreateNewSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedParty = (workforce.parties || []).find(p => p.id === newSessionPartyId);
    const visitorName = newSessionName.trim() || selectedParty?.name || 'Customer';
    const targetQueue = (workforce.queues || []).find(q => q.id === newSessionQueueId);

    await createSession({
      siteId: newSessionSiteId || workforce.sites[0]?.id,
      channelType: newSessionChannel,
      visitorName,
      visitorEmail: newSessionEmail.trim() || undefined,
      visitorPhone: newSessionPhone.trim() || undefined,
      partyId: newSessionPartyId || undefined,
      initialMessage: newSessionMessage.trim() || undefined,
      allocationMode: newSessionAssigneeType === 'AI_AGENT' ? 'AI_FIRST' : 'HUMAN_FIRST',
      targetAssigneeType: newSessionAssigneeType,
      targetQueueId: newSessionQueueId || undefined,
      targetQueueName: targetQueue?.name || undefined
    });

    setShowNewSessionModal(false);
    setNewSessionName('');
    setNewSessionEmail('');
    setNewSessionPhone('');
    setNewSessionMessage('');
    setNewSessionPartyId('');
    setNewSessionQueueId('');
    setNewSessionPartyId('');
  };

  const handleCreateLinkedRecord = async () => {
    if (!activeSession || !newRecordTitle.trim()) return;
    const modId = newRecordModuleId || workforce.modules[0]?.id || 'general';
    const modName = workforce.modules.find(m => m.id === modId)?.name || 'Records';
    await linkOrCreateRecord(activeSession.id, {
      mode: 'CREATE_NEW',
      moduleId: modId,
      moduleName: modName,
      title: newRecordTitle.trim(),
      shareCardInChat: true
    });
    setNewRecordTitle('');
    setShowNewRecordForm(false);
  };

  const statusColorDot = (status: ServiceDeskOperatorStatus) => {
    if (status === 'AVAILABLE') return 'bg-emerald-500';
    if (status === 'ON_CALL' || status === 'BUSY_CHAT') return 'bg-amber-500';
    return 'bg-zinc-400';
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden select-none relative">
      {/* =====================================================================
          PANE 1: LEFT NAVIGATION SIDEBAR (Matches InboxSidebar.tsx)
          ===================================================================== */}
      <div
        style={{ width: sidebarWidth }}
        className="h-full border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/80 flex flex-col justify-between shrink-0"
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* App Brand Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
                <Headset className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight leading-none">
                  Service Desk
                </h2>
                <button
                  type="button"
                  onClick={() => toggleQueuePaused()}
                  title="Synced with your Profile Presence. Click to toggle Queue Active / Paused."
                  className="flex items-center gap-1.5 mt-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColorDot(operatorStatus)}`} />
                  <span>
                    {activeVoiceCall
                      ? 'On Call'
                      : profilePresenceStatus === 'AWAY_TWIN'
                      ? 'Away (Twin Active)'
                      : profilePresenceStatus === 'NIGHT_SHIFT'
                      ? 'Night Shift'
                      : profilePresenceStatus === 'OFFLINE'
                      ? 'Offline'
                      : isQueueActive
                      ? 'Queue: Active'
                      : 'Queue: Paused'}
                  </span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/workspace/settings/platform-modules/service-desk')}
                title="Service Desk Settings"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Settings size={14} />
              </button>
              <button
                onClick={() => refreshServiceDesk()}
                title="Refresh"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Primary Action Button (Aurora Indigo) */}
          <div className="px-3 mb-4">
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-indigo-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          </div>

          {/* Views / Queues Navigation */}
          <div className="px-3 space-y-0.5">
            <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Queues
            </div>
            {[
              { id: 'ALL_ACTIVE', label: 'All Open', icon: MessageSquare, count: counts.allActive },
              { id: 'MINE', label: 'Assigned to Me', icon: User, count: counts.mine },
              { id: 'AI_HANDLED', label: 'AI Assistant', icon: Bot, count: counts.aiHandled },
              { id: 'ESCALATED_HITL', label: 'Needs Attention', icon: ShieldAlert, count: counts.escalated },
              { id: 'VOICE_QUEUE', label: 'Voice Calls', icon: PhoneCall, count: counts.voice },
              { id: 'RESOLVED', label: 'Resolved', icon: CheckCircle2, count: counts.resolved }
            ].map(item => {
              const Icon = item.icon;
              const isActive = queueFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setQueueFilter(item.id as QueueFilter)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Dynamic Dispatched Queues */}
          {workforce.queues && workforce.queues.length > 0 && (
            <div className="mt-5 px-3 space-y-0.5">
              <div className="flex items-center justify-between px-2.5 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Dispatched Queues
                </span>
                <Link
                  to="/workspace/settings/platform-modules/service-desk?tab=queues"
                  className="text-[10px] text-zinc-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Configure Queues in Settings"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Manage</span>
                </Link>
              </div>
              {workforce.queues.map(q => {
                const count = sessions.filter(s =>
                  (s.allocatedQueueId === q.id || s.allocatedQueueName === q.name || s.allocatedQueueId === q.slug) &&
                  s.status !== 'RESOLVED' &&
                  s.status !== 'ARCHIVED'
                ).length;
                const isSelected = queueFilter === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => setQueueFilter(q.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <ListOrdered
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
                        }`}
                      />
                      <span className="truncate">{q.name}</span>
                    </div>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Customer Feedback & CSAT Closed Loop Link */}
          <div className="mt-4 px-3">
            <Link
              to="/workspace/settings/platform-modules/service-desk?tab=feedback_loop"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Star className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">CSAT & Feedback</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Closed Loop
              </span>
            </Link>
          </div>

          {/* Sites Filter (Matches Mailboxes in InboxSidebar.tsx) */}
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sites</span>
              {selectedSiteId !== 'ALL' && (
                <button
                  onClick={() => setSelectedSiteId('ALL')}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedSiteId('ALL')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  selectedSiteId === 'ALL'
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe size={13} className={`shrink-0 ${selectedSiteId === 'ALL' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
                  <span className="truncate">All Sites</span>
                </div>
              </button>

              {workforce.sites.map(site => (
                <div
                  key={site.id}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    selectedSiteId === site.id
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSiteId(site.id)}
                    className="flex-1 flex items-center gap-2 truncate text-left cursor-pointer"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedSiteId === site.id ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-zinc-400'}`} />
                    <span className="truncate">{site.name}</span>
                  </button>
                  <button
                    onClick={() => window.open(`/public/portal/${site.id}`, '_blank', 'noopener,noreferrer')}
                    title={`Open ${site.name} Portal`}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer transition-opacity"
                  >
                    <ExternalLink size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Real Metrics & Display Mode Switcher */}
        <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 bg-zinc-50/40 dark:bg-zinc-900/40">
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <div className="text-xs font-bold text-zinc-900 dark:text-white">{metrics.totalActiveSessions}</div>
              <div className="text-[9px] text-zinc-400">Open</div>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <div className="text-xs font-bold text-zinc-900 dark:text-white">
                {sessions.length > 0 ? `${metrics.aiDeflectionRate}%` : '—'}
              </div>
              <div className="text-[9px] text-zinc-400">AI Handled</div>
            </div>
            <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
              <div className="text-xs font-bold text-zinc-900 dark:text-white">
                {metrics.avgFirstResponseSeconds > 0 ? `${metrics.avgFirstResponseSeconds}s` : '—'}
              </div>
              <div className="text-[9px] text-zinc-400">Avg Reply</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 pt-1">
            <button
              onClick={handleSwitchToDock}
              title="Dock as bottom-right chat bar"
              className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <MessageSquare size={12} /> Dock
            </button>
            <button
              onClick={handleSwitchToSide}
              title="Open as right side panel"
              className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <PanelRight size={12} /> Side
            </button>
            <button
              onClick={() => window.open('/workspace/apps/service-desk?standalone=true', '_blank', 'noopener,noreferrer')}
              title="Open in new browser tab"
              className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <ExternalLink size={12} /> Tab
            </button>
          </div>
        </div>
      </div>

      <ResizeHandle
        onResize={delta => setSidebarWidth(w => Math.max(190, Math.min(340, w + delta)))}
      />

      {/* =====================================================================
          PANE 2: SESSION LIST (Matches InboxThreadList.tsx)
          ===================================================================== */}
      <div
        style={{ width: listWidth }}
        className="h-full border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/40 flex flex-col shrink-0"
      >
        {/* Search & Filter Header */}
        <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'UNREAD', label: 'Unread' },
                { id: 'SITE_CHAT', label: 'Chat' },
                { id: 'VOICE_CALL', label: 'Voice' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setChannelTab(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  channelTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 custom-scrollbar">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 px-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No conversations</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Customer chats from your Sites and inbound Voice Queue calls appear here in real time.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setShowNewSessionModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
                >
                  Start Session
                </button>
                {workforce.sites[0] && (
                  <button
                    onClick={() =>
                      window.open(`/portal/${workforce.sites[0].id}`, '_blank', 'noopener,noreferrer')
                    }
                    className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink size={11} /> Open Portal
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredSessions.map(sess => {
              const isSelected = activeSession?.id === sess.id;
              const isVoice = sess.channelType === 'VOICE_CALL';
              const isHitl = sess.status === 'AWAITING_HITL_APPROVAL';
              const assigneeLabel =
                sess.allocatedAssigneeType === 'AI_AGENT'
                  ? sess.allocatedAgentName || 'AI Assistant'
                  : sess.allocatedMemberName || 'Unassigned';

              return (
                <div
                  key={sess.id}
                  onClick={() => setActiveSessionId(sess.id)}
                  className={`px-4 py-3 cursor-pointer transition-all relative ${
                    isSelected
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/25'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-600 dark:bg-indigo-400" />
                  )}

                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {sess.unreadByOperator > 0 && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                      )}
                      <span
                        className={`text-xs truncate ${
                          sess.unreadByOperator > 0
                            ? 'font-bold text-zinc-900 dark:text-white'
                            : isSelected
                            ? 'font-semibold text-indigo-950 dark:text-white'
                            : 'font-semibold text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {sess.visitorName}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      {new Date(sess.lastMessageAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 truncate">
                    {isVoice ? <PhoneCall size={10} className="text-indigo-500" /> : <Globe size={10} />}
                    <span className="truncate">{sess.siteName || 'Customer Portal'}</span>
                    <span>•</span>
                    <span className={`truncate ${sess.allocatedAssigneeType === 'AI_AGENT' ? 'text-indigo-600 dark:text-indigo-400 font-medium' : ''}`}>
                      {assigneeLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 flex-1">
                      {sess.lastMessagePreview || 'Conversation started'}
                    </p>
                    {isHitl && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-semibold shrink-0">
                        Approval
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ResizeHandle
        onResize={delta => setListWidth(w => Math.max(260, Math.min(480, w + delta)))}
      />

      {/* =====================================================================
          PANE 3: MAIN CONVERSATION WORKSPACE (Matches ChatApp.tsx)
          ===================================================================== */}
      {activeSession ? (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-white dark:bg-zinc-950">
          {/* Clean h-14 Conversation Header */}
          <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                {activeSession.channelType === 'VOICE_CALL' ? (
                  <PhoneCall size={14} />
                ) : (
                  activeSession.visitorName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                    {activeSession.visitorName}
                  </span>
                  {activeSession.allocatedQueueName && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-medium flex items-center gap-1">
                      <ListOrdered size={10} />
                      {activeSession.allocatedQueueName}
                    </span>
                  )}
                  {activeSession.status === 'RESOLVED' && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-medium">
                      Resolved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 truncate">
                  <span>{activeSession.siteName || 'Portal'}</span>
                  {activeSession.currentPageSlug && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{activeSession.currentPageSlug}</span>
                    </>
                  )}
                  {activeSession.visitorEmail && (
                    <>
                      <span>•</span>
                      <span>{activeSession.visitorEmail}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Answer Call Button if Voice Call */}
              {activeSession.channelType === 'VOICE_CALL' &&
                activeVoiceCall?.sessionId !== activeSession.id && (
                  <button
                    onClick={() => answerVoiceCall(activeSession)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <PhoneCall size={13} /> Answer Call
                  </button>
                )}

              {/* Unified Assignee Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAssignMenu(prev => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {activeSession.allocatedAssigneeType === 'AI_AGENT' ? (
                    <Bot size={13} className="text-zinc-500" />
                  ) : (
                    <User size={13} className="text-zinc-500" />
                  )}
                  <span className="max-w-[140px] truncate">
                    {activeSession.allocatedAssigneeType === 'AI_AGENT'
                      ? activeSession.allocatedAgentName || 'AI Assistant'
                      : activeSession.allocatedMemberName || 'Unassigned'}
                  </span>
                  <ChevronDown size={12} className="text-zinc-400" />
                </button>

                {showAssignMenu && (
                  <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-2 z-50 space-y-2">
                    <input
                      type="text"
                      value={handoverNote}
                      onChange={e => setHandoverNote(e.target.value)}
                      placeholder="Optional transfer note..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none"
                    />

                    {workforce.aiAgents.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          AI Agents
                        </div>
                        {workforce.aiAgents.map(agent => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              allocateSession(activeSession.id, {
                                targetAssigneeType: 'AI_AGENT',
                                targetAgentId: agent.id,
                                targetAgentName: agent.name,
                                handoverNote: handoverNote || undefined
                              });
                              setHandoverNote('');
                              setShowAssignMenu(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Bot size={13} className="text-zinc-400 shrink-0" />
                              <span className="truncate font-medium">{agent.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400">AI</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {workforce.humanOperators.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Team Members
                        </div>
                        {workforce.humanOperators.map(op => (
                          <button
                            key={op.id}
                            onClick={() => {
                              allocateSession(activeSession.id, {
                                targetAssigneeType: 'HUMAN_USER',
                                targetMemberId: op.id,
                                targetMemberName: op.name,
                                handoverNote: handoverNote || undefined
                              });
                              setHandoverNote('');
                              setShowAssignMenu(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <User size={13} className="text-zinc-400 shrink-0" />
                              <span className="truncate font-medium">{op.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {op.status === 'AVAILABLE' ? 'Online' : op.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {workforce.teams.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Teams (Round-Robin)
                        </div>
                        {workforce.teams.map(team => (
                          <button
                            key={team.id}
                            onClick={() => {
                              allocateSession(activeSession.id, {
                                targetAssigneeType: 'TEAM_ROUND_ROBIN',
                                targetTeamId: team.id,
                                targetTeamName: team.name,
                                handoverNote: handoverNote || undefined
                              });
                              setHandoverNote('');
                              setShowAssignMenu(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Users size={13} className="text-zinc-400 shrink-0" />
                              <span className="truncate font-medium">{team.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400">Queue</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {workforce.queues && workforce.queues.length > 0 && (
                      <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Dispatched Queues
                        </div>
                        {workforce.queues.map(q => (
                          <button
                            key={q.id}
                            onClick={() => {
                              allocateSession(activeSession.id, {
                                targetAssigneeType: 'QUEUE',
                                targetQueueId: q.id,
                                targetQueueName: q.name,
                                handoverNote: handoverNote || `Dispatched to ${q.name}`
                              });
                              setHandoverNote('');
                              setShowAssignMenu(false);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <ListOrdered size={13} className="text-indigo-400 shrink-0" />
                              <span className="truncate font-medium">{q.name}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400">Queue</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Resolve / Wrap-Up / Reopen */}
              {activeSession.status !== 'RESOLVED' ? (
                <button
                  onClick={() => openWrapUpModal(activeSession.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <CheckCircle2 size={13} /> Wrap-Up & Resolve
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openWrapUpModal(activeSession.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 text-xs font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Update Wrap-Up Outcome & Topic"
                  >
                    <CheckCircle2 size={13} /> {activeSession.wrapUpOutcome || 'Edit Wrap-Up'}
                  </button>
                  <button
                    onClick={() => resolveOrReopenSession(activeSession.id, 'ASSIGNED_HUMAN')}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={13} /> Reopen
                  </button>
                </div>
              )}

              {/* Toggle Right Details Drawer */}
              <button
                onClick={() => setShowContextDrawer(prev => !prev)}
                title={showContextDrawer ? 'Hide details panel' : 'Show details panel'}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  showContextDrawer
                    ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {showContextDrawer ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              </button>
            </div>
          </div>

          {/* Active Voice Softphone Bar (Only when on an active voice call) */}
          {activeVoiceCall && activeVoiceCall.sessionId === activeSession.id && (
            <div className="px-5 py-2.5 bg-zinc-900 text-white flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold">
                  Active Call: {activeVoiceCall.callerName} ({activeVoiceCall.callerNumber})
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {Math.floor(activeVoiceCall.durationSeconds / 60)}m {activeVoiceCall.durationSeconds % 60}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleVoiceMute}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer ${
                    activeVoiceCall.isMuted ? 'bg-rose-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {activeVoiceCall.isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                  {activeVoiceCall.isMuted ? 'Muted' : 'Mute'}
                </button>
                <button
                  onClick={toggleVoiceHold}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 cursor-pointer ${
                    activeVoiceCall.isOnHold ? 'bg-amber-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {activeVoiceCall.isOnHold ? <Play size={12} /> : <Pause size={12} />}
                  {activeVoiceCall.isOnHold ? 'Resume' : 'Hold'}
                </button>
                <button
                  onClick={endVoiceCall}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <PhoneOff size={12} /> End Call
                </button>
              </div>
            </div>
          )}

          {/* Conversation Messages Stream */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 custom-scrollbar">
            {(activeSession.messages || []).map(msg => (
              <ServiceDeskMessageBubble
                key={msg.id}
                message={msg}
                viewMode="OPERATOR"
                onApproveHitl={note => decideHitlApproval(activeSession.id, 'APPROVED', note)}
                onRejectHitl={note => decideHitlApproval(activeSession.id, 'REJECTED', note)}
                onOpenRecord={(moduleId, recordId) =>
                  navigate(`/workspace/modules/${moduleId}/records/${recordId}`)
                }
                onAnswerCall={() => answerVoiceCall(activeSession)}
                onCardAction={async (messageId, actionType, data) => {
                  await ServiceDeskService.executePublicCardAction(activeSession.siteId || 'default', {
                    sessionId: activeSession.id,
                    messageId,
                    actionType,
                    data
                  });
                  await refreshServiceDesk();
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Subtle AI Co-Pilot Draft Bar */}
          {activeSession.aiSuggestedReply && (
            <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 text-xs text-zinc-700 dark:text-zinc-200">
                <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{activeSession.aiSuggestedReply}</span>
              </div>
              <button
                onClick={() => setComposerText(activeSession.aiSuggestedReply || '')}
                className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium shrink-0 cursor-pointer transition-colors"
              >
                Use Draft
              </button>
            </div>
          )}

          {/* Clean Composer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsWhisperMode(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    !isWhisperMode
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Reply
                </button>
                <button
                  onClick={() => setIsWhisperMode(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    isWhisperMode
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Lock size={11} /> Internal Note
                </button>
              </div>

              {/* Action Buttons: Macros & Insert Card */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <button
                    onClick={() => setShowCannedPicker(prev => !prev)}
                    className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Canned Response Macros (or type / in composer)"
                  >
                    <Zap size={12} className="text-amber-500" /> Macros
                  </button>

                  {showCannedPicker && (
                    <div className="absolute right-0 bottom-9 w-80 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 z-50 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Quick Reply Macros
                      </div>
                      {cannedResponses.map(m => (
                        <button
                          key={m.id}
                          onClick={() => applyCannedMacro(m)}
                          className="w-full p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-xs cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px]">
                              {m.shortcut}
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-white truncate">{m.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{m.content}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clean "+ Insert Card" Dropdown (Uses Real Tenant Forms, KB, Invoices, Bookings) */}
                <div className="relative">
                <button
                  onClick={() => {
                    setShowInsertMenu(prev => !prev);
                    setInsertPickerType(null);
                  }}
                  className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={12} /> Insert Card
                </button>

                {showInsertMenu && (
                  <div className="absolute right-0 bottom-9 w-80 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-2.5 z-50">
                    {!insertPickerType ? (
                      <div className="space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Send Interactive Card
                        </div>
                        <button
                          onClick={() => setInsertPickerType('FORM')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <FileText size={13} className="text-zinc-400" /> Form ({workforce.forms.length})
                          </span>
                          <ChevronDown size={12} className="-rotate-90 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setInsertPickerType('BOOKING')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <Calendar size={13} className="text-zinc-400" /> Booking Slots
                          </span>
                          <ChevronDown size={12} className="-rotate-90 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setInsertPickerType('INVOICE')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <CreditCard size={13} className="text-zinc-400" /> Invoice Payment (
                            {(workforce.invoices || []).length})
                          </span>
                          <ChevronDown size={12} className="-rotate-90 text-zinc-400" />
                        </button>
                        <button
                          onClick={() => setInsertPickerType('KB')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <BookOpen size={13} className="text-zinc-400" /> Knowledge Article (
                            {(workforce.kbArticles || []).length})
                          </span>
                          <ChevronDown size={12} className="-rotate-90 text-zinc-400" />
                        </button>
                      </div>
                    ) : insertPickerType === 'FORM' ? (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-xs font-semibold">Select Form</span>
                          <button
                            onClick={() => setInsertPickerType(null)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        {workforce.forms.length === 0 ? (
                          <div className="p-3 text-center text-xs text-zinc-500">
                            No forms built yet. Create one in Form Builder.
                          </div>
                        ) : (
                          workforce.forms.map(f => (
                            <button
                              key={f.id}
                              onClick={() => handleInsertFormCard(f)}
                              className="w-full p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                            >
                              <div className="text-xs font-medium text-zinc-900 dark:text-white">{f.name}</div>
                              {f.description && (
                                <div className="text-[10px] text-zinc-400 truncate">{f.description}</div>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    ) : insertPickerType === 'KB' ? (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-xs font-semibold">Select Knowledge Source</span>
                          <button
                            onClick={() => setInsertPickerType(null)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        {(workforce.kbArticles || []).length === 0 ? (
                          <div className="p-3 text-center text-xs text-zinc-500">
                            No knowledge base articles found. Add documents in Drive or Agent Builder.
                          </div>
                        ) : (
                          (workforce.kbArticles || []).map(art => (
                            <button
                              key={art.id}
                              onClick={() => handleInsertKbCard(art)}
                              className="w-full p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
                            >
                              <div className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                                {art.title}
                              </div>
                              <div className="text-[10px] text-zinc-400">{art.category}</div>
                            </button>
                          ))
                        )}
                      </div>
                    ) : insertPickerType === 'INVOICE' ? (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-xs font-semibold">Select Invoice</span>
                          <button
                            onClick={() => setInsertPickerType(null)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        {(workforce.invoices || []).length === 0 ? (
                          <div className="p-3 text-center text-xs text-zinc-500">
                            No invoices found for this tenant.
                          </div>
                        ) : (
                          (workforce.invoices || []).map(inv => (
                            <button
                              key={inv.id}
                              onClick={() => handleInsertInvoiceCard(inv)}
                              className="w-full p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-left cursor-pointer"
                            >
                              <div>
                                <div className="text-xs font-medium text-zinc-900 dark:text-white">
                                  {inv.invoiceNumber}
                                </div>
                                <div className="text-[10px] text-zinc-400">{inv.status}</div>
                              </div>
                              <div className="text-xs font-semibold">
                                ${Number(inv.amount).toFixed(2)} {inv.currency}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                          <span className="text-xs font-semibold">Send Booking Card</span>
                          <button
                            onClick={() => setInsertPickerType(null)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        <input
                          type="text"
                          value={bookingServiceTitle}
                          onChange={e => setBookingServiceTitle(e.target.value)}
                          placeholder="Service or consultation title..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                        />
                        <button
                          onClick={handleInsertBookingCard}
                          className="w-full py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium cursor-pointer"
                        >
                          Send Booking Slots
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
              {matchingCanned.length > 0 && (
                <div className="absolute left-0 bottom-full mb-2 w-80 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 z-50 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 flex items-center justify-between">
                    <span>Matching Macros</span>
                    <span className="text-[9px] font-normal text-zinc-500">Click to insert</span>
                  </div>
                  {matchingCanned.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => applyCannedMacro(m)}
                      className="w-full p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          {m.shortcut}
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-white truncate">{m.title}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{m.content}</p>
                    </button>
                  ))}
                </div>
              )}
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
                  isWhisperMode
                    ? 'Write an internal note visible only to your team...'
                    : `Message ${activeSession.visitorName}...`
                }
                className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none border transition-colors ${
                  isWhisperMode
                    ? 'bg-zinc-50 dark:bg-zinc-900 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-zinc-700'
                }`}
              />
              <button
                onClick={handleSend}
                disabled={!composerText.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-xs shadow-indigo-500/15"
              >
                <Send size={13} /> Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/30 dark:bg-zinc-950">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-400">
            <Headset className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Select or start a conversation</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
            Choose a conversation from the queue on the left, or start a new customer chat or voice session.
          </p>
          <button
            onClick={() => setShowNewSessionModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs shadow-indigo-500/15"
          >
            <Plus size={14} /> New Session
          </button>
        </div>
      )}

      {/* =====================================================================
          PANE 4: COLLAPSIBLE RIGHT CONTEXT DRAWER
          ===================================================================== */}
      {activeSession && showContextDrawer && (
        <div className="w-80 h-full border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex flex-col shrink-0">
          {/* Context Tabs */}
          <div className="h-14 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1 shrink-0">
            {(
              [
                { id: 'overview', label: 'Details' },
                { id: 'records', label: `Records (${(activeSession.linkedRecords || []).length})` },
                { id: 'routing', label: 'Routing' }
              ] as const
            ).map(t => (
              <button
                key={t.id}
                onClick={() => setContextTab(t.id)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  contextTab === t.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {contextTab === 'overview' && (
              <>
                {/* Customer Info Card */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Customer</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400">Name</span>
                      <span className="font-medium text-zinc-900 dark:text-white truncate">
                        {activeSession.visitorName}
                      </span>
                    </div>
                    {activeSession.visitorEmail && (
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-400">Email</span>
                        <span className="font-medium text-zinc-900 dark:text-white truncate">
                          {activeSession.visitorEmail}
                        </span>
                      </div>
                    )}
                    {activeSession.visitorPhone && (
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-400">Phone</span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {activeSession.visitorPhone}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400">Channel</span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {activeSession.channelType === 'VOICE_CALL' ? 'Voice Call' : 'Site Chat'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-zinc-400">Site</span>
                      <span className="font-medium text-zinc-900 dark:text-white truncate">
                        {activeSession.siteName || 'Portal'}
                      </span>
                    </div>
                    {activeSession.currentPageSlug && (
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-400">Page</span>
                        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 truncate">
                          {activeSession.currentPageSlug}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Wrap-Up & Disposition Card */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Wrap-Up & Disposition
                    </span>
                    <button
                      type="button"
                      onClick={() => openWrapUpModal(activeSession.id)}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {activeSession.wrapUpOutcome ? 'Edit' : 'Record Wrap-Up'}
                    </button>
                  </div>

                  {activeSession.wrapUpOutcome ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-400">Outcome</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-right">
                          {activeSession.wrapUpOutcome}
                        </span>
                      </div>
                      {activeSession.wrapUpTopic && (
                        <div className="flex justify-between gap-2">
                          <span className="text-zinc-400">Topic</span>
                          <span className="font-medium text-zinc-900 dark:text-white text-right">
                            {activeSession.wrapUpTopic}
                          </span>
                        </div>
                      )}
                      {activeSession.wrapUpSubtopic && (
                        <div className="flex justify-between gap-2">
                          <span className="text-zinc-400">Sub-Topic</span>
                          <span className="text-zinc-700 dark:text-zinc-300 text-right">
                            {activeSession.wrapUpSubtopic}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span className="text-zinc-400">FCR</span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {activeSession.firstContactResolution ? 'Yes (1st Contact)' : 'Follow-Up'}
                        </span>
                      </div>
                      {typeof activeSession.handleDurationSeconds === 'number' && (
                        <div className="flex justify-between gap-2">
                          <span className="text-zinc-400">Handle Time</span>
                          <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {Math.floor(activeSession.handleDurationSeconds / 60)}m{' '}
                            {activeSession.handleDurationSeconds % 60}s
                          </span>
                        </div>
                      )}
                      {activeSession.wrapUpNotes && (
                        <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          {activeSession.wrapUpNotes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500">
                      Not wrapped up yet. Click <strong>Wrap-Up & Resolve</strong> when closing to record outcome & topic for BI reporting.
                    </div>
                  )}
                </div>

                {/* AI Summary Card */}
                {activeSession.aiSummary && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Summary
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {activeSession.aiSummary}
                    </p>
                  </div>
                )}

                {/* Session Management */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Actions</div>
                  {activeSession.siteId && (
                    <button
                      onClick={() =>
                        window.open(`/portal/${activeSession.siteId}`, '_blank', 'noopener,noreferrer')
                      }
                      className="w-full py-1.5 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink size={12} /> Open Customer Site
                    </button>
                  )}
                  <button
                    onClick={() => deleteSession(activeSession.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-rose-600 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 size={12} /> Delete Session
                  </button>
                </div>
              </>
            )}

            {contextTab === 'records' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Linked Module Records
                  </span>
                  <button
                    onClick={() => setShowNewRecordForm(prev => !prev)}
                    className="px-2.5 py-1 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={11} /> Create Record
                  </button>
                </div>

                {showNewRecordForm && (
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <select
                      value={newRecordModuleId}
                      onChange={e => setNewRecordModuleId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                    >
                      {workforce.modules.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newRecordTitle}
                      onChange={e => setNewRecordTitle(e.target.value)}
                      placeholder="Record title or summary..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                    />
                    <button
                      onClick={handleCreateLinkedRecord}
                      className="w-full py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium cursor-pointer"
                    >
                      Create & Share in Chat
                    </button>
                  </div>
                )}

                {(activeSession.linkedRecords || []).length === 0 ? (
                  <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                    No records linked to this session yet.
                  </div>
                ) : (
                  (activeSession.linkedRecords || []).map(rec => (
                    <div
                      key={rec.recordId}
                      onClick={() => navigate(`/workspace/modules/${rec.moduleId}/records/${rec.recordId}`)}
                      className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
                          <Database size={11} className="text-zinc-400" /> {rec.recordKey || 'Record'}
                        </span>
                        <span className="text-zinc-400">{rec.moduleName}</span>
                      </div>
                      <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {rec.title}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {contextTab === 'routing' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Current Assignee
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {activeSession.allocatedAssigneeType === 'AI_AGENT'
                      ? activeSession.allocatedAgentName || 'AI Assistant'
                      : activeSession.allocatedMemberName || 'Unassigned'}
                  </div>
                </div>

                {workforce.aiAgents.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      AI Agents (Agent Builder)
                    </div>
                    {workforce.aiAgents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() =>
                          allocateSession(activeSession.id, {
                            targetAssigneeType: 'AI_AGENT',
                            targetAgentId: agent.id,
                            targetAgentName: agent.name
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 flex items-center justify-between text-xs text-left cursor-pointer transition-colors"
                      >
                        <div className="truncate pr-2">
                          <div className="font-medium text-zinc-900 dark:text-white truncate">{agent.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{agent.roleTitle}</div>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-500">Assign</span>
                      </button>
                    ))}
                  </div>
                )}

                {workforce.humanOperators.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Team Members
                    </div>
                    {workforce.humanOperators.map(op => (
                      <button
                        key={op.id}
                        onClick={() =>
                          allocateSession(activeSession.id, {
                            targetAssigneeType: 'HUMAN_USER',
                            targetMemberId: op.id,
                            targetMemberName: op.name
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 flex items-center justify-between text-xs text-left cursor-pointer transition-colors"
                      >
                        <div className="truncate pr-2">
                          <div className="font-medium text-zinc-900 dark:text-white truncate">{op.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{op.roleTitle}</div>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-500">Assign</span>
                      </button>
                    ))}
                  </div>
                )}

                {workforce.queues && workforce.queues.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Dispatched Queues
                    </div>
                    {workforce.queues.map(q => (
                      <button
                        key={q.id}
                        onClick={() =>
                          allocateSession(activeSession.id, {
                            targetAssigneeType: 'QUEUE',
                            targetQueueId: q.id,
                            targetQueueName: q.name,
                            handoverNote: `Transferred to ${q.name}`
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 flex items-center justify-between text-xs text-left cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <ListOrdered size={14} className="text-indigo-400 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-zinc-900 dark:text-white truncate">{q.name}</div>
                            <div className="text-[10px] text-zinc-400 truncate">{q.description || 'Service queue'}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-zinc-500">Route</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          NEW SESSION MODAL (100% Real Sites, Real Contacts/Parties, Real Routing)
          ===================================================================== */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">New Service Desk Session</h3>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewSessionSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewSessionChannel('SITE_CHAT')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    newSessionChannel === 'SITE_CHAT'
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <MessageSquare size={13} /> Site Chat
                </button>
                <button
                  type="button"
                  onClick={() => setNewSessionChannel('VOICE_CALL')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    newSessionChannel === 'VOICE_CALL'
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white'
                      : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <PhoneCall size={13} /> Voice Call
                </button>
              </div>

              {workforce.sites.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Site</label>
                  <select
                    value={newSessionSiteId}
                    onChange={e => setNewSessionSiteId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    {workforce.sites.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.domain})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(workforce.parties || []).length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    Select Existing Contact / Organization (Optional)
                  </label>
                  <select
                    value={newSessionPartyId}
                    onChange={e => {
                      setNewSessionPartyId(e.target.value);
                      const found = (workforce.parties || []).find(p => p.id === e.target.value);
                      if (found && !newSessionName) setNewSessionName(found.name);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    <option value="">Custom Visitor / Caller...</option>
                    {(workforce.parties || []).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.partyType})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newSessionName}
                  onChange={e => setNewSessionName(e.target.value)}
                  placeholder="Enter customer name..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={newSessionEmail}
                    onChange={e => setNewSessionEmail(e.target.value)}
                    placeholder="customer@domain.com"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newSessionPhone}
                    onChange={e => setNewSessionPhone(e.target.value)}
                    placeholder="+61 400 000 000"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                  />
                </div>
              </div>

              {workforce.queues && workforce.queues.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Dispatch Queue</label>
                  <select
                    value={newSessionQueueId}
                    onChange={e => setNewSessionQueueId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    <option value="">Default Dispatch</option>
                    {workforce.queues.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Initial Allocation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSessionAssigneeType('AI_AGENT')}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      newSessionAssigneeType === 'AI_AGENT'
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    AI Assistant First
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSessionAssigneeType('HUMAN_USER')}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      newSessionAssigneeType === 'HUMAN_USER'
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-white'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    Human Operator
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                  {newSessionChannel === 'VOICE_CALL' ? 'Call Notes / Context' : 'Initial Customer Question (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={newSessionMessage}
                  onChange={e => setNewSessionMessage(e.target.value)}
                  placeholder={
                    newSessionChannel === 'VOICE_CALL'
                      ? 'Reason for call...'
                      : 'Ask a question to test live AI grounding...'
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                >
                  Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDeskApp;
