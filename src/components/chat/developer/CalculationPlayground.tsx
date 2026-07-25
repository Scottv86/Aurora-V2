import React, { useState } from 'react';
import { Calculator, Play, CheckCircle2, AlertCircle } from 'lucide-react';

export interface FormulaFieldInput {
  key: string;
  label: string;
  value: number | string;
}

export interface CalculationPlaygroundProps {
  formulaName?: string;
  formulaLogic: string;
  initialInputs?: FormulaFieldInput[];
}

export const CalculationPlayground: React.FC<CalculationPlaygroundProps> = ({
  formulaName = 'Calculated Field Formula',
  formulaLogic,
  initialInputs = [
    { key: 'subtotal', label: 'Subtotal ($)', value: 150 },
    { key: 'taxRate', label: 'Tax Rate (%)', value: 10 },
    { key: 'discount', label: 'Discount ($)', value: 15 }
  ]
}) => {
  const [inputs, setInputs] = useState<FormulaFieldInput[]>(initialInputs);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (key: string, newVal: string) => {
    setInputs((prev) =>
      prev.map((inp) => (inp.key === key ? { ...inp, value: newVal } : inp))
    );
  };

  const runEvaluation = () => {
    try {
      setError(null);
      // Create evaluation context
      const contextObj: Record<string, number> = {};
      inputs.forEach((inp) => {
        contextObj[inp.key] = Number(inp.value) || 0;
      });

      // Simple safe evaluation for simple math formulas (e.g. (subtotal * (1 + taxRate/100)) - discount)
      const keys = Object.keys(contextObj);
      const values = Object.values(contextObj);
      const func = new Function(...keys, `return ${formulaLogic};`);
      const computedVal = func(...values);

      setResult(computedVal);
    } catch (err: any) {
      setError(err.message || 'Error evaluating formula');
      setResult(null);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">{formulaName}</h4>
        </div>

        <button
          onClick={runEvaluation}
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500 shadow"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Evaluate</span>
        </button>
      </div>

      {/* Logic Expression */}
      <div className="my-3 rounded-lg bg-slate-950 p-2.5 font-mono text-xs text-indigo-300 border border-slate-800">
        <span className="text-[10px] text-slate-500 uppercase block mb-1">FORMULA LOGIC:</span>
        <code>{formulaLogic}</code>
      </div>

      {/* Mock Inputs */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {inputs.map((inp) => (
          <div key={inp.key} className="rounded-md bg-slate-950/60 p-2 border border-slate-800/80">
            <label className="text-[10px] font-medium text-slate-400 block">{inp.label}</label>
            <input
              type="text"
              value={inp.value}
              onChange={(e) => handleInputChange(inp.key, e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Output View */}
      {(result !== null || error !== null) && (
        <div className="mt-3 border-t border-slate-800 pt-2.5">
          {error ? (
            <div className="flex items-center gap-2 rounded-md bg-rose-950/40 p-2 text-xs text-rose-300 border border-rose-900/50">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md bg-emerald-950/30 p-2.5 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Computed Result:</span>
              </div>
              <span className="font-mono text-sm font-bold text-white">{String(result)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
