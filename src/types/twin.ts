/**
 * Digital Twin Types for Aurora
 */

export type TwinPresenceStatus = 
  | 'AVAILABLE'
  | 'AWAY_TWIN'
  | 'DND_INTERCEPT'
  | 'NIGHT_SHIFT'
  | 'OFFLINE';

export type TwinMode = 
  | 'DRAFT_ONLY'
  | 'AUTONOMOUS'
  | 'EMERGENCY_ONLY';

export interface WritingStyleProfile {
  formality: number; // 0 to 100 (Casual -> Formal)
  conciseness: number; // 0 to 100 (Bullet points -> Detailed)
  enthusiasm: number; // 0 to 100 (Neutral -> Energetic)
  greetingPreference: string;
  signoffPreference: string;
  customToneInstructions: string;
  sampleSnippets: string[];
  extractedKeywords: string[];
}

export interface DigitalTwinConfig {
  id: string;
  userId: string;
  status: TwinPresenceStatus;
  mode: TwinMode;
  roleTitle: string;
  department: string;
  responsibilities: string;
  keyProjects: string[];
  confidenceThreshold: number; // 0.50 to 0.99
  writingStyle: WritingStyleProfile;
  autoActivateOnSchedule: boolean;
  nightShiftSchedule?: {
    startTime: string; // e.g. "18:00"
    endTime: string;   // e.g. "08:30"
    enabledDays: string[];
  };
  emergencyContacts?: string[];
}

export interface TwinActivityLog {
  id: string;
  userId: string;
  timestamp: string;
  actionType: 'MESSAGE_REPLY' | 'DRAFT_CREATED' | 'TASK_EXECUTED' | 'PING_INTERCEPTED' | 'ESCALATION';
  title: string;
  description: string;
  channel?: string;
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'ESCALATED';
  confidenceScore: number;
}

export interface TwinDraftItem {
  id: string;
  userId: string;
  targetChannel: string;
  recipientName: string;
  recipientRole?: string;
  incomingPrompt: string;
  draftedResponse: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface HandoverDigest {
  timestamp: string;
  periodSummary: string;
  totalPingsTriaged: number;
  tasksCompletedCount: number;
  pendingApprovalsCount: number;
  logs: TwinActivityLog[];
  pendingDrafts: TwinDraftItem[];
  highPriorityAlerts: string[];
}
