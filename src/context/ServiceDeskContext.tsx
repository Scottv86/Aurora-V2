import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import {
  ServiceDeskSession,
  ServiceDeskMessage,
  ServiceDeskWallboardMetrics,
  ServiceDeskOperatorStatus,
  ServiceDeskVoiceCallState,
  ServiceDeskCardPayload,
  ServiceDeskMessageType,
  ServiceDeskWrapUpPayload,
  ServiceDeskWrapUpSuggestion
} from '../types/serviceDesk';
import { ServiceDeskService, ServiceDeskWorkforceRoster } from '../services/serviceDeskService';
import { useAuth } from '../hooks/useAuth';
import { usePlatform } from '../hooks/usePlatform';
import { useDigitalTwin } from './DigitalTwinContext';
import { TwinPresenceStatus } from '../types/twin';
import { toast } from 'sonner';
import { playChatNotificationSound } from '../lib/audioNotification';

export interface DockedHeadState {
  sessionId: string;
  minimized: boolean;
}

interface ServiceDeskContextType {
  sessions: ServiceDeskSession[];
  activeSessionId: string | null;
  activeSession: ServiceDeskSession | null;
  setActiveSessionId: (id: string | null) => void;
  workforce: ServiceDeskWorkforceRoster;
  metrics: ServiceDeskWallboardMetrics;
  operatorStatus: ServiceDeskOperatorStatus;
  updateOperatorStatus: (status: ServiceDeskOperatorStatus) => Promise<void>;
  profilePresenceStatus: TwinPresenceStatus;
  setProfilePresenceStatus: (status: TwinPresenceStatus) => Promise<void>;
  isQueuePaused: boolean;
  isQueueActive: boolean;
  toggleQueuePaused: () => Promise<void>;
  activeWrapUpSessionId: string | null;
  wrapUpSession: ServiceDeskSession | null;
  acwSeconds: number;
  openWrapUpModal: (sessionId: string) => void;
  closeWrapUpModal: () => void;
  suggestWrapUp: (sessionId: string) => Promise<ServiceDeskWrapUpSuggestion>;
  addWrapUpCode: (params: {
    type: 'OUTCOME' | 'TOPIC';
    label: string;
    category?: string;
    subtopic?: string;
    isFcrEligible?: boolean;
  }) => Promise<void>;
  dockedHeads: DockedHeadState[];
  openInFacebookHead: (sessionId: string) => void;
  toggleMinimizeFacebookHead: (sessionId: string) => void;
  closeFacebookHead: (sessionId: string) => void;
  activeVoiceCall: ServiceDeskVoiceCallState | null;
  answerVoiceCall: (session: ServiceDeskSession) => void;
  toggleVoiceMute: () => void;
  toggleVoiceHold: () => void;
  endVoiceCall: () => void;
  createSession: (params: {
    siteId?: string;
    channelType?: 'SITE_CHAT' | 'VOICE_CALL';
    visitorName: string;
    visitorEmail?: string;
    visitorPhone?: string;
    partyId?: string;
    initialMessage?: string;
    allocationMode?: 'AI_FIRST' | 'HUMAN_FIRST' | 'TRIAGE_AGENT' | 'DIRECT_OWNER';
    targetAssigneeType?: 'AI_AGENT' | 'HUMAN_USER';
    targetAgentId?: string;
    targetMemberId?: string;
    targetTeamId?: string;
    targetQueueId?: string;
    targetQueueName?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }) => Promise<ServiceDeskSession>;
  deleteSession: (sessionId: string) => Promise<void>;
  simulateInboundVoiceCall: (params?: {
    callerName?: string;
    callerNumber?: string;
    callerEmail?: string;
    partyId?: string;
    queueName?: string;
    ivrSummary?: string;
  }) => Promise<ServiceDeskSession>;
  allocateSession: (
    sessionId: string,
    allocation: {
      targetAssigneeType: 'AI_AGENT' | 'HUMAN_USER' | 'TEAM_ROUND_ROBIN' | 'QUEUE';
      targetMemberId?: string;
      targetMemberName?: string;
      targetAgentId?: string;
      targetAgentName?: string;
      targetTeamId?: string;
      targetTeamName?: string;
      targetQueueId?: string;
      targetQueueName?: string;
      handoverNote?: string;
    }
  ) => Promise<ServiceDeskSession>;
  sendMessage: (
    sessionId: string,
    payload: {
      senderType?: 'VISITOR' | 'HUMAN_AGENT' | 'AI_AGENT' | 'INTERNAL_WHISPER';
      content: string;
      messageType?: ServiceDeskMessageType;
      payload?: ServiceDeskCardPayload;
      triggerAiResponse?: boolean;
    }
  ) => Promise<void>;
  decideHitlApproval: (sessionId: string, decision: 'APPROVED' | 'REJECTED', note?: string) => Promise<void>;
  linkOrCreateRecord: (
    sessionId: string,
    params: {
      mode: 'LINK_EXISTING' | 'CREATE_NEW';
      moduleId: string;
      moduleName?: string;
      recordId?: string;
      recordKey?: string;
      title: string;
      status?: string;
      newRecordData?: Record<string, any>;
      shareCardInChat?: boolean;
    }
  ) => Promise<void>;
  resolveOrReopenSession: (
    sessionId: string,
    status: 'RESOLVED' | 'ACTIVE_AI' | 'ASSIGNED_HUMAN',
    options?: ServiceDeskWrapUpPayload
  ) => Promise<void>;
  totalOperatorUnread: number;
  urgentAttentionCount: number;
  isLoading: boolean;
  refreshServiceDesk: () => Promise<void>;
  currentOperatorId: string;
  currentOperatorName: string;
}

const ServiceDeskContext = createContext<ServiceDeskContextType | undefined>(undefined);

const DEFAULT_METRICS: ServiceDeskWallboardMetrics = {
  totalActiveSessions: 0,
  activeAiSessions: 0,
  queuedForHuman: 0,
  assignedToHuman: 0,
  awaitingHitlApproval: 0,
  activeVoiceCalls: 0,
  resolvedToday: 0,
  aiDeflectionRate: 0,
  avgFirstResponseSeconds: 0,
  slaComplianceRate: 0,
  avgCsatScore: 0
};

const DEFAULT_WORKFORCE: ServiceDeskWorkforceRoster = {
  humanOperators: [],
  aiAgents: [],
  teams: [],
  queues: [],
  sites: [],
  forms: [],
  modules: [],
  invoices: [],
  kbArticles: [],
  parties: []
};

export const ServiceDeskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const { tenant, user: platformUser } = usePlatform();
  const { presenceStatus: profilePresenceStatus, setPresenceStatus: setProfilePresenceStatus } = useDigitalTwin();
  const token = session?.access_token || (import.meta as any).env.VITE_DEV_TOKEN;

  const [sessions, setSessions] = useState<ServiceDeskSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [workforce, setWorkforce] = useState<ServiceDeskWorkforceRoster>(DEFAULT_WORKFORCE);
  const [metrics, setMetrics] = useState<ServiceDeskWallboardMetrics>(DEFAULT_METRICS);
  const [isQueuePaused, setIsQueuePaused] = useState<boolean>(() => {
    return localStorage.getItem('aurora_service_desk_queue_paused') === 'true';
  });
  const [activeWrapUpSessionId, setActiveWrapUpSessionId] = useState<string | null>(null);
  const [acwSeconds, setAcwSeconds] = useState<number>(0);
  const [operatorStatus, setOperatorStatus] = useState<ServiceDeskOperatorStatus>(() => {
    return (localStorage.getItem('aurora_service_desk_operator_status') as ServiceDeskOperatorStatus) || 'AVAILABLE';
  });
  const [dockedHeads, setDockedHeads] = useState<DockedHeadState[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_service_desk_heads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeVoiceCall, setActiveVoiceCall] = useState<ServiceDeskVoiceCallState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const currentOperatorId =
    platformUser?.memberId || platformUser?.id || user?.id || 'operator-default';
  const currentOperatorName = useMemo(() => {
    if (platformUser?.firstName && ((platformUser as any)?.lastName || (platformUser as any)?.familyName)) {
      return `${platformUser.firstName} ${(platformUser as any).lastName || (platformUser as any).familyName}`;
    }
    return (
      platformUser?.name ||
      platformUser?.firstName ||
      (user?.user_metadata as any)?.full_name ||
      user?.email?.split('@')[0] ||
      'Operator'
    );
  }, [platformUser, user]);

  useEffect(() => {
    try {
      localStorage.setItem('aurora_service_desk_heads', JSON.stringify(dockedHeads));
    } catch {}
  }, [dockedHeads]);

  const refreshServiceDesk = useCallback(async () => {
    try {
      const [sessionData, rosterData] = await Promise.all([
        ServiceDeskService.getSessions(undefined, tenant?.id),
        ServiceDeskService.getWorkforceRoster(tenant?.id)
      ]);
      setSessions(sessionData.sessions);
      setMetrics(sessionData.metrics);
      setWorkforce(rosterData);

      setActiveSessionId(prev => {
        if (prev && sessionData.sessions.some(s => s.id === prev)) return prev;
        return sessionData.sessions[0]?.id || null;
      });

      setDockedHeads(prev => {
        const validPrev = prev.filter(h => sessionData.sessions.some(s => s.id === h.sessionId));
        if (validPrev.length > 0) return validPrev;
        return sessionData.sessions
          .filter(s => s.status !== 'RESOLVED' && s.status !== 'ARCHIVED')
          .slice(0, 2)
          .map((s, idx) => ({ sessionId: s.id, minimized: idx > 0 }));
      });
    } catch (err) {
      console.error('[ServiceDeskContext] Refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    refreshServiceDesk();
  }, [refreshServiceDesk]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('aurora_service_desk_sync');
    broadcastRef.current = channel;

    channel.onmessage = event => {
      const { type, payload } = event.data || {};
      if (type === 'SESSION_UPDATED' && payload) {
        setSessions(prev => {
          const exists = prev.some(s => s.id === payload.id);
          return exists ? prev.map(s => (s.id === payload.id ? payload : s)) : [payload, ...prev];
        });
      } else if (type === 'SESSION_DELETED' && payload?.id) {
        setSessions(prev => prev.filter(s => s.id !== payload.id));
      } else if (type === 'OPERATOR_STATUS' && payload) {
        setOperatorStatus(payload);
      }
    };

    return () => {
      channel.close();
      broadcastRef.current = null;
    };
  }, []);

  const broadcastSync = useCallback((type: string, payload: any) => {
    try {
      broadcastRef.current?.postMessage({ type, payload });
    } catch {}
  }, []);

  useEffect(() => {
    if (!token || !tenant?.id) return;

    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_tenant', tenant.id);
    });

    socket.on('service_desk:session_created', (newSession: ServiceDeskSession) => {
      setSessions(prev => {
        if (prev.some(s => s.id === newSession.id)) return prev;
        return [newSession, ...prev];
      });
      setActiveSessionId(prev => prev || newSession.id);
      playChatNotificationSound();
      toast.info(
        `New ${newSession.channelType === 'VOICE_CALL' ? 'Voice Call' : 'Site Chat'}: ${newSession.visitorName}`,
        {
          description: newSession.lastMessagePreview || newSession.siteName
        }
      );
    });

    socket.on('service_desk:session_updated', (updated: ServiceDeskSession) => {
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    });

    socket.on('service_desk:session_deleted', (data: { id: string }) => {
      setSessions(prev => prev.filter(s => s.id !== data.id));
    });

    socket.on(
      'service_desk:message',
      (data: { sessionId: string; message: ServiceDeskMessage; session?: ServiceDeskSession }) => {
        if (data.session) {
          setSessions(prev => {
            const exists = prev.some(s => s.id === data.session!.id);
            return exists ? prev.map(s => (s.id === data.session!.id ? data.session! : s)) : [data.session!, ...prev];
          });
        } else if (data.message) {
          setSessions(prev =>
            prev.map(s =>
              s.id === data.sessionId
                ? {
                    ...s,
                    messages: [...(s.messages || []).filter(m => m.id !== data.message.id), data.message],
                    lastMessageAt: data.message.createdAt,
                    lastMessagePreview: data.message.content
                  }
                : s
            )
          );
        }

        if (data.message?.senderType === 'VISITOR') {
          playChatNotificationSound();
        }
      }
    );

    socket.on('service_desk:allocation_changed', (data: { session: ServiceDeskSession }) => {
      if (data.session) {
        setSessions(prev => prev.map(s => (s.id === data.session.id ? data.session : s)));
      }
    });

    socket.on('service_desk:hitl_resolved', (data: { session: ServiceDeskSession }) => {
      if (data.session) {
        setSessions(prev => prev.map(s => (s.id === data.session.id ? data.session : s)));
      }
    });

    socket.on('service_desk:ai_whisper_suggestion', (data: { sessionId: string; suggestedReply: string }) => {
      setSessions(prev =>
        prev.map(s => (s.id === data.sessionId ? { ...s, aiSuggestedReply: data.suggestedReply } : s))
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, tenant?.id]);

  useEffect(() => {
    if (!activeVoiceCall || activeVoiceCall.status === 'WRAP_UP') return;
    const interval = setInterval(() => {
      setActiveVoiceCall(prev => (prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeVoiceCall?.status]);

  // Live ACW (After-Call / After-Interaction Work) timer while Wrap-Up Modal is open
  useEffect(() => {
    if (!activeWrapUpSessionId) {
      setAcwSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setAcwSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWrapUpSessionId]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  const wrapUpSession = useMemo(() => {
    if (!activeWrapUpSessionId) return null;
    return sessions.find(s => s.id === activeWrapUpSessionId) || null;
  }, [sessions, activeWrapUpSessionId]);

  const isQueueActive = useMemo(() => {
    return (
      profilePresenceStatus === 'AVAILABLE' &&
      !isQueuePaused &&
      !activeVoiceCall &&
      !activeWrapUpSessionId
    );
  }, [profilePresenceStatus, isQueuePaused, activeVoiceCall, activeWrapUpSessionId]);

  // Automatically synchronize derived Service Desk Operator Status with User Profile Presence & Queue state
  useEffect(() => {
    let derived: ServiceDeskOperatorStatus = 'AVAILABLE';
    if (activeVoiceCall) {
      derived = 'ON_CALL';
    } else if (activeWrapUpSessionId) {
      derived = 'WRAP_UP';
    } else if (profilePresenceStatus === 'AWAY_TWIN' || profilePresenceStatus === 'NIGHT_SHIFT') {
      derived = 'AWAY_TWIN';
    } else if (profilePresenceStatus === 'OFFLINE') {
      derived = 'OFFLINE';
    } else if (profilePresenceStatus === 'DND_INTERCEPT' || isQueuePaused) {
      derived = 'BUSY_CHAT';
    } else {
      derived = 'AVAILABLE';
    }

    if (derived !== operatorStatus) {
      setOperatorStatus(derived);
      localStorage.setItem('aurora_service_desk_operator_status', derived);
      ServiceDeskService.updateOperatorPresence(derived, currentOperatorId, currentOperatorName).catch(() => {});
    }
  }, [
    profilePresenceStatus,
    isQueuePaused,
    activeVoiceCall,
    activeWrapUpSessionId,
    operatorStatus,
    currentOperatorId,
    currentOperatorName
  ]);

  const totalOperatorUnread = useMemo(() => {
    return sessions
      .filter(s => s.status !== 'RESOLVED' && s.status !== 'ARCHIVED')
      .reduce((sum, s) => sum + (s.unreadByOperator || 0), 0);
  }, [sessions]);

  const urgentAttentionCount = useMemo(() => {
    return sessions.filter(
      s => s.status === 'AWAITING_HITL_APPROVAL' || s.status === 'QUEUED_FOR_HUMAN'
    ).length;
  }, [sessions]);

  const toggleQueuePaused = useCallback(async () => {
    if (profilePresenceStatus !== 'AVAILABLE') {
      await setProfilePresenceStatus('AVAILABLE');
      setIsQueuePaused(false);
      localStorage.setItem('aurora_service_desk_queue_paused', 'false');
      toast.success('Profile set to Available & Service Desk Queue Active');
      return;
    }
    const nextPaused = !isQueuePaused;
    setIsQueuePaused(nextPaused);
    localStorage.setItem('aurora_service_desk_queue_paused', String(nextPaused));
    toast.success(nextPaused ? 'Service Desk Queue Paused (Focus Mode)' : 'Service Desk Queue Active');
  }, [profilePresenceStatus, setProfilePresenceStatus, isQueuePaused]);

  const openWrapUpModal = useCallback((sessionId: string) => {
    setAcwSeconds(0);
    setActiveWrapUpSessionId(sessionId);
  }, []);

  const closeWrapUpModal = useCallback(() => {
    setActiveWrapUpSessionId(null);
    setAcwSeconds(0);
  }, []);

  const suggestWrapUp = useCallback(async (sessionId: string) => {
    return await ServiceDeskService.suggestWrapUp(sessionId);
  }, []);

  const addWrapUpCode = useCallback(
    async (params: {
      type: 'OUTCOME' | 'TOPIC';
      label: string;
      category?: string;
      subtopic?: string;
      isFcrEligible?: boolean;
    }) => {
      const res = await ServiceDeskService.addWrapUpCode(params);
      setWorkforce(prev => ({
        ...prev,
        wrapUpOutcomes: res.wrapUpOutcomes,
        wrapUpTopics: res.wrapUpTopics
      }));
      toast.success(`Added "${params.label}" to Global Lists`);
    },
    []
  );

  const updateOperatorStatus = useCallback(
    async (status: ServiceDeskOperatorStatus) => {
      setOperatorStatus(status);
      localStorage.setItem('aurora_service_desk_operator_status', status);
      broadcastSync('OPERATOR_STATUS', status);
      if (status === 'AVAILABLE') {
        setIsQueuePaused(false);
        localStorage.setItem('aurora_service_desk_queue_paused', 'false');
        if (profilePresenceStatus !== 'AVAILABLE') {
          await setProfilePresenceStatus('AVAILABLE');
        }
      } else if (status === 'AWAY_TWIN') {
        await setProfilePresenceStatus('AWAY_TWIN');
      } else if (status === 'OFFLINE') {
        await setProfilePresenceStatus('OFFLINE');
      } else if (status === 'BUSY_CHAT') {
        setIsQueuePaused(true);
        localStorage.setItem('aurora_service_desk_queue_paused', 'true');
      }
      await ServiceDeskService.updateOperatorPresence(status, currentOperatorId, currentOperatorName);
    },
    [currentOperatorId, currentOperatorName, broadcastSync, profilePresenceStatus, setProfilePresenceStatus]
  );

  const openInFacebookHead = useCallback((sessionId: string) => {
    setDockedHeads(prev => {
      const existing = prev.find(h => h.sessionId === sessionId);
      if (existing) {
        return prev.map(h => (h.sessionId === sessionId ? { ...h, minimized: false } : h));
      }
      return [{ sessionId, minimized: false }, ...prev].slice(0, 3);
    });
    setActiveSessionId(sessionId);
  }, []);

  const toggleMinimizeFacebookHead = useCallback((sessionId: string) => {
    setDockedHeads(prev =>
      prev.map(h => (h.sessionId === sessionId ? { ...h, minimized: !h.minimized } : h))
    );
  }, []);

  const closeFacebookHead = useCallback((sessionId: string) => {
    setDockedHeads(prev => prev.filter(h => h.sessionId !== sessionId));
  }, []);

  const answerVoiceCall = useCallback(
    (sessionItem: ServiceDeskSession) => {
      setActiveSessionId(sessionItem.id);
      openInFacebookHead(sessionItem.id);
      setOperatorStatus('ON_CALL');
      setActiveVoiceCall({
        sessionId: sessionItem.id,
        callerName: sessionItem.visitorName,
        callerNumber: sessionItem.visitorPhone || 'Direct Line',
        siteOrLineName: sessionItem.siteName || 'Voice Line',
        queueName: sessionItem.allocatedTeamName || 'Voice Queue',
        status: 'CONNECTED_HUMAN',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        isMuted: false,
        isOnHold: false,
        isRecording: true,
        liveTranscript: [
          {
            speaker: 'AI_IVR',
            text: sessionItem.aiSummary || 'Call connected to operator.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      });

      ServiceDeskService.allocateSession(sessionItem.id, {
        targetAssigneeType: 'HUMAN_USER',
        targetMemberId: currentOperatorId,
        targetMemberName: currentOperatorName,
        handoverNote: 'Answered voice call'
      }).then(updated => {
        setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
        broadcastSync('SESSION_UPDATED', updated);
      });
    },
    [currentOperatorId, currentOperatorName, openInFacebookHead, broadcastSync]
  );

  const toggleVoiceMute = useCallback(() => {
    setActiveVoiceCall(prev => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  }, []);

  const toggleVoiceHold = useCallback(() => {
    setActiveVoiceCall(prev =>
      prev
        ? {
            ...prev,
            isOnHold: !prev.isOnHold,
            status: !prev.isOnHold ? 'ON_HOLD' : 'CONNECTED_HUMAN'
          }
        : null
    );
  }, []);

  const endVoiceCall = useCallback(() => {
    if (!activeVoiceCall) return;
    const endedSessionId = activeVoiceCall.sessionId;
    const duration = activeVoiceCall.durationSeconds;
    setActiveVoiceCall(null);
    setAcwSeconds(0);
    setActiveWrapUpSessionId(endedSessionId);

    ServiceDeskService.sendMessage(endedSessionId, {
      senderType: 'HUMAN_AGENT',
      senderName: currentOperatorName,
      content: `Call completed (Duration: **${Math.floor(duration / 60)}m ${duration % 60}s**). Entering Wrap-Up.`,
      messageType: 'CALL_EVENT',
      payload: {
        callEventType: 'CALL_ENDED',
        callDurationSeconds: duration
      }
    }).then(({ session: updated }) => {
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      broadcastSync('SESSION_UPDATED', updated);
    });
  }, [activeVoiceCall, currentOperatorName, broadcastSync]);

  const createSession = useCallback(
    async (params: {
      siteId?: string;
      channelType?: 'SITE_CHAT' | 'VOICE_CALL';
      visitorName: string;
      visitorEmail?: string;
      visitorPhone?: string;
      partyId?: string;
      initialMessage?: string;
      allocationMode?: 'AI_FIRST' | 'HUMAN_FIRST' | 'TRIAGE_AGENT' | 'DIRECT_OWNER';
      targetAssigneeType?: 'AI_AGENT' | 'HUMAN_USER';
      targetAgentId?: string;
      targetMemberId?: string;
      targetTeamId?: string;
      targetQueueId?: string;
      targetQueueName?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    }) => {
      const created = await ServiceDeskService.createSession(params, tenant?.id);
      setSessions(prev => [created, ...prev.filter(s => s.id !== created.id)]);
      setActiveSessionId(created.id);
      broadcastSync('SESSION_UPDATED', created);
      await refreshServiceDesk();
      return created;
    },
    [tenant?.id, broadcastSync, refreshServiceDesk]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await ServiceDeskService.deleteSession(sessionId, tenant?.id);
      setSessions(prev => {
        const remaining = prev.filter(s => s.id !== sessionId);
        if (activeSessionId === sessionId) {
          setActiveSessionId(remaining[0]?.id || null);
        }
        return remaining;
      });
      closeFacebookHead(sessionId);
      broadcastSync('SESSION_DELETED', { id: sessionId });
      await refreshServiceDesk();
    },
    [tenant?.id, activeSessionId, closeFacebookHead, broadcastSync, refreshServiceDesk]
  );

  const simulateInboundVoiceCall = useCallback(
    async (params?: {
      callerName?: string;
      callerNumber?: string;
      callerEmail?: string;
      partyId?: string;
      queueName?: string;
      ivrSummary?: string;
    }) => {
      const created = await ServiceDeskService.simulateInboundVoiceCall(params);
      setSessions(prev => [created, ...prev.filter(s => s.id !== created.id)]);
      setActiveSessionId(created.id);
      openInFacebookHead(created.id);
      playChatNotificationSound();
      await refreshServiceDesk();
      return created;
    },
    [openInFacebookHead, refreshServiceDesk]
  );

  const allocateSession = useCallback(
    async (
      sessionId: string,
      allocation: {
        targetAssigneeType: 'AI_AGENT' | 'HUMAN_USER' | 'TEAM_ROUND_ROBIN' | 'QUEUE';
        targetMemberId?: string;
        targetMemberName?: string;
        targetAgentId?: string;
        targetAgentName?: string;
        targetTeamId?: string;
        targetTeamName?: string;
        targetQueueId?: string;
        targetQueueName?: string;
        handoverNote?: string;
      }
    ) => {
      const updated = await ServiceDeskService.allocateSession(sessionId, allocation);
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      broadcastSync('SESSION_UPDATED', updated);
      toast.success(
        allocation.targetAssigneeType === 'AI_AGENT'
          ? `Assigned to ${updated.allocatedAgentName}`
          : `Assigned to ${updated.allocatedMemberName || updated.allocatedTeamName || 'Queue'}`
      );
      return updated;
    },
    [broadcastSync]
  );

  const sendMessage = useCallback(
    async (
      sessionId: string,
      payload: {
        senderType?: 'VISITOR' | 'HUMAN_AGENT' | 'AI_AGENT' | 'INTERNAL_WHISPER';
        content: string;
        messageType?: ServiceDeskMessageType;
        payload?: ServiceDeskCardPayload;
        triggerAiResponse?: boolean;
      }
    ) => {
      const { session: updated } = await ServiceDeskService.sendMessage(sessionId, {
        ...payload,
        senderId: currentOperatorId,
        senderName: currentOperatorName,
        senderRole: 'Operator'
      });
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      broadcastSync('SESSION_UPDATED', updated);
    },
    [currentOperatorId, currentOperatorName, broadcastSync]
  );

  const decideHitlApproval = useCallback(
    async (sessionId: string, decision: 'APPROVED' | 'REJECTED', note?: string) => {
      const { session: updated } = await ServiceDeskService.decideHitlApproval(
        sessionId,
        decision,
        currentOperatorName,
        note
      );
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      broadcastSync('SESSION_UPDATED', updated);
      toast.success(decision === 'APPROVED' ? 'Action approved' : 'Action declined');
    },
    [currentOperatorName, broadcastSync]
  );

  const linkOrCreateRecord = useCallback(
    async (
      sessionId: string,
      params: {
        mode: 'LINK_EXISTING' | 'CREATE_NEW';
        moduleId: string;
        moduleName?: string;
        recordId?: string;
        recordKey?: string;
        title: string;
        status?: string;
        newRecordData?: Record<string, any>;
        shareCardInChat?: boolean;
      }
    ) => {
      const { session: updated, linkedRecord } = await ServiceDeskService.linkOrCreateRecord(sessionId, params);
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      broadcastSync('SESSION_UPDATED', updated);
      toast.success(`Record ${linkedRecord.recordKey} linked`);
    },
    [broadcastSync]
  );

  const resolveOrReopenSession = useCallback(
    async (
      sessionId: string,
      status: 'RESOLVED' | 'ACTIVE_AI' | 'ASSIGNED_HUMAN',
      options?: ServiceDeskWrapUpPayload
    ) => {
      const updated = await ServiceDeskService.resolveOrReopenSession(sessionId, status, {
        ...options,
        wrappedUpByType: options?.wrappedUpByType || 'HUMAN_AGENT',
        wrappedUpById: options?.wrappedUpById || currentOperatorId,
        wrappedUpByName: options?.wrappedUpByName || currentOperatorName,
        acwDurationSeconds: options?.acwDurationSeconds ?? acwSeconds
      });
      setSessions(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      broadcastSync('SESSION_UPDATED', updated);
      if (activeWrapUpSessionId === sessionId) {
        setActiveWrapUpSessionId(null);
        setAcwSeconds(0);
      }
      await refreshServiceDesk();
      toast.success(
        status === 'RESOLVED'
          ? `Interaction closed${options?.wrapUpOutcome ? ` (${options.wrapUpOutcome})` : ''}`
          : 'Conversation reopened'
      );
    },
    [broadcastSync, currentOperatorId, currentOperatorName, acwSeconds, activeWrapUpSessionId, refreshServiceDesk]
  );

  const value = useMemo(
    () => ({
      sessions,
      activeSessionId,
      activeSession,
      setActiveSessionId,
      workforce,
      metrics,
      operatorStatus,
      updateOperatorStatus,
      profilePresenceStatus,
      setProfilePresenceStatus,
      isQueuePaused,
      isQueueActive,
      toggleQueuePaused,
      activeWrapUpSessionId,
      wrapUpSession,
      acwSeconds,
      openWrapUpModal,
      closeWrapUpModal,
      suggestWrapUp,
      addWrapUpCode,
      dockedHeads,
      openInFacebookHead,
      toggleMinimizeFacebookHead,
      closeFacebookHead,
      activeVoiceCall,
      answerVoiceCall,
      toggleVoiceMute,
      toggleVoiceHold,
      endVoiceCall,
      createSession,
      deleteSession,
      simulateInboundVoiceCall,
      allocateSession,
      sendMessage,
      decideHitlApproval,
      linkOrCreateRecord,
      resolveOrReopenSession,
      totalOperatorUnread,
      urgentAttentionCount,
      isLoading,
      refreshServiceDesk,
      currentOperatorId,
      currentOperatorName
    }),
    [
      sessions,
      activeSessionId,
      activeSession,
      workforce,
      metrics,
      operatorStatus,
      updateOperatorStatus,
      profilePresenceStatus,
      setProfilePresenceStatus,
      isQueuePaused,
      isQueueActive,
      toggleQueuePaused,
      activeWrapUpSessionId,
      wrapUpSession,
      acwSeconds,
      openWrapUpModal,
      closeWrapUpModal,
      suggestWrapUp,
      addWrapUpCode,
      dockedHeads,
      openInFacebookHead,
      toggleMinimizeFacebookHead,
      closeFacebookHead,
      activeVoiceCall,
      answerVoiceCall,
      toggleVoiceMute,
      toggleVoiceHold,
      endVoiceCall,
      createSession,
      deleteSession,
      simulateInboundVoiceCall,
      allocateSession,
      sendMessage,
      decideHitlApproval,
      linkOrCreateRecord,
      resolveOrReopenSession,
      totalOperatorUnread,
      urgentAttentionCount,
      isLoading,
      refreshServiceDesk,
      currentOperatorId,
      currentOperatorName
    ]
  );

  return <ServiceDeskContext.Provider value={value}>{children}</ServiceDeskContext.Provider>;
};

export const useServiceDesk = () => {
  const context = useContext(ServiceDeskContext);
  if (!context) {
    throw new Error('useServiceDesk must be used within a ServiceDeskProvider');
  }
  return context;
};
