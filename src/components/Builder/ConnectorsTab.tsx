import React, { useState, useMemo, useEffect } from 'react';
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
  CheckCircle,
  Sparkles,
  BrainCircuit,
  Check,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, flattenFields } from '../../lib/utils';
import { toast } from 'sonner';
import { Field } from '../ModuleEditor';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { ConditionModal } from './ConditionModal';
import { ExpressionEditor } from './ExpressionEditor';

const getRuleSummary = (rule: any, fields: any[]): string => {
  if (!rule) return 'No conditions defined (runs on any change to referenced fields)';
  if (rule.type === 'rule') {
    const field = fields.find(f => f.id === rule.fieldId);
    const label = field ? field.label : rule.fieldId;
    return `${label || rule.fieldId} ${rule.operator} ${rule.value || ''}`;
  }
  if (rule.type === 'group') {
    const children = (rule.rules || []).map((r: any) => getRuleSummary(r, fields)).filter((c: string) => c && !c.includes('No conditions'));
    if (children.length === 0) return 'No conditions defined (runs on any change to referenced fields)';
    return `(${children.join(` ${rule.logicalOperator || 'AND'} `)})`;
  }
  if (rule.fieldId) {
    const field = fields.find(f => f.id === rule.fieldId);
    const label = field ? field.label : rule.fieldId;
    return `${label || rule.fieldId} ${rule.operator || 'equals'} ${rule.value || ''}`;
  }
  return 'No conditions defined (runs on any change to referenced fields)';
};

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
  handleCreateCustomConnector
}) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
  const [rightTab, setRightTab] = useState<'setup' | 'sandbox' | 'logs' | 'ai' | 'json'>('setup');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'prod' | 'test'>('all');
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [savingSecrets, setSavingSecrets] = useState(false);
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [pendingFieldCreation, setPendingFieldCreation] = useState<{
    outputName: string;
    outputLabel: string;
    outputType: string;
  } | null>(null);
  const [selectedDestinationTabId, setSelectedDestinationTabId] = useState<string>('default-tab');
  const [editingTriggerCondition, setEditingTriggerCondition] = useState<{ ruleId: string; rule: any } | null>(null);
  const [showCreateTabForm, setShowCreateTabForm] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState('');
  const [newTabParentId, setNewTabParentId] = useState('');

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
    // fallback for any orphaned subtabs
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
  const [testing, setTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // AI states
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset test state and test inputs when selected connector transitions
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
        setLogs(data);
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
        toast.success('Configuration saved successfully');
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

  const handleAddCustomRule = () => {
    if (!selectedConnector) return;
    const newRuleId = `rule-${Math.random().toString(36).substring(2, 9)}`;
    const newRule = {
      id: newRuleId,
      connectorId: selectedConnector.id,
      name: `Populate on field change`,
      triggerFieldId: '',
      condition: { fieldId: '', operator: 'not_null', value: '' },
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
    };
  };

  // Identify connectors currently utilized by fields in this module layout
  const usedConnectorIds = useMemo(() => {
    return new Set(
      flattenFields(layout)
        .filter(f => (f.type === 'connector' || f.lookupSource === 'connector') && f.connectorId)
        .map(f => f.connectorId)
    );
  }, [layout]);

  // List active connectors and separate them by usage
  const sortedConnectors = useMemo(() => {
    return activeConnectors.map(c => {
      const details = getConnectorDetails(c);
      const isUsed = usedConnectorIds.has(details.id);
      return { ...c, ...details, isUsed };
    });
  }, [activeConnectors, connectorRegistry, usedConnectorIds]);

  // Filter based on search query
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

  // Get compatible target fields in the layout for mapping
  const targetFields = useMemo(() => {
    return flattenFields(layout).filter(f => 
      f.type !== 'connector' && 
      !['heading', 'divider', 'spacer', 'alert', 'group', 'fieldGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'html', 'button', 'sub_module'].includes(f.type)
    );
  }, [layout]);

  // Find fields in layout or execution rules in config that use this connector
  const placements = useMemo(() => {
    if (!selectedConnectorId) return [];
    const list: any[] = [];
    
    // 1. Find lookup fields or connector block fields in the layout
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
    
    // 2. Find data population rules
    const rules = (dataPopulationRules || []).filter((r: any) => r.connectorId === selectedConnectorId);
    rules.forEach((r: any) => {
      list.push({
        id: r.id,
        type: 'rule',
        label: r.name || `Execution Rule (${r.id})`,
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

  // Auto-map output fields to layout fields of the same name/label
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
      toast.success(`Successfully auto-mapped ${count} fields.`);
    } else {
      toast.info("No matching layout fields found by name or label.");
    }
  };

  // Manually update mapping
  const handleMapField = (outputName: string, targetFieldId: string) => {
    if (!selectedConnectorId || !selectedPlacement) return;

    if (selectedPlacement.type === 'lookup') {
      const fieldId = selectedPlacement.id;
      setLayout(prev => prev.map(f => {
        if (f.id === fieldId) {
          const currentMappings = [...(f.lookupOutputMappings || [])];
          const idx = currentMappings.findIndex(m => m.sourceFieldId === outputName);
          if (targetFieldId === '') {
            if (idx > -1) currentMappings.splice(idx, 1);
          } else {
            if (idx > -1) {
              currentMappings[idx].targetFieldId = targetFieldId;
            } else {
              currentMappings.push({
                id: Math.random().toString(36).substr(2, 9),
                sourceFieldId: outputName,
                targetFieldId: targetFieldId
              });
            }
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
          if (targetFieldId === '') {
            if (idx > -1) currentMappings.splice(idx, 1);
          } else {
            if (idx > -1) {
              currentMappings[idx].targetFieldId = targetFieldId;
            } else {
              currentMappings.push({
                sourceFieldId: outputName,
                targetFieldId: targetFieldId
              });
            }
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

  // Create a new layout field and map it directly
  const handleCreateAndMapField = (outputName: string, outputLabel: string, outputType: string, customTabId?: string) => {
    if (!selectedConnector || !selectedPlacement) return;
    const label = outputLabel || outputName;
    const newFieldId = `field-${Math.random().toString(36).substring(2, 9)}`;

    // Generate unique slug
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

    if (selectedPlacement.type === 'lookup') {
      const fieldId = selectedPlacement.id;
      setLayout(prev => prev.map(f => {
        if (f.id === fieldId) {
          const currentMappings = [...(f.lookupOutputMappings || [])];
          currentMappings.push({
            id: Math.random().toString(36).substr(2, 9),
            sourceFieldId: outputName,
            targetFieldId: newFieldId
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
          currentMappings.push({
            sourceFieldId: outputName,
            targetFieldId: newFieldId
          });
          return { ...r, outputMappings: currentMappings };
        }
        return r;
      }));
    } else {
      setConnectorMappings(prev => {
        const currentMappings = { ...(prev[selectedConnector.id] || {}) };
        currentMappings[outputName] = newFieldId;
        return { ...prev, [selectedConnector.id]: currentMappings };
      });
    }

    toast.success(`Created field "${label}" and mapped to ${outputName}`);
  };

  const handleDisconnectConnector = () => {
    if (!selectedConnector) return;
    const connectorId = selectedConnector.id;

    // 1. Remove references from layout fields
    setLayout(prev => {
      return prev.map(f => {
        // If it's a legacy connector block referencing this connector
        if (f.type === 'connector' && f.connectorId === connectorId) {
          return {
            ...f,
            connectorId: undefined
          } as Field;
        }
        // If it's a field (e.g. lookup) referencing this connector
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
      });
    });

    // 2. Remove mappings
    setConnectorMappings(prev => {
      const updated = { ...prev };
      delete updated[connectorId];
      return updated;
    });

    toast.success(`Successfully disconnected ${selectedConnector.name} integration`);
  };

  // Live proxy test execution
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

  // AI connector forge executor
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const generatedSchema = await handleForgeConnector(aiPrompt);
      if (generatedSchema) {
        const created = await handleCreateCustomConnector(generatedSchema);
        toast.success(`Successfully forged and active connector "${generatedSchema.name || 'AI Custom Connector'}"`);
        setAiPrompt('');
        setRightTab('sandbox');
        
        // Auto-select newly forged connector
        if (created && (created.id || created.activation?.id)) {
          setSelectedConnectorId(created.id || created.activation?.id);
        }
      } else {
        throw new Error("No connector configuration generated.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Shadow Architect failed to forge connector configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Left Panel: Connectors List */}
      <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Integrations</h3>
            <button 
              onClick={() => setShowConnectorModal(true)}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-md text-[9px] font-bold uppercase tracking-wider transition-all"
            >
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search active integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Connectors List Scroll Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* Active in Module Section */}
          <div className="space-y-1.5">
            <div className="px-2 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Active in Module ({filteredConnectors.filter(c => c.isUsed).length})
            </div>
            {filteredConnectors.filter(c => c.isUsed).length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 italic">
                No integrations added to layout
              </div>
            ) : (
              filteredConnectors.filter(c => c.isUsed).map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConnectorId(c.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden group",
                    selectedConnectorId === c.id 
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/5"
                      : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl text-white shadow-sm flex items-center justify-center",
                    selectedConnectorId === c.id ? "bg-indigo-600" : "bg-zinc-500/20 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}>
                    <Zap size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{c.name}</p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest">{c.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold uppercase tracking-wider">
                      In Use
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Other Configured Connectors Section */}
          <div className="space-y-1.5">
            <div className="px-2 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Available Integrations ({filteredConnectors.filter(c => !c.isUsed).length})
            </div>
            {filteredConnectors.filter(c => !c.isUsed).length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 italic">
                No inactive integrations
              </div>
            ) : (
              filteredConnectors.filter(c => !c.isUsed).map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConnectorId(c.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden group",
                    selectedConnectorId === c.id 
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-500/5"
                      : "bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl text-white shadow-sm flex items-center justify-center",
                    selectedConnectorId === c.id ? "bg-indigo-600" : "bg-zinc-500/20 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}>
                    <Zap size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{c.name}</p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest">{c.category}</p>
                  </div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[8px] font-bold uppercase tracking-wider">
                    Ready
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Right Panel: Detail & Mappings */}
      {!selectedConnector ? (
        <div className="flex-1 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col items-center justify-center p-12 text-center space-y-8 overflow-y-auto h-full">
          <div className="relative inline-flex items-center justify-center p-8 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-[3rem] border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
            <Network className="w-16 h-16 text-indigo-500 animate-pulse" />
            <div className="absolute -inset-2 bg-indigo-500/20 rounded-[3.5rem] blur-xl opacity-50 -z-10 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Connector Integrations Hub</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
              Map real-time third party API data directly into module fields. Add a Connector trigger to your forms, then configure response maps below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-xl mx-auto pt-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Cpu size={16} />
              </div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Auto-Provisioning</h4>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Auto-create compatible fields with proper data-types instantly matching API payloads.
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500">
                <Database size={16} />
              </div>
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Live Data Pipelines</h4>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Input search values in the form, and watch downstream inputs instantly resolve API output responses.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setShowConnectorModal(true)}
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus size={14} /> Add New Integration
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Column 2: Module Triggers (side panel) */}
          <aside className="w-72 border-r border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar flex-shrink-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Module Triggers</h3>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowAddPlacementDropdown(prev => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 hover:text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Plus size={10} /> Add
                  </button>
                  
                  {showAddPlacementDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAddPlacementDropdown(false)} />
                      <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1.5 text-left">
                        <button
                          onClick={() => {
                            setShowAddPlacementDropdown(false);
                            setShowInlineLookupModal(true);
                          }}
                          className="w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Search size={12} className="text-zinc-400" />
                          <span>Add Lookup Field</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowAddPlacementDropdown(false);
                            handleAddCustomRule();
                          }}
                          className="w-full px-3.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <BrainCircuit size={12} className="text-zinc-400" />
                          <span>Add Custom Trigger Rule</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal px-1">
                Triggers that execute this connector.
              </p>
            </div>

            <div className="space-y-3">
                  {placements.length === 0 ? (
                    <div className="p-6 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                      <AlertCircle size={20} className="mx-auto text-amber-500 animate-bounce" />
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-widest">No Active Triggers</p>
                        <p className="text-[8px] text-zinc-400 leading-relaxed">
                          Configure a Lookup field or custom execution rule.
                        </p>
                      </div>
                    </div>
                  ) : (
                    placements.map(p => {
                      const isSelected = selectedPlacement?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPlacementId(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedPlacementId(p.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                            isSelected 
                              ? "bg-indigo-50/40 dark:bg-indigo-950/10 border-indigo-500/50 shadow-sm"
                              : "bg-white dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0",
                            isSelected 
                              ? "bg-indigo-600" 
                              : "bg-zinc-500/10 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                          )}>
                            {p.type === 'rule' ? <BrainCircuit size={14} /> : <Search size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{p.label}</p>
                            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                              {p.type === 'rule' 
                                ? `On: ${flattenFields(layout).find(f => f.id === p.details.triggerFieldId)?.label || 'No trigger'}`
                                : `Field: ${p.fieldName}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateDeletePlacement(p);
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
            </div>
          </aside>

          {/* Column 3: Settings & Mappings (main panel) */}
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col gap-8">
                {/* Header Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Zap size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{selectedConnector.name}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] font-black uppercase tracking-wider">
                          {selectedConnector.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">
                        ID: {selectedConnector.id}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-stretch md:self-auto border-t md:border-t-0 pt-4 md:pt-0 border-zinc-100 dark:border-zinc-800">
                    {selectedConnector.isUsed && (
                      <button
                        onClick={handleDisconnectConnector}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-rose-200 dark:border-rose-900/50 hover:border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Disconnect
                      </button>
                    )}
                    <button
                      onClick={() => setShowConnectorModal(true)}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      <Settings2 size={12} />
                      Credentials Settings
                    </button>
                  </div>
                </div>

                {!selectedPlacement ? (
                  <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center flex-1 min-h-[300px]">
                    <Settings2 size={32} className="text-zinc-300 dark:text-zinc-700 animate-spin mb-4" />
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Select trigger</p>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Choose a trigger from the left list or click "Add" to start mapping API outputs to form fields.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full">
                    {/* Stepper progress bar */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm text-left shrink-0">
                      {[
                        { step: 1, label: selectedPlacement.type === 'lookup' ? 'General' : 'Details' },
                        { step: 2, label: selectedPlacement.type === 'lookup' ? 'Input Param' : 'Conditions' },
                        { step: 3, label: selectedPlacement.type === 'lookup' ? 'Display & Value' : 'Inputs Payload' },
                        { step: 4, label: 'Output Mappings' }
                      ].map((s, i) => {
                        const isActive = s.step === activeStep;
                        const isCompleted = s.step < activeStep;
                        const isUpcoming = s.step > activeStep;
                        return (
                          <React.Fragment key={s.step}>
                            <button
                              type="button"
                              onClick={() => setActiveStep(s.step)}
                              className="flex items-center gap-2 focus:outline-none cursor-pointer group text-left"
                            >
                              <div className={cn(
                                "w-6 h-6 rounded-full border text-[9px] font-black flex items-center justify-center transition-all duration-350",
                                isActive && "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-110",
                                isCompleted && "bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-400 group-hover:bg-emerald-500/20",
                                isUpcoming && "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 group-hover:border-zinc-300 dark:group-hover:border-zinc-750"
                              )}>
                                {isCompleted ? <Check size={10} className="stroke-[3]" /> : s.step}
                              </div>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-[7.5px] font-black uppercase tracking-widest transition-colors duration-300",
                                  isActive && "text-indigo-650 dark:text-indigo-400 font-black",
                                  isCompleted && "text-zinc-500 dark:text-zinc-400 font-medium",
                                  isUpcoming && "text-zinc-400 dark:text-zinc-600 font-medium"
                                )}>
                                  Step 0{s.step}
                                </span>
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest transition-colors duration-300 mt-0.5",
                                  isActive && "text-zinc-900 dark:text-white",
                                  isCompleted && "text-zinc-650 dark:text-zinc-350",
                                  isUpcoming && "text-zinc-400 dark:text-zinc-500"
                                )}>
                                  {s.label}
                                </span>
                              </div>
                            </button>
                            {i < 3 && (
                              <div className={cn(
                                "h-0.5 flex-1 transition-all duration-300",
                                s.step < activeStep ? "bg-indigo-500/40" : "bg-zinc-200 dark:bg-zinc-800"
                              )} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Step Cards Stack */}
                    <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                      {selectedPlacement.type === 'lookup' ? (
                        <>
                          {/* LOOKUP STEP 1 */}
                          {activeStep === 1 && (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                              <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    STEP 01
                                  </span>
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">General Info & Destination</h4>
                                </div>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Placement Settings</span>
                              </div>
                              
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                                Configure the field label and which tab in the module page layout this lookup field will reside.
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Field Label</label>
                                  <input
                                    type="text"
                                    value={selectedPlacement.label}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, label: val } : f));
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 dark:text-white font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Destination Tab</label>
                                  <select
                                    value={selectedPlacement.tabId || 'default-tab'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, tabId: val } : f));
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-zinc-700 dark:text-zinc-300 font-bold"
                                  >
                                    {displayTabs.map((t: any) => (
                                      <option key={t.id} value={t.id}>
                                        {t.depth === 1 ? '↳ ' : ''}{t.label || t.id}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* LOOKUP STEP 2 */}
                          {activeStep === 2 && (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                              <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    STEP 02
                                  </span>
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Lookup Search Parameter (Input)</h4>
                                </div>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Request Parameter</span>
                              </div>
                              
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                                Select the API request parameter that will be mapped to the search term entered into this lookup field.
                              </p>
                              
                              <div>
                                <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Search Parameter</label>
                                <select
                                  value={selectedPlacement.details.connectorSearchParam || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, connectorSearchParam: val } : f));
                                  }}
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-zinc-755 dark:text-zinc-300 font-mono text-[10px]"
                                >
                                  <option value="">-- Select parameter --</option>
                                  {(selectedConnector.ioSchema?.inputs || []).map((input: any) => (
                                    <option key={input.name} value={input.name}>{input.label || input.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* LOOKUP STEP 3 */}
                          {activeStep === 3 && (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                              <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    STEP 03
                                  </span>
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Display & Value Mapping</h4>
                                </div>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Core Mappings</span>
                              </div>
                              
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                                Specify which API response output fields represent the display label and the stored database value.
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Label Field (Display Output)</label>
                                  <select
                                    value={selectedPlacement.details.connectorLabelField || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, connectorLabelField: val } : f));
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-zinc-755 dark:text-zinc-300 font-mono text-[10px]"
                                  >
                                    <option value="">-- Select output --</option>
                                    {(selectedConnector.ioSchema?.outputs || []).map((output: any) => (
                                      <option key={output.name} value={output.name}>{output.label || output.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Value Field (Database Store Output)</label>
                                  <select
                                    value={selectedPlacement.details.connectorValueField || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLayout(prev => prev.map(f => f.id === selectedPlacement.id ? { ...f, connectorValueField: val } : f));
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-zinc-755 dark:text-zinc-300 font-mono text-[10px]"
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
                          {/* RULE STEP 1 */}
                          {activeStep === 1 && (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                              <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    STEP 01
                                  </span>
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Rule Details</h4>
                                </div>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Basic Info</span>
                              </div>
                              
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                                Give your data population rule a clear name and choose which layout field triggers this connection when changed.
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Rule Name</label>
                                  <input
                                    type="text"
                                    value={selectedPlacement.details.name || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, name: val } : r));
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 dark:text-white font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Trigger Field (On Change)</label>
                                  <select
                                    value={selectedPlacement.details.triggerFieldId || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, triggerFieldId: val } : r));
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-zinc-700 dark:text-zinc-300 font-bold"
                                  >
                                    <option value="">-- None (Auto-detect from conditions) --</option>
                                    {targetFields.map((f: any) => (
                                      <option key={f.id} value={f.id}>{f.label} ({f.name})</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* RULE STEP 2 */}
                          {activeStep === 2 && (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                              <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-655 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    STEP 02
                                  </span>
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Trigger Conditions</h4>
                                </div>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Logical Filter</span>
                              </div>
                              
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                                Configure the logical filter that must evaluate to true for the integration trigger to execute.
                              </p>
                              
                              <div>
                                <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Trigger Condition Mode</label>
                                <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200 dark:border-zinc-800 mb-3 max-w-xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, triggerMode: 'visual' } : r));
                                    }}
                                    className={cn(
                                      "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all",
                                      (selectedPlacement.details.triggerMode || 'visual') === 'visual'
                                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                    )}
                                  >
                                    Visual Builder
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDataPopulationRules(prev => prev.map(r => r.id === selectedPlacement.id ? { ...r, triggerMode: 'expression' } : r));
                                    }}
                                    className={cn(
                                      "flex-1 py-1 rounded-lg text-[10px] font-bold transition-all",
                                      selectedPlacement.details.triggerMode === 'expression'
                                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                    )}
                                  >
                                    Custom Expression
                                  </button>
                                </div>
                              </div>

                              {(selectedPlacement.details.triggerMode || 'visual') === 'visual' ? (
                                <div className="space-y-2.5">
                                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Trigger Conditions</label>
                                  <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                                    <div className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 font-mono bg-white dark:bg-zinc-950 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-24 overflow-y-auto break-all">
                                      {getRuleSummary(selectedPlacement.details.condition, targetFields)}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTriggerCondition({
                                        ruleId: selectedPlacement.id,
                                        rule: selectedPlacement.details.condition
                                      })}
                                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                                    >
                                      <BrainCircuit size={14} />
                                      Edit Conditions
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
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
                                </div>
                              )}
                            </div>
                          )}

                          {/* RULE STEP 3 */}
                          {activeStep === 3 && (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4 text-left">
                              <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                    STEP 03
                                  </span>
                                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Request Input Parameters</h4>
                                </div>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Input Payload</span>
                              </div>
                              
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                                Map source fields or write custom expression formulas to populate the required payload parameters sent to this integration.
                              </p>
                              
                              <div className="space-y-3">
                                {(selectedConnector.ioSchema?.inputs || []).map((input: any) => {
                                  const mappings = selectedPlacement.details.inputMappings || [];
                                  const currentMapping = mappings.find((m: any) => m.inputName === input.name);
                                  const isExpr = currentMapping?.mappingType === 'expression';
                                  const currentVal = isExpr ? (currentMapping?.expression || '') : (currentMapping?.sourceFieldId || '');
                                  
                                  return (
                                    <div key={input.name} className="space-y-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 font-mono">.{input.name}</span>
                                        
                                        <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-800">
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
                                              "px-2 py-0.5 rounded-md text-[8.5px] font-bold transition-all",
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
                                              "px-2 py-0.5 rounded-md text-[8.5px] font-bold transition-all",
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
                                                } else {
                                                  if (idx > -1) {
                                                    currentInputs[idx].sourceFieldId = sourceId;
                                                    currentInputs[idx].mappingType = 'field';
                                                  } else {
                                                    currentInputs.push({
                                                      inputName: input.name,
                                                      sourceFieldId: sourceId,
                                                      mappingType: 'field'
                                                    });
                                                  }
                                                }
                                                return { ...r, inputMappings: currentInputs };
                                              }
                                              return r;
                                            }));
                                          }}
                                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-700 dark:text-zinc-300"
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
                                                  currentInputs.push({
                                                    inputName: input.name,
                                                    expression: val,
                                                    mappingType: 'expression'
                                                  });
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

                      {/* LOOKUP/RULE STEP 4: OUTPUT MAPPINGS */}
                      {activeStep === 4 && (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm text-left">
                          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                STEP 04
                              </span>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Output Mappings</h4>
                            </div>

                            <button 
                              onClick={handleAutoMap}
                              className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-650 dark:text-indigo-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                            >
                              Auto-Map
                            </button>
                          </div>
                          
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                            {selectedPlacement.type === 'lookup' 
                              ? 'Map other API response fields to auto-populate layout fields on selection.'
                              : 'Choose which layout fields will auto-populate with the API response outputs.'}
                          </p>

                          {(!selectedConnector.ioSchema?.outputs || selectedConnector.ioSchema.outputs.length === 0) ? (
                            <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                              <Info size={20} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                              <p className="text-[10px] text-zinc-400 font-bold uppercase">No outputs defined in schema</p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                              {selectedConnector.ioSchema.outputs.filter((o: any) => selectedPlacement.type === 'rule' || o.name !== selectedPlacement.details.connectorValueField).map((output: any) => {
                                let targetFieldId = '';
                                if (selectedPlacement.type === 'lookup') {
                                  const mappings = selectedPlacement.details.lookupOutputMappings || [];
                                  targetFieldId = mappings.find((m: any) => m.sourceFieldId === output.name)?.targetFieldId || '';
                                } else if (selectedPlacement.type === 'rule') {
                                  const mappings = selectedPlacement.details.outputMappings || [];
                                  targetFieldId = mappings.find((m: any) => m.sourceFieldId === output.name)?.targetFieldId || '';
                                } else {
                                  const mappings = connectorMappings[selectedConnector.id] || {};
                                  targetFieldId = mappings[output.name] || '';
                                }

                                return (
                                  <div key={output.name} className="flex items-center justify-between gap-3 p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10 rounded-2xl hover:border-indigo-500/25 transition-all">
                                    <div className="min-w-0 text-left">
                                      <span className="block text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{output.label || output.name}</span>
                                      <span className="block text-[7.5px] font-mono text-zinc-400">.{output.name} ({output.type || 'string'})</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <select
                                        value={targetFieldId}
                                        onChange={(e) => handleMapField(output.name, e.target.value)}
                                        className="w-32 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-1 px-2 text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-700 dark:text-zinc-300"
                                      >
                                        <option value="">-- Unmapped --</option>
                                        {targetFields.map(f => (
                                          <option key={f.id} value={f.id}>{f.label} ({f.name})</option>
                                        ))}
                                      </select>
                                      
                                      {!targetFieldId && (
                                        <button
                                          onClick={() => setPendingFieldCreation({
                                            outputName: output.name,
                                            outputLabel: output.label || output.name,
                                            outputType: output.type || 'string'
                                          })}
                                          className="p-1 text-indigo-650 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors border border-indigo-500/20 cursor-pointer"
                                        >
                                          <PlusCircle size={12} />
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
                    </div>

                    {/* Wizard footer Next/Back buttons */}
                    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-auto shrink-0 bg-transparent">
                      <button
                        type="button"
                        onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                        disabled={activeStep === 1}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft size={12} /> Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeStep < 4) {
                            setActiveStep(prev => prev + 1);
                          } else {
                            toast.success("All configuration steps mapped!");
                          }
                        }}
                        className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-650/10"
                      >
                        {activeStep === 4 ? 'Done' : 'Next'} <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

            {/* Column 4: Sandbox, AI Builder & Schema */}
            <aside className="w-80 flex-shrink-0 bg-white dark:bg-zinc-950 p-4 flex flex-col gap-6 border-l border-zinc-100 dark:border-zinc-900 overflow-y-auto custom-scrollbar">
          {/* Tab Selector */}
          <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-900 pb-2 bg-transparent shrink-0">
            {[
              { id: 'setup', label: 'Setup', icon: Settings2 },
              { id: 'sandbox', label: 'Sandbox', icon: Play },
              { id: 'logs', label: 'Logs', icon: FileText },
              { id: 'ai', label: 'AI', icon: Sparkles },
              { id: 'json', label: 'Schema', icon: Code }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setRightTab(tab.id as any)}
                className={cn(
                  "flex-1 py-2 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer",
                  rightTab === tab.id 
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm" 
                    : "text-zinc-500 border-transparent hover:bg-zinc-100/50"
                )}
              >
                <tab.icon size={11} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {rightTab === 'setup' ? (
            <div className="flex flex-col gap-4 flex-1 min-h-0 text-left">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Secure Configuration</h3>
                <p className="text-[9px] text-zinc-400 leading-relaxed">
                  Provide credentials, API tokens, and connection secrets for this integration.
                </p>
              </div>

              {!selectedTenantConnector?.isActive ? (
                <div className="flex flex-col items-center justify-center py-10 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <AlertCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-medium text-center px-4 leading-normal">
                    Activate this integration in the main tab to configure secure secrets.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {(selectedConnector.ioSchema?.config || []).map((field: any) => (
                    <div key={field.name} className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                        {field.label || field.name}
                      </label>
                      <div className="relative">
                        <input 
                          type={field.type === 'password' ? 'password' : 'text'}
                          placeholder={field.description}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 px-3 text-[10px] focus:outline-none focus:border-indigo-500/50 dark:text-white"
                          value={secrets[field.name] || ''}
                          onChange={(e) => setSecrets(prev => ({ ...prev, [field.name]: e.target.value }))}
                        />
                        {selectedTenantConnector.secrets?.some((s: any) => s.secretKey === field.name) && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-emerald-500 text-[8px] font-bold uppercase select-none">
                            <Check className="w-3 h-3" />
                            Vaulted
                          </div>
                        )}
                      </div>
                      <p className="text-[8px] text-zinc-400 dark:text-zinc-600 leading-normal">{field.description}</p>
                    </div>
                  ))}

                  <button 
                    onClick={handleSaveSecrets}
                    disabled={savingSecrets || Object.keys(secrets).length === 0}
                    className="w-full bg-zinc-900 dark:bg-zinc-100 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-650 text-white dark:text-zinc-900 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    {savingSecrets ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Save Secure Configuration'}
                  </button>

                  <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/20 rounded-2xl flex gap-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 leading-none">Security Vault</p>
                      <p className="text-[8px] text-indigo-500 dark:text-indigo-300/50 mt-1 leading-relaxed">
                        Credentials are encrypted and never exposed on clients. They are only injected inside server-side Edge Functions.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : rightTab === 'logs' ? (
            <div className="flex flex-col gap-4 flex-1 min-h-0 text-left">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Audit Logs</h3>
                  <p className="text-[9px] text-zinc-400 leading-relaxed">External API queries audit history.</p>
                </div>
                <button 
                  onClick={fetchLogs} 
                  disabled={loadingLogs}
                  className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-[9px] font-bold text-indigo-500 transition-all border border-zinc-205 dark:border-zinc-800 cursor-pointer"
                >
                  {loadingLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 rotate-90" />}
                  <span>Reload</span>
                </button>
              </div>

              {/* Filter pills */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-xl p-0.5 border border-zinc-200 dark:border-zinc-800 shrink-0">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'prod', label: 'Prod' },
                  { id: 'test', label: 'Test' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setLogFilter(opt.id as any)}
                    className={cn(
                      "flex-1 py-1 rounded-md text-[9px] font-bold transition-all",
                      logFilter === opt.id 
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {loadingLogs && logs.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {logs.filter(log => {
                    const isTest = log.payload?.metadata?.isTest === true;
                    if (logFilter === 'prod') return !isTest;
                    if (logFilter === 'test') return isTest;
                    return true;
                  }).map(log => {
                    const isExpanded = expandedLogId === log.id;
                    const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isError = log.status === 'ERROR';

                    return (
                      <div 
                        key={log.id}
                        className={cn(
                          "border rounded-xl transition-all overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/10",
                          isError ? "border-rose-500/20" : "border-zinc-200 dark:border-zinc-800"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="w-full p-2.5 flex items-center justify-between gap-2 text-left"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isError ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                              <span className="text-[10px] font-bold dark:text-white truncate uppercase tracking-tight">
                                {log.status}
                              </span>
                            </div>
                            <p className="text-[8px] text-zinc-400 mt-0.5">{dateStr} • {log.latencyMs ? `${log.latencyMs}ms` : 'Proxy'}</p>
                          </div>
                          <ChevronDown size={12} className={cn("text-zinc-450 transition-transform", isExpanded && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-zinc-200 dark:border-zinc-800 p-2.5 bg-zinc-50 dark:bg-black/20 text-[8px] font-mono space-y-2 overflow-x-auto"
                            >
                              <div>
                                <span className="block text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Payload:</span>
                                <pre className="text-zinc-700 dark:text-zinc-300 leading-normal max-h-24 overflow-auto whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                              </div>
                              {log.response && (
                                <div>
                                  <span className="block text-zinc-400 font-bold uppercase tracking-wider mb-0.5">Response:</span>
                                  <pre className="text-zinc-700 dark:text-zinc-300 leading-normal max-h-24 overflow-auto whitespace-pre-wrap">{JSON.stringify(log.response, null, 2)}</pre>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {logs.length === 0 && (
                    <div className="py-8 text-center text-zinc-400 text-[10px] italic">No logs found for this connector.</div>
                  )}
                </div>
              )}
            </div>
          ) : rightTab === 'sandbox' ? (
            <div className="flex flex-col gap-6 flex-1 min-h-0 text-left">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sandbox Testing</h3>
                <p className="text-[9px] text-zinc-400">Mock API payloads to run proxy test calls.</p>
              </div>

              {/* Dynamic Mock Inputs */}
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {(selectedConnector.ioSchema?.inputs || []).map((input: any) => (
                  <div key={input.name} className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                      <span>{input.label || input.name}</span>
                      <span className="text-[7.5px] font-mono text-zinc-400">{input.type || 'string'}</span>
                    </label>
                    <input 
                      type="text"
                      placeholder={input.description || `Value for ${input.name}`}
                      value={testData[input.name] ?? ''}
                      onChange={(e) => setTestData(prev => ({ ...prev, [input.name]: e.target.value }))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-indigo-500/50 dark:text-white placeholder:text-zinc-400"
                    />
                  </div>
                ))}
                {(selectedConnector.ioSchema?.inputs || []).length === 0 && (
                  <p className="text-[10px] text-zinc-400 text-center py-4 italic">No inputs required for this connector.</p>
                )}
              </div>

              {/* Test Action */}
              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-900 shrink-0">
                <button
                  onClick={runTest}
                  disabled={testing}
                  className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-650 text-white dark:text-zinc-900 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testing ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                  Execute Test Call
                </button>

                {/* Test Results Output */}
                {testResponse && (
                  <div className={cn(
                    "p-4 rounded-2xl border flex flex-col gap-2 animate-in fade-in duration-200 max-h-48 overflow-y-auto custom-scrollbar",
                    testResponse.error 
                      ? "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-455"
                      : "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  )}>
                    <div className="flex items-center gap-2">
                      {testResponse.error ? (
                        <AlertCircle size={14} className="shrink-0" />
                      ) : (
                        <CheckCircle size={14} className="shrink-0" />
                      )}
                      <span className="text-[10px] font-bold">
                        {testResponse.error ? 'Test Execution Failed' : 'Test Call Successful'}
                      </span>
                    </div>
                    <pre className="text-[9px] font-mono opacity-90 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(testResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : rightTab === 'ai' ? (
            <div className="flex flex-col gap-6 flex-1 min-h-0 text-left">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI Connector Architect</h3>
                <p className="text-[9px] text-zinc-400 leading-relaxed">
                  Describe what you want this custom connector to do, and the AI will forge its secure schema and integrations.
                </p>
              </div>

              <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl relative overflow-hidden shadow-lg shadow-indigo-500/10 flex flex-col gap-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-xl -mr-12 -mt-12 pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles size={12} className="animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">AI Assistant</span>
                  </div>
                  
                  <textarea 
                    rows={6}
                    placeholder="e.g. Create a Salesforce Lead sync connector that requires leadEmail, name, and notes, and returns leadId and status..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all resize-none leading-relaxed"
                  />
                  
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="w-full py-2.5 bg-white text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>Forge Connector</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-1 min-h-0 text-left">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">JSON Schema</h3>
                <p className="text-[9px] text-zinc-400 leading-relaxed">
                  The raw IO schema definition for inputs and outputs.
                </p>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <pre className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-[9px] font-mono overflow-y-auto custom-scrollbar text-zinc-650 dark:text-zinc-300">
                  {JSON.stringify(selectedConnector.ioSchema, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </aside>
      </>
    )}
      {/* Placement Tab Prompt Modal */}
      <AnimatePresence>
        {pendingFieldCreation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] w-full max-w-md p-6 shadow-2xl space-y-6"
            >
              <div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Select Placement Tab</h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  Choose which tab in the module should contain the new field: <strong className="text-indigo-500">{pendingFieldCreation.outputLabel || pendingFieldCreation.outputName}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Destination Tab</label>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar border border-zinc-200 dark:border-zinc-900 rounded-xl p-1 bg-zinc-50 dark:bg-zinc-900/50">
                  {displayTabs.map((tab: any) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedDestinationTabId(tab.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                        selectedDestinationTabId === tab.id
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                      style={{ paddingLeft: tab.depth === 1 ? '1.5rem' : '0.75rem' }}
                    >
                      <span className="flex items-center gap-1">
                        {tab.depth === 1 && <span className="opacity-40">↳</span>}
                        <span>{tab.label || tab.id}</span>
                      </span>
                      <span className="text-[9px] opacity-60 font-mono">ID: {tab.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {setTabs && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
                  {showCreateTabForm ? (
                    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 space-y-3">
                      <h5 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Create New Tab or Section</h5>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Label</label>
                          <input 
                            type="text"
                            placeholder="e.g. Weather Data"
                            value={newTabLabel}
                            onChange={(e) => setNewTabLabel(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">Parent Tab (Optional)</label>
                          <select
                            value={newTabParentId}
                            onChange={(e) => setNewTabParentId(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-zinc-700 dark:text-zinc-300"
                          >
                            <option value="">None (Root Tab)</option>
                            {tabs.filter((t: any) => !t.parentId).map((t: any) => (
                              <option key={t.id} value={t.id}>{t.label || t.id}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setShowCreateTabForm(false);
                            setNewTabLabel('');
                            setNewTabParentId('');
                          }}
                          className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!newTabLabel.trim()) {
                              toast.error("Please enter a tab label");
                              return;
                            }
                            const newTabId = `tab-${Math.random().toString(36).substring(2, 9)}`;
                            const newTab = {
                              id: newTabId,
                              label: newTabLabel.trim(),
                              parentId: newTabParentId || undefined
                            };
                            setTabs([...tabs, newTab]);
                            setSelectedDestinationTabId(newTabId);
                            setShowCreateTabForm(false);
                            setNewTabLabel('');
                            setNewTabParentId('');
                            toast.success(`Created tab "${newTab.label}"`);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm hover:bg-indigo-500"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreateTabForm(true)}
                      className="w-full py-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all flex items-center justify-center gap-1.5 bg-zinc-50/20 dark:bg-zinc-900/10 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Create New Tab or Sub-tab</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  onClick={() => setPendingFieldCreation(null)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (pendingFieldCreation) {
                      let finalTabId = selectedDestinationTabId;
                      let finalTabs = [...tabs];

                      // Auto-create new tab if form is open and has a non-empty label
                      if (showCreateTabForm && newTabLabel.trim()) {
                        const newTabId = `tab-${Math.random().toString(36).substring(2, 9)}`;
                        const newTab = {
                          id: newTabId,
                          label: newTabLabel.trim(),
                          parentId: newTabParentId || undefined
                        };
                        finalTabs = [...finalTabs, newTab];
                        finalTabId = newTabId;

                        if (setTabs) {
                          setTabs(finalTabs);
                        }
                        setSelectedDestinationTabId(newTabId);
                        setShowCreateTabForm(false);
                        setNewTabLabel('');
                        setNewTabParentId('');
                      }

                      handleCreateAndMapField(
                        pendingFieldCreation.outputName,
                        pendingFieldCreation.outputLabel,
                        pendingFieldCreation.outputType,
                        finalTabId
                      );
                      setPendingFieldCreation(null);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] w-full max-w-md p-6 shadow-2xl space-y-6"
            >
              <div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Create Lookup Field</h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  Add a new Lookup field to trigger the connector <strong className="text-indigo-500">{selectedConnector.name}</strong>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1 block mb-1">Field Label</label>
                  <input 
                    type="text"
                    placeholder="e.g. Zipcode Lookup"
                    value={inlineLookupLabel}
                    onChange={(e) => setInlineLookupLabel(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Destination Tab</label>
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar border border-zinc-200 dark:border-zinc-900 rounded-xl p-1 bg-zinc-50 dark:bg-zinc-900/50">
                    {displayTabs.map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setInlineLookupTabId(tab.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                          inlineLookupTabId === tab.id
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        )}
                        style={{ paddingLeft: tab.depth === 1 ? '1.5rem' : '0.75rem' }}
                      >
                        <span className="flex items-center gap-1">
                          {tab.depth === 1 && <span className="opacity-40">↳</span>}
                          <span>{tab.label || tab.id}</span>
                        </span>
                        <span className="text-[9px] opacity-60 font-mono">ID: {tab.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowInlineLookupModal(false);
                    setInlineLookupLabel('');
                  }}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!inlineLookupLabel.trim()) {
                      toast.error("Please enter a field label");
                      return;
                    }
                    handleCreateLookupField(inlineLookupLabel.trim(), inlineLookupTabId);
                    setShowInlineLookupModal(false);
                    setInlineLookupLabel('');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] w-full max-w-md p-6 shadow-2xl space-y-6 text-left"
            >
              <div>
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Remove Placement Trigger</h4>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  You are removing the placement trigger: <strong className="text-indigo-500">{deletePlacementConfirmation.label}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
                  {deletePlacementConfirmation.type === 'rule' 
                    ? "This trigger rule is associated with the following populated fields:"
                    : "This lookup trigger is associated with the following layout fields:"}
                </p>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-xl p-3 max-h-36 overflow-y-auto custom-scrollbar space-y-1.5">
                  {deletePlacementConfirmation.associatedFieldLabels.map((label, idx) => (
                    <div key={idx} className="text-[10px] font-bold text-zinc-750 dark:text-zinc-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 italic">
                  Choose whether you want to delete these fields from your layout entirely, or keep them as standard unmapped fields.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => confirmDeletePlacement(false)}
                  className="w-full py-2.5 bg-rose-650 hover:bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 size={12} />
                  Delete Associated Fields
                </button>
                <button
                  onClick={() => confirmDeletePlacement(true)}
                  className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={12} />
                  Keep Associated Fields (Unmap)
                </button>
                <button
                  onClick={() => setDeletePlacementConfirmation(null)}
                  className="w-full py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {editingTriggerCondition && (
        <ConditionModal 
          isOpen={true}
          onClose={() => setEditingTriggerCondition(null)}
          onSave={(rule) => {
            const ruleId = editingTriggerCondition.ruleId;
            setDataPopulationRules(prev => prev.map(r => r.id === ruleId ? {
              ...r,
              condition: rule
            } : r));
            setEditingTriggerCondition(null);
            toast.success("Updated trigger conditions");
          }}
          initialRule={editingTriggerCondition.rule}
          availableFields={targetFields}
          tabs={tabs}
          targetLabel={selectedPlacement?.details?.name || 'Trigger Conditions'}
          title="Trigger Conditions"
          hideActionSelector={true}
        />
      )}
    </div>
  );
};
