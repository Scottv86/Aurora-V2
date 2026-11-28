import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  SolutionBlueprint,
  SolutionArtifact,
  ContextSource,
  ConnectedModule,
  SolutionChatMessage,
  SolutionStatus,
  SavedNote,
  SolutionVersionSnapshot,
  PinnedChatContext,
} from '../types/solutions';
import { normalizeSolutionArtifact } from '../components/Builders/SolutionBuilder/solutionComponentCatalog';

export type StudioCanvasTab = 'preview' | 'components';

export interface SolutionStudioContextValue {
  solutionId: string;
  solutionName: string;
  setSolutionName: (name: string) => void;
  solutionVersion: string;
  setSolutionVersion: (version: string) => void;
  solutionStatus: SolutionStatus;
  setSolutionStatus: (status: SolutionStatus) => void;

  contextSources: ContextSource[];
  addSource: (source: ContextSource) => void;
  removeSource: (id: string) => void;

  connectedModules: ConnectedModule[];
  setConnectedModules: React.Dispatch<React.SetStateAction<ConnectedModule[]>>;

  artifacts: SolutionArtifact[];
  setArtifacts: React.Dispatch<React.SetStateAction<SolutionArtifact[]>>;
  upsertArtifact: (artifact: SolutionArtifact, editedBy?: 'USER' | 'AI') => void;
  removeArtifact: (id: string) => void;

  activeArtifactId: string;
  setActiveArtifactId: (id: string) => void;

  chatMessages: SolutionChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<SolutionChatMessage[]>>;
  appendChatMessage: (msg: SolutionChatMessage) => void;

  savedNotes: SavedNote[];
  setSavedNotes: React.Dispatch<React.SetStateAction<SavedNote[]>>;

  versions: SolutionVersionSnapshot[];
  createSnapshot: (label: string, author?: 'USER' | 'AI' | 'DEPLOY') => SolutionVersionSnapshot;
  restoreSnapshot: (versionId: string) => boolean;

  activeCanvasTab: StudioCanvasTab;
  setActiveCanvasTab: (tab: StudioCanvasTab) => void;

  pinnedContext: PinnedChatContext | null;
  pinToChat: (ctx: PinnedChatContext) => void;
  clearPinnedContext: () => void;

  activeModalArtifactId: string | null;
  openInBuilderModal: (artifactId: string) => void;
  closeBuilderModal: () => void;

  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
}

const SolutionStudioContext = createContext<SolutionStudioContextValue | null>(null);

const DEFAULT_WELCOME_MESSAGE: SolutionChatMessage = {
  id: 'msg_welcome_1',
  role: 'aurora',
  text: 'Describe the business system you want to build—or attach reference docs in Sources above—and I will assemble a working v1 app using Aurora’s core modules and blueprints first.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  suggestedActions: [
    "Inspect what's already in my workspace",
    'Extend an existing module with a form & workflow',
    'Build a solution from a document in Sources',
  ],
};

export interface SolutionStudioProviderProps {
  initialSolution?: SolutionBlueprint | null;
  children: React.ReactNode;
}

export const SolutionStudioProvider: React.FC<SolutionStudioProviderProps> = ({
  initialSolution,
  children,
}) => {
  const [solutionId] = useState(() => initialSolution?.id || `sol_draft_${Date.now()}`);
  const [solutionName, setSolutionNameState] = useState(
    initialSolution?.name || 'Untitled Solution'
  );
  const [solutionVersion, setSolutionVersion] = useState(
    initialSolution?.version || 'v1.0.0'
  );
  const [solutionStatus, setSolutionStatus] = useState<SolutionStatus>(
    initialSolution?.status || 'DRAFT'
  );

  const [contextSources, setContextSources] = useState<ContextSource[]>(
    initialSolution?.contextSources || []
  );
  const [connectedModules, setConnectedModules] = useState<ConnectedModule[]>(
    initialSolution?.connectedModules || []
  );
  const [artifacts, setArtifacts] = useState<SolutionArtifact[]>(() =>
    (initialSolution?.artifacts || []).map(normalizeSolutionArtifact)
  );
  const [activeArtifactId, setActiveArtifactId] = useState<string>(
    initialSolution?.activeArtifactId || initialSolution?.artifacts?.[0]?.id || ''
  );

  const [chatMessages, setChatMessages] = useState<SolutionChatMessage[]>(() => {
    const history =
      initialSolution?.chatHistory && initialSolution.chatHistory.length > 0
        ? initialSolution.chatHistory
        : initialSolution?.chatMessages && initialSolution.chatMessages.length > 0
        ? initialSolution.chatMessages
        : [DEFAULT_WELCOME_MESSAGE];
    return history;
  });

  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(
    initialSolution?.savedNotes || []
  );

  const [versions, setVersions] = useState<SolutionVersionSnapshot[]>(() => {
    if (Array.isArray(initialSolution?.versions) && initialSolution.versions.length > 0) {
      return initialSolution.versions;
    }
    if (Array.isArray(initialSolution?.metadata?.versions)) {
      return initialSolution.metadata.versions;
    }
    return [];
  });

  const [activeCanvasTab, setActiveCanvasTab] = useState<StudioCanvasTab>('preview');
  const [pinnedContext, setPinnedContext] = useState<PinnedChatContext | null>(null);
  const [activeModalArtifactId, setActiveModalArtifactId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (initialSolution) {
      if (initialSolution.name) setSolutionNameState(initialSolution.name);
      if (initialSolution.version) setSolutionVersion(initialSolution.version);
      if (initialSolution.status) setSolutionStatus(initialSolution.status);
      if (initialSolution.contextSources) setContextSources(initialSolution.contextSources);
      if (initialSolution.connectedModules) setConnectedModules(initialSolution.connectedModules);
      if (initialSolution.artifacts) {
        const normalized = initialSolution.artifacts.map(normalizeSolutionArtifact);
        setArtifacts(normalized);
        if (!activeArtifactId && normalized[0]) {
          setActiveArtifactId(normalized[0].id);
        }
      }
      const history =
        initialSolution.chatHistory && initialSolution.chatHistory.length > 0
          ? initialSolution.chatHistory
          : initialSolution.chatMessages;
      if (history && history.length > 0) setChatMessages(history);
      if (initialSolution.savedNotes) setSavedNotes(initialSolution.savedNotes);
      const loadedVersions =
        Array.isArray(initialSolution.versions)
          ? initialSolution.versions
          : Array.isArray(initialSolution.metadata?.versions)
          ? initialSolution.metadata.versions
          : [];
      if (loadedVersions.length > 0) setVersions(loadedVersions);
    }

    const timer = setTimeout(() => {
      isInitializedRef.current = true;
      setIsDirty(false);
    }, 120);
    return () => clearTimeout(timer);
  }, [initialSolution?.id]);

  useEffect(() => {
    if (isInitializedRef.current) {
      setIsDirty(true);
    }
  }, [solutionName, contextSources, connectedModules, artifacts, savedNotes]);

  const setSolutionName = useCallback((name: string) => {
    setSolutionNameState(name);
  }, []);

  const addSource = useCallback((source: ContextSource) => {
    setContextSources((prev) => [source, ...prev]);
  }, []);

  const removeSource = useCallback((id: string) => {
    setContextSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const upsertArtifact = useCallback(
    (rawArtifact: SolutionArtifact, editedBy: 'USER' | 'AI' = 'USER') => {
      const normalized = normalizeSolutionArtifact(rawArtifact);
      const now = new Date().toISOString();

      setArtifacts((prev) => {
        const idx = prev.findIndex((a) => a.id === normalized.id);
        if (idx >= 0) {
          const existing = prev[idx];
          const updated: SolutionArtifact = {
            ...existing,
            ...normalized,
            lastEditedBy: editedBy,
            manualEditVersion:
              editedBy === 'USER'
                ? (existing.manualEditVersion || 0) + 1
                : existing.manualEditVersion || 0,
            updatedAt: now,
          };
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [
          ...prev,
          {
            ...normalized,
            lastEditedBy: editedBy,
            manualEditVersion: editedBy === 'USER' ? 1 : 0,
            updatedAt: now,
          },
        ];
      });
    },
    []
  );

  const removeArtifact = useCallback((id: string) => {
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
    setActiveArtifactId((prev) => (prev === id ? '' : prev));
    setActiveModalArtifactId((prev) => (prev === id ? null : prev));
  }, []);

  const appendChatMessage = useCallback((msg: SolutionChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const createSnapshot = useCallback(
    (label: string, author: 'USER' | 'AI' | 'DEPLOY' = 'USER'): SolutionVersionSnapshot => {
      const nextNum = versions.length + 1;
      const snapshot: SolutionVersionSnapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        versionTag: `v1.0.${nextNum}`,
        label,
        createdAt: new Date().toISOString(),
        author,
        artifacts: JSON.parse(JSON.stringify(artifacts)),
        connectedModules: JSON.parse(JSON.stringify(connectedModules)),
        contextSourcesCount: contextSources.length,
      };
      setVersions((prev) => [snapshot, ...prev].slice(0, 30));
      setSolutionVersion(snapshot.versionTag);
      return snapshot;
    },
    [artifacts, connectedModules, contextSources.length, versions.length]
  );

  const restoreSnapshot = useCallback(
    (versionId: string): boolean => {
      const target = versions.find((v) => v.id === versionId);
      if (!target) return false;
      setArtifacts(JSON.parse(JSON.stringify(target.artifacts || [])));
      setConnectedModules(JSON.parse(JSON.stringify(target.connectedModules || [])));
      setSolutionVersion(target.versionTag);
      setIsDirty(true);
      return true;
    },
    [versions]
  );

  const pinToChat = useCallback((ctx: PinnedChatContext) => {
    setPinnedContext(ctx);
  }, []);

  const clearPinnedContext = useCallback(() => {
    setPinnedContext(null);
  }, []);

  const openInBuilderModal = useCallback((artifactId: string) => {
    setActiveModalArtifactId(artifactId);
  }, []);

  const closeBuilderModal = useCallback(() => {
    setActiveModalArtifactId(null);
  }, []);

  return (
    <SolutionStudioContext.Provider
      value={{
        solutionId,
        solutionName,
        setSolutionName,
        solutionVersion,
        setSolutionVersion,
        solutionStatus,
        setSolutionStatus,
        contextSources,
        addSource,
        removeSource,
        connectedModules,
        setConnectedModules,
        artifacts,
        setArtifacts,
        upsertArtifact,
        removeArtifact,
        activeArtifactId,
        setActiveArtifactId,
        chatMessages,
        setChatMessages,
        appendChatMessage,
        savedNotes,
        setSavedNotes,
        versions,
        createSnapshot,
        restoreSnapshot,
        activeCanvasTab,
        setActiveCanvasTab,
        pinnedContext,
        pinToChat,
        clearPinnedContext,
        activeModalArtifactId,
        openInBuilderModal,
        closeBuilderModal,
        isDirty,
        setIsDirty,
      }}
    >
      {children}
    </SolutionStudioContext.Provider>
  );
};

export function useSolutionStudio(): SolutionStudioContextValue {
  const ctx = useContext(SolutionStudioContext);
  if (!ctx) {
    throw new Error('useSolutionStudio must be used within a SolutionStudioProvider');
  }
  return ctx;
}
