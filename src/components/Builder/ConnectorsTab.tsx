import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  Plus,
  Search,
  Database,
  Network,
  Cpu,
  Settings2,
  Trash2,
  AlertCircle,
  Info,
  PlusCircle,
  Play,
  Code,
  Loader2,
  CheckCircle2,
  Sparkles,
  BrainCircuit,
  Check,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, flattenFields } from '../../lib/utils';
import { toast } from 'sonner';
import { Field } from '../ModuleEditor';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { ExpressionEditor } from './ExpressionEditor';
import {
  VisualRuleBuilder,
  createDefaultConditionGroup
} from './VisualRuleBuilder';
import { ValidationConditionNode } from '../../lib/validationEngine';

interface ConnectorsTabProps {
  layout: Field[];
  setLayout: React.Dispatch<React.SetStateAction<Field[]>>;
  activeConnectors: any[];
  connectorRegistry: any[];
  connectorMappings: Record<string, Record<string, string>>;
  setConnectorMappings: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  dataPopulationRules?: any[];
  setDataPopulationRules?: React.Dispatch<React.SetStateAction<any[]>>;
  setShowConnectorModal: (show: boolean) => void;
  currentTabId: string;
  tabs?: any[];
  setTabs?: React.Dispatch<React.SetStateAction<any[]>>;
  handleForgeConnector: (prompt: string) => Promise<any>;
  handleCreateCustomConnector: (connector: any) => Promise<any>;
  showAiAssist?: boolean;
  mode?: 'module' | 'global';
}

export const ConnectorsTab: React.FC<ConnectorsTabProps> = ({
  layout,
  setLayout,
  activeConnectors,
  connectorRegistry,
  connectorMappings,
  setConnectorMappings,
  dataPopulationRules = [],
  setDataPopulationRules = () => {},
  setShowConnectorModal,
  currentTabId,
  tabs = [],
  setTabs,
  handleForgeConnector,
  handleCreateCustomConnector,
  showAiAssist = true
}) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Resizable & Collapsible Sidebars (aligned with Interface, Forms, Workflows & Rules)
  const [leftWidth, setLeftWidth] = useState(264);
  const [rightWidth, setRightWidth] = useState(320);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);
  const resizingSideRef = useRef<'left' | 'right' | null>(null);

  // Placement selection and creation states
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [showAddPlacementDropdown, setShowAddPlacementDropdown] = useState(false);
  const [showInlineLookupModal, setShowInlineLookupModal] = useState(false);
  const [inlineLookupLabel, setInlineLookupLabel] = useState('');
  const [inlineLookupTabId, setInlineLookupTabId] = useState('default-tab');
  const [deletePlacementConfirmation, setDeletePlacementConfirmation] = useState<{
    id: string;
    type: 'rule' | 'lookup';
    label: string;
    associatedFieldIds: string[];
    associatedFieldLabels: string[];
  } | null>(null);

  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    setActiveStep(1);
  }, [selectedPlacementId]);

  // Right sidebar tab and data states
  const [rightTab, setRightTab] = useState<'setup' | 'sandbox' | 'logs' | 'json'>('setup');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error'>('all');
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [savingSecrets, setSavingSecrets] = useState(false);
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [pendingFieldCreation, setPendingFieldCreation] = useState<{
    outputName: string;
    outputLabel: string;
    outputType: string;
  } | null>(null);
  const [selectedDestinationTabId, setSelectedDestinationTabId] = useState<string>('default-tab');
  const [showCreateTabForm, setShowCreateTabForm] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabParentId, setNewTabParentId] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // Sidebar resize listeners (delta-based so it works with or without an outer sidebar)
  const resizeOriginRef = useRef<{ x: number; width: number }>({ x: 0, width: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingSideRef.current) return;
      const delta = e.clientX - resizeOriginRef.current.x;
      if (resizingSideRef.current === 'left') {
        const next = Math.min(380, Math.max(220, resizeOriginRef.current.width + delta));
        setLeftWidth(next);
      } else {
        const next = Math.min(440, Math.max(260, resizeOriginRef.current.width - delta));
        setRightWidth(next);
      }
    };
    const handleMouseUp = () => {
      resizingSideRef.current = null;
      setResizingSide(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = (side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    resizeOriginRef.current = { x: e.clientX, width: side === 'left' ? leftWidth : rightWidth };
    resizingSideRef.current = side;
    setResizingSide(side);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const displayTabs = useMemo(() => {
    if (!tabs || tabs.length === 0) {
      return [{ id: 'default-tab', label: 'General', depth: 0 }];
    }
    const rootTabs = tabs.filter((t: any) => !t.parentId);
    const result: any[] = [];
    rootTabs.forEach((root: any) => {
      result.push({ ...root, depth: 0 });
      const subtabs = tabs.filter((t: any) => t.parentId === root.id);
      subtabs.forEach((sub: any) => {
        result.push({ ...sub, depth: 1 });
      });
    });
    tabs.forEach((t: any) => {
      if (t.parentId && !result.some(r => r.id === t.id)) {
        result.push({ ...t, depth: 1 });
      }
    });
    return result;
  }, [tabs]);

  useEffect(() => {
    if (pendingFieldCreation) {
      setSelectedDestinationTabId(currentTabId || (tabs && tabs[0]?.id) || 'default-tab');
    }
  }, [pendingFieldCreation, currentTabId, tabs]);

  useEffect(() => {
    setTestData({});
    setTestResponse(null);
    setSelectedPlacementId(null);
  }, [selectedConnectorId]);

  const selectedTenantConnector = useMemo(() => {
    if (!selectedConnectorId) return null;
    return activeConnectors.find((ac: any) => ac.connectorId === selectedConnectorId) || null;
  }, [activeConnectors, selectedConnectorId]);

  const fetchLogs = async () => {
    if (!tenant?.id || !selectedConnectorId) return;
    setLoadingLogs(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/connectors/${selectedConnectorId}/logs`, {
        headers: {
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch connector logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveSecrets = async () => {
    if (!tenant?.id || !selectedConnectorId) return;
    setSavingSecrets(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/connectors/${selectedConnectorId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ secrets })
      });
      if (res.ok) {
        toast.success('Configuration saved');
        setSecrets({});
        new BroadcastChannel('nexus_connectors').postMessage('refresh');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save configuration:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSavingSecrets(false);
    }
  };

  useEffect(() => {
    if (selectedConnectorId) {
      setLogs([]);
      setSecrets({});
      setExpandedLogId(null);
      if (rightTab === 'logs') {
        fetchLogs();
      }
    }
  }, [selectedConnectorId]);

  useEffect(() => {
    if (rightTab === 'logs' && selectedConnectorId) {
      fetchLogs();
    }
  }, [rightTab]);

  useEffect(() => {
    if (showInlineLookupModal) {
      setInlineLookupTabId(currentTabId || (tabs && tabs[0]?.id) || 'default-tab');
    }
  }, [showInlineLookupModal, currentTabId, tabs]);

  // Normalize details retrieval for a connector
  const getConnectorDetails = (c: any) => {
    const connId = c.connectorId || c.id;
    const registryEntry = connectorRegistry.find(r => r.id === connId);
    return {
      id: connId,
      name: c.displayName || c.name || registryEntry?.name || 'Unnamed Connector',
      icon: c.icon || registryEntry?.icon || c.connector?.icon || 'Zap',
      category: c.category || registryEntry?.category || c.connector?.category || 'Utility',
      ioSchema: c.ioSchema || registryEntry?.ioSchema || c.connector?.ioSchema || { inputs: [], outputs: [] },
      edgeFunctionUrl: c.edgeFunctionUrl || registryEntry?.edgeFunctionUrl || c.connector?.edgeFunctionUrl,
      hasSecrets: Boolean(c.isActive && (!c.secretsSchema?.length || c.configuredSecrets?.length > 0 || c.hasCredentials !== false))
    };
  };

  const usedConnectorIds = useMemo(() => {
    const ids = new Set<string>(
      flattenFields(layout)
        .filter(f => (f.type === 'connector' || f.lookupSource === 'connector') && f.connectorId)
        .map(f => f.connectorId as string)
    );
    (dataPopulationRules || []).forEach((r: any) => {
      if (r.connectorId) ids.add(r.connectorId);
    });
    return ids;
  }, [layout, dataPopulationRules]);

  const sortedConnectors = useMemo(() => {
    return activeConnectors.map(c => {
      const details = getConnectorDetails(c);
      const isUsed = usedConnectorIds.has(details.id);
      return { ...c, ...details, isUsed };
    });
  }, [activeConnectors, connectorRegistry, usedConnectorIds]);

  useEffect(() => {
    const used = sortedConnectors.filter(c => c.isUsed);
    if (used.length > 0 && (!selectedConnectorId || !used.some(c => c.id === selectedConnectorId))) {
      setSelectedConnectorId(used[0].id);
    } else if (used.length === 0 && selectedConnectorId) {
      setSelectedConnectorId(null);
    }
  }, [sortedConnectors, selectedConnectorId]);

  const filteredConnectors = useMemo(() => {
    return sortedConnectors.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedConnectors, searchQuery]);

  const selectedConnector = useMemo(() => {
    if (!selectedConnectorId) return null;
    return sortedConnectors.find(c => c.id === selectedConnectorId) || null;
  }, [sortedConnectors, selectedConnectorId]);

  const targetFields = useMemo(() => {
    return flattenFields(layout).filter(f =>
      f.type !== 'connector' &&
      !['heading', 'divider', 'spacer', 'alert', 'group', 'fieldGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'html', 'button', 'sub_module'].includes(f.type)
    );
  }, [layout]);

  const placements = useMemo(() => {
    if (!selectedConnectorId) return [];
    const list: any[] = [];

    const fields = flattenFields(layout).filter(f => f.connectorId === selectedConnectorId);
    fields.forEach(f => {
      list.push({
        id: f.id,
        type: (f.type === 'lookup' || f.lookupSource === 'connector') ? 'lookup' : 'connector_field',
        label: f.label || f.name || f.id,
        fieldName: f.name,
        tabId: f.tabId,
        details: f
      });
    });

    const rules = (dataPopulationRules || []).filter((r: any) => r.connectorId === selectedConnectorId);
    rules.forEach((r: any) => {
      list.push({
        id: r.id,
        type: 'rule',
        label: r.name || `Trigger Rule (${r.id})`,
        details: r
      });
    });

    return list;
  }, [selectedConnectorId, layout, dataPopulationRules]);

  const selectedPlacement = useMemo(() => {
    if (placements.length === 0) return null;
    if (!selectedPlacementId) return placements[0];
    return placements.find(p => p.id === selectedPlacementId) || placements[0];
  }, [placements, selectedPlacementId]);

  const handleAddCustomRule = () => {
    if (!selectedConnector) return;
    const newRuleId = `rule-${Math.random().toString(36).substring(2, 9)}`;
    const newRule = {
      id: newRuleId,
      connectorId: selectedConnector.id,
      name: `Populate on field change`,
      triggerFieldId: '',
      triggerMode: 'visual',
      onFailure: 'ignore',
      condition: createDefaultConditionGroup(targetFields),
      inputMappings: [] as any[],
      outputMappings: [] as any[]
    };
    setDataPopulationRules(prev => [...(prev || []), newRule]);
    setSelectedPlacementId(newRuleId);
    toast.success("Created trigger rule");
  };

  const handleDeleteCustomRule = (ruleId: string) => {
    setDataPopulationRules(prev => prev.filter((r: any) => r.id !== ruleId));
    if (selectedPlacementId === ruleId) setSelectedPlacementId(null);
    toast.success("Deleted trigger rule");
  };

  const initiateDeletePlacement = (placement: any) => {
    const associatedFieldIds: string[] = [];
    const associatedFieldLabels: string[] = [];

    if (placement.type === 'rule') {
      const rule = placement.details;
      (rule.outputMappings || []).forEach((m: any) => {
        if (m.targetFieldId) {
          const f = targetFields.find(tf => tf.id === m.targetFieldId);
          if (f) {
            associatedFieldIds.push(f.id);
            associatedFieldLabels.push(f.label || f.name || f.id);
          }
        }
      });

      if (associatedFieldIds.length === 0) {
        handleDeleteCustomRule(placement.id);
        return;
      }

      setDeletePlacementConfirmation({
        id: placement.id,
        type: 'rule',
        label: placement.label,
        associatedFieldIds,
        associatedFieldLabels
      });
    } else {
      const field = placement.details;
      associatedFieldIds.push(field.id);
      associatedFieldLabels.push(`${field.label || field.name} (Lookup Field)`);

      (field.lookupOutputMappings || []).forEach((m: any) => {
        if (m.targetFieldId) {
          const f = targetFields.find(tf => tf.id === m.targetFieldId);
          if (f) {
            associatedFieldIds.push(f.id);
            associatedFieldLabels.push(f.label || f.name || f.id);
          }
        }
      });

      setDeletePlacementConfirmation({
        id: placement.id,
        type: 'lookup',
        label: placement.label,
        associatedFieldIds,
        associatedFieldLabels
      });
    }
  };

  const confirmDeletePlacement = (keepFields: boolean) => {
    if (!deletePlacementConfirmation) return;

    if (deletePlacementConfirmation.type === 'rule') {
      if (!keepFields) {
        setLayout(prev => prev.filter(f => !deletePlacementConfirmation.associatedFieldIds.includes(f.id)));
      }
      handleDeleteCustomRule(deletePlacementConfirmation.id);
    } else {
      if (!keepFields) {
        setLayout(prev => prev.filter(f => !deletePlacementConfirmation.associatedFieldIds.includes(f.id)));
        if (selectedPlacementId === deletePlacementConfirmation.id) setSelectedPlacementId(null);
        toast.success("Deleted lookup field and associated output fields");
      } else {
        setLayout(prev => prev.map(f => {
          if (f.id === deletePlacementConfirmation.id) {
            return {
              ...f,
              connectorId: undefined,
              lookupSource: f.type === 'lookup' ? 'module_records' : undefined,
              connectorSearchParam: undefined,
              connectorLabelField: undefined,
              connectorValueField: undefined,
              lookupOutputMappings: undefined
            } as Field;
          }
          return f;
        }));
        if (selectedPlacementId === deletePlacementConfirmation.id) setSelectedPlacementId(null);
        toast.success("Removed lookup placement trigger (kept layout fields)");
      }
    }

    setDeletePlacementConfirmation(null);
  };

  const handleCreateLookupField = (label: string, tabId: string) => {
    if (!selectedConnector) return;
    const newFieldId = `field-${Math.random().toString(36).substring(2, 9)}`;
    const baseSlug = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '');
    let finalSlug = baseSlug || 'lookup';
    let suffix = 1;
    const allFields = flattenFields(layout);
    while (allFields.some(f => f.name === finalSlug)) {
      finalSlug = `${baseSlug}_${suffix}`;
      suffix++;
    }

    const newField: Field = {
      id: newFieldId,
      name: finalSlug,
      type: 'lookup',
      lookupSource: 'connector',
      connectorId: selectedConnector.id,
      label: label,
      placeholder: `Search ${label}...`,
      required: false,
      colSpan: 6,
      startCol: 1,
      rowIndex: layout.length,
      tabId: tabId || 'default-tab',
      lookupOutputMappings: []
    };

    setLayout(prev => [...prev, newField]);
    setSelectedPlacementId(newFieldId);
    toast.success(`Created lookup field "${label}"`);
  };

  const handleAutoMap = () => {
    if (!selectedConnector || !selectedPlacement) return;
    const outputs = selectedConnector.ioSchema?.outputs || [];
    if (outputs.length === 0) {
      toast.info("This connector has no output fields defined.");
      return;
    }

    let count = 0;

    if (selectedPlacement.type === 'lookup') {
      const fieldId = selectedPlacement.id;
      setLayout(prev => prev.map(f => {
        if (f.id === fieldId) {
          const currentMappings = [...(f.lookupOutputMappings || [])];
          outputs.forEach((output: any) => {
            if (currentMappings.some(m => m.sourceFieldId === output.name)) return;
            const match = targetFields.find(tf =>
              tf.id === output.name ||
              (tf.name && tf.name.toLowerCase() === output.name.toLowerCase()) ||
              tf.label.toLowerCase() === (output.label || output.name).toLowerCase()
            );
            if (match) {
              currentMappings.push({
                id: Math.random().toString(36).substr(2, 9),
                sourceFieldId: output.name,
                targetFieldId: match.id
              });
              count++;
            }
          });
          return { ...f, lookupOutputMappings: currentMappings };
        }
        return f;
      }));
    } else if (selectedPlacement.type === 'rule') {
      const ruleId = selectedPlacement.id;
      setDataPopulationRules(prev => prev.map(r => {
        if (r.id === ruleId) {
          const currentMappings = [...(r.outputMappings || [])];
          outputs.forEach((output: any) => {
            if (currentMappings.some(m => m.sourceFieldId === output.name)) return;
            const match = targetFields.find(tf =>
              tf.id === output.name ||
              (tf.name && tf.name.toLowerCase() === output.name.toLowerCase()) ||
              tf.label.toLowerCase() === (output.label || output.name).toLowerCase()
            );
            if (match) {
              currentMappings.push({
                sourceFieldId: output.name,
                targetFieldId: match.id
              });
              count++;
            }
          });
          return { ...r, outputMappings: currentMappings };
        }
        return r;
      }));
    } else {
      const currentMappings = { ...(connectorMappings[selectedConnector.id] || {}) };
      outputs.forEach((output: any) => {
        if (currentMappings[output.name]) return;
        const match = targetFields.find(tf =>
          tf.id === output.name ||
          (tf.name && tf.name.toLowerCase() === output.name.toLowerCase()) ||
          tf.label.toLowerCase() === (output.label || output.name).toLowerCase()
        );
        if (match) {
          currentMappings[output.name] = match.id;
          count++;
        }
      });
      setConnectorMappings(prev => ({ ...prev, [selectedConnector.id]: currentMappings }));
    }

    if (count > 0) {
      toast.success(`Auto-mapped ${count} fields.`);
    } else {
      toast.info("No matching layout fields found by name or label.");
    }
  };

  const handleMapField = (outputName: string, targetFieldId: string, fallbackValue?: string) => {
    if (!selectedConnectorId || !selectedPlacement) return;

    if (selectedPlacement.type === 'lookup') {
      const fieldId = selectedPlacement.id;
      setLayout(prev => prev.map(f => {
        if (f.id === fieldId) {
          const currentMappings = [...(f.lookupOutputMappings || [])];
          const idx = currentMappings.findIndex(m => m.sourceFieldId === outputName);
          if (targetFieldId === '' && fallbackValue === undefined) {
            if (idx > -1) currentMappings.splice(idx, 1);
          } else if (idx > -1) {
            if (targetFieldId !== undefined) currentMappings[idx].targetFieldId = targetFieldId;
            if (fallbackValue !== undefined) currentMappings[idx].fallbackValue = fallbackValue;
          } else if (targetFieldId) {
            currentMappings.push({
              id: Math.random().toString(36).substr(2, 9),
              sourceFieldId: outputName,
              targetFieldId,
              ...(fallbackValue !== undefined ? { fallbackValue } : {})
            });
          }
          return { ...f, lookupOutputMappings: currentMappings };
        }
        return f;
      }));
    } else if (selectedPlacement.type === 'rule') {
      const ruleId = selectedPlacement.id;
      setDataPopulationRules(prev => prev.map(r => {
        if (r.id === ruleId) {
          const currentMappings = [...(r.outputMappings || [])];
          const idx = currentMappings.findIndex(m => m.sourceFieldId === outputName);
          if (targetFieldId === '' && fallbackValue === undefined) {
            if (idx > -1) currentMappings.splice(idx, 1);
          } else if (idx > -1) {
            if (targetFieldId !== undefined) currentMappings[idx].targetFieldId = targetFieldId;
            if (fallbackValue !== undefined) currentMappings[idx].fallbackValue = fallbackValue;
          } else if (targetFieldId) {
            currentMappings.push({
              sourceFieldId: outputName,
              targetFieldId,
              ...(fallbackValue !== undefined ? { fallbackValue } : {})
            });
          }
          return { ...r, outputMappings: currentMappings };
        }
        return r;
      }));
    } else {
      setConnectorMappings(prev => {
        const currentMappings = { ...(prev[selectedConnectorId] || {}) };
        if (targetFieldId === '') {
          delete currentMappings[outputName];
        } else {
          currentMappings[outputName] = targetFieldId;
        }
        return { ...prev, [selectedConnectorId]: currentMappings };
      });
    }
  };

  const handleCreateAndMapField = (outputName: string, outputLabel: string, outputType: string, customTabId?: string) => {
    if (!selectedConnector || !selectedPlacement) return;
    const label = outputLabel || outputName;
    const newFieldId = `field-${Math.random().toString(36).substring(2, 9)}`;

    const baseSlug = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '');
    let finalSlug = baseSlug || 'field';
    let suffix = 1;
    const allFields = flattenFields(layout);
    while (allFields.some(f => f.name === finalSlug)) {
      finalSlug = `${baseSlug}_${suffix}`;
      suffix++;
    }

    const isCollection = outputType === 'array' || outputType === 'object[]' || outputType === 'collection';

    const newField: Field = {
      id: newFieldId,
      name: finalSlug,
      type: (isCollection ? 'repeatableGroup' : outputType === 'number' ? 'number' : outputType === 'boolean' ? 'boolean' : 'text') as any,
      label: label,
      placeholder: isCollection ? undefined : `Enter ${label}...`,
      helperText: `Auto-populated by ${selectedConnector.name}`,
      required: false,
      colSpan: isCollection ? 12 : 6,
      startCol: 1,
      rowIndex: layout.length,
      tabId: customTabId || currentTabId || 'default-tab',
    };

    if (isCollection) {
      const outputSchema = selectedConnector.ioSchema?.outputs?.find((o: any) => o.name === outputName);
      const childItems = outputSchema?.items || [];
      newField.fields = childItems.map((item: any) => ({
        id: `field-${Math.random().toString(36).substring(2, 9)}`,
        name: item.name,
        type: (item.type === 'number' ? 'number' : item.type === 'boolean' ? 'boolean' : 'text') as any,
        label: item.label || item.name,
        required: false,
        colSpan: 6,
        startCol: 1,
        rowIndex: 0
      }));
    }

    setLayout(prev => [...prev, newField]);
    handleMapField(outputName, newFieldId);
    toast.success(`Created field "${label}" and mapped to ${outputName}`);
  };

  const handleDisconnectConnector = () => {
    if (!selectedConnector) return;
    const connectorId = selectedConnector.id;

    setLayout(prev => prev.map(f => {
      if (f.type === 'connector' && f.connectorId === connectorId) {
        return { ...f, connectorId: undefined } as Field;
      }
      if (f.connectorId === connectorId) {
        return {
          ...f,
          connectorId: undefined,
          lookupSource: f.type === 'lookup' ? 'module_records' : undefined,
          connectorSearchParam: undefined,
          connectorLabelField: undefined,
          connectorValueField: undefined,
          lookupOutputMappings: undefined
        } as Field;
      }
      return f;
    }));

    // Also remove any dataPopulationRules referencing this connector
    setDataPopulationRules(prev => (prev || []).filter((r: any) => r.connectorId !== connectorId));

    setConnectorMappings(prev => {
      const updated = { ...prev };
      delete updated[connectorId];
      return updated;
    });

    toast.success(`Disconnected ${selectedConnector.name}`);
  };

  const runTest = async () => {
    if (!selectedConnector) return;
    if (!selectedConnector.edgeFunctionUrl) {
      toast.error("This connector does not specify an edge function endpoint URL.");
      return;
    }

    setTesting(true);
    setTestResponse(null);

    try {
      const url = selectedConnector.edgeFunctionUrl.startsWith('/')
        ? `${API_BASE_URL}${selectedConnector.edgeFunctionUrl}`
        : selectedConnector.edgeFunctionUrl;

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          connectorId: selectedConnector.id,
          payload: testData,
          test: true
        })
      });
      const data = await res.json();
      setTestResponse(data);
    } catch (err: any) {
      setTestResponse({ error: err.message || 'Proxy request failed' });
    } finally {
      setTesting(false);
    }
  };

  const getNestedValue = (obj: any, path: string): any => {
    if (!obj || typeof obj !== 'object' || !path) return undefined;
    if (obj[path] !== undefined) return obj[path];
    return path.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);
  };

  // Compute dry-run mapped output preview from testResponse
  const dryRunMappedPreview = useMemo(() => {
    if (!testResponse || testResponse.error || !selectedPlacement || !selectedConnector) return [];
    const payload = testResponse.data || testResponse.result || testResponse;
    if (!payload || typeof payload !== 'object') return [];

    const mappings =
      selectedPlacement.type === 'lookup'
        ? selectedPlacement.details.lookupOutputMappings || []
        : selectedPlacement.type === 'rule'
          ? selectedPlacement.details.outputMappings || []
          : Object.entries(connectorMappings[selectedConnector.id] || {}).map(([k, v]) => ({
              sourceFieldId: k,
              targetFieldId: v
            }));

    return mappings.map((m: any) => {
      const tf = targetFields.find(f => f.id === m.targetFieldId);
      const rawVal = getNestedValue(payload, m.sourceFieldId);
      const resolvedVal = rawVal !== undefined && rawVal !== null && rawVal !== '' ? rawVal : (m.fallbackValue ?? '—');
      return {
        source: m.sourceFieldId,
        targetLabel: tf?.label || tf?.name || m.targetFieldId,
        value: typeof resolvedVal === 'object' ? JSON.stringify(resolvedVal) : String(resolvedVal)
      };
    });
  }, [testResponse, selectedPlacement, selectedConnector, connectorMappings, targetFields]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const isErr = Boolean(log.error || (log.status && log.status >= 400));
      if (logFilter === 'error') return isErr;
      if (logFilter === 'success') return !isErr;
      return true;
    });
  }, [logs, logFilter]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 relative">
      {/* 1. Left Panel: Integrations (Animated, Collapsible & Resizable) */}
      <AnimatePresence initial={false}>
        {!isLeftCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: leftWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={resizingSide === 'left' ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="relative flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full overflow-hidden"
          >
            {/* Header */}
            <div className="h-11 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Integrations</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500">
                  {sortedConnectors.filter(c => c.isUsed).length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowConnectorModal(true)}
                  className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
                <button
                  onClick={() => setIsLeftCollapsed(true)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                  title="Collapse Integrations panel"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Connectors List (Module-Bound Integrations Only) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Module Integrations ({filteredConnectors.filter(c => c.isUsed).length})
                </div>
                {filteredConnectors.filter(c => c.isUsed).length === 0 ? (
                  <div className="p-4 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2 mt-1">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      No integrations added to this module yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowConnectorModal(true)}
                      className="h-7 px-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Browse Library</span>
                    </button>
                  </div>
                ) : (
                  filteredConnectors.filter(c => c.isUsed).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConnectorId(c.id)}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg border transition-colors flex items-center gap-2.5 cursor-pointer",
                        selectedConnectorId === c.id
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60"
                          : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                        selectedConnectorId === c.id
                          ? "bg-indigo-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      )}>
                        <Zap size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{c.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{c.category}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Resize Handle */}
            <div
              onMouseDown={(e) => startResize('left', e)}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/40 transition-colors z-10"
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Center Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-50/70 dark:bg-zinc-950">
        {/* Inline h-11 Top Bar (matching Interface & Rules) */}
        <div className="h-11 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isLeftCollapsed && (
              <>
                <button
                  type="button"
                  onClick={() => setIsLeftCollapsed(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Expand Integrations panel"
                >
                  <ChevronRight size={14} />
                  <span className="hidden sm:inline">Integrations</span>
                </button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              </>
            )}
            {selectedConnector ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedConnector.name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium shrink-0">
                  {selectedConnector.category}
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 truncate">Connector Integrations</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedConnector && (
              <>
                {selectedConnector.isUsed && (
                  <button
                    type="button"
                    onClick={handleDisconnectConnector}
                    className="h-7 px-2.5 rounded-md border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span className="hidden sm:inline">Disconnect</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowConnectorModal(true)}
                  className="h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Settings2 size={12} />
                  <span className="hidden sm:inline">Switch</span>
                </button>
              </>
            )}

            {selectedConnector && isRightCollapsed && (
              <>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <button
                  type="button"
                  onClick={() => setIsRightCollapsed(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Expand Inspector panel"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Inspector</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Center Body */}
        {!selectedConnector ? (
          <div className="flex-1 overflow-y-auto px-8 pt-8 pb-24 flex">
            <div className="m-auto w-full max-w-lg text-center space-y-5">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                <Network size={24} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Connector Integrations</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Map live API data directly into module fields. Select an integration on the left or add one to configure triggers, inputs, and output mappings.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Cpu size={14} />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Auto-Provisioning</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Create compatible fields directly from API output schemas.
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Database size={14} />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Trigger Pipelines</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Trigger API lookups or conditional auto-population on field changes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectorModal(true)}
                className="inline-flex items-center gap-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Integration</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Module Triggers Bar */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Module Triggers</span>
                    <span className="text-[11px] text-zinc-400">({placements.length})</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowAddPlacementDropdown(prev => !prev)}
                      className="h-7 px-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Trigger</span>
                    </button>

                    {showAddPlacementDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowAddPlacementDropdown(false)} />
                        <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 py-1 text-left">
                          <button
                            onClick={() => {
                              setShowAddPlacementDropdown(false);
                              setShowInlineLookupModal(true);
                            }}
                            className="w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <Search size={13} className="text-zinc-400" />
                            <span>Add Lookup Field</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowAddPlacementDropdown(false);
                              handleAddCustomRule();
                            }}
                            className="w-full px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <BrainCircuit size={13} className="text-zinc-400" />
                            <span>Add Trigger Rule</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {placements.length === 0 ? (
                  <div className="p-3 text-center bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-500">
                    No triggers configured yet. Click <strong>+ Add Trigger</strong> to add a Lookup field or conditional rule.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {placements.map(p => {
                      const isSelected = selectedPlacement?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPlacementId(p.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors group",
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-medium"
                              : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                          )}
                        >
                          {p.type === 'rule' ? <BrainCircuit size={13} /> : <Search size={13} />}
                          <span className="truncate max-w-[180px]">{p.label}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateDeletePlacement(p);
                            }}
                            className="p-0.5 text-zinc-400 hover:text-rose-500 rounded opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Remove trigger"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!selectedPlacement ? (
                <div className="p-10 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center">
                  <Settings2 size={24} className="text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Select or Add a Trigger</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    Choose a trigger above to configure conditions, input payloads, and output field mappings.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Compact Stepper Bar */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                    {[
                      { step: 1, label: selectedPlacement.type === 'lookup' ? 'General' : 'Details' },
                      { step: 2, label: selectedPlacement.type === 'lookup' ? 'Input Param' : 'Conditions' },
                      { step: 3, label: selectedPlacement.type === 'lookup' ? 'Display & Value' : 'Inputs' },
                      { step: 4, label: 'Output Mappings' }
                    ].map((s, i) => {
                      const isActive = s.step === activeStep;
                      const isCompleted = s.step < activeStep;
                      return (
                        <React.Fragment key={s.step}>
                          <button
                            type="button"
                            onClick={() => setActiveStep(s.step)}
                            className="flex items-center gap-2 focus:outline-none cursor-pointer group text-left"
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full border text-[11px] font-semibold flex items-center justify-center transition-colors",
                              isActive
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : isCompleted
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
                                  : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            )}>
                              {isCompleted ? <Check size={11} /> : s.step}
                            </div>
                            <span className={cn(
                              "text-xs font-medium hidden sm:inline",
                              isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                            )}>
                              {s.label}
                            </span>
                          </button>
                          {i < 3 && (
                            <div className={cn(
                              "flex-1 h-px transition-colors",
                              isCompleted ? "bg-emerald-400/50" : "bg-zinc-200 dark:bg-zinc-800"
                            )} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Step Content */}
                  {selectedPlacement.type === 'lookup' ? (
                    <>
                      {activeStep === 1 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Lookup Field Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Field Label</label>
                              <input
                                type="text"
                                value={selectedPlacement.details.label || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, label: val } : f));
                                }}
                                className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Destination Tab</label>
                              <select
                                value={selectedPlacement.details.tabId || 'default-tab'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, tabId: val } : f));
                                }}
                                className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                              >
                                {displayTabs.map((t: any) => (
                                  <option key={t.id} value={t.id}>{t.label || t.id}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStep === 2 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Search Input Parameter</h4>
                          <p className="text-xs text-zinc-500">Select which API input parameter receives the user&apos;s lookup search query.</p>
                          <select
                            value={selectedPlacement.details.connectorSearchParam || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, connectorSearchParam: val } : f));
                            }}
                            className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Select parameter --</option>
                            {(selectedConnector.ioSchema?.inputs || []).map((input: any) => (
                              <option key={input.name} value={input.name}>{input.label || input.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {activeStep === 3 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Display &amp; Value Mapping</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Label Field (Display)</label>
                              <select
                                value={selectedPlacement.details.connectorLabelField || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, connectorLabelField: val } : f));
                                }}
                                className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">-- Select output --</option>
                                {(selectedConnector.ioSchema?.outputs || []).map((output: any) => (
                                  <option key={output.name} value={output.name}>{output.label || output.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Value Field (Stored)</label>
                              <select
                                value={selectedPlacement.details.connectorValueField || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, connectorValueField: val } : f));
                                }}
                                className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">-- Select output --</option>
                                {(selectedConnector.ioSchema?.outputs || []).map((output: any) => (
                                  <option key={output.name} value={output.name}>{output.label || output.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {activeStep === 1 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Rule Details &amp; Failure Policy</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Rule Name</label>
                              <input
                                type="text"
                                value={selectedPlacement.details.name || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, name: val } : r));
                                }}
                                className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Trigger Field (On Change)</label>
                              <select
                                value={selectedPlacement.details.triggerFieldId || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, triggerFieldId: val } : r));
                                }}
                                className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">Auto-detect from conditions</option>
                                {targetFields.map((f: any) => (
                                  <option key={f.id} value={f.id}>{f.label} ({f.name})</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">On API Error</label>
                              <select
                                value={selectedPlacement.details.onFailure || 'ignore'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, onFailure: val } : r));
                                }}
                                className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="ignore">Ignore (Use Fallbacks)</option>
                                <option value="warn">Show Warning Toast</option>
                                <option value="block">Block Record Save</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStep === 2 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Trigger Conditions</h4>
                            <div className="inline-flex p-0.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, triggerMode: 'visual' } : r))}
                                className={cn(
                                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                                  (selectedPlacement.details.triggerMode || 'visual') === 'visual'
                                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                              >
                                Visual Builder
                              </button>
                              <button
                                type="button"
                                onClick={() => setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, triggerMode: 'expression' } : r))}
                                className={cn(
                                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                                  selectedPlacement.details.triggerMode === 'expression'
                                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}
                              >
                                Expression
                              </button>
                            </div>
                          </div>

                          {(selectedPlacement.details.triggerMode || 'visual') === 'visual' ? (
                            <VisualRuleBuilder
                              conditionTree={
                                selectedPlacement.details.condition?.type
                                  ? (selectedPlacement.details.condition as ValidationConditionNode)
                                  : createDefaultConditionGroup(targetFields)
                              }
                              onChange={(nextTree) => {
                                setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, condition: nextTree } : r));
                              }}
                              fields={targetFields}
                            />
                          ) : (
                            <ExpressionEditor
                              value={selectedPlacement.details.conditionExpression || ''}
                              onChange={(val) => {
                                setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, conditionExpression: val } : r));
                              }}
                              placeholder="e.g. AND({status} == 'Approved', {priority} == 'High')"
                              availableFields={targetFields}
                              showConsole={true}
                              title="Custom Trigger Expression"
                            />
                          )}
                        </div>
                      )}

                      {activeStep === 3 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Request Input Parameters</h4>
                          <div className="space-y-2.5">
                            {(selectedConnector.ioSchema?.inputs || []).map((input: any) => {
                              const mappings = selectedPlacement.details.inputMappings || [];
                              const currentMapping = mappings.find((m: any) => m.inputName === input.name);
                              const isExpr = currentMapping?.mappingType === 'expression';
                              const currentVal = isExpr ? (currentMapping?.expression || '') : (currentMapping?.sourceFieldId || '');

                              return (
                                <div key={input.name} className="space-y-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-950/40">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200">.{input.name}</span>
                                    <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-800">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDataPopulationRules(prev => prev.map(r => {
                                            if (r.id === selectedPlacement.id) {
                                              const inputs = [...(r.inputMappings || [])];
                                              const idx = inputs.findIndex((m: any) => m.inputName === input.name);
                                              if (idx > -1) {
                                                inputs[idx].mappingType = 'field';
                                                inputs[idx].expression = undefined;
                                              } else {
                                                inputs.push({ inputName: input.name, mappingType: 'field' });
                                              }
                                              return { ...r, inputMappings: inputs };
                                            }
                                            return r;
                                          }));
                                        }}
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                                          !isExpr ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
                                        )}
                                      >
                                        Field
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDataPopulationRules(prev => prev.map(r => {
                                            if (r.id === selectedPlacement.id) {
                                              const inputs = [...(r.inputMappings || [])];
                                              const idx = inputs.findIndex((m: any) => m.inputName === input.name);
                                              if (idx > -1) {
                                                inputs[idx].mappingType = 'expression';
                                                inputs[idx].sourceFieldId = undefined;
                                              } else {
                                                inputs.push({ inputName: input.name, mappingType: 'expression' });
                                              }
                                              return { ...r, inputMappings: inputs };
                                            }
                                            return r;
                                          }));
                                        }}
                                        className={cn(
                                          "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                                          isExpr ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
                                        )}
                                      >
                                        Expr
                                      </button>
                                    </div>
                                  </div>

                                  {!isExpr ? (
                                    <select
                                      value={currentVal}
                                      onChange={(e) => {
                                        const sourceId = e.target.value;
                                        setDataPopulationRules(prev => prev.map(r => {
                                          if (r.id === selectedPlacement.id) {
                                            const currentInputs = [...(r.inputMappings || [])];
                                            const idx = currentInputs.findIndex((m: any) => m.inputName === input.name);
                                            if (sourceId === '') {
                                              if (idx > -1) currentInputs.splice(idx, 1);
                                            } else if (idx > -1) {
                                              currentInputs[idx].sourceFieldId = sourceId;
                                              currentInputs[idx].mappingType = 'field';
                                            } else {
                                              currentInputs.push({ inputName: input.name, sourceFieldId: sourceId, mappingType: 'field' });
                                            }
                                            return { ...r, inputMappings: currentInputs };
                                          }
                                          return r;
                                        }));
                                      }}
                                      className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-xs focus:outline-none focus:border-indigo-500 text-zinc-700 dark:text-zinc-300"
                                    >
                                      <option value="">-- None --</option>
                                      {targetFields.map((f: any) => (
                                        <option key={f.id} value={f.id}>{f.label} ({f.name})</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <ExpressionEditor
                                      value={currentVal}
                                      onChange={(val) => {
                                        setDataPopulationRules(prev => prev.map(r => {
                                          if (r.id === selectedPlacement.id) {
                                            const currentInputs = [...(r.inputMappings || [])];
                                            const idx = currentInputs.findIndex((m: any) => m.inputName === input.name);
                                            if (idx > -1) {
                                              currentInputs[idx].expression = val;
                                            } else {
                                              currentInputs.push({ inputName: input.name, expression: val, mappingType: 'expression' });
                                            }
                                            return { ...r, inputMappings: currentInputs };
                                          }
                                          return r;
                                        }));
                                      }}
                                      placeholder="e.g. CONCAT({first_name}, ' ', {last_name})"
                                      availableFields={targetFields}
                                      compact={true}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeStep === 4 && (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Output Mappings</h4>
                        <button
                          onClick={handleAutoMap}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
                        >
                          Auto-Map
                        </button>
                      </div>

                      {(!selectedConnector.ioSchema?.outputs || selectedConnector.ioSchema.outputs.length === 0) ? (
                        <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                          <Info size={18} className="mx-auto text-zinc-400 mb-1.5" />
                          <p className="text-xs text-zinc-500">No outputs defined in schema</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                          {selectedConnector.ioSchema.outputs
                            .filter((o: any) => selectedPlacement.type === 'rule' || o.name !== selectedPlacement.details.connectorValueField)
                            .map((output: any) => {
                              let mappingObj: any = null;
                              let targetFieldId = '';
                              if (selectedPlacement.type === 'lookup') {
                                mappingObj = (selectedPlacement.details.lookupOutputMappings || []).find((m: any) => m.sourceFieldId === output.name);
                                targetFieldId = mappingObj?.targetFieldId || '';
                              } else if (selectedPlacement.type === 'rule') {
                                mappingObj = (selectedPlacement.details.outputMappings || []).find((m: any) => m.sourceFieldId === output.name);
                                targetFieldId = mappingObj?.targetFieldId || '';
                              } else {
                                targetFieldId = (connectorMappings[selectedConnector.id] || {})[output.name] || '';
                              }

                              return (
                                <div key={output.name} className="flex flex-wrap items-center justify-between gap-2 p-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-lg">
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{output.label || output.name}</span>
                                    <span className="block text-[10px] font-mono text-zinc-400">.{output.name} ({output.type || 'string'})</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <select
                                      value={targetFieldId}
                                      onChange={(e) => handleMapField(output.name, e.target.value)}
                                      className="h-8 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-700 dark:text-zinc-200"
                                    >
                                      <option value="">-- Unmapped --</option>
                                      {targetFields.map(f => (
                                        <option key={f.id} value={f.id}>{f.label} ({f.name})</option>
                                      ))}
                                    </select>

                                    {targetFieldId && selectedPlacement.type !== 'connector_field' && (
                                      <input
                                        type="text"
                                        value={mappingObj?.fallbackValue || ''}
                                        onChange={(e) => handleMapField(output.name, targetFieldId, e.target.value)}
                                        placeholder="Fallback..."
                                        title="Optional fallback value if API returns null"
                                        className="h-8 w-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-[11px] focus:outline-none focus:border-indigo-500 text-zinc-700 dark:text-zinc-200"
                                      />
                                    )}

                                    {!targetFieldId && (
                                      <button
                                        onClick={() => setPendingFieldCreation({
                                          outputName: output.name,
                                          outputLabel: output.label || output.name,
                                          outputType: output.type || 'string'
                                        })}
                                        className="h-8 w-8 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-md transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                                        title="Create & map new module field"
                                      >
                                        <PlusCircle size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Next/Back */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                      disabled={activeStep === 1}
                      className="h-8 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={13} /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeStep < 4) setActiveStep(prev => prev + 1);
                        else toast.success("Configuration steps saved in draft");
                      }}
                      className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {activeStep === 4 ? 'Done' : 'Next'} <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Right Sidebar: Inspector (Animated, Collapsible & Resizable) */}
      <AnimatePresence initial={false}>
        {selectedConnector && !isRightCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={resizingSide === 'right' ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="relative flex-shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Resize Handle */}
            <div
              onMouseDown={(e) => startResize('right', e)}
              className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/40 transition-colors z-10"
            />

            {/* Header Tabs */}
            <div className="h-11 px-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-1 shrink-0">
              <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
                {[
                  { id: 'setup', label: 'Setup', icon: Settings2 },
                  { id: 'sandbox', label: 'Test', icon: Play },
                  { id: 'logs', label: 'Logs', icon: FileText },
                  { id: 'json', label: 'Schema', icon: Code }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id as any)}
                    className={cn(
                      "px-2 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 cursor-pointer shrink-0",
                      rightTab === tab.id
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    )}
                  >
                    <tab.icon size={11} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsRightCollapsed(true)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
                title="Collapse Inspector panel"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
              {rightTab === 'setup' ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Credentials &amp; Secrets</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Encrypted connection tokens for this integration.</p>
                  </div>

                  {!selectedTenantConnector?.isActive ? (
                    <div className="py-8 px-4 text-center bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                      <AlertCircle size={18} className="mx-auto text-amber-500" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Not Activated</p>
                      <p className="text-[11px] text-zinc-400">Activate this integration to configure credentials.</p>
                    </div>
                  ) : !selectedTenantConnector.secretsSchema || selectedTenantConnector.secretsSchema.length === 0 ? (
                    <div className="py-8 px-4 text-center bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-1.5">
                      <CheckCircle2 size={18} className="mx-auto text-emerald-500" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Zero-Config Ready</p>
                      <p className="text-[11px] text-zinc-400">No external API keys required.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTenantConnector.secretsSchema.map((field: any) => (
                        <div key={field.name} className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                            <span>{field.label || field.name}</span>
                            {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          <input
                            type={field.type === 'password' ? 'password' : 'text'}
                            value={secrets[field.name] || ''}
                            onChange={(e) => setSecrets(prev => ({ ...prev, [field.name]: e.target.value }))}
                            placeholder={field.description || `Enter ${field.name}...`}
                            className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                          />
                        </div>
                      ))}
                      <button
                        onClick={handleSaveSecrets}
                        disabled={savingSecrets}
                        className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {savingSecrets ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Save Credentials'}
                      </button>
                    </div>
                  )}
                </div>
              ) : rightTab === 'logs' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Execution Logs</h3>
                    <button
                      onClick={fetchLogs}
                      disabled={loadingLogs}
                      className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                      title="Refresh logs"
                    >
                      {loadingLogs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    {(['all', 'success', 'error'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setLogFilter(f)}
                        className={cn(
                          "py-1 text-[11px] font-medium rounded capitalize transition-colors cursor-pointer",
                          logFilter === f
                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {loadingLogs && logs.length === 0 ? (
                    <div className="py-10 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-8">No logs matching filter</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredLogs.map((log: any, idx: number) => {
                        const isErr = Boolean(log.error || (log.status && log.status >= 400));
                        const isExpanded = expandedLogId === (log.id || String(idx));
                        return (
                          <div
                            key={log.id || idx}
                            className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : (log.id || String(idx)))}
                              className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left text-xs cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isErr ? "bg-rose-500" : "bg-emerald-500")} />
                                <span className="font-mono text-[11px] truncate text-zinc-800 dark:text-zinc-200">
                                  {log.status || (isErr ? 'ERR' : '200')}
                                </span>
                                {log.latencyMs && (
                                  <span className="text-[10px] text-zinc-400">{log.latencyMs}ms</span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 shrink-0">
                                {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : 'Recent'}
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                                {log.payload && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTestData(log.payload);
                                      setRightTab('sandbox');
                                      toast.info('Loaded log payload into Sandbox');
                                    }}
                                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Play size={10} />
                                    <span>Replay in Sandbox</span>
                                  </button>
                                )}
                                <pre className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-40">
                                  {JSON.stringify(log.response || log.error || log, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : rightTab === 'sandbox' ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Test Sandbox</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Execute live test requests and preview field mappings.</p>
                  </div>

                  <div className="space-y-2.5">
                    {(selectedConnector.ioSchema?.inputs || []).map((input: any) => (
                      <div key={input.name} className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                          <span>{input.label || input.name}</span>
                          {input.required && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type={input.type === 'number' ? 'number' : 'text'}
                          placeholder={input.description || `Value for ${input.name}`}
                          value={testData[input.name] || ''}
                          onChange={(e) => setTestData(prev => ({ ...prev, [input.name]: e.target.value }))}
                          className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={runTest}
                    disabled={testing}
                    className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} />}
                    <span>Run Test</span>
                  </button>

                  {/* Dry-Run Mapped Output Preview */}
                  {dryRunMappedPreview.length > 0 && (
                    <div className="p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1.5">
                      <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        Mapped Field Preview
                      </p>
                      <div className="space-y-1">
                        {dryRunMappedPreview.map((row: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-zinc-500 flex items-center gap-1 truncate">
                              <code className="font-mono">.{row.source}</code>
                              <ArrowRight size={10} />
                              <span className="font-medium text-zinc-700 dark:text-zinc-200 truncate">{row.targetLabel}</span>
                            </span>
                            <span className="font-mono text-zinc-900 dark:text-zinc-100 truncate max-w-[100px]">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testResponse && (
                    <div className={cn(
                      "p-3 rounded-lg border space-y-1.5",
                      testResponse.error
                        ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400"
                        : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400"
                    )}>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{testResponse.error ? 'Test Failed' : '200 OK'}</span>
                      </div>
                      <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
                        {JSON.stringify(testResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">IO Schema</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Raw input/output schema definition.</p>
                  </div>
                  <pre className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg text-[10px] font-mono overflow-y-auto custom-scrollbar text-zinc-700 dark:text-zinc-300 max-h-[60vh]">
                    {JSON.stringify(selectedConnector.ioSchema, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Placement Tab Prompt Modal */}
      <AnimatePresence>
        {pendingFieldCreation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4"
            >
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Select Placement Tab</h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Choose where to place the new field: <strong className="text-indigo-600 dark:text-indigo-400">{pendingFieldCreation.outputLabel || pendingFieldCreation.outputName}</strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Destination Tab</label>
                <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 bg-zinc-50 dark:bg-zinc-950">
                  {displayTabs.map((tab: any) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedDestinationTabId(tab.id)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                        selectedDestinationTabId === tab.id
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                      style={{ paddingLeft: tab.depth === 1 ? '1.5rem' : '0.75rem' }}
                    >
                      <span className="flex items-center gap-1">
                        {tab.depth === 1 && <span className="opacity-40">↳</span>}
                        <span>{tab.label || tab.id}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {setTabs && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  {showCreateTabForm ? (
                    <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 space-y-2.5">
                      <input
                        type="text"
                        placeholder="New tab label..."
                        value={newTabLabel}
                        onChange={(e) => setNewTabLabel(e.target.value)}
                        className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                      />
                      <select
                        value={newTabParentId}
                        onChange={(e) => setNewTabParentId(e.target.value)}
                        className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <option value="">Root Tab</option>
                        {tabs.filter((t: any) => !t.parentId).map((t: any) => (
                          <option key={t.id} value={t.id}>{t.label || t.id}</option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setShowCreateTabForm(false); setNewTabLabel(''); setNewTabParentId(''); }}
                          className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!newTabLabel.trim()) return toast.error("Please enter a tab label");
                            const newTabId = `tab-${Math.random().toString(36).substring(2, 9)}`;
                            const newTab = { id: newTabId, label: newTabLabel.trim(), parentId: newTabParentId || undefined };
                            setTabs([...tabs, newTab]);
                            setSelectedDestinationTabId(newTabId);
                            setShowCreateTabForm(false);
                            setNewTabLabel('');
                            setNewTabParentId('');
                          }}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-md text-xs font-medium cursor-pointer"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreateTabForm(true)}
                      className="w-full py-1.5 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Create New Tab</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  onClick={() => setPendingFieldCreation(null)}
                  className="h-8 px-3 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (pendingFieldCreation) {
                      handleCreateAndMapField(
                        pendingFieldCreation.outputName,
                        pendingFieldCreation.outputLabel,
                        pendingFieldCreation.outputType,
                        selectedDestinationTabId
                      );
                      setPendingFieldCreation(null);
                    }
                  }}
                  className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Create Field
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline Lookup Field Modal */}
      <AnimatePresence>
        {showInlineLookupModal && selectedConnector && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4"
            >
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Create Lookup Field</h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Add a Lookup field powered by <strong className="text-indigo-600 dark:text-indigo-400">{selectedConnector.name}</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Field Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Zipcode Lookup"
                    value={inlineLookupLabel}
                    onChange={(e) => setInlineLookupLabel(e.target.value)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Destination Tab</label>
                  <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-lg p-1 bg-zinc-50 dark:bg-zinc-950">
                    {displayTabs.map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setInlineLookupTabId(tab.id)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                          inlineLookupTabId === tab.id
                            ? "bg-indigo-600 text-white"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        style={{ paddingLeft: tab.depth === 1 ? '1.5rem' : '0.75rem' }}
                      >
                        <span>{tab.label || tab.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  onClick={() => { setShowInlineLookupModal(false); setInlineLookupLabel(''); }}
                  className="h-8 px-3 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!inlineLookupLabel.trim()) return toast.error("Please enter a field label");
                    handleCreateLookupField(inlineLookupLabel.trim(), inlineLookupTabId);
                    setShowInlineLookupModal(false);
                    setInlineLookupLabel('');
                  }}
                  className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                >
                  Create Field
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Placement Confirmation Modal */}
      <AnimatePresence>
        {deletePlacementConfirmation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Remove Placement Trigger</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Removing <strong>{deletePlacementConfirmation.label}</strong> affects these mapped fields:
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                {deletePlacementConfirmation.associatedFieldLabels.map((label, idx) => (
                  <div key={idx} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => confirmDeletePlacement(false)}
                  className="w-full h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>Delete Associated Fields</span>
                </button>
                <button
                  onClick={() => confirmDeletePlacement(true)}
                  className="w-full h-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={12} />
                  <span>Keep Fields (Unmap Only)</span>
                </button>
                <button
                  onClick={() => setDeletePlacementConfirmation(null)}
                  className="w-full h-8 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
