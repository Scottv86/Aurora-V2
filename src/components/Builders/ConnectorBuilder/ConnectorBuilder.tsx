import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';
import { StandaloneBuilderContext } from '../../../types/platform';
import { ConnectorsTab } from '../../Builder/ConnectorsTab';
import { ConnectorModal } from '../../Builder/ConnectorModal';
import { API_BASE_URL } from '../../../config';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';

export interface ConnectorBuilderProps {
  builderContext: StandaloneBuilderContext;
  layout?: any[];
  setLayout?: React.Dispatch<React.SetStateAction<any[]>>;
  activeConnectors?: any[];
  connectorRegistry?: any[];
  connectorMappings?: Record<string, Record<string, string>>;
  setConnectorMappings?: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  currentTabId?: string;
}

export const ConnectorBuilder: React.FC<ConnectorBuilderProps> = ({
  builderContext,
  layout: externalLayout,
  setLayout: externalSetLayout,
  activeConnectors: externalActive,
  connectorRegistry: externalRegistry,
  connectorMappings: externalMappings,
  setConnectorMappings: externalSetMappings,
  currentTabId = 'default'
}) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

  const [localLayout, setLocalLayout] = useState<any[]>(externalLayout || []);
  const [localMappings, setLocalMappings] = useState<Record<string, Record<string, string>>>(externalMappings || {});
  const [localRules, setLocalRules] = useState<any[]>([]);
  const [fetchedActive, setFetchedActive] = useState<any[]>(externalActive || []);
  const [fetchedRegistry, setFetchedRegistry] = useState<any[]>(externalRegistry || []);
  const [showConnectorModal, setShowConnectorModal] = useState(false);

  const effectiveLayout = externalSetLayout ? (externalLayout || []) : localLayout;
  const effectiveSetLayout = externalSetLayout || setLocalLayout;
  const effectiveMappings = externalSetMappings ? (externalMappings || {}) : localMappings;
  const effectiveSetMappings = externalSetMappings || setLocalMappings;
  const effectiveActive = externalActive && externalActive.length > 0 ? externalActive : fetchedActive;
  const effectiveRegistry = externalRegistry && externalRegistry.length > 0 ? externalRegistry : fetchedRegistry;

  const fetchConnectors = async () => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/connectors`, {
        headers: {
          'x-tenant-id': tenant.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.registry)) setFetchedRegistry(data.registry);
        if (Array.isArray(data.active)) setFetchedActive(data.active);
      }
    } catch (err) {
      console.error('Failed to fetch connectors:', err);
    }
  };

  useEffect(() => {
    if ((!externalActive || externalActive.length === 0) && tenant?.id) {
      fetchConnectors();
    }
  }, [tenant?.id]);

  const handleForgeConnector = async (prompt: string) => {
    const res = await fetch(`${API_BASE_URL}/api/ai/forge-connector`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw new Error('Failed to generate connector configuration');
    return await res.json();
  };

  const handleCreateCustomConnector = async (connector: any) => {
    if (!tenant?.id) return null;
    const res = await fetch(`${API_BASE_URL}/api/connectors/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenant.id,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(connector)
    });
    if (!res.ok) throw new Error('Failed to save custom connector');
    const created = await res.json();
    await fetchConnectors();
    return created;
  };

  const handleActivateConnector = async (connectorId: string) => {
    if (!tenant?.id) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/connectors/${connectorId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const activated = await res.json();
        await fetchConnectors();
        toast.success('Integration activated');
        return activated;
      }
      toast.error('Failed to activate integration');
      return null;
    } catch {
      toast.error('Failed to activate integration');
      return null;
    }
  };

  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden">
      <div className="h-12 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-lg flex items-center justify-center shrink-0">
            <Radio size={15} />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              Connector Mapping Studio
            </h3>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              {builderContext.mode === 'global'
                ? 'Global Connector Registry'
                : `${builderContext.hostType?.toUpperCase()} Mappings`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ConnectorsTab
          layout={effectiveLayout}
          setLayout={effectiveSetLayout}
          activeConnectors={effectiveActive}
          connectorRegistry={effectiveRegistry}
          connectorMappings={effectiveMappings}
          setConnectorMappings={effectiveSetMappings}
          dataPopulationRules={localRules}
          setDataPopulationRules={setLocalRules}
          setShowConnectorModal={setShowConnectorModal}
          currentTabId={currentTabId}
          handleForgeConnector={handleForgeConnector}
          handleCreateCustomConnector={handleCreateCustomConnector}
          showAiAssist={builderContext.mode === 'global'}
        />
      </div>

      <ConnectorModal
        isOpen={showConnectorModal}
        onClose={() => setShowConnectorModal(false)}
        activeConnectors={effectiveActive}
        registry={effectiveRegistry}
        onSelect={() => setShowConnectorModal(false)}
        onActivate={handleActivateConnector}
      />
    </div>
  );
};
