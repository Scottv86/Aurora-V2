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

  if (builderContext.mode === 'in_context') {
    return (
      <div className="h-full w-full overflow-hidden">
        <AutomationsTab
          moduleId={effectiveModuleId}
          fields={fields}
          automations={automations}
          setAutomations={setAutomations}
          deletedAutomationIds={deletedAutomationIds}
          setDeletedAutomationIds={setDeletedAutomationIds}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
      <div className="h-12 px-5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Zap size={15} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Automation Rules</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Tenant Global Automations
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
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
