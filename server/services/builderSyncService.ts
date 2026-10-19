import { PLATFORM_MODULES } from '../../src/constants/platformModules';

const migratedTenants = new Set<string>();

export function resolveModuleName(moduleId: string | null | undefined, modulesMap: Map<string, string>): string | undefined {
  if (!moduleId) return undefined;
  if (modulesMap.has(moduleId)) return modulesMap.get(moduleId);
  const platMod = PLATFORM_MODULES.find((pm: any) => pm.id === moduleId);
  return platMod?.name;
}

export function formatFormRowForModule(row: any) {
  const schema = (row.schema && typeof row.schema === 'object') ? (row.schema as Record<string, any>) : {};
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  const steps = Array.isArray(schema.steps) && schema.steps.length > 0
    ? schema.steps
    : [{ id: 'step-1', title: 'Step 1', fields }];

  return {
    ...schema,
    id: row.id,
    moduleId: row.moduleId,
    isGlobal: row.isGlobal,
    name: row.name || schema.name || schema.title || 'Untitled Form',
    title: row.name || schema.title || schema.name || 'Untitled Form',
    description: row.description ?? schema.description ?? schema.settings?.description ?? '',
    usage: schema.usage || (row.isGlobal ? 'public_link' : 'workspace_create'),
    isMultistep: Boolean(schema.isMultistep),
    fields,
    steps,
    status: row.status || 'PUBLISHED',
    version: row.version || 1,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

export async function ensureTenantBuilderEntitiesMigrated(db: any, tenantId: string, force = false): Promise<Map<string, string>> {
  const modules = await db.module.findMany({ where: { tenantId } });
  const modulesMap = new Map<string, string>();
  for (const m of modules) {
    modulesMap.set(m.id, m.name);
  }

  if (migratedTenants.has(tenantId) && !force) {
    return modulesMap;
  }

  try {
    const [existingForms, existingWorkflows, existingRulesets] = await Promise.all([
      db.form.findMany({ where: { tenantId } }),
      db.workflow.findMany({ where: { tenantId } }),
      db.validationRuleset.findMany({ where: { tenantId } }),
    ]);

    const formsByModule = new Set(existingForms.map((f: any) => f.moduleId).filter(Boolean));
    const workflowsByModule = new Set(existingWorkflows.map((w: any) => w.moduleId).filter(Boolean));
    const rulesetsByModule = new Set(existingRulesets.map((v: any) => v.moduleId).filter(Boolean));

    for (const mod of modules) {
      const cfg = (mod.config && typeof mod.config === 'object') ? (mod.config as any) : {};

      // 1. Migrate embedded forms if none exist in db.form for this module
      if (!formsByModule.has(mod.id) && Array.isArray(cfg.forms) && cfg.forms.length > 0) {
        for (const f of cfg.forms) {
          const formName = f.name || f.title || `${mod.name} Form`;
          const formDesc = f.description || f.settings?.description || '';
          await db.form.create({
            data: {
              tenantId,
              moduleId: mod.id,
              isGlobal: false,
              name: formName,
              description: formDesc,
              status: f.status || 'PUBLISHED',
              version: f.version || 1,
              schema: {
                ...f,
                name: formName,
                title: formName,
                description: formDesc,
              },
            },
          }).catch((e: any) => console.warn('[BuilderSync] Form migration notice:', e.message));
        }
        formsByModule.add(mod.id);
      }

      // 2. Migrate embedded workflows if none exist in db.workflow for this module
      const embeddedWfs = Array.isArray(cfg.workflows) && cfg.workflows.length > 0
        ? cfg.workflows
        : (cfg.workflow && Array.isArray(cfg.workflow.nodes) && cfg.workflow.nodes.length > 0 ? [cfg.workflow] : []);

      if (!workflowsByModule.has(mod.id) && embeddedWfs.length > 0) {
        for (const wf of embeddedWfs) {
          if (!wf || (!Array.isArray(wf.nodes) || wf.nodes.length === 0)) continue;
          await db.workflow.create({
            data: {
              tenantId,
              moduleId: mod.id,
              isGlobal: false,
              name: wf.name || `${mod.name} Lifecycle Workflow`,
              description: wf.description || `State machine and process workflow for ${mod.name}`,
              triggerType: wf.triggerType || 'RECORD_EVENT',
              nodes: wf.nodes || [],
              edges: wf.edges || [],
              status: wf.status || 'PUBLISHED',
              version: wf.version || 1,
            },
          }).catch((e: any) => console.warn('[BuilderSync] Workflow migration notice:', e.message));
        }
        workflowsByModule.add(mod.id);
      }

      // 3. Migrate embedded validationRules if none exist in db.validationRuleset for this module
      if (!rulesetsByModule.has(mod.id) && Array.isArray(cfg.validationRules) && cfg.validationRules.length > 0) {
        await db.validationRuleset.create({
          data: {
            tenantId,
            moduleId: mod.id,
            scope: 'MODULE',
            name: `${mod.name} Validation Rules`,
            description: `Field and record validation rules for ${mod.name}`,
            rules: cfg.validationRules,
          },
        }).catch((e: any) => console.warn('[BuilderSync] Validation migration notice:', e.message));
        rulesetsByModule.add(mod.id);
      }
    }

    migratedTenants.add(tenantId);
  } catch (err) {
    console.warn('[BuilderSync] Migration check warning:', err);
  }

  return modulesMap;
}

export async function syncModuleBuilderEntities(
  db: any,
  tenantId: string,
  moduleId: string,
  moduleName: string,
  configPayload: any
) {
  if (!configPayload || typeof configPayload !== 'object') return;

  // 1. Sync Forms
  if (Array.isArray(configPayload.forms)) {
    const existingForms = await db.form.findMany({ where: { tenantId, moduleId } });
    const incomingForms = configPayload.forms;
    const keptIds = new Set<string>();

    const syncedForms: any[] = [];
    for (const f of incomingForms) {
      const formName = f.name || f.title || `${moduleName} Form`;
      const formDesc = f.description || f.settings?.description || '';
      const match = existingForms.find((ef: any) => ef.id === f.id || (ef.schema as any)?.id === f.id);

      if (match) {
        keptIds.add(match.id);
        const updated = await db.form.update({
          where: { id: match.id },
          data: {
            name: formName,
            description: formDesc,
            isGlobal: false,
            moduleId,
            schema: {
              ...f,
              id: match.id,
              name: formName,
              title: formName,
              description: formDesc,
            },
          },
        });
        syncedForms.push(formatFormRowForModule(updated));
      } else {
        const created = await db.form.create({
          data: {
            tenantId,
            moduleId,
            isGlobal: false,
            name: formName,
            description: formDesc,
            status: f.status || 'PUBLISHED',
            version: 1,
            schema: {
              ...f,
              name: formName,
              title: formName,
              description: formDesc,
            },
          },
        });
        keptIds.add(created.id);
        syncedForms.push(formatFormRowForModule(created));
      }
    }

    // Delete module forms that were removed in ModuleEditor
    for (const ef of existingForms) {
      if (!keptIds.has(ef.id)) {
        await db.form.delete({ where: { id: ef.id } }).catch(() => {});
      }
    }

    configPayload.forms = syncedForms;
  }

  // 2. Sync Workflows
  const incomingWfs = Array.isArray(configPayload.workflows)
    ? configPayload.workflows
    : (configPayload.workflow ? [configPayload.workflow] : null);

  if (incomingWfs) {
    const existingWfs = await db.workflow.findMany({ where: { tenantId, moduleId }, orderBy: { updatedAt: 'desc' } });
    const syncedWfs: any[] = [];

    for (let i = 0; i < incomingWfs.length; i++) {
      const wf = incomingWfs[i];
      if (!wf) continue;
      const match = existingWfs.find((ew: any) => ew.id === wf.id) || (i === 0 ? existingWfs[0] : null);
      const wfName = wf.name || `${moduleName} Workflow`;

      if (match) {
        const updated = await db.workflow.update({
          where: { id: match.id },
          data: {
            name: wfName,
            description: wf.description !== undefined ? wf.description : match.description,
            triggerType: wf.triggerType || match.triggerType || 'RECORD_EVENT',
            nodes: wf.nodes || [],
            edges: wf.edges || [],
            isGlobal: false,
            moduleId,
          },
        });
        syncedWfs.push(updated);
      } else if (Array.isArray(wf.nodes) && wf.nodes.length > 0) {
        const created = await db.workflow.create({
          data: {
            tenantId,
            moduleId,
            isGlobal: false,
            name: wfName,
            description: wf.description || `Workflow for ${moduleName}`,
            triggerType: wf.triggerType || 'RECORD_EVENT',
            nodes: wf.nodes || [],
            edges: wf.edges || [],
            status: 'PUBLISHED',
            version: 1,
          },
        });
        syncedWfs.push(created);
      }
    }

    configPayload.workflows = syncedWfs;
    if (syncedWfs.length > 0) {
      configPayload.workflow = syncedWfs[0];
    }
  }

  // 3. Sync Validation Rules
  if (Array.isArray(configPayload.validationRules)) {
    const existingRulesets = await db.validationRuleset.findMany({
      where: { tenantId, moduleId },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingRulesets.length > 0) {
      await db.validationRuleset.update({
        where: { id: existingRulesets[0].id },
        data: {
          rules: configPayload.validationRules,
          scope: 'MODULE',
          moduleId,
        },
      });
    } else if (configPayload.validationRules.length > 0) {
      await db.validationRuleset.create({
        data: {
          tenantId,
          moduleId,
          scope: 'MODULE',
          name: `${moduleName} Validation Rules`,
          description: `Validation rules for ${moduleName}`,
          rules: configPayload.validationRules,
        },
      });
    }
  }
}

export async function syncStandaloneToModuleConfig(db: any, tenantId: string, moduleId: string | null | undefined) {
  if (!moduleId) return;
  try {
    const mod = await db.module.findFirst({ where: { id: moduleId, tenantId } });
    if (!mod) return;

    const [forms, workflows, rulesets] = await Promise.all([
      db.form.findMany({ where: { tenantId, moduleId }, orderBy: { updatedAt: 'desc' } }),
      db.workflow.findMany({ where: { tenantId, moduleId }, orderBy: { updatedAt: 'desc' } }),
      db.validationRuleset.findMany({ where: { tenantId, moduleId }, orderBy: { updatedAt: 'desc' } }),
    ]);

    const currentConfig = (mod.config && typeof mod.config === 'object') ? (mod.config as any) : {};
    const formattedForms = forms.map(formatFormRowForModule);
    const mergedRules = rulesets.flatMap((r: any) => (Array.isArray(r.rules) ? r.rules : []));

    await db.module.update({
      where: { id: mod.id },
      data: {
        config: {
          ...currentConfig,
          forms: formattedForms,
          workflows,
          workflow: workflows[0] || currentConfig.workflow || undefined,
          validationRules: mergedRules,
        },
      },
    });
  } catch (err) {
    console.warn('[BuilderSync] syncStandaloneToModuleConfig warning:', err);
  }
}

export async function getActiveRulesForModule(db: any, tenantId: string, moduleId: string, fallbackRules: any[] = []): Promise<any[]> {
  try {
    await ensureTenantBuilderEntitiesMigrated(db, tenantId);
    const rulesets = await db.validationRuleset.findMany({
      where: {
        tenantId,
        OR: [
          { moduleId },
          { scope: 'GLOBAL' },
        ],
      },
    });
    if (rulesets.length > 0) {
      return rulesets.flatMap((rs: any) => (Array.isArray(rs.rules) ? rs.rules : []));
    }
  } catch (err) {
    console.warn('[BuilderSync] getActiveRulesForModule fallback:', err);
  }
  return Array.isArray(fallbackRules) ? fallbackRules : [];
}

export async function getActiveWorkflowForModule(db: any, tenantId: string, moduleId: string, fallbackWorkflow?: any): Promise<any> {
  try {
    await ensureTenantBuilderEntitiesMigrated(db, tenantId);
    const wf = await db.workflow.findFirst({
      where: { tenantId, moduleId },
      orderBy: { updatedAt: 'desc' },
    });
    if (wf && Array.isArray(wf.nodes) && wf.nodes.length > 0) {
      return wf;
    }
  } catch (err) {
    console.warn('[BuilderSync] getActiveWorkflowForModule fallback:', err);
  }
  return fallbackWorkflow;
}
