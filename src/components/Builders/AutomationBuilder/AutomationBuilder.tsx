import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { StandaloneBuilderContext } from '../../../types/platform';
import { AutomationsTab } from '../../Builder/AutomationsTab';

export interface AutomationBuilderProps {
  builderContext: StandaloneBuilderContext;
  moduleId?: string;
  fields?: any[];
  automations?: any[];
  setAutomations?: React.Dispatch<React.SetStateAction<any[]>>;
  deletedAutomationIds?: string[];
  setDeletedAutomationIds?: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
  builderContext,
  moduleId,
  fields = [],
  automations: externalAutomations,
  setAutomations: externalSetAutomations,
  deletedAutomationIds: externalDeletedIds,
  setDeletedAutomationIds: externalSetDeletedIds
}) => {
  const [internalAutomations, setInternalAutomations] = useState<any[]>([]);
  const [internalDeletedIds, setInternalDeletedIds] = useState<string[]>([]);

  const automations = externalAutomations ?? internalAutomations;
  const setAutomations = externalSetAutomations ?? setInternalAutomations;
  const deletedAutomationIds = externalDeletedIds ?? internalDeletedIds;
  const setDeletedAutomationIds = externalSetDeletedIds ?? setInternalDeletedIds;

  const effectiveModuleId = moduleId || (builderContext.hostType === 'module' ? builderContext.hostId : undefined);

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col overflow-hidden">

      <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-950/80 text-amber-400 border border-amber-800/50 rounded-lg">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Automation Rules & Trigger Studio</h3>
            <p className="text-xs text-zinc-400">
              {builderContext.mode === 'global' ? 'Tenant Global Automations' : `In-Context Automation for [${builderContext.hostType?.toUpperCase()}]`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AutomationsTab
          moduleId={effectiveModuleId}
          fields={fields}
          automations={automations}
          setAutomations={setAutomations}
          deletedAutomationIds={deletedAutomationIds}
          setDeletedAutomationIds={setDeletedAutomationIds}
        />
      </div>
    </div>
  );
};
