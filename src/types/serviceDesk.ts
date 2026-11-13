export type ServiceDeskDisplayMode = 'facebook_dock' | 'side_dock' | 'full' | 'new_tab';

export type ServiceDeskChannelType = 'SITE_CHAT' | 'VOICE_CALL';

export type ServiceDeskSessionStatus =
  | 'ACTIVE_AI'
  | 'QUEUED_FOR_HUMAN'
  | 'ASSIGNED_HUMAN'
  | 'AWAITING_HITL_APPROVAL'
  | 'WRAP_UP'
  | 'RESOLVED'
  | 'ARCHIVED';

export type ServiceDeskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ServiceDeskAllocationMode =
  | 'AI_FIRST'
  | 'HUMAN_FIRST'
  | 'TRIAGE_AGENT'
  | 'DIRECT_OWNER';

export type ServiceDeskAssigneeType = 'AI_AGENT' | 'HUMAN_USER' | 'UNASSIGNED';

export type ServiceDeskOperatorStatus =
  | 'AVAILABLE'
  | 'ON_CALL'
  | 'BUSY_CHAT'
  | 'WRAP_UP'
  | 'AWAY_TWIN'
  | 'OFFLINE';

export type ServiceDeskSenderType =
  | 'VISITOR'
  | 'AI_AGENT'
  | 'HUMAN_AGENT'
  | 'SYSTEM'
  | 'INTERNAL_WHISPER';

export type ServiceDeskMessageType =
  | 'TEXT'
  | 'FORM_CARD'
  | 'BOOKING_CARD'
  | 'RECORD_CARD'
  | 'PAYMENT_CARD'
  | 'KB_CITATION'
  | 'HITL_APPROVAL_REQUEST'
  | 'CALL_EVENT'
  | 'DOCUMENT_CARD'
  | 'ATTACHMENT';

export interface SiteProactiveGreetingRule {
  id: string;
  pageSlug: string;
  delaySeconds: number;
  message: string;
  agentId?: string;
  enabled: boolean;
}

export interface SiteChatConfig {
  enabled: boolean;
  widgetTitle: string;
  widgetSubtitle: string;
  displayStyle: 'floating_bubble' | 'inline_only' | 'both';
  position: 'bottom-right' | 'bottom-left';
  allocationMode: ServiceDeskAllocationMode;
  primaryAgentId?: string;
  primaryAgentName?: string;
  specialistAgentIds?: string[];
  fallbackQueueId?: string;
  fallbackQueueName?: string;
  fallbackTeamId?: string;
  fallbackTeamName?: string;
  defaultHumanMemberId?: string;
  defaultHumanMemberName?: string;
  welcomeMessage: string;
  offlineMessage: string;
  slaTargetMinutes: number;
  confidenceEscalationThreshold: number;
  aiWhisperEnabled: boolean;
  proactiveRules: SiteProactiveGreetingRule[];
  preChatCapture: {
    enabled: boolean;
    requireName: boolean;
    requireEmail: boolean;
    requirePhone: boolean;
    customFormId?: string;
  };
  enabledCapabilities: {
    kbSearch: boolean;
    recordLookup: boolean;
    recordCreation: boolean;
    targetIntakeModuleId?: string;
    bookings: boolean;
    bookingResourceId?: string;
    forms: boolean;
    payments: boolean;
    documentGeneration: boolean;
    voiceCallEscalation: boolean;
  };
}

export interface ServiceDeskLinkedRecord {
  moduleId: string;
  moduleName?: string;
  recordId: string;
  recordKey?: string;
  title: string;
  status?: string;
  linkedAt: string;
}

export interface ServiceDeskHitlRequest {
  id: string;
  toolId: string;
  toolName: string;
  toolType: string;
  description: string;
  parameters: Record<string, any>;
  requestedByAgentId: string;
  requestedByAgentName: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedByName?: string;
  decidedAt?: string;
  executionResult?: string;
}

export interface ServiceDeskAiTrace {
  intent?: string;
  confidenceScore?: number;
  ragSources?: Array<{
    id: string;
    title: string;
    category?: string;
    snippet?: string;
  }>;
  companyContextUsed?: string[];
  toolsInvoked?: Array<{
    name: string;
    status: 'SUCCESS' | 'AWAITING_APPROVAL' | 'FAILED';
    summary: string;
  }>;
  memoryRecalled?: string[];
}

export interface ServiceDeskCardPayload {
  // FORM_CARD
  formId?: string;
  formTitle?: string;
  formDescription?: string;
  formFields?: Array<{
    id: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date';
    required?: boolean;
    options?: string[];
  }>;
  submittedData?: Record<string, any>;
  isSubmitted?: boolean;

  // BOOKING_CARD
  bookingResourceId?: string;
  bookingServiceName?: string;
  availableSlots?: Array<{
    id: string;
    date: string;
    time: string;
    durationMinutes: number;
    resourceName: string;
  }>;
  selectedSlot?: {
    id: string;
    date: string;
    time: string;
    resourceName: string;
    confirmationCode?: string;
  };

  // RECORD_CARD
  moduleId?: string;
  moduleName?: string;
  recordId?: string;
  recordKey?: string;
  recordTitle?: string;
  recordStatus?: string;
  recordFields?: Record<string, any>;

  // PAYMENT_CARD
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  paymentDescription?: string;
  paymentStatus?: 'UNPAID' | 'PAID' | 'PROCESSING';
  paymentUrl?: string;

  // KB_CITATION
  articles?: Array<{
    id: string;
    title: string;
    category: string;
    excerpt: string;
  }>;

  // DOCUMENT_CARD
  documentId?: string;
  documentTitle?: string;
  documentType?: string;
  downloadUrl?: string;

  // HITL_APPROVAL_REQUEST
  hitlRequest?: ServiceDeskHitlRequest;

  // CALL_EVENT
  callEventType?: 'INBOUND_RINGING' | 'CALL_CONNECTED' | 'IVR_AI_HANDLED' | 'WARM_TRANSFER' | 'CALL_ENDED' | 'RECORDING_READY';
  callDurationSeconds?: number;
  callerNumber?: string;
  queueName?: string;
  recordingUrl?: string;
}

export interface ServiceDeskMessage {
  id: string;
  sessionId: string;
  tenantId: string;
  senderType: ServiceDeskSenderType;
  senderId?: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  content: string;
  messageType: ServiceDeskMessageType;
  payload?: ServiceDeskCardPayload;
  aiTrace?: ServiceDeskAiTrace;
  isRead: boolean;
  createdAt: string;
}

export interface ServiceDeskWrapUpCodeItem {
  id: string;
  code: string;
  label: string;
  category?: string;
  subtopic?: string;
  isFcrEligible?: boolean;
}

export interface ServiceDeskWrapUpPayload {
  status?: 'RESOLVED' | 'ACTIVE_AI' | 'ASSIGNED_HUMAN';
  wrapUpOutcome?: string;
  wrapUpTopic?: string;
  wrapUpSubtopic?: string;
  wrapUpSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  firstContactResolution?: boolean;
  wrapUpNotes?: string;
  wrapUpTags?: string[];
  acwDurationSeconds?: number;
  resolutionSummary?: string;
  csatScore?: number;
  csatFeedback?: string;
  wrappedUpByType?: 'HUMAN_AGENT' | 'AI_AGENT';
  wrappedUpById?: string;
  wrappedUpByName?: string;
}

export interface ServiceDeskWrapUpSuggestion {
  outcome: string;
  topic: string;
  subtopic: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  firstContactResolution: boolean;
  notes: string;
  tags: string[];
}

export interface ServiceDeskSession {
  id: string;
  tenantId: string;
  siteId?: string;
  siteName?: string;
  channelType: ServiceDeskChannelType;
  status: ServiceDeskSessionStatus;
  priority: ServiceDeskPriority;

  visitorToken?: string;
  partyId?: string;
  visitorName: string;
  visitorEmail?: string;
  visitorPhone?: string;
  currentPageSlug?: string;
  currentPageTitle?: string;
  isAuthenticated: boolean;

  allocationMode: ServiceDeskAllocationMode;
  allocatedAssigneeType: ServiceDeskAssigneeType;
  allocatedMemberId?: string;
  allocatedMemberName?: string;
  allocatedAgentId?: string;
  allocatedAgentName?: string;
  allocatedTeamId?: string;
  allocatedTeamName?: string;
  allocatedQueueId?: string;
  allocatedQueueName?: string;

  aiWhisperEnabled: boolean;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  confidenceScore?: number;
  aiSummary?: string;
  aiSuggestedReply?: string;
  pendingHitlTool?: ServiceDeskHitlRequest | null;

  linkedRecords: ServiceDeskLinkedRecord[];
  tags: string[];
  metadata?: Record<string, any>;
  slaDeadline?: string;
  slaStatus?: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
  firstResponseAt?: string;
  escalatedAt?: string;
  resolvedAt?: string;
  csatScore?: number;
  csatFeedback?: string;

  // Structured Wrap-Up & Disposition (BI Ready)
  wrapUpOutcome?: string | null;
  wrapUpTopic?: string | null;
  wrapUpSubtopic?: string | null;
  wrapUpTags?: string[];
  wrapUpSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null;
  firstContactResolution?: boolean;
  wrapUpNotes?: string | null;
  wrappedUpByType?: 'HUMAN_AGENT' | 'AI_AGENT' | null;
  wrappedUpById?: string | null;
  wrappedUpByName?: string | null;
  wrappedUpAt?: string | null;
  handleDurationSeconds?: number | null;
  acwDurationSeconds?: number | null;

  unreadByOperator: number;
  unreadByVisitor: number;
  lastMessageAt: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
  messages?: ServiceDeskMessage[];
}

export interface ServiceDeskOperatorPresence {
  id: string;
  tenantId: string;
  memberId: string;
  memberName: string;
  status: ServiceDeskOperatorStatus;
  maxConcurrentChats: number;
  activeChatCount: number;
  activeCallId?: string | null;
  assignedQueues: string[];
  lastAssignedAt: string;
  updatedAt: string;
}

export interface ServiceDeskVoiceCallState {
  sessionId: string;
  callerName: string;
  callerNumber: string;
  siteOrLineName: string;
  queueName: string;
  status: 'RINGING' | 'CONNECTED_AI_IVR' | 'CONNECTED_HUMAN' | 'ON_HOLD' | 'WARM_TRANSFER' | 'WRAP_UP';
  startedAt: string;
  durationSeconds: number;
  isMuted: boolean;
  isOnHold: boolean;
  isRecording: boolean;
  liveTranscript: Array<{
    speaker: 'CALLER' | 'AI_IVR' | 'OPERATOR';
    text: string;
    timestamp: string;
  }>;
}

export interface ServiceDeskTenantSettings {
  // General & SLA
  defaultSlaTargetMinutes: number;
  slaBreachWarningMinutes: number;
  maxConcurrentChatsPerOperator: number;
  enableSoundAlerts: boolean;
  enableBrowserNotifications: boolean;

  // Routing & Allocation
  primaryAllocationMode: ServiceDeskAllocationMode;
  fallbackToQueueOnTimeout: boolean;
  queueTimeoutSeconds: number;
  defaultFallbackTeamId?: string | null;
  autoReturnToReadyAfterCall: boolean;

  // Wrap-Up & ACW
  requireWrapUpToClose: boolean;
  acwTimeoutSeconds: number; // 0 for unlimited / operator-controlled
  defaultWrapUpOutcomeCode?: string;
  defaultWrapUpTopic?: string;
  enableAiWrapUpAutoSuggest: boolean;

  // AI Concierge & HITL Guardrails
  defaultAgentId?: string | null;
  aiConfidenceEscalationThreshold: number; // e.g. 0.72
  requireHitlApprovalForRefunds: boolean;
  requireHitlApprovalForCancellations: boolean;
  enableAiWhisperSuggestions: boolean;

  // Telephony Switchboard
  inboundVoiceNumber?: string;
  voiceQueueGreeting?: string;
  recordCalls: boolean;

  // Business Hours & Schedules
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedules: Array<{
      day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      enabled: boolean;
      openTime: string;
      closeTime: string;
    }>;
    offHoursStrategy: 'AI_CONCIERGE' | 'AUTO_RESPONDER' | 'TICKET_LEAD';
    offHoursMessage: string;
    holidays: Array<{ id: string; name: string; date: string }>;
  };

  // Inactivity & Ghosting Prevention
  inactivity: {
    idleWarningMinutes: number;
    idleWarningMessage: string;
    autoCloseMinutes: number;
    autoCloseOutcomeCode: string;
    reconnectGraceMinutes: number;
  };

  // Customer Feedback & Closed Loop
  feedbackLoop: {
    enableCsatSurvey: boolean;
    ratingType: 'CSAT_5_STAR' | 'CSAT_EMOJI' | 'NPS_10';
    surveyPrompt: string;
    followUpPrompt: string;
    lowScoreThreshold: number; // e.g. <= 2 stars or <= 6 NPS
    autoCreateFeedbackCase: boolean;
    feedbackSlaHours: number; // e.g. 24h for manager outreach
    defaultSupervisorId?: string | null;
  };

  // Web Chat Widget & Embed
  widget: {
    themeColor: string;
    launcherStyle: 'BUBBLE' | 'PILL';
    launcherText: string;
    position: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
    requireName: boolean;
    requireEmail: boolean;
    requirePhone: boolean;
    allowAnonymous: boolean;
  };

  // Security, PII Redaction & Retention
  security: {
    enablePiiMasking: boolean;
    maskCreditCards: boolean;
    maskTfnAndSsn: boolean;
    maskPasswords: boolean;
    retentionDays: number; // 0 = indefinite
  };
}

export interface ServiceDeskFeedbackCase {
  id: string;
  tenantId: string;
  sessionId: string;
  visitorName: string;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  channelType: string;
  score: number;
  maxScore: number;
  ratingType: string;
  comment?: string | null;
  sentiment: 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
  status:
    | 'NEW_UNASSIGNED'
    | 'IN_REVIEW'
    | 'OUTREACH_SCHEDULED'
    | 'REMEDIATION_OFFERED'
    | 'RESOLVED_CLOSED_LOOP'
    | 'DISMISSED';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  rootCauseCategory?: string | null;
  assignedSupervisorId?: string | null;
  assignedSupervisorName?: string | null;
  remediationAction?: string | null;
  remediationNotes?: string | null;
  slaDeadline?: string | null;
  closedAt?: string | null;
  closedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDeskCannedResponse {
  id: string;
  tenantId: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  isShared: boolean;
  usageCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_SERVICE_DESK_TENANT_SETTINGS: ServiceDeskTenantSettings = {
  defaultSlaTargetMinutes: 15,
  slaBreachWarningMinutes: 5,
  maxConcurrentChatsPerOperator: 3,
  enableSoundAlerts: true,
  enableBrowserNotifications: true,

  primaryAllocationMode: 'AI_FIRST',
  fallbackToQueueOnTimeout: true,
  queueTimeoutSeconds: 120,
  defaultFallbackTeamId: null,
  autoReturnToReadyAfterCall: false,

  requireWrapUpToClose: true,
  acwTimeoutSeconds: 120,
  defaultWrapUpOutcomeCode: 'RESOLVED_FCR',
  defaultWrapUpTopic: 'General Inquiry / Information',
  enableAiWrapUpAutoSuggest: true,

  defaultAgentId: null,
  aiConfidenceEscalationThreshold: 0.72,
  requireHitlApprovalForRefunds: true,
  requireHitlApprovalForCancellations: true,
  enableAiWhisperSuggestions: true,

  inboundVoiceNumber: '+61 421 904 332',
  voiceQueueGreeting: 'Thank you for calling. Connecting you with our service team...',
  recordCalls: true,

  businessHours: {
    enabled: true,
    timezone: 'Australia/Adelaide',
    schedules: [
      { day: 'monday', enabled: true, openTime: '08:30', closeTime: '17:30' },
      { day: 'tuesday', enabled: true, openTime: '08:30', closeTime: '17:30' },
      { day: 'wednesday', enabled: true, openTime: '08:30', closeTime: '17:30' },
      { day: 'thursday', enabled: true, openTime: '08:30', closeTime: '17:30' },
      { day: 'friday', enabled: true, openTime: '08:30', closeTime: '17:30' },
      { day: 'saturday', enabled: false, openTime: '09:00', closeTime: '13:00' },
      { day: 'sunday', enabled: false, openTime: '09:00', closeTime: '13:00' }
    ],
    offHoursStrategy: 'AI_CONCIERGE',
    offHoursMessage: 'Our live support desk is currently closed. Our AI Concierge is available 24/7 to assist, or you can leave a callback request for our team during business hours.',
    holidays: [
      { id: 'h-1', name: "New Year's Day", date: '2027-01-01' },
      { id: 'h-2', name: 'Australia Day', date: '2027-01-26' },
      { id: 'h-3', name: 'Christmas Day', date: '2026-12-25' }
    ]
  },

  inactivity: {
    idleWarningMinutes: 5,
    idleWarningMessage: 'Are you still with us? Please reply if you still need assistance, or this session will automatically close shortly.',
    autoCloseMinutes: 10,
    autoCloseOutcomeCode: 'CLOSED_ABANDONED',
    reconnectGraceMinutes: 15
  },

  feedbackLoop: {
    enableCsatSurvey: true,
    ratingType: 'CSAT_5_STAR',
    surveyPrompt: 'How would you rate the service you received today?',
    followUpPrompt: 'What could we have done better to improve your experience?',
    lowScoreThreshold: 2,
    autoCreateFeedbackCase: true,
    feedbackSlaHours: 24,
    defaultSupervisorId: null
  },

  widget: {
    themeColor: '#4f46e5',
    launcherStyle: 'PILL',
    launcherText: 'Chat with us',
    position: 'BOTTOM_RIGHT',
    requireName: true,
    requireEmail: false,
    requirePhone: false,
    allowAnonymous: true
  },

  security: {
    enablePiiMasking: true,
    maskCreditCards: true,
    maskTfnAndSsn: true,
    maskPasswords: true,
    retentionDays: 90
  }
};

export interface ServiceDeskWallboardMetrics {
  totalActiveSessions: number;
  activeAiSessions: number;
  queuedForHuman: number;
  assignedToHuman: number;
  awaitingHitlApproval: number;
  activeVoiceCalls: number;
  resolvedToday: number;
  aiDeflectionRate: number;
  avgFirstResponseSeconds: number;
  slaComplianceRate: number;
  avgCsatScore: number;
}

export const DEFAULT_SITE_CHAT_CONFIG: SiteChatConfig = {
  enabled: true,
  widgetTitle: 'Live Concierge & Support',
  widgetSubtitle: 'Ask our AI Concierge or connect with a specialist',
  displayStyle: 'both',
  position: 'bottom-right',
  allocationMode: 'AI_FIRST',
  welcomeMessage: 'Hi there! How can we help you today? I can answer questions from our knowledge base, check statuses, book appointments, or connect you with our team.',
  offlineMessage: 'Our human specialists are currently away, but our AI Concierge is online 24/7 and can log a priority ticket for you.',
  slaTargetMinutes: 15,
  confidenceEscalationThreshold: 0.72,
  aiWhisperEnabled: true,
  proactiveRules: [
    {
      id: 'rule-home',
      pageSlug: 'home',
      delaySeconds: 8,
      message: 'Welcome! Let us know if you need help finding anything or checking an existing request.',
      enabled: true
    }
  ],
  preChatCapture: {
    enabled: false,
    requireName: true,
    requireEmail: true,
    requirePhone: false
  },
  enabledCapabilities: {
    kbSearch: true,
    recordLookup: true,
    recordCreation: true,
    bookings: true,
    forms: true,
    payments: true,
    documentGeneration: true,
    voiceCallEscalation: true
  }
};
