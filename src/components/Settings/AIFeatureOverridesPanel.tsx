import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  Save, 
  Loader2 
} from 'lucide-react';
import { 
  AI_FEATURES_CATALOG, 
  AI_CATEGORY_LABELS, 
  AIPolicyState, 
  AIFeatureCategory 
} from '../../types/aiGovernance';
import { Button, Badge, Input, cn } from '../UI/Primitives';

interface AIFeatureOverridesPanelProps {
  title?: string;
  description?: string;
  overrides: Record<string, AIPolicyState>;
  onChange: (overrides: Record<string, AIPolicyState>) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
  targetName?: string;
  targetType?: 'User' | 'Team';
}

export const AIFeatureOverridesPanel: React.FC<AIFeatureOverridesPanelProps> = ({
  title = 'AI Governance & Access Overrides',
  description = 'Configure explicit AI feature access overrides for this entity. Overrides take highest precedence before group or tenant defaults.',
  overrides,
  onChange,
  onSave,
  isSaving = false,
  targetName,
  targetType: _targetType = 'User'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Object.keys(AI_CATEGORY_LABELS) as AIFeatureCategory[];

  const handleSetState = (featureKey: string, state: AIPolicyState) => {
    const updated = { ...overrides };
    if (state === 'INHERIT') {
      delete updated[featureKey];
    } else {
      updated[featureKey] = state;
    }
    onChange(updated);
  };

  const handleBulkSet = (state: AIPolicyState) => {
    if (state === 'INHERIT') {
      onChange({});
    } else {
      const updated: Record<string, AIPolicyState> = {};
      AI_FEATURES_CATALOG.forEach(f => {
        updated[f.key] = state;
      });
      onChange(updated);
    }
  };

  const filteredFeatures = AI_FEATURES_CATALOG.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const overrideCounts = {
    allow: Object.values(overrides).filter(v => v === 'ALLOW').length,
    deny: Object.values(overrides).filter(v => v === 'DENY').length,
    inherit: AI_FEATURES_CATALOG.length - (Object.values(overrides).filter(v => v === 'ALLOW' || v === 'DENY').length)
  };

  return (
    <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-sm">
              <Sliders size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                {title}
                {targetName && (
                  <span className="text-sm font-normal text-zinc-400">({targetName})</span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Bulk Actions & Save */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-zinc-100/80 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 text-xs">
            <button
              type="button"
              onClick={() => handleBulkSet('INHERIT')}
              className="px-3 py-1.5 rounded-lg font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-all"
            >
              Reset All
            </button>
            <button
              type="button"
              onClick={() => handleBulkSet('ALLOW')}
              className="px-3 py-1.5 rounded-lg font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 transition-all"
            >
              Allow All
            </button>
            <button
              type="button"
              onClick={() => handleBulkSet('DENY')}
              className="px-3 py-1.5 rounded-lg font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-all"
            >
              Deny All
            </button>
          </div>

          {onSave && (
            <Button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 px-5 py-2 text-xs shadow-lg shadow-indigo-500/20"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Overrides
            </Button>
          )}
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Inherited Defaults</span>
            <p className="text-xl font-black text-zinc-700 dark:text-zinc-300">{overrideCounts.inherit}</p>
          </div>
          <Badge variant="zinc" className="text-[10px] font-bold">Auto</Badge>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Explicit Allowed</span>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{overrideCounts.allow}</p>
          </div>
          <Badge variant="green" className="text-[10px] font-bold">Override</Badge>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Explicit Denied</span>
            <p className="text-xl font-black text-rose-700 dark:text-rose-300">{overrideCounts.deny}</p>
          </div>
          <Badge variant="red" className="text-[10px] font-bold">Blocked</Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search AI features..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 max-w-full scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
              selectedCategory === 'all'
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25"
                : "bg-zinc-100/80 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            All Features ({AI_FEATURES_CATALOG.length})
          </button>
          {categories.map(cat => {
            const isCatSelected = selectedCategory === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                  isCatSelected
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25"
                    : "bg-zinc-100/80 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                {AI_CATEGORY_LABELS[cat].title.split('&')[0].trim()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFeatures.map(feat => {
          const currentState: AIPolicyState = overrides[feat.key] || 'INHERIT';
          return (
            <div
              key={feat.key}
              className={cn(
                "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4",
                currentState === 'ALLOW' 
                  ? "border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-sm shadow-emerald-500/5"
                  : currentState === 'DENY'
                  ? "border-rose-500/30 bg-rose-50/10 dark:bg-rose-950/10 shadow-sm shadow-rose-500/5"
                  : "border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className={cn(
                        currentState === 'ALLOW' ? 'text-emerald-500' :
                        currentState === 'DENY' ? 'text-rose-500' :
                        'text-indigo-500'
                      )} />
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {feat.name}
                      </h4>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 block">
                      {feat.key}
                    </span>
                  </div>

                  <Badge
                    variant={
                      currentState === 'ALLOW' ? 'green' :
                      currentState === 'DENY' ? 'red' :
                      'zinc'
                    }
                    className="text-[9px] uppercase font-black tracking-widest shrink-0"
                  >
                    {currentState === 'ALLOW' ? 'Allowed' :
                     currentState === 'DENY' ? 'Blocked' :
                     'Inherit'}
                  </Badge>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              {/* 3-Way Policy Switcher */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Access Policy:
                </span>
                <div className="flex items-center bg-zinc-100/80 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSetState(feat.key, 'INHERIT')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all",
                      currentState === 'INHERIT'
                        ? "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-300/40 dark:border-zinc-700/60"
                        : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40"
                    )}
                  >
                    Auto (Inherit)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetState(feat.key, 'ALLOW')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1",
                      currentState === 'ALLOW'
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    )}
                  >
                    <CheckCircle2 size={12} />
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetState(feat.key, 'DENY')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1",
                      currentState === 'DENY'
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                    )}
                  >
                    <XCircle size={12} />
                    Deny
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
