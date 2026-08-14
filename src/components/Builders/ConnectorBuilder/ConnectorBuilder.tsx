import React from 'react';
import { Radio } from 'lucide-react';
import { StandaloneBuilderContext } from '../../../types/platform';
import { ConnectorsTab } from '../../Builder/ConnectorsTab';

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
  layout = [],
  setLayout = () => {},
  activeConnectors = [],
  connectorRegistry = [],
  connectorMappings = {},
  setConnectorMappings = () => {},
  currentTabId = 'default'
}) => {
  return (
    <div className="h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex flex-col">
      <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-950/80 text-blue-400 border border-blue-800/50 rounded-lg">
            <Radio size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Integration & Connector Mapping Studio</h3>
            <p className="text-xs text-zinc-400">
              {builderContext.mode === 'global' ? 'Global Connector Registry' : `In-Context Field Mappings for [${builderContext.hostType?.toUpperCase()}]`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConnectorsTab
          layout={layout}
          setLayout={setLayout}
          activeConnectors={activeConnectors}
          connectorRegistry={connectorRegistry}
          connectorMappings={connectorMappings}
          setConnectorMappings={setConnectorMappings}
          setShowConnectorModal={() => {}}
          currentTabId={currentTabId}
          handleForgeConnector={async () => {}}
          handleCreateCustomConnector={async () => {}}
        />
      </div>
    </div>
  );
};

