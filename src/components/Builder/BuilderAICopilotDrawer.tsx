import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Field } from '../../types/versionControl';
import { CompactAIAssistantView } from '../WorkspaceApps/CompactAIAssistantView';
import { useRegisterActiveEntity } from '../../context/ActiveEntityContext';

interface BuilderAICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId?: string;
  layout: Field[];
  tabs: any[];
  moduleName: string;
  activeTab?: string;
  width?: number;
  isResizing?: boolean;
  overlayMode?: boolean;
  onStartResize?: (e: React.MouseEvent) => void;
  onApplyChanges?: (newLayout: Field[], description?: string) => void;
  onRefreshModule?: () => void;
}

const TAB_CONTEXT_LABELS: Record<string, string> = {
  details: 'Setup',
  builder: 'Interface',
  forms: 'Forms',
  workflow: 'Workflow',
  validations: 'Rules',
  connectors: 'Integrations',
  automation: 'Automations',
  preview: 'Preview',
};

export const BuilderAICopilotDrawer: React.FC<BuilderAICopilotDrawerProps> = ({
  isOpen,
  onClose,
  moduleId,
  layout,
  tabs,
  moduleName,
  activeTab = 'builder',
  width = 360,
  isResizing = false,
  overlayMode = false,
  onStartResize,
}) => {
  const activeContextLabel = TAB_CONTEXT_LABELS[activeTab] || 'Module';

  const moduleEntityContext = useMemo(
    () => ({
      domain: 'module_builder' as any,
      id: moduleId || 'new',
      title: moduleName || 'Custom Module',
      status: 'EDITING',
      activeTab: activeContextLabel,
      module: {
        id: moduleId,
        name: moduleName || 'Custom Module',
      },
      keyAttributes: {
        fieldsCount: layout.length,
        tabsCount: tabs.length,
        tabs: tabs.map(t => `${t.label || t.id} (id=${t.id})`).join(', '),
        fields: layout
          .slice(0, 60)
          .map(f => `${f.label || f.name} (${f.type}, id=${f.id})`)
          .join('; '),
      },
    }),
    [moduleId, moduleName, activeContextLabel, layout, tabs]
  );

  useRegisterActiveEntity(moduleEntityContext, {
    enabled: isOpen,
    priority: 20,
  });

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          key="copilot-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={isResizing ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
          className={
            overlayMode
              ? "absolute right-0 top-0 bottom-0 z-30 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col h-full overflow-hidden shadow-2xl shadow-black/15 dark:shadow-black/50"
              : "relative shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col h-full overflow-hidden"
          }
        >
          {onStartResize && (
            <div
              onMouseDown={onStartResize}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/60 transition-colors z-30"
              title="Drag to resize AI Assistant"
            />
          )}
          <CompactAIAssistantView compactLevel="side" onClose={onClose} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
