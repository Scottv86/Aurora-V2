import React from 'react';
import { BarChart3 } from 'lucide-react';
import { StandaloneBuilderContext } from '../../../types/platform';
import { ReportManagementSettings } from '../../../pages/Settings/PlatformModules/ReportManagementSettings';

export interface ReportBuilderProps {
  builderContext: StandaloneBuilderContext;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  builderContext
}) => {
  return (
    <div className="h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex flex-col">
      <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/80 text-cyan-400 border border-cyan-800/50 rounded-lg">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Report & Analytics Canvas Studio</h3>
            <p className="text-xs text-zinc-400">
              {builderContext.mode === 'global' ? 'Platform Report Library' : `In-Context Report for [${builderContext.hostType?.toUpperCase()}]`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <ReportManagementSettings />
      </div>
    </div>
  );
};
