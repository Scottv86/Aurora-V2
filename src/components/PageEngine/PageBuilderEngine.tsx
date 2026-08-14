import React, { useState } from 'react';
import { 
  Layout, Cpu, Workflow, FileText, 
  HelpCircle, Sparkles, Monitor, Tablet, Smartphone
} from 'lucide-react';
import { UniversalWidgetRenderer } from './UniversalWidgetRenderer';
import { cn } from '../../lib/utils';

export interface PageEngineWidget {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  properties?: Record<string, any>;
  formFields?: any[];
  buttonLabel?: string;
  layout?: { x: number; y: number; w: number; h: number };
}

export interface PageEngineContext {
  mode: 'site' | 'workspace';
  containerId: string;
}

export interface PageBuilderEngineProps {
  widgets: PageEngineWidget[];
  onChangeWidgets: (widgets: PageEngineWidget[]) => void;
  context: PageEngineContext;
  readOnly?: boolean;
}

export const PageBuilderEngine: React.FC<PageBuilderEngineProps> = ({
  widgets,
  onChangeWidgets,
  context,
  readOnly = false
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);


  const handleAddWidget = (type: string) => {
    const newWidget: PageEngineWidget = {
      id: `w_${Date.now()}`,
      type,
      title: `New ${type.replace('-', ' ').toUpperCase()} Widget`,
      layout: { x: 0, y: widgets.length * 4, w: 6, h: 4 }
    };
    onChangeWidgets([...widgets, newWidget]);
    setSelectedWidgetId(newWidget.id);
  };

  const viewportWidthClass = {
    desktop: 'w-full',
    tablet: 'max-w-3xl mx-auto',
    mobile: 'max-w-sm mx-auto'
  }[viewport];

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      {/* Top Engine Control Bar */}
      {!readOnly && (
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
              Page Layout Engine
            </span>
            <span className="text-xs text-zinc-500 font-mono">[{context.mode.toUpperCase()}]</span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setViewport('desktop')}
              className={cn("p-1.5 rounded-lg transition-all", viewport === 'desktop' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-400")}
              title="Desktop View"
            >
              <Monitor size={15} />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={cn("p-1.5 rounded-lg transition-all", viewport === 'tablet' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-400")}
              title="Tablet View"
            >
              <Tablet size={15} />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={cn("p-1.5 rounded-lg transition-all", viewport === 'mobile' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-400")}
              title="Mobile View"
            >
              <Smartphone size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Widget Toolbox (If not readOnly) */}
        {!readOnly && (
          <div className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 space-y-3 overflow-y-auto shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Universal Toolbox</h4>
            <div className="space-y-1.5">
              {[
                { type: 'standalone-form', label: 'Standalone Form', icon: FileText },
                { type: 'stats-grid', label: 'Stats Metrics Grid', icon: Cpu },
                { type: 'active-workflows', label: 'Active Workflows', icon: Workflow },
                { type: 'work-queue', label: 'Work Inbox', icon: Layout },
                { type: 'rich-text', label: 'Rich Text Block', icon: FileText },
                { type: 'hero', label: 'Hero Section', icon: Sparkles },
                { type: 'faq', label: 'FAQ Accordion', icon: HelpCircle }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddWidget(item.type)}
                  className="w-full flex items-center gap-2.5 p-2.5 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 transition-all text-left"
                >
                  <item.icon size={15} className="text-zinc-400" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Center Canvas */}
        <div className="flex-1 p-6 overflow-y-auto bg-zinc-100/50 dark:bg-zinc-950/40">

          <div className={cn("transition-all duration-300 space-y-4", viewportWidthClass)}>
            {widgets.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8">
                <Layout className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Page Canvas is Empty</p>
                <p className="text-xs text-zinc-400 mt-1">Use the toolbox on the left to add widgets onto this page body.</p>
              </div>
            ) : (
              widgets.map((widget) => (
                <div
                  key={widget.id}
                  onClick={() => setSelectedWidgetId(widget.id)}
                  className={cn(
                    "relative group rounded-3xl transition-all",
                    selectedWidgetId === widget.id && !readOnly ? "ring-2 ring-indigo-500 shadow-md" : ""
                  )}
                >
                  <UniversalWidgetRenderer widget={widget} mode={context.mode} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
