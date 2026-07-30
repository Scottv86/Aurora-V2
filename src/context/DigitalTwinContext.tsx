import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePlatform } from '../hooks/usePlatform';
import {
  DigitalTwinConfig,
  TwinPresenceStatus,
  TwinMode,
  TwinActivityLog,
  TwinDraftItem,
  HandoverDigest,
  WritingStyleProfile
} from '../types/twin';

interface DigitalTwinContextType {
  twinConfig: DigitalTwinConfig | null;
  presenceStatus: TwinPresenceStatus;
  setPresenceStatus: (status: TwinPresenceStatus) => Promise<void>;
  setTwinMode: (mode: TwinMode) => Promise<void>;
  updateConfig: (partial: Partial<DigitalTwinConfig>) => Promise<void>;
  logs: TwinActivityLog[];
  drafts: TwinDraftItem[];
  digest: HandoverDigest | null;
  isLoading: boolean;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isHandoverOpen: boolean;
  setIsHandoverOpen: (open: boolean) => void;
  testTwin: (prompt: string) => Promise<{ responseText: string; confidenceScore: number }>;
  simulatePing: (message: string, senderName?: string, channel?: string) => Promise<any>;
  approveOrRejectDraft: (draftId: string, action: 'APPROVE' | 'REJECT', editedContent?: string) => Promise<void>;
  analyzeStyle: (samples: string[]) => Promise<WritingStyleProfile | null>;
  refreshAll: () => Promise<void>;
}

const DigitalTwinContext = createContext<DigitalTwinContextType | undefined>(undefined);

const API_BASE = '/api/digital-twin';

const DEFAULT_TWIN_CONFIG: DigitalTwinConfig = {
  id: 'twin-default',
  userId: 'default-user',
  status: 'AVAILABLE',
  mode: 'DRAFT_ONLY',
  roleTitle: 'Senior Product Manager',
  department: 'Platform Operations',
  responsibilities: 'Overseeing module development, approving workflow automation specifications, and triaging team requests.',
  keyProjects: ['Aurora V2 Migration', 'Agent Orchestration Framework', 'User Twin Delegate'],
  confidenceThreshold: 0.85,
  writingStyle: {
    formality: 65,
    conciseness: 80,
    enthusiasm: 50,
    greetingPreference: 'Hi team,',
    signoffPreference: 'Best regards,',
    customToneInstructions: 'Direct, clear, solution-oriented. Prefers bullet points for multi-step tasks.',
    sampleSnippets: [
      "Thanks for flagging this. I've reviewed the specs and approve moving forward.",
      "Let's make sure we log telemetry before deploying to staging."
    ],
    extractedKeywords: ['Pragmatic', 'Structured', 'Decisive']
  },
  autoActivateOnSchedule: true
};

const DEFAULT_DIGEST: HandoverDigest = {
  timestamp: new Date().toISOString(),
  periodSummary: 'While you were away, your Digital Twin triaged incoming activity, auto-executed 2 routine items, and prepared 1 response draft for your sign-off.',
  totalPingsTriaged: 3,
  tasksCompletedCount: 2,
  pendingApprovalsCount: 1,
  logs: [
    {
      id: 'log-1',
      userId: 'default-user',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actionType: 'MESSAGE_REPLY',
      title: 'Answered Status Ping from Alex',
      description: 'Responded regarding the API migration timeline based on project backlog.',
      channel: 'Slack #engineering',
      status: 'COMPLETED',
      confidenceScore: 0.92
    },
    {
      id: 'log-2',
      userId: 'default-user',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      actionType: 'DRAFT_CREATED',
      title: 'Drafted Sprint Summary Report',
      description: 'Compiled pull request metrics for the weekly engineering handover.',
      channel: 'Email',
      status: 'PENDING_APPROVAL',
      confidenceScore: 0.88
    }
  ],
  pendingDrafts: [
    {
      id: 'draft-1',
      userId: 'default-user',
      targetChannel: 'Email to Sarah (Lead Architect)',
      recipientName: 'Sarah Connor',
      recipientRole: 'Lead Architect',
      incomingPrompt: 'Hi Daniela, do we need to delay the database schema update until after the audit?',
      draftedResponse: "Hi Sarah,\n\nBased on our compliance checklist, yes—we should hold off on schema migrations until the audit completes this Thursday. I'll make sure the team is aligned.\n\nBest regards,\nDaniela",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      status: 'PENDING'
    }
  ],
  highPriorityAlerts: ['1 response draft waiting for morning sign-off.']
};

export const DigitalTwinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = usePlatform();
  const [twinConfig, setTwinConfig] = useState<DigitalTwinConfig>(DEFAULT_TWIN_CONFIG);
  const [presenceStatus, setPresenceStatusState] = useState<TwinPresenceStatus>('AVAILABLE');
  const [logs, setLogs] = useState<TwinActivityLog[]>(DEFAULT_DIGEST.logs);
  const [drafts, setDrafts] = useState<TwinDraftItem[]>(DEFAULT_DIGEST.pendingDrafts);
  const [digest, setDigest] = useState<HandoverDigest>(DEFAULT_DIGEST);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  // Automatically dispatch global notification when Morning Handover Digest is created
  useEffect(() => {
    if (digest) {
      addNotification({
        id: 'notif-handover-digest-ready',
        type: 'system',
        title: '🌅 Morning Handover Digest Available',
        content: `Your Digital Twin triaged ${digest.totalPingsTriaged} items while away and prepared ${digest.pendingApprovalsCount} drafts for sign-off.`,
        priority: 'high',
        audience: 'all'
      });
    }
  }, [digest, addNotification]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
        return;
      }
      const data = await res.json();
      if (data.success && data.config) {
        setTwinConfig(data.config);
        setPresenceStatusState(data.config.status || 'AVAILABLE');
      }
    } catch (err) {
      console.error('Failed to fetch twin config:', err);
    }
  };

  const fetchLogsAndDrafts = async () => {
    try {
      const [logsRes, draftsRes, handoverRes] = await Promise.all([
        fetch(`${API_BASE}/activity`),
        fetch(`${API_BASE}/drafts`),
        fetch(`${API_BASE}/handover`)
      ]);

      const logsData = logsRes.ok && logsRes.headers.get('content-type')?.includes('application/json') ? await logsRes.json() : null;
      const draftsData = draftsRes.ok && draftsRes.headers.get('content-type')?.includes('application/json') ? await draftsRes.json() : null;
      const handoverData = handoverRes.ok && handoverRes.headers.get('content-type')?.includes('application/json') ? await handoverRes.json() : null;

      if (logsData?.success) setLogs(logsData.logs || []);
      if (draftsData?.success) setDrafts(draftsData.drafts || []);
      if (handoverData?.success) setDigest(handoverData.digest || null);
    } catch (err) {
      console.error('Failed to fetch logs/drafts:', err);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchConfig(), fetchLogsAndDrafts()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const setPresenceStatus = async (status: TwinPresenceStatus) => {
    setPresenceStatusState(status);
    if (twinConfig) {
      setTwinConfig({ ...twinConfig, status });
    }
    try {
      const res = await fetch(`${API_BASE}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success && data.config) {
        setTwinConfig(data.config);
      }
    } catch (err) {
      console.error('Error setting presence status:', err);
    }
  };

  const setTwinMode = async (mode: TwinMode) => {
    if (twinConfig) {
      setTwinConfig({ ...twinConfig, mode });
    }
    try {
      const res = await fetch(`${API_BASE}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (data.success && data.config) {
        setTwinConfig(data.config);
      }
    } catch (err) {
      console.error('Error setting twin mode:', err);
    }
  };

  const updateConfig = async (partial: Partial<DigitalTwinConfig>) => {
    if (twinConfig) {
      setTwinConfig({ ...twinConfig, ...partial });
    }
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial)
      });
      const data = await res.json();
      if (data.success && data.config) {
        setTwinConfig(data.config);
      }
    } catch (err) {
      console.error('Error updating twin config:', err);
    }
  };

  const testTwin = async (prompt: string) => {
    try {
      const res = await fetch(`${API_BASE}/test-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.success) {
        return { responseText: data.responseText, confidenceScore: data.confidenceScore };
      }
      throw new Error(data.error || 'Failed to generate test prompt');
    } catch (err: any) {
      return { responseText: `Error generating twin response: ${err.message}`, confidenceScore: 0 };
    }
  };

  const simulatePing = async (message: string, senderName?: string, channel?: string) => {
    try {
      const res = await fetch(`${API_BASE}/simulate-ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, senderName, channel })
      });
      const data = await res.json();
      await fetchLogsAndDrafts();
      return data;
    } catch (err) {
      console.error('Error simulating ping:', err);
    }
  };

  const approveOrRejectDraft = async (draftId: string, action: 'APPROVE' | 'REJECT', editedContent?: string) => {
    try {
      await fetch(`${API_BASE}/drafts/${draftId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, editedContent })
      });
      await fetchLogsAndDrafts();
    } catch (err) {
      console.error('Error approving/rejecting draft:', err);
    }
  };

  const analyzeStyle = async (samples: string[]) => {
    try {
      const res = await fetch(`${API_BASE}/analyze-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples })
      });
      const data = await res.json();
      if (data.success && data.styleProfile) {
        if (twinConfig) {
          setTwinConfig({ ...twinConfig, writingStyle: data.styleProfile });
        }
        return data.styleProfile;
      }
      return null;
    } catch (err) {
      console.error('Error analyzing style:', err);
      return null;
    }
  };

  return (
    <DigitalTwinContext.Provider
      value={{
        twinConfig,
        presenceStatus,
        setPresenceStatus,
        setTwinMode,
        updateConfig,
        logs,
        drafts,
        digest,
        isLoading,
        isSettingsOpen,
        setIsSettingsOpen,
        isHandoverOpen,
        setIsHandoverOpen,
        testTwin,
        simulatePing,
        approveOrRejectDraft,
        analyzeStyle,
        refreshAll
      }}
    >
      {children}
    </DigitalTwinContext.Provider>
  );
};

export const useDigitalTwin = () => {
  const context = useContext(DigitalTwinContext);
  if (!context) {
    return {
      twinConfig: DEFAULT_TWIN_CONFIG,
      presenceStatus: 'AVAILABLE' as TwinPresenceStatus,
      setPresenceStatus: async () => {},
      setTwinMode: async () => {},
      updateConfig: async () => {},
      logs: [] as TwinActivityLog[],
      drafts: [] as TwinDraftItem[],
      digest: DEFAULT_DIGEST,
      isLoading: false,
      isSettingsOpen: false,
      setIsSettingsOpen: () => {},
      isHandoverOpen: false,
      setIsHandoverOpen: () => {},
      testTwin: async () => ({ responseText: '', confidenceScore: 1 }),
      simulatePing: async (): Promise<any> => {},
      approveOrRejectDraft: async () => {},
      analyzeStyle: async (): Promise<WritingStyleProfile | null> => null,
      refreshAll: async () => {}
    };
  }
  return context;
};
