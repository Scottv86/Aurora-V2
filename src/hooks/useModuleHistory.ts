import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface ModuleHistorySnapshot {
  layout: any[];
  tabs: any[];
  moduleSettings: any;
  interfaceSettings: any;
  workflow?: any;
  forms: any[];
  validationRules: any[];
  connectorMappings: Record<string, Record<string, string>>;
  dataPopulationRules: any[];
  localAutomations: any[];
}

export interface UseModuleHistoryProps {
  layout: any[];
  tabs: any[];
  moduleSettings: any;
  interfaceSettings: any;
  workflow?: any;
  forms: any[];
  validationRules: any[];
  connectorMappings: Record<string, Record<string, string>>;
  dataPopulationRules: any[];
  localAutomations: any[];
  isLoading: boolean;

  setLayout: React.Dispatch<React.SetStateAction<any[]>>;
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  setModuleSettings: React.Dispatch<React.SetStateAction<any>>;
  setInterfaceSettings: React.Dispatch<React.SetStateAction<any>>;
  setWorkflow: React.Dispatch<React.SetStateAction<any>>;
  setForms: React.Dispatch<React.SetStateAction<any[]>>;
  setValidationRules: React.Dispatch<React.SetStateAction<any[]>>;
  setConnectorMappings: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  setDataPopulationRules: React.Dispatch<React.SetStateAction<any[]>>;
  setLocalAutomations: React.Dispatch<React.SetStateAction<any[]>>;
  
  maxHistory?: number;
  debounceMs?: number;
}

export const useModuleHistory = ({
  layout,
  tabs,
  moduleSettings,
  interfaceSettings,
  workflow,
  forms,
  validationRules,
  connectorMappings,
  dataPopulationRules,
  localAutomations,
  isLoading,

  setLayout,
  setTabs,
  setModuleSettings,
  setInterfaceSettings,
  setWorkflow,
  setForms,
  setValidationRules,
  setConnectorMappings,
  setDataPopulationRules,
  setLocalAutomations,

  maxHistory = 50,
  debounceMs = 300
}: UseModuleHistoryProps) => {
  const [history, setHistory] = useState<ModuleHistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isRestoringRef = useRef<boolean>(false);
  const historyRef = useRef<ModuleHistorySnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  // Keep refs in sync for immediate access in callbacks and timer events
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const getCurrentSnapshot = useCallback((): ModuleHistorySnapshot => {
    return {
      layout: JSON.parse(JSON.stringify(layout || [])),
      tabs: JSON.parse(JSON.stringify(tabs || [])),
      moduleSettings: JSON.parse(JSON.stringify(moduleSettings || {})),
      interfaceSettings: JSON.parse(JSON.stringify(interfaceSettings || {})),
      workflow: workflow ? JSON.parse(JSON.stringify(workflow)) : undefined,
      forms: JSON.parse(JSON.stringify(forms || [])),
      validationRules: JSON.parse(JSON.stringify(validationRules || [])),
      connectorMappings: JSON.parse(JSON.stringify(connectorMappings || {})),
      dataPopulationRules: JSON.parse(JSON.stringify(dataPopulationRules || [])),
      localAutomations: JSON.parse(JSON.stringify(localAutomations || []))
    };
  }, [
    layout,
    tabs,
    moduleSettings,
    interfaceSettings,
    workflow,
    forms,
    validationRules,
    connectorMappings,
    dataPopulationRules,
    localAutomations
  ]);

  const applySnapshot = useCallback((snapshot: ModuleHistorySnapshot) => {
    isRestoringRef.current = true;
    setLayout(JSON.parse(JSON.stringify(snapshot.layout)));
    setTabs(JSON.parse(JSON.stringify(snapshot.tabs)));
    setModuleSettings(JSON.parse(JSON.stringify(snapshot.moduleSettings)));
    setInterfaceSettings(JSON.parse(JSON.stringify(snapshot.interfaceSettings)));
    setWorkflow(snapshot.workflow ? JSON.parse(JSON.stringify(snapshot.workflow)) : undefined);
    setForms(JSON.parse(JSON.stringify(snapshot.forms)));
    setValidationRules(JSON.parse(JSON.stringify(snapshot.validationRules)));
    setConnectorMappings(JSON.parse(JSON.stringify(snapshot.connectorMappings)));
    setDataPopulationRules(JSON.parse(JSON.stringify(snapshot.dataPopulationRules)));
    setLocalAutomations(JSON.parse(JSON.stringify(snapshot.localAutomations)));

    setTimeout(() => {
      isRestoringRef.current = false;
    }, 60);
  }, [
    setLayout,
    setTabs,
    setModuleSettings,
    setInterfaceSettings,
    setWorkflow,
    setForms,
    setValidationRules,
    setConnectorMappings,
    setDataPopulationRules,
    setLocalAutomations
  ]);

  // Handle initialization when loading finishes
  useEffect(() => {
    if (!isLoading && !hasInitializedRef.current) {
      const initialSnapshot = getCurrentSnapshot();
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
      historyRef.current = [initialSnapshot];
      historyIndexRef.current = 0;
      hasInitializedRef.current = true;
    }
  }, [isLoading, getCurrentSnapshot]);

  // Track state changes and debounce history commits
  useEffect(() => {
    if (isLoading || isRestoringRef.current || !hasInitializedRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const currentSnap = getCurrentSnapshot();
      const currentIdx = historyIndexRef.current;
      const currentHistory = historyRef.current;

      const serializedCurrent = JSON.stringify(currentSnap);
      const serializedHead = currentIdx >= 0 && currentHistory[currentIdx]
        ? JSON.stringify(currentHistory[currentIdx])
        : null;

      if (serializedCurrent === serializedHead) {
        return;
      }

      // Truncate forward history if we're branching from an earlier state
      const newHistory = currentHistory.slice(0, currentIdx + 1);
      newHistory.push(currentSnap);

      if (newHistory.length > maxHistory) {
        newHistory.shift();
      }

      const nextIndex = newHistory.length - 1;
      setHistory(newHistory);
      setHistoryIndex(nextIndex);
      historyRef.current = newHistory;
      historyIndexRef.current = nextIndex;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    layout,
    tabs,
    moduleSettings,
    interfaceSettings,
    workflow,
    forms,
    validationRules,
    connectorMappings,
    dataPopulationRules,
    localAutomations,
    isLoading,
    getCurrentSnapshot,
    maxHistory,
    debounceMs
  ]);

  const undo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentIdx = historyIndexRef.current;
    const currentHistory = historyRef.current;

    if (currentIdx > 0 && currentHistory.length > 0) {
      const targetIdx = currentIdx - 1;
      const targetSnapshot = currentHistory[targetIdx];
      if (targetSnapshot) {
        setHistoryIndex(targetIdx);
        historyIndexRef.current = targetIdx;
        applySnapshot(targetSnapshot);
        toast.info('Undo applied', { duration: 1500 });
      }
    }
  }, [applySnapshot]);

  const redo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentIdx = historyIndexRef.current;
    const currentHistory = historyRef.current;

    if (currentIdx < currentHistory.length - 1) {
      const targetIdx = currentIdx + 1;
      const targetSnapshot = currentHistory[targetIdx];
      if (targetSnapshot) {
        setHistoryIndex(targetIdx);
        historyIndexRef.current = targetIdx;
        applySnapshot(targetSnapshot);
        toast.info('Redo applied', { duration: 1500 });
      }
    }
  }, [applySnapshot]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
    isRestoring: isRestoringRef.current
  };
};
