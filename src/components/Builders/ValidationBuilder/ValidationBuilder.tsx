import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { StandaloneBuilderContext } from '../../../types/platform';
import { ValidationsTab } from '../../Builder/ValidationsTab';

export interface ValidationBuilderProps {
  builderContext: StandaloneBuilderContext;
  fields?: any[];
  validationRules?: any[];
  setValidationRules?: React.Dispatch<React.SetStateAction<any[]>>;
}

export const ValidationBuilder: React.FC<ValidationBuilderProps> = ({
  builderContext,
  fields = [],
  validationRules = [],
  setValidationRules = () => {}
}) => {
  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col overflow-hidden">

      <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 rounded-lg">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Validation Ruleset Studio</h3>
            <p className="text-xs text-zinc-400">
              {builderContext.mode === 'global' ? 'Reusable Platform Validation Rules' : `In-Context Validation Rules for [${builderContext.hostType?.toUpperCase()}]`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ValidationsTab
          fields={fields}
          validationRules={validationRules}
          setValidationRules={setValidationRules}
        />
      </div>
    </div>
  );
};

