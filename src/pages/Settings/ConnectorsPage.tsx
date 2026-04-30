import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Settings2, 
  Box, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Puzzle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layout,
  Play,
  Loader2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { NexusSelectionModal } from '../../components/Builder/NexusSelectionModal';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';
import { PageHeader } from '../../components/UI/PageHeader';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { DynamicIcon } from '../../components/UI/DynamicIcon';

interface Connector {
  id: string;
  name: string;
  icon: string;
  category: string;
  edgeFunctionUrl: string;
  ioSchema: any;
}

interface TenantConnector {
  id: string;
  connectorId: string;
  isActive: boolean;
  displayName: string;
  secrets: { secretKey: string }[];
}

export const ConnectorsPage = () => {
  const { tenant, modules, isLoading: platformLoading } = usePlatform();
  const { session } = useAuth();
  const [registry, setRegistry] = useState<Connector[]>([]);
  const [activeConnectors, setActiveConnectors] = useState<TenantConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'usage' | 'test'>('setup');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/connectors`, {
        headers: {
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRegistry(data.registry);
        setActiveConnectors(data.active);
        if (data.registry.length > 0 && !selectedConnectorId) {
          setSelectedConnectorId(data.registry[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch connectors:', err);
      toast.error('Failed to load connectors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Broadcast Channel for Connector Sync
    const channel = new BroadcastChannel('nexus_connectors');
    channel.onmessage = (event) => {
      if (event.data === 'refresh') {
        fetchData();
      }
    };
    return () => channel.close();
  }, [tenant?.id]);

  const handleCreateCustomConnector = async (connector: any) => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/connectors/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(connector)
      });
      
      if (response.ok) {
        const data = await response.json();
        fetchData();
        // Broadcast change
        new BroadcastChannel('nexus_connectors').postMessage('refresh');
        setSelectedConnectorId(data.connector.id);
        toast.success("Custom connector forged successfully");
        return data;
      }
    } catch (err) {
      console.error("Failed to create custom connector:", err);
      toast.error("Failed to create custom connector");
    }
  };

  const handleForgeConnector = async (prompt: string) => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/architect/forge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.error("Failed to forge connector:", err);
      toast.error("Shadow Architect failed to forge connector");
    }
  };

  const handleActivateConnector = async (connectorId: string) => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/connectors/${connectorId}/activate`, {
        method: 'POST',
        headers: {
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchData();
        return await res.json();
      }
    } catch (err) {
      console.error("Activation failed:", err);
    }
  };

  const selectedConnector = useMemo(() => 
    registry.find(c => c.id === selectedConnectorId), 
    [registry, selectedConnectorId]
  );

  const selectedTenantConnector = useMemo(() => 
    activeConnectors.find(ac => ac.connectorId === selectedConnectorId),
    [activeConnectors, selectedConnectorId]
  );

  const filteredRegistry = registry.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const usage = useMemo(() => {
    if (!selectedConnectorId || !modules) return [];
    const placements: any[] = [];
    modules.forEach((m: any) => {
      // Deep scan config for connectorId
      const configStr = JSON.stringify(m);
      if (configStr.includes(`"connectorId":"${selectedConnectorId}"`)) {
        // Try to find specific blocks
        const fields = m.fields || m.config?.fields || [];
        fields.forEach((f: any) => {
          if (f.connectorId === selectedConnectorId) {
            placements.push({
              moduleId: m.id,
              moduleName: m.name,
              blockName: f.label || f.name,
              blockType: 'Field'
            });
          }
        });
        
        const blocks = m.blocks || m.config?.blocks || [];
        blocks.forEach((b: any) => {
          if (b.connectorId === selectedConnectorId) {
            placements.push({
              moduleId: m.id,
              moduleName: m.name,
              blockName: b.label || b.title || 'Action Block',
              blockType: 'UI Block'
            });
          }
        });

        // Fallback if we found the string but couldn't pinpoint the block
        if (placements.filter(p => p.moduleId === m.id).length === 0) {
          placements.push({
            moduleId: m.id,
            moduleName: m.name,
            blockName: 'Unknown Reference',
            blockType: 'Logic/Config'
          });
        }
      }
    });
    return placements;
  }, [selectedConnectorId, modules]);

  const toggleActivation = async () => {
    if (!selectedConnector || !tenant?.id) return;
    const isActivating = !selectedTenantConnector?.isActive;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/connectors/${selectedConnector.id}/${isActivating ? 'activate' : 'deactivate'}`, {
        method: 'POST',
        headers: {
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success(`${selectedConnector.name} ${isActivating ? 'activated' : 'deactivated'}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  if (platformLoading || (loading && registry.length === 0)) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      <div className="px-8 pt-8">
        <PageHeader 
          title="Connectors"
          description="Nexus API Vending Machine. Activate business capabilities and snap them into your modules."
        />
      </div>

      <div className="flex flex-1 overflow-hidden border-t border-zinc-200 dark:border-white/5">
        {/* Master Pane */}
        <div className="w-80 border-r border-zinc-200 dark:border-white/5 flex flex-col bg-zinc-50 dark:bg-zinc-900/30">
          <div className="p-4 border-b border-zinc-200 dark:border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input 
                type="text"
                placeholder="Search Nexus..."
                className="w-full bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            <div>
              <div className="px-3 flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Nexus Registry</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-5 h-5 flex items-center justify-center rounded-lg bg-indigo-500 text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Plus size={12} />
                </button>
              </div>
              <div className="space-y-1">
                {filteredRegistry.map(connector => {
                  const isActive = activeConnectors.find(ac => ac.connectorId === connector.id)?.isActive;
                  return (
                    <button
                      key={connector.id}
                      onClick={() => setSelectedConnectorId(connector.id)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                        selectedConnectorId === connector.id 
                          ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-100" 
                          : "hover:bg-zinc-200/50 dark:hover:bg-white/5 border border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      <div className={clsx(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                        selectedConnectorId === connector.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                      )}>
                        <DynamicIcon name={connector.icon} size={20} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{connector.name}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate">{connector.category}</p>
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Detail Pane */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {selectedConnector ? (
              <motion.div 
                key={selectedConnector.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Detail Header */}
                <div className="p-8 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-2xl overflow-hidden">
                      <DynamicIcon name={selectedConnector.icon} size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{selectedConnector.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-white/5">
                          {selectedConnector.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Enterprise Vaulted</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={toggleActivation}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-xl",
                      selectedTenantConnector?.isActive
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-red-500/10 hover:text-red-400 border border-zinc-200 dark:border-white/5"
                        : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20"
                    )}
                  >
                    {selectedTenantConnector?.isActive ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Activate Connector
                      </>
                    )}
                  </button>
                </div>

                {/* Detail Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-8 border-b border-zinc-200 dark:border-white/5 flex gap-8">
                    {[
                      { id: 'setup', label: 'Setup', icon: Settings2 },
                      { id: 'usage', label: 'Usage & Placements', icon: Layout },
                      { id: 'test', label: 'Test Plug', icon: Play },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                          "flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all",
                          activeTab === tab.id 
                            ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                            : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                        )}
                      >
                        <tab.icon className="w-3 h-3" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'setup' && (
                      <ConnectorSetup 
                        connector={selectedConnector} 
                        activeConnector={selectedTenantConnector}
                        onRefresh={fetchData}
                      />
                    )}
                    {activeTab === 'usage' && (
                      <ConnectorUsage usage={usage} />
                    )}
                    {activeTab === 'test' && (
                      <ConnectorTest connector={selectedConnector} />
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                <Puzzle className="w-12 h-12 mb-4 opacity-30 dark:opacity-20" />
                <p className="text-sm font-medium">Select a connector to view details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

      <NexusSelectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeConnectors={activeConnectors}
        registry={registry}
        onSelect={(conn) => {
          setSelectedConnectorId(conn.connectorId);
          setIsModalOpen(false);
        }}
        onActivate={handleActivateConnector}
        onCreateCustom={handleCreateCustomConnector}
        onForge={handleForgeConnector}
      />
    </>
  );
};

const ConnectorSetup = ({ connector, activeConnector, onRefresh }: { connector: Connector, activeConnector?: TenantConnector, onRefresh: () => void }) => {
  const { tenant } = usePlatform();
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const configFields = connector.ioSchema.config || [];

  const handleSave = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (window as any).session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/connectors/${connector.id}/config`, {
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
        onRefresh();
      }
    } catch (err) {
      toast.error('Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (!activeConnector?.isActive) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-white/10">
        <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-4" />
        <p className="text-zinc-400 dark:text-zinc-500 font-medium">Activate this connector to begin setup</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-6">
        {configFields.map((field: any) => (
          <div key={field.name} className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{field.label}</label>
            <div className="relative">
              <input 
                type={field.type === 'password' ? 'password' : 'text'}
                placeholder={field.description}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100"
                value={secrets[field.name] || ''}
                onChange={(e) => setSecrets(prev => ({ ...prev, [field.name]: e.target.value }))}
              />
              {activeConnector.secrets.find(s => s.secretKey === field.name) && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-500 text-[10px] font-bold uppercase">
                  <CheckCircle2 className="w-3 h-3" />
                  Vaulted
                </div>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{field.description}</p>
          </div>
        ))}
      </div>

      <button 
        onClick={handleSave}
        disabled={saving || Object.keys(secrets).length === 0}
        className="w-full bg-white text-zinc-950 py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Secure Configuration'}
      </button>

      <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl flex gap-4">
        <ShieldCheck className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
        <div>
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Enterprise Security Note</p>
          <p className="text-[10px] text-indigo-500 dark:text-indigo-300/60 mt-1 leading-relaxed">
            Your secrets are stored in an encrypted vault. They are never sent to the client and are only accessible by certified Edge Functions via internal proxy calls.
          </p>
        </div>
      </div>
    </div>
  );
};

const ConnectorUsage = ({ usage }: { usage: any[] }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Placements</h3>
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{usage.length} References Found</span>
      </div>

      {usage.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usage.map((item, i) => (
            <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl flex items-center justify-between group hover:border-zinc-300 dark:hover:border-white/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <Layout className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.moduleName}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.blockType}: {item.blockName}</p>
                </div>
              </div>
              <a 
                href={`/workspace/settings/builder/${item.moduleId}`}
                className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500 hover:text-white"
              >
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-white/10">
          <Circle className="w-10 h-10 text-zinc-300 dark:text-zinc-800 mx-auto mb-4" />
          <p className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">This connector isn't used in any modules yet.</p>
          <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-1">Use the Module Builder to snap this capability into a screen.</p>
        </div>
      )}
    </div>
  );
};

const ConnectorTest = ({ connector }: { connector: Connector }) => {
  const [testData, setTestData] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const inputs = connector.ioSchema.inputs || [];

  const runTest = async () => {
    setTesting(true);
    setResponse(null);
    try {
      // Simulate calling the Edge Function proxy
      const res = await fetch(connector.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectorId: connector.id,
          payload: testData,
          test: true
        })
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ error: 'Proxy call failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
      <div className="space-y-6 overflow-y-auto pr-4">
        <h3 className="text-lg font-bold">Sample Payload</h3>
        <div className="space-y-4">
          {inputs.map((input: any) => (
            <div key={input.name} className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{input.label}</label>
              <input 
                type="text"
                placeholder={input.description}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100"
                value={testData[input.name] || ''}
                onChange={(e) => setTestData(prev => ({ ...prev, [input.name]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button 
          onClick={runTest}
          disabled={testing}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Run Proxy Test</>}
        </button>
      </div>

      <div className="flex flex-col overflow-hidden bg-zinc-50 dark:bg-black/40 rounded-3xl border border-zinc-200 dark:border-white/5">
        <div className="p-4 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Proxy Response</span>
          {response && (
            <span className={clsx(
              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
              response.error ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
            )}>
              {response.error ? 'Error' : 'Success'}
            </span>
          )}
        </div>
        <div className="flex-1 p-6 font-mono text-[11px] overflow-auto">
          {response ? (
            <pre className="text-zinc-600 dark:text-zinc-300">{JSON.stringify(response, null, 2)}</pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
              <Zap className="w-8 h-8 mb-2 opacity-30 dark:opacity-10" />
              <p>Ready for test...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
