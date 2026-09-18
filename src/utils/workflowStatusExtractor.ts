export interface WorkflowStatusOption {
  label: string;
  value: string;
  color?: string;
  moduleNames: string[];
  nodeType?: 'START' | 'STATUS' | 'END' | 'DECISION' | string;
}

/**
 * Extracts workflow statuses and stages from custom modules' workflow configurations.
 * Inspects `module.config.workflows` (nodes of type STATUS, START, END) as well as
 * any custom stages or status configurations.
 */
export function extractWorkflowStatusesFromModules(
  modules: any[],
  selectedModuleIds?: string[]
): WorkflowStatusOption[] {
  if (!Array.isArray(modules) || modules.length === 0) return [];

  // Filter to selected modules if specified
  const targetModules = selectedModuleIds && selectedModuleIds.length > 0
    ? modules.filter(m => selectedModuleIds.includes(m.id))
    : modules;

  const statusMap = new Map<string, WorkflowStatusOption>();

  targetModules.forEach(mod => {
    if (!mod) return;
    const modName = mod.name || 'Module';
    const config = mod.config || {};

    // 1. Traverse workflows and their nodes
    const workflows = Array.isArray(config.workflows) 
      ? config.workflows 
      : (Array.isArray(mod.workflows) ? mod.workflows : []);

    workflows.forEach((wf: any) => {
      const nodes = Array.isArray(wf.nodes) ? wf.nodes : [];
      nodes.forEach((node: any) => {
        if (!node || !node.name) return;
        const type = String(node.type || '').toUpperCase();
        
        // Match workflow lifecycle nodes (STATUS, START, END)
        if (['STATUS', 'START', 'END'].includes(type)) {
          const rawName = String(node.name).trim();
          if (!rawName) return;
          const key = rawName.toLowerCase();

          if (statusMap.has(key)) {
            const existing = statusMap.get(key)!;
            if (!existing.moduleNames.includes(modName)) {
              existing.moduleNames.push(modName);
            }
          } else {
            let color = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60';
            if (type === 'START') {
              color = 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60';
            } else if (type === 'END') {
              color = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
            }

            statusMap.set(key, {
              label: rawName,
              value: rawName,
              color,
              moduleNames: [modName],
              nodeType: type
            });
          }
        }
      });
    });

    // 2. Check config.stages or config.statuses
    const stages = Array.isArray(config.stages) ? config.stages : (Array.isArray(config.statuses) ? config.statuses : []);
    stages.forEach((st: any) => {
      const name = typeof st === 'string' ? st.trim() : String(st.name || st.label || '').trim();
      if (!name) return;
      const key = name.toLowerCase();

      if (statusMap.has(key)) {
        const existing = statusMap.get(key)!;
        if (!existing.moduleNames.includes(modName)) {
          existing.moduleNames.push(modName);
        }
      } else {
        statusMap.set(key, {
          label: name,
          value: name,
          color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
          moduleNames: [modName],
          nodeType: 'STATUS'
        });
      }
    });
  });

  return Array.from(statusMap.values());
}
