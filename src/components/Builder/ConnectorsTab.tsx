import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Search, 
  Wand2, 
  Database, 
  Network, 
  Cpu, 
  Settings2, 
  AlertCircle, 
  Info, 
  PlusCircle,
  Play,
  Code,
  Loader2,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, flattenFields } from '../../lib/utils';
import { toast } from 'sonner';
import { Field } from '../ModuleEditor';

interface ConnectorsTabProps {
  layout: Field[];
  setLayout: React.Dispatch<React.SetStateAction<Field[]>>;
  activeConnectors: any[];
  connectorRegistry: any[];
  connectorMappings: Record<string, Record<string, string>>;
  setConnectorMappings: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  setShowConnectorModal: (show: boolean) => void;
  currentTabId: string;
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
  setShowConnectorModal,
  currentTabId,
  handleForgeConnector,
  handleCreateCustomConnector
}) => {
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Right sidebar tab and data states
  const [rightTab, setRightTab] = useState<'sandbox' | 'ai' | 'json'>('sandbox');
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<any>(null);

  // AI states
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset test state and test inputs when selected connector transitions
  useEffect(() => {
    setTestData({});
    setTestResponse(null);
  }, [selectedConnectorId]);

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
        .filter(f => f.type === 'connector' && f.connectorId)
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
      !['heading', 'divider', 'spacer', 'alert', 'group', 'fieldGroup', 'repeatableGroup', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline', 'html', 'button', 'sub_module'].includes(f.type)
    );
  }, [layout]);

  // Find fields in layout that represent the connector trigger block itself
  const connectorTriggerFields = useMemo(() => {
    if (!selectedConnectorId) return [];
    return flattenFields(layout).filter(f => f.type === 'connector' && f.connectorId === selectedConnectorId);
  }, [layout, selectedConnectorId]);

  // Auto-map output fields to layout fields of the same name/label
  const handleAutoMap = () => {
    if (!selectedConnector) return;
    const outputs = selectedConnector.ioSchema?.outputs || [];
    if (outputs.length === 0) {
      toast.info("This connector has no output fields defined.");
      return;
    }

    const currentMappings = { ...(connectorMappings[selectedConnector.id] || {}) };
    let count = 0;

    outputs.forEach((output: any) => {
      if (currentMappings[output.name]) return; // Skip if already mapped
      const match = targetFields.find(f => 
        f.id === output.name || 
        (f.name && f.name.toLowerCase() === output.name.toLowerCase()) ||
        f.label.toLowerCase() === (output.label || output.name).toLowerCase()
      );
      if (match) {
        currentMappings[output.name] = match.id;
        count++;
      }
    });

    setConnectorMappings(prev => ({ ...prev, [selectedConnector.id]: currentMappings }));
    if (count > 0) {
      toast.success(`Successfully auto-mapped ${count} fields.`);
    } else {
      toast.info("No matching layout fields found by name or label.");
    }
  };

  // Manually update mapping
  const handleMapField = (outputName: string, targetFieldId: string) => {
    if (!selectedConnectorId) return;
    setConnectorMappings(prev => {
      const currentMappings = { ...(prev[selectedConnectorId] || {}) };
      if (targetFieldId === '') {
        delete currentMappings[outputName];
      } else {
        currentMappings[outputName] = targetFieldId;
      }
      return { ...prev, [selectedConnectorId]: currentMappings };
    });
  };

  // Create a new layout field and map it directly
  const handleCreateAndMapField = (outputName: string, outputLabel: string, outputType: string) => {
    if (!selectedConnector) return;
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

    const newField: Field = {
      id: newFieldId,
      name: finalSlug,
      type: (outputType === 'number' ? 'number' : outputType === 'boolean' ? 'boolean' : 'text') as any,
      label: label,
      placeholder: `Enter ${label}...`,
      helperText: `Auto-populated by ${selectedConnector.name}`,
      required: false,
      colSpan: 6,
      startCol: 1,
      rowIndex: layout.length,
      tabId: currentTabId || 'default-tab',
    };

    setLayout(prev => [...prev, newField]);

    setConnectorMappings(prev => {
      const currentMappings = { ...(prev[selectedConnector.id] || {}) };
      currentMappings[outputName] = newFieldId;
      return { ...prev, [selectedConnector.id]: currentMappings };
    });

    toast.success(`Created field "${label}" and mapped to ${outputName}`);
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
      const res = await fetch(selectedConnector.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
    <div className="flex h-full w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Left Panel: Connectors List */}
      <aside className="w-80 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 flex flex-col h-full overflow-hidden">
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
              placeholder="Search active connectors..."
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
                No connectors added to layout
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
              Available Connectors ({filteredConnectors.filter(c => !c.isUsed).length})
            </div>
            {filteredConnectors.filter(c => !c.isUsed).length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 italic">
                No inactive connectors
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
      <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-zinc-50 dark:bg-zinc-950">
        <AnimatePresence mode="wait">
          {!selectedConnector ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto text-center space-y-8 py-12"
            >
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
                  className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
                >
                  <Plus size={14} /> Add New Integration
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedConnector.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full space-y-8"
            >
              {/* Header Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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
                  <button
                    onClick={() => setShowConnectorModal(true)}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    <Settings2 size={12} />
                    Credentials Settings
                  </button>
                </div>
              </div>

              {/* Grid: Trigger fields and outputs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Connected Fields list (1/3 columns) */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Module Placements</h3>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                      Fields configured to trigger this API integration.
                    </p>
                  </div>

                  {connectorTriggerFields.length === 0 ? (
                    <div className="p-6 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                      <AlertCircle size={24} className="mx-auto text-amber-500 animate-bounce" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase">Not Placed inside Form</p>
                        <p className="text-[9px] text-zinc-400 leading-relaxed">
                          Add a field of type "Connector" to your layout and associate it with this connector.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {connectorTriggerFields.map(field => (
                        <div key={field.id} className="bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{field.label}</p>
                            <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Field Name: {field.name}</p>
                          </div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Response Data Mappings (2/3 columns) */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Data Mappings</h3>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal">
                        Map API outputs to compatible data entry fields.
                      </p>
                    </div>

                    <button 
                      onClick={handleAutoMap}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 dark:text-indigo-400 hover:text-white border border-indigo-500/25 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm"
                    >
                      <Wand2 size={12} />
                      Auto-Map Fields
                    </button>
                  </div>

                  {(!selectedConnector.ioSchema?.outputs || selectedConnector.ioSchema.outputs.length === 0) ? (
                    <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                      <Info size={24} className="mx-auto text-zinc-400 mb-2" />
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">No API Outputs Defined</p>
                      <p className="text-[10px] text-zinc-400 mt-1">This connector does not define any dynamic response attributes to map.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedConnector.ioSchema.outputs.map((output: any) => {
                        const mappings = connectorMappings[selectedConnector.id] || {};
                        const currentTargetId = mappings[output.name] || '';
                        
                        return (
                          <div 
                            key={output.name} 
                            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-indigo-500/20"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{output.label || output.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 text-[8px] font-bold uppercase tracking-wider">
                                  {output.type || 'string'}
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-0.5">API Property: {output.name}</p>
                            </div>

                            <div className="flex items-center gap-2 self-stretch sm:self-auto w-full sm:w-auto">
                              <div className="relative flex-1 sm:flex-initial">
                                <select
                                  value={currentTargetId}
                                  onChange={(e) => handleMapField(output.name, e.target.value)}
                                  className="w-full sm:w-56 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:border-indigo-500 text-zinc-700 dark:text-zinc-300"
                                >
                                  <option value="">-- Unmapped --</option>
                                  {targetFields.map(f => (
                                    <option key={f.id} value={f.id}>
                                      {f.label} ({f.name})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {!currentTargetId && (
                                <button
                                  onClick={() => handleCreateAndMapField(output.name, output.label || output.name, output.type || 'string')}
                                  title="Create layout field and map instantly"
                                  className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all flex items-center justify-center shadow-sm"
                                >
                                  <PlusCircle size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Right Sidebar: Sandbox, AI Builder & Schema */}
      {selectedConnector ? (
        <aside className="w-80 flex-shrink-0 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-6 border-l border-zinc-200 dark:border-zinc-900 overflow-y-auto custom-scrollbar">
          {/* Tab Selector */}
          <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-900 pb-2 bg-transparent shrink-0">
            <button 
              onClick={() => setRightTab('sandbox')}
              className={cn(
                "flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer",
                rightTab === 'sandbox' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm" 
                  : "text-zinc-500 border-transparent hover:bg-zinc-100/50"
              )}
            >
              <Play size={12} />
              <span>Sandbox</span>
            </button>
            <button 
              onClick={() => setRightTab('ai')}
              className={cn(
                "flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer",
                rightTab === 'ai' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm" 
                  : "text-zinc-500 border-transparent hover:bg-zinc-100/50"
              )}
            >
              <Sparkles size={12} />
              <span>AI Architect</span>
            </button>
            <button 
              onClick={() => setRightTab('json')}
              className={cn(
                "flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer",
                rightTab === 'json' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-sm" 
                  : "text-zinc-500 border-transparent hover:bg-zinc-100/50"
              )}
            >
              <Code size={12} />
              <span>JSON Schema</span>
            </button>
          </div>

          {rightTab === 'sandbox' ? (
            <div className="flex flex-col gap-6 flex-1 min-h-0">
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
                      ? "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400"
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
            <div className="flex flex-col gap-6 flex-1 min-h-0">
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
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">JSON Schema</h3>
                <p className="text-[9px] text-zinc-400 leading-relaxed">
                  The raw IO schema definition for inputs and outputs.
                </p>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <pre className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl text-[9px] font-mono overflow-y-auto custom-scrollbar text-zinc-600 dark:text-zinc-300">
                  {JSON.stringify(selectedConnector.ioSchema, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
};
