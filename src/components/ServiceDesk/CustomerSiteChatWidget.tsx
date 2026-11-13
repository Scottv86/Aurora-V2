import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Maximize2,
  Minimize2,
  Minus,
  ChevronRight,
  Search,
  Calendar,
  FileText,
  CreditCard,
  Headset,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import {
  ServiceDeskSession,
  ServiceDeskMessage,
  SiteChatConfig,
  DEFAULT_SITE_CHAT_CONFIG
} from '../../types/serviceDesk';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { ServiceDeskMessageBubble } from './ServiceDeskMessageBubble';
import { Site } from '../../services/siteService';
import { cn } from '../../lib/utils';

interface CustomerSiteChatWidgetProps {
  site: Site;
  currentPageSlug?: string;
  mode: 'floating' | 'inline';
  widgetTitle?: string;
  widgetSubtitle?: string;
  authenticatedCustomer?: {
    partyId?: string;
    name?: string;
    email?: string;
    company?: string;
  };
}

export const CustomerSiteChatWidget: React.FC<CustomerSiteChatWidgetProps> = ({
  site,
  currentPageSlug = '/',
  mode = 'floating',
  widgetTitle,
  widgetSubtitle,
  authenticatedCustomer
}) => {
  const chatConfig: SiteChatConfig = {
    ...DEFAULT_SITE_CHAT_CONFIG,
    ...(site.chatConfig || (site.branding as any)?.chatConfig || {})
  };

  const accentColor =
    chatConfig.customAccentColor ||
    site.branding?.accentColor ||
    '#4f46e5';

  // Visitor token persisted per site
  const visitorTokenKey = `aurora_visitor_token_${site.id}`;
  const visitorProfileKey = `aurora_visitor_profile_${site.id}`;

  const [visitorToken] = useState<string>(() => {
    const existing = localStorage.getItem(visitorTokenKey);
    if (existing) return existing;
    const generated = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(visitorTokenKey, generated);
    return generated;
  });

  const [visitorProfile, setVisitorProfile] = useState<{
    name: string;
    email: string;
    company: string;
    captured: boolean;
  }>(() => {
    if (authenticatedCustomer?.name || authenticatedCustomer?.email) {
      return {
        name: authenticatedCustomer.name || 'Site Visitor',
        email: authenticatedCustomer.email || '',
        company: authenticatedCustomer.company || '',
        captured: true
      };
    }
    try {
      const saved = localStorage.getItem(visitorProfileKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      name: '',
      email: '',
      company: '',
      captured: chatConfig.preChatCapture === 'none'
    };
  });

  const [isOpen, setIsOpen] = useState<boolean>(mode === 'inline');
  const [windowSize, setWindowSize] = useState<'normal' | 'expanded' | 'minimized'>('normal');
  const [session, setSession] = useState<ServiceDeskSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [proactivePrompt, setProactivePrompt] = useState<string | null>(null);
  const [proactiveDismissed, setProactiveDismissed] = useState<boolean>(false);
  const [showPreChatForm, setShowPreChatForm] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize or restore session when opened (or immediately if inline)
  const ensureSession = async (overrideProfile?: { name?: string; email?: string; company?: string }) => {
    if (isLoadingSession) return;
    setIsLoadingSession(true);
    try {
      const activeProfile = overrideProfile || visitorProfile;
      const loaded = await ServiceDeskService.initPublicSiteSession(site.id, {
        visitorToken,
        visitorName: activeProfile.name || authenticatedCustomer?.name || 'Site Visitor',
        visitorEmail: activeProfile.email || authenticatedCustomer?.email || undefined,
        visitorCompany: activeProfile.company || authenticatedCustomer?.company || undefined,
        partyId: authenticatedCustomer?.partyId,
        currentPageSlug
      });
      setSession(loaded);
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    if (isOpen && !session) {
      if (chatConfig.preChatCapture === 'required' && !visitorProfile.captured) {
        setShowPreChatForm(true);
      } else {
        ensureSession();
      }
    }
  }, [isOpen]);

  // Connect Visitor Socket.IO for real-time operator & AI push updates
  useEffect(() => {
    if (!session?.id) return;

    const socket = io(window.location.origin, {
      auth: {
        visitorToken,
        siteId: site.id
      },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_service_desk_session', session.id);
    });

    socket.on('service_desk:session_updated', (updated: ServiceDeskSession) => {
      if (updated && updated.id === session.id) {
        setSession(updated);
      }
    });

    return () => {
      socket.emit('leave_service_desk_session', session.id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.id, site.id, visitorToken]);

  // Proactive page-aware greeting trigger
  useEffect(() => {
    if (mode !== 'floating' || isOpen || proactiveDismissed) return;
    const rules = chatConfig.proactiveRules || [];
    const matchingRule = rules.find(
      r =>
        r.enabled &&
        (currentPageSlug === r.pageSlugPattern ||
          currentPageSlug.includes(r.pageSlugPattern.replace('/', '')))
    );

    const timer = setTimeout(() => {
      if (matchingRule) {
        setProactivePrompt(matchingRule.greetingMessage);
      } else if (chatConfig.welcomeMessage) {
        setProactivePrompt(chatConfig.welcomeMessage);
      }
    }, (matchingRule?.delaySeconds || 4) * 1000);

    return () => clearTimeout(timer);
  }, [currentPageSlug, mode, isOpen, proactiveDismissed]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages?.length, isOpen]);

  const handlePreChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...visitorProfile,
      name: visitorProfile.name.trim() || 'Site Visitor',
      captured: true
    };
    setVisitorProfile(updated);
    localStorage.setItem(visitorProfileKey, JSON.stringify(updated));
    setShowPreChatForm(false);
    await ensureSession(updated);
  };

  const handleSendMessage = async (customText?: string, requestHumanHandoff?: boolean) => {
    const content = (customText ?? inputText).trim();
    if (!content && !requestHumanHandoff) return;
    if (! customText) setInputText('');

    setIsSending(true);
    try {
      const updated = await ServiceDeskService.sendPublicSiteMessage(site.id, {
        sessionId: session?.id,
        visitorToken,
        visitorName: visitorProfile.name || authenticatedCustomer?.name || 'Site Visitor',
        visitorEmail: visitorProfile.email || authenticatedCustomer?.email || undefined,
        content: content || 'I would like to speak with a human representative please.',
        currentPageSlug,
        requestHumanHandoff
      });
      setSession(updated);
    } finally {
      setIsSending(false);
    }
  };

  const handleCardAction = async (
    messageId: string,
    actionType: 'BOOK_SLOT' | 'SUBMIT_FORM' | 'PAY_INVOICE',
    data: Record<string, any>
  ) => {
    if (!session) return;
    setIsSending(true);
    try {
      const updated = await ServiceDeskService.executePublicCardAction(site.id, {
        sessionId: session.id,
        messageId,
        actionType,
        data
      });
      setSession(updated);
    } finally {
      setIsSending(false);
    }
  };

  const quickActions = [
    chatConfig.capabilities.allowRecordLookup && {
      id: 'status',
      label: 'Check Status',
      icon: Search,
      prompt: 'Can you check the status of my recent request or order?'
    },
    chatConfig.capabilities.allowAppointmentBooking && {
      id: 'book',
      label: 'Book Appointment',
      icon: Calendar,
      prompt: 'I would like to book an appointment or consultation slot.'
    },
    chatConfig.capabilities.allowFormPush && {
      id: 'form',
      label: 'Submit Request',
      icon: FileText,
      prompt: 'I need to submit a new support or service request form.'
    },
    chatConfig.capabilities.allowInvoicePayment && {
      id: 'pay',
      label: 'Pay Invoice',
      icon: CreditCard,
      prompt: 'Can I view and pay my outstanding invoice?'
    },
    chatConfig.capabilities.allowHumanEscalation && {
      id: 'human',
      label: 'Talk to a Human',
      icon: Headset,
      prompt: 'Can you connect me with a human specialist?',
      handoff: true
    }
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    icon: any;
    prompt: string;
    handoff?: boolean;
  }>;

  const renderChatContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div
        style={{ backgroundColor: accentColor }}
        className="px-4 py-3.5 text-white flex items-center justify-between shrink-0 shadow-sm"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25">
              {session?.assignedOwnerType === 'HUMAN' ? (
                <User size={18} className="text-white" />
              ) : (
                <Sparkles size={18} className="text-white" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-sm truncate">
                {widgetTitle || session?.assignedOwnerName || `${site.name} Service Desk`}
              </h4>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-white/20 text-white shrink-0">
                {session?.assignedOwnerType === 'HUMAN'
                  ? 'Live Specialist'
                  : session?.status === 'QUEUED_FOR_HUMAN'
                    ? 'In Queue'
                    : 'AI Concierge'}
              </span>
            </div>
            <p className="text-[11px] text-white/80 truncate">
              {widgetSubtitle ||
                (session?.assignedOwnerType === 'HUMAN'
                  ? `Connected with ${session.assignedOwnerName}`
                  : `Grounded on ${site.name} Knowledge Base & Live Records`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {chatConfig.capabilities.allowHumanEscalation &&
            session?.assignedOwnerType !== 'HUMAN' &&
            session?.status !== 'QUEUED_FOR_HUMAN' && (
              <button
                type="button"
                onClick={() => handleSendMessage('Please connect me with a human specialist.', true)}
                className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer mr-1"
                title="Request Human Specialist"
              >
                <Headset size={11} />
                <span className="hidden sm:inline">Human</span>
              </button>
            )}

          {mode === 'floating' && (
            <>
              <button
                type="button"
                onClick={() =>
                  setWindowSize(prev => (prev === 'expanded' ? 'normal' : 'expanded'))
                }
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                title={windowSize === 'expanded' ? 'Restore size' : 'Expand window'}
              >
                {windowSize === 'expanded' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                title="Minimize chat"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subheader Context Bar */}
      <div className="px-4 py-1.5 bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0">
        <span className="flex items-center gap-1.5 truncate">
          <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Verified {site.name} Channel</span>
          {currentPageSlug && (
            <span className="text-zinc-400 dark:text-zinc-500">• Page: {currentPageSlug}</span>
          )}
        </span>
        {chatConfig.preChatCapture === 'optional' && !visitorProfile.captured && !showPreChatForm && (
          <button
            type="button"
            onClick={() => setShowPreChatForm(true)}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer shrink-0"
          >
            Add your details
          </button>
        )}
      </div>

      {/* Pre-chat Identity Capture Form (when required or toggled) */}
      {showPreChatForm ? (
        <form onSubmit={handlePreChatSubmit} className="p-5 flex-1 flex flex-col justify-center space-y-4">
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-zinc-900 dark:text-white">
              Welcome to {site.name} Support
            </h5>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Let us know who we are chatting with so we can look up your account and records automatically.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={visitorProfile.name}
                onChange={e => setVisitorProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={visitorProfile.email}
                onChange={e => setVisitorProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="jane@company.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Company / Organization (Optional)
              </label>
              <input
                type="text"
                value={visitorProfile.company}
                onChange={e => setVisitorProfile(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {chatConfig.preChatCapture !== 'required' && (
              <button
                type="button"
                onClick={() => setShowPreChatForm(false)}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Skip
              </button>
            )}
            <button
              type="submit"
              style={{ backgroundColor: accentColor }}
              className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
            >
              <span>Start Conversation</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/40">
            {isLoadingSession && !session ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2 py-12">
                <RefreshCw size={20} className="animate-spin text-indigo-500" />
                <span className="text-xs font-medium">Connecting to {site.name} Service Desk...</span>
              </div>
            ) : (
              <>
                {(session?.messages || []).map((msg: ServiceDeskMessage) => (
                  <ServiceDeskMessageBubble
                    key={msg.id}
                    message={msg}
                    viewMode="VISITOR"
                    onVisitorCardAction={(actionType, data) =>
                      handleCardAction(msg.id, actionType, data)
                    }
                  />
                ))}

                {isSending && (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 pl-2 py-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:300ms]" />
                    </div>
                    <span className="text-[11px]">
                      {session?.assignedOwnerType === 'HUMAN'
                        ? `${session.assignedOwnerName || 'Specialist'} is responding...`
                        : 'Searching knowledge base & records...'}
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick Task Action Pills */}
          {quickActions.length > 0 && (
            <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={isSending}
                    onClick={() => handleSendMessage(action.prompt, action.handoff)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-indigo-50 dark:bg-zinc-800 dark:hover:bg-indigo-950/50 text-zinc-700 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 border border-zinc-200/70 dark:border-zinc-700 text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    <Icon size={11} />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Ask ${site.name} anything or request a task...`}
              className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              style={{ backgroundColor: accentColor }}
              className="p-2.5 rounded-xl text-white disabled:opacity-40 hover:opacity-95 transition-opacity cursor-pointer shrink-0 shadow-xs"
              title="Send message"
            >
              <Send size={14} />
            </button>
          </form>
        </>
      )}
    </div>
  );

  // Mode 1: Inline Embedded Page Widget ('live_chat' / 'chat_thread')
  if (mode === 'inline') {
    return (
      <div className="w-full h-[540px] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden bg-white dark:bg-zinc-900">
        {renderChatContent()}
      </div>
    );
  }

  // Mode 2: Floating Site-Wide Bubble & Expandable Window
  if (chatConfig.enabled === false) return null;

  const positionClasses =
    chatConfig.launcherPosition === 'bottom_left' ? 'left-6' : 'right-6';

  return (
    <div className={cn('fixed bottom-6 z-50 flex flex-col items-end', positionClasses)}>
      {/* Expanded / Normal Chat Window */}
      {isOpen && (
        <div
          className={cn(
            'mb-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden bg-white dark:bg-zinc-900 transition-all duration-200',
            windowSize === 'expanded'
              ? 'w-[92vw] sm:w-[640px] h-[82vh] max-h-[760px]'
              : 'w-[90vw] sm:w-[400px] h-[580px] max-h-[80vh]'
          )}
        >
          {renderChatContent()}
        </div>
      )}

      {/* Proactive Greeting Bubble */}
      {!isOpen && proactivePrompt && !proactiveDismissed && (
        <div className="mb-3 max-w-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div
            style={{ backgroundColor: accentColor }}
            className="w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 mt-0.5"
          >
            <Sparkles size={15} />
          </div>
          <div
            onClick={() => {
              setProactiveDismissed(true);
              setIsOpen(true);
            }}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <div className="text-[11px] font-bold text-zinc-900 dark:text-white flex items-center gap-1">
              <span>{site.name} Assistant</span>
              <ChevronRight size={12} className="text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mt-0.5">
              {proactivePrompt}
            </p>
          </div>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setProactiveDismissed(true);
            }}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Floating Launcher Pill / Button */}
      <button
        type="button"
        onClick={() => {
          setProactiveDismissed(true);
          setIsOpen(prev => !prev);
        }}
        style={{ backgroundColor: accentColor }}
        className="h-14 px-5 rounded-full text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5 cursor-pointer"
      >
        {isOpen ? (
          <>
            <Minus size={18} />
            <span className="text-xs font-bold tracking-wide">Minimize</span>
          </>
        ) : (
          <>
            <MessageSquare size={19} className="fill-white/20" />
            <span className="text-xs font-bold tracking-wide">
              {chatConfig.launcherLabel || 'Chat with us'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          </>
        )}
      </button>
    </div>
  );
};
