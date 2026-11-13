import {
  ServiceDeskSession,
  ServiceDeskMessage,
  ServiceDeskWallboardMetrics,
  ServiceDeskOperatorStatus,
  ServiceDeskCardPayload,
  ServiceDeskMessageType,
  ServiceDeskWrapUpCodeItem,
  ServiceDeskWrapUpPayload,
  ServiceDeskWrapUpSuggestion,
  SiteChatConfig,
  DEFAULT_SITE_CHAT_CONFIG,
  ServiceDeskTenantSettings,
  DEFAULT_SERVICE_DESK_TENANT_SETTINGS
} from '../types/serviceDesk';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return '/api';
  }
  return '/api';
};

const getAuthHeaders = (tenantIdOverride?: string): Record<string, string> => {
  const token = localStorage.getItem('aurora_auth_token') || '';
  const tenantId = tenantIdOverride || localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-tenant-id': tenantId
  };
};

// Clear any legacy v1 demo seed keys from localStorage on module load
if (typeof window !== 'undefined') {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('aurora_service_desk_sessions_v1')) {
        localStorage.removeItem(key);
      }
    });
  } catch (_e) {}
}

export interface ServiceDeskWorkforceRoster {
  humanOperators: Array<{
    id: string;
    userId?: string;
    name: string;
    email?: string;
    roleTitle: string;
    avatarUrl?: string;
    status: ServiceDeskOperatorStatus;
    activeChatCount: number;
    maxConcurrentChats: number;
    teams: Array<{ id: string; name: string }>;
  }>;
  aiAgents: Array<{
    id: string;
    name: string;
    roleTitle: string;
    modelType: string;
    avatarUrl?: string | null;
    status: string;
  }>;
  teams: Array<{ id: string; name: string; description?: string }>;
  queues: Array<{
    id: string;
    name: string;
    slug?: string;
    description?: string;
    iconName?: string;
    status?: string;
    queueConfig?: {
      slaMinutes?: number;
      priority?: string;
      targetAssigneeType?: string;
      [key: string]: any;
    };
  }>;
  sites: Array<{ id: string; name: string; domain: string; category: string }>;
  forms: Array<{
    id: string;
    name: string;
    description?: string;
    moduleId?: string | null;
    fields?: Array<{
      id: string;
      label: string;
      type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date';
      required?: boolean;
      options?: string[];
    }>;
  }>;
  modules: Array<{ id: string; name: string; slug?: string }>;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: string;
  }>;
  kbArticles?: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
  }>;
  parties?: Array<{
    id: string;
    name: string;
    partyType: string;
  }>;
  wrapUpOutcomes?: ServiceDeskWrapUpCodeItem[];
  wrapUpTopics?: ServiceDeskWrapUpCodeItem[];
  outcomeListId?: string | null;
  topicListId?: string | null;
}

const EMPTY_METRICS: ServiceDeskWallboardMetrics = {
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

export const ServiceDeskService = {
  async getSessions(
    filters?: {
      status?: string;
      channelType?: string;
      siteId?: string;
      allocatedAssigneeType?: string;
    },
    tenantIdOverride?: string
  ): Promise<{ sessions: ServiceDeskSession[]; metrics: ServiceDeskWallboardMetrics }> {
    const tenantId = tenantIdOverride || localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    try {
      const url = new URL(`${getApiBaseUrl()}/service-desk/sessions`, window.location.origin);
      if (filters?.status) url.searchParams.set('status', filters.status);
      if (filters?.channelType) url.searchParams.set('channelType', filters.channelType);
      if (filters?.siteId) url.searchParams.set('siteId', filters.siteId);
      if (filters?.allocatedAssigneeType) url.searchParams.set('allocatedAssigneeType', filters.allocatedAssigneeType);

      const res = await fetch(url.toString(), {
        headers: getAuthHeaders(tenantId)
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (_err) {}

    return {
      sessions: [],
      metrics: EMPTY_METRICS
    };
  },

  async createSession(
    params: {
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
    },
    tenantIdOverride?: string
  ): Promise<ServiceDeskSession> {
    const tenantId = tenantIdOverride || localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error('Failed to create Service Desk session');
    }
    return await res.json();
  },

  async deleteSession(sessionId: string, tenantIdOverride?: string): Promise<void> {
    const tenantId = tenantIdOverride || localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    await fetch(`${getApiBaseUrl()}/service-desk/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(tenantId)
    });
  },

  async getWorkforceRoster(tenantIdOverride?: string): Promise<ServiceDeskWorkforceRoster> {
    const tenantId = tenantIdOverride || localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    try {
      const res = await fetch(`${getApiBaseUrl()}/service-desk/workforce`, {
        headers: getAuthHeaders(tenantId)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (_err) {}

    return {
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
  },

  async getSettings(tenantIdOverride?: string): Promise<ServiceDeskTenantSettings> {
    const tenantId = tenantIdOverride || localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    try {
      const res = await fetch(`${getApiBaseUrl()}/service-desk/settings`, {
        headers: getAuthHeaders(tenantId)
      });
      if (!res.ok) return DEFAULT_SERVICE_DESK_TENANT_SETTINGS;
      const data = await res.json();
      return { ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS, ...(data || {}) };
    } catch (_e) {
      return DEFAULT_SERVICE_DESK_TENANT_SETTINGS;
    }
  },

  async updateSettings(settings: Partial<ServiceDeskTenantSettings>, tenantIdOverride?: string): Promise<ServiceDeskTenantSettings> {
    const tenantId = tenantIdOverride || localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      throw new Error('Failed to update Service Desk settings');
    }
    const data = await res.json();
    return { ...DEFAULT_SERVICE_DESK_TENANT_SETTINGS, ...(data || {}) };
  },

  async updateOperatorPresence(
    status: ServiceDeskOperatorStatus,
    memberId?: string,
    memberName?: string
  ): Promise<any> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/service-desk/operators/presence`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, memberId, memberName })
      });
      if (res.ok) return await res.json();
    } catch (_e) {}
    return { status, memberId, memberName };
  },

  async allocateSession(
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
  ): Promise<ServiceDeskSession> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/sessions/${sessionId}/allocate`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(allocation)
    });
    if (!res.ok) {
      throw new Error('Failed to allocate session');
    }
    return await res.json();
  },

  async sendMessage(
    sessionId: string,
    payload: {
      senderType?: 'VISITOR' | 'HUMAN_AGENT' | 'AI_AGENT' | 'INTERNAL_WHISPER';
      senderId?: string;
      senderName?: string;
      senderRole?: string;
      content: string;
      messageType?: ServiceDeskMessageType;
      payload?: ServiceDeskCardPayload;
      triggerAiResponse?: boolean;
    }
  ): Promise<{ message: ServiceDeskMessage; aiMessage?: ServiceDeskMessage; session: ServiceDeskSession }> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error('Failed to send message');
    }
    return await res.json();
  },

  async decideHitlApproval(
    sessionId: string,
    decision: 'APPROVED' | 'REJECTED',
    operatorName?: string,
    note?: string
  ): Promise<{ session: ServiceDeskSession; message: ServiceDeskMessage }> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/sessions/${sessionId}/hitl`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify({ decision, operatorName, note })
    });
    if (!res.ok) {
      throw new Error('Failed to decide HITL approval');
    }
    return await res.json();
  },

  async linkOrCreateRecord(
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
  ): Promise<{ session: ServiceDeskSession; linkedRecord: any }> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/sessions/${sessionId}/link-record`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error('Failed to link or create record');
    }
    return await res.json();
  },

  async resolveOrReopenSession(
    sessionId: string,
    status: 'RESOLVED' | 'ACTIVE_AI' | 'ASSIGNED_HUMAN',
    options?: ServiceDeskWrapUpPayload
  ): Promise<ServiceDeskSession> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/sessions/${sessionId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify({ status, ...(options || {}) })
    });
    if (!res.ok) {
      throw new Error('Failed to update session status');
    }
    return await res.json();
  },

  async suggestWrapUp(sessionId: string): Promise<ServiceDeskWrapUpSuggestion> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/sessions/${sessionId}/suggest-wrap-up`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId)
    });
    if (!res.ok) {
      throw new Error('Failed to generate wrap-up suggestion');
    }
    return await res.json();
  },

  async addWrapUpCode(params: {
    type: 'OUTCOME' | 'TOPIC';
    label: string;
    category?: string;
    subtopic?: string;
    isFcrEligible?: boolean;
  }): Promise<{
    wrapUpOutcomes: ServiceDeskWrapUpCodeItem[];
    wrapUpTopics: ServiceDeskWrapUpCodeItem[];
  }> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/wrap-up-codes`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error('Failed to add wrap-up code');
    }
    return await res.json();
  },

  async simulateInboundVoiceCall(params?: {
    callerName?: string;
    callerNumber?: string;
    callerEmail?: string;
    partyId?: string;
    queueName?: string;
    ivrSummary?: string;
  }): Promise<ServiceDeskSession> {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
    const res = await fetch(`${getApiBaseUrl()}/service-desk/voice/simulate-inbound`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(params || {})
    });
    if (!res.ok) {
      throw new Error('Failed to initiate voice call');
    }
    return await res.json();
  },

  async initPublicSiteSession(
    siteId: string,
    visitorToken: string,
    pageSlug: string = '/',
    visitorName?: string,
    visitorEmail?: string
  ): Promise<{ session: ServiceDeskSession; chatConfig: SiteChatConfig }> {
    const url = new URL(`${getApiBaseUrl()}/public/sites/${siteId}/chat/session`, window.location.origin);
    url.searchParams.set('visitorToken', visitorToken);
    url.searchParams.set('pageSlug', pageSlug);
    if (visitorName) url.searchParams.set('visitorName', visitorName);
    if (visitorEmail) url.searchParams.set('visitorEmail', visitorEmail);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error('Failed to initialize site chat session');
    }
    const data = await res.json();
    return {
      session: data.session,
      chatConfig: { ...DEFAULT_SITE_CHAT_CONFIG, ...(data.chatConfig || {}) }
    };
  },

  async sendPublicSiteMessage(
    siteId: string,
    params: {
      sessionId?: string;
      visitorToken: string;
      message: string;
      senderName?: string;
      senderEmail?: string;
      currentPageSlug?: string;
    }
  ): Promise<{
    session: ServiceDeskSession;
    visitorMessage: ServiceDeskMessage;
    aiMessage?: ServiceDeskMessage;
    reply: string;
    sender: string;
  }> {
    const res = await fetch(`${getApiBaseUrl()}/public/sites/${siteId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error('Failed to send message');
    }
    return await res.json();
  },

  async executePublicCardAction(
    siteId: string,
    params: {
      sessionId: string;
      messageId: string;
      actionType: 'SUBMIT_FORM' | 'CONFIRM_BOOKING' | 'COMPLETE_PAYMENT';
      data?: Record<string, any>;
    }
  ): Promise<{ session: ServiceDeskSession; message: ServiceDeskMessage }> {
    const res = await fetch(`${getApiBaseUrl()}/public/sites/${siteId}/chat/card-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error('Failed to execute card action');
    }
    return await res.json();
  },

  async listQueues(tenantId?: string): Promise<any[]> {
    const res = await fetch(`${getApiBaseUrl()}/queues`, {
      headers: getAuthHeaders(tenantId)
    });
    if (!res.ok) {
      throw new Error('Failed to fetch queues');
    }
    return await res.json();
  },

  async upsertQueue(queueData: any, tenantId?: string): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/queues`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(queueData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save queue');
    }
    return await res.json();
  },

  async deleteQueue(queueId: string, tenantId?: string): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/queues/${queueId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(tenantId)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete queue');
    }
  },

  async getCannedResponses(tenantId?: string): Promise<any[]> {
    const res = await fetch(`${getApiBaseUrl()}/service-desk/canned-responses`, {
      headers: getAuthHeaders(tenantId)
    });
    if (!res.ok) {
      throw new Error('Failed to load canned responses');
    }
    return await res.json();
  },

  async upsertCannedResponse(data: any, tenantId?: string): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/service-desk/canned-responses`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save canned response');
    }
    return await res.json();
  },

  async deleteCannedResponse(id: string, tenantId?: string): Promise<void> {
    const res = await fetch(`${getApiBaseUrl()}/service-desk/canned-responses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(tenantId)
    });
    if (!res.ok) {
      throw new Error('Failed to delete canned response');
    }
  },

  async getFeedbackCases(params?: { status?: string; priority?: string; rootCause?: string }, tenantId?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.rootCause) query.set('rootCause', params.rootCause);

    const res = await fetch(`${getApiBaseUrl()}/service-desk/feedback-cases?${query.toString()}`, {
      headers: getAuthHeaders(tenantId)
    });
    if (!res.ok) {
      throw new Error('Failed to load feedback cases');
    }
    return await res.json();
  },

  async submitFeedback(data: any, tenantId?: string): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/service-desk/feedback-cases`, {
      method: 'POST',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit feedback');
    }
    return await res.json();
  },

  async updateFeedbackCase(id: string, data: any, tenantId?: string): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/service-desk/feedback-cases/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(tenantId),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update feedback case');
    }
    return await res.json();
  },

  async getFeedbackStats(tenantId?: string): Promise<any> {
    const res = await fetch(`${getApiBaseUrl()}/service-desk/feedback-cases/stats`, {
      headers: getAuthHeaders(tenantId)
    });
    if (!res.ok) {
      throw new Error('Failed to load feedback statistics');
    }
    return await res.json();
  }
};
