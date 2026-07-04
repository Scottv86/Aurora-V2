import express from 'express';
import { emitTenantUpdate } from '../socket';
import { TenantRequest } from '../middleware/tenantMiddleware';
import { RLS_CONTEXT, globalPrisma } from '../lib/prisma';
import { validateRecordRules } from '../../src/lib/validationEngine';
import { WorkflowEngine } from '../services/workflowEngine';
import { AutomationEngine } from '../services/automationEngine';

const router = express.Router();

function getStatusFromState(evaluatedState: any, workflow: any, fallback: string): string {
  if (!evaluatedState || !workflow) return fallback;
  const activeNodeIds = evaluatedState.activeNodeIds || (evaluatedState.currentNodeId ? [evaluatedState.currentNodeId] : []);
  if (activeNodeIds.length === 0) return fallback;

  const statusNames: string[] = [];
  for (const nodeId of activeNodeIds) {
    let targetNode = workflow.nodes.find((n: any) => n.id === nodeId);
    if (targetNode && (targetNode.type === 'ACTION' || targetNode.type === 'DECISION')) {
      const history = evaluatedState.history || [];
      for (let i = history.length - 1; i >= 0; i--) {
        const histNode = workflow.nodes.find((n: any) => n.id === history[i].nodeId);
        if (histNode && (histNode.type === 'STATUS' || histNode.type === 'START' || histNode.type === 'END')) {
          targetNode = histNode;
          break;
        }
      }
    }
    if (targetNode && targetNode.name && !statusNames.includes(targetNode.name)) {
      statusNames.push(targetNode.name);
    }
  }
  return statusNames.length > 0 ? statusNames.join(' / ') : fallback;
}

function processAutonumbers(dataObject: any, fields: any[], updatedConfig: any): boolean {
  if (!dataObject || typeof dataObject !== 'object' || !fields || !Array.isArray(fields)) return false;
  let changed = false;

  const getNextAutonumber = (field: any) => {
    const fieldKey = `_autonumber_${field.id}`;
    const currentNum = updatedConfig[fieldKey] !== undefined ? updatedConfig[fieldKey] : (field.autonumberStart || 1);
    const prefix = field.autonumberPrefix || '';
    const suffix = field.autonumberSuffix || '';
    const digits = field.autonumberDigits || 0;
    const formattedNum = currentNum.toString().padStart(digits, '0');
    
    updatedConfig[fieldKey] = currentNum + 1;
    return `${prefix}${formattedNum}${suffix}`;
  };

  fields.forEach((field: any) => {
    if (field.type === 'autonumber') {
      if (!dataObject[field.id]) {
        dataObject[field.id] = getNextAutonumber(field);
        changed = true;
      }
    } else if (field.type === 'repeatableGroup') {
      const arrayVal = dataObject[field.id];
      if (Array.isArray(arrayVal)) {
        arrayVal.forEach((item: any) => {
          if (item && typeof item === 'object') {
            const itemChanged = processAutonumbers(item, field.fields || [], updatedConfig);
            if (itemChanged) {
              changed = true;
            }
          }
        });
      }
    } else if (field.fields && Array.isArray(field.fields)) {
      const nestedObj = dataObject[field.id];
      if (nestedObj && typeof nestedObj === 'object' && !Array.isArray(nestedObj)) {
        const nestedChanged = processAutonumbers(nestedObj, field.fields, updatedConfig);
        if (nestedChanged) {
          changed = true;
        }
      } else {
        const flatChanged = processAutonumbers(dataObject, field.fields, updatedConfig);
        if (flatChanged) {
          changed = true;
        }
      }
    }
  });

  return changed;
}

async function ensureWorkDistributionModule(db: any, tenantId: string) {
  const triageModule = await db.module.findFirst({
    where: {
      tenantId,
      config: { path: ['isIntakeTriage'], equals: true }
    }
  });

  if (!triageModule) {
    console.log(`[DataAPI] Auto-provisioning Work Distribution module for tenant: ${tenantId}`);
    let workspace = await db.workspace.findFirst();
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          name: 'Main Workspace',
          tenantId
        }
      });
    }

    await db.module.create({
      data: {
        tenantId,
        workspaceId: workspace.id,
        name: 'Work Distribution',
        category: 'Intake & Requests',
        icon: 'Inbox',
        type: 'WORK_ITEM',
        enabled: true,
        config: {
          isIntakeTriage: true,
          layout: [
            { id: 'f1', name: 'submitted_by', label: 'Submitted By', type: 'text', colSpan: 6, rowIndex: 0 },
            { id: 'f2', name: 'email', label: 'Email', type: 'text', colSpan: 6, rowIndex: 0 },
            { id: 'f3', name: 'description', label: 'Description', type: 'longText', colSpan: 12, rowIndex: 1 }
          ]
        }
      }
    });
  }
}

// GET all modules for this tenant
router.get('/modules', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    await ensureWorkDistributionModule(db, tenantId);
    const modules = await db.module.findMany();
    // Flatten config for frontend
    const formatted = modules.map(m => {
      const config = (m.config as any);
      return {
        ...config,
        id: m.id,
        name: m.name,
        category: m.category,
        iconName: m.icon,
        type: m.type,
        enabled: m.enabled,
        isGlobal: m.isGlobal,
        templateId: m.templateId || config.id,
        status: m.enabled ? 'ACTIVE' : 'INACTIVE',
        createdAt: m.createdAt,
      };
    });
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single module by ID
router.get('/modules/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const module = await db.module.findUnique({ where: { id } });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    const config = module.config as any;
    const formatted = {
      ...config,
      id: module.id,
      name: module.name,
      category: module.category,
      iconName: module.icon,
      type: module.type,
      enabled: module.enabled,
      isGlobal: module.isGlobal,
      templateId: module.templateId || config.id,
      status: module.enabled ? 'ACTIVE' : 'INACTIVE',
      createdAt: module.createdAt,
    };
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// GET stats for dashboard
router.get('/stats', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const totalRecords = await db.record.count();
    const activeRecords = await db.record.count({
      where: {
        NOT: {
          status: { in: ['Completed', 'Archived'] }
        }
      }
    });

    res.json({
      totalRecords,
      activeRecords,
      health: '99.9%',
      aiAutomations: Math.floor(totalRecords * 0.8)
    });
  } catch (err: any) {
    console.error(`[DataAPI] Dashboard stats error: ${err.message}`, { tenantId: req.tenantId });
    res.status(500).json({ error: err.message });
  }
});



// GET all cases/records
router.get('/records', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { moduleId, platformModuleId, associationId, page = '1', limit = '100' } = req.query;
    const p = parseInt(page as string);
    const l = parseInt(limit as string);
    const skip = (p - 1) * l;

    const whereClause: any = {};
    if (moduleId) {
      whereClause.moduleId = moduleId as string;
    }
    
    // Total count for pagination
    let total;
    let records;

    if (associationId) {
      total = await db.record.count({
        where: {
          associations: {
            array_contains: [{ record_id: associationId as string }]
          }
        }
      });

      records = await db.record.findMany({
        where: {
          associations: {
            array_contains: [{ record_id: associationId as string }]
          }
        },
        include: { createdByMember: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l
      });
    } else if (platformModuleId === 'people-organisations') {
      total = await db.party.count({ where: {} });
      records = await db.party.findMany({
        where: {},
        include: { person: true, organization: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l
      });
      
      const formatted = (records as any[]).map((p: any) => ({
        id: p.id,
        name: p.partyType === 'PERSON' 
          ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
          : p.organization?.legalName || 'Unknown Org',
        partyType: p.partyType,
        firstName: p.person?.firstName,
        lastName: p.person?.lastName,
        legalName: p.organization?.legalName,
        taxIdentifier: p.organization?.taxIdentifier,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));

      return res.json({
        records: formatted,
        total,
        page: p,
        limit: l
      });
    } else {
      total = await db.record.count({ where: whereClause });
      records = await db.record.findMany({
        where: whereClause,
        include: { createdByMember: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l
      });
    }
    
    // Format records for frontend consumption
    const formatted = (records as any[]).map((r: any) => ({
      id: r.id,
      moduleId: r.moduleId,
      status: r.status,
      associations: r.associations,
      path: r.path,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      createdBy: r.createdByMember ? `${r.createdByMember.firstName || ''} ${r.createdByMember.familyName || ''}`.trim() : 'System',
      ...(r.data as any),
      workflowState: r.workflowState
    }));
    
    res.json({
      records: formatted,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single record by ID
router.get('/records/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { id } = req.params;
    const record = await db.record.findUnique({ 
      where: { id },
      include: { createdByMember: true }
    });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({
      id: record.id,
      moduleId: record.moduleId,
      status: record.status,
      associations: record.associations,
      path: record.path,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: (record as any).createdByMember ? `${(record as any).createdByMember.firstName || ''} ${(record as any).createdByMember.familyName || ''}`.trim() : 'System',
      ...(record.data as any),
      workflowState: record.workflowState
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE record
router.post('/records', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { moduleId, associations, path, ...data } = req.body;
    
    const module = await db.module.findUnique({ where: { id: moduleId } });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    // Validation for required fields
    const config = module.config as any;
    const flattenFields = (fields: any[]): any[] => {
      const result: any[] = [];
      fields.forEach(f => {
        result.push(f);
        // Do not flatten sub-fields of repeatableGroup or sub_module for top-level validation
        if (f.fields && f.type !== 'repeatableGroup' && f.type !== 'sub_module') {
          result.push(...flattenFields(f.fields));
        }
      });
      return result;
    };
    const allFields = flattenFields(config.layout || []);
    const requiredFields = allFields.filter((f: any) => f.required);

    const missingFields = requiredFields.filter((f: any) => {
      const val = data[f.id];
      // Also check if it's nested in a group in the data (though data is usually flat unless it's a fieldGroup)
      // Actually, based on RecordDetailView, data is flat unless in a fieldGroup.
      // Let's check both for safety.
      let actualVal = val;
      if (actualVal === undefined || actualVal === null) {
        // Find if this field belongs to a container in the data
        const containerTypes = ['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'];
        const group = (config.layout || []).find((l: any) => containerTypes.includes(l.type) && l.fields?.some((nf: any) => nf.id === f.id));
        if (group) {
          actualVal = data[group.id]?.[f.id];
        }
      }
      
      return actualVal === null || actualVal === undefined || (typeof actualVal === 'string' && actualVal.trim() === '');
    });

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Validation failed: Required fields missing: ${missingFields.map(f => f.label || f.id).join(', ')}` 
      });
    }

    // Custom Validation Rules check
    if (config.validationRules && Array.isArray(config.validationRules)) {
      const validationErrors = validateRecordRules(data, config.validationRules, allFields);
      const hardErrors = validationErrors.filter(e => e.severity === 'error');
      if (hardErrors.length > 0) {
        return res.status(400).json({ 
          error: `Validation failed: ${hardErrors.map(e => e.message).join(' | ')}` 
        });
      }
    }
    let finalData = { ...data };
    
    if (module) {
      const config = module.config as any;
      let configChanged = false;
      let updatedConfig = { ...config };

      // 1. Handle legacy _record_key generation
      if (config.recordKeyPrefix) {
        const nextNum = config.nextKeyNumber || 1;
        const prefix = config.recordKeyPrefix || '';
        const suffix = config.recordKeySuffix || '';
        const recordKey = `${prefix}-${nextNum}${suffix}`;
        
        finalData._record_key = recordKey;
        updatedConfig.nextKeyNumber = nextNum + 1;
        configChanged = true;
      }

      // 2. Handle specific 'autonumber' fields in layout (including repeatable groups)
      const autonumbersChanged = processAutonumbers(finalData, config.layout || [], updatedConfig);
      if (autonumbersChanged) {
        configChanged = true;
      }

      if (configChanged) {
        await db.module.update({
          where: { id: moduleId },
          data: { config: updatedConfig }
        });
      }
    }

    // Initialize workflow state if module has one
    let workflowState = null;
    const workflow = config?.workflow || (config?.workflows && config.workflows[0]);
    
    if (workflow && workflow.nodes && workflow.nodes.length > 0) {
      const startNode = workflow.nodes.find((n: any) => n.type === 'START') || workflow.nodes[0];
      workflowState = {
        currentNodeId: startNode.id,
        activeNodeIds: [startNode.id],
        history: [{
          nodeId: startNode.id,
          timestamp: new Date().toISOString(),
          action: 'Initialized',
          triggeredBy: (req as any).user?.name || (req as any).user?.email || 'System'
        }]
      };
    }

    let record = await db.record.create({
      data: {
        tenantId, // still required by schema, but RLS will verify it matches app.current_tenant_id
        moduleId,
        data: finalData as any,
        associations: associations || [],
        path: path || null,
        status: (data as any).status || (workflowState ? getStatusFromState(workflowState, workflow, 'New') : 'New'),
        createdByMemberId: (req as any).user?.memberId,
        workflowState: workflowState as any
      }
    });

    // Evaluate workflow engine if a workflow exists
    if (workflow && workflowState) {
      try {
        const evaluatedState = await WorkflowEngine.evaluate(
          { id: record.id, ...finalData },
          workflow,
          workflowState,
          config?.layout
        );

        if (
          evaluatedState.currentNodeId !== workflowState.currentNodeId ||
          JSON.stringify(evaluatedState.activeNodeIds) !== JSON.stringify(workflowState.activeNodeIds)
        ) {
          const finalStatus = getStatusFromState(evaluatedState, workflow, record.status);

          // Update record with the new state and status
          record = await db.record.update({
            where: { id: record.id },
            data: {
              status: finalStatus,
              workflowState: evaluatedState as any
            }
          });
        }
      } catch (err) {
        console.error('[Workflow Error on Creation]:', err);
      }
    }

    // Trigger automations asynchronously
    AutomationEngine.handleEvent({
      type: 'RECORD_CREATED',
      tenantId,
      moduleId,
      record: { id: record.id, ...finalData }
    }, db).catch(err => console.error('[Automation Error on Creation]:', err));

    const recordWithMember = await db.record.findUnique({
      where: { id: record.id },
      include: { createdByMember: true }
    });

    const formatted = {
      id: record.id,
      moduleId: record.moduleId,
      status: record.status,
      associations: record.associations,
      path: record.path,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: recordWithMember?.createdByMember ? `${recordWithMember.createdByMember.firstName || ''} ${recordWithMember.createdByMember.familyName || ''}`.trim() : 'System',
      ...(record.data as any),
      workflowState: record.workflowState
    };
    emitTenantUpdate(tenantId, 'record_added', formatted);

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE record
router.put('/records/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { moduleId, status, associations, path, transitionTo, ...data } = req.body;

    // 1. Fetch existing (using scoped client, extension handles RLS)
    const existing = await db.record.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    const updatedData = {
      ...(existing.data as any),
      ...data
    };

    // 2. Validation for required fields
    const module = await db.module.findUnique({ 
      where: { id: moduleId || existing.moduleId }
    });
    
    if (module) {
      const config = module.config as any;
      let configChanged = false;
      const updatedConfig = { ...config };

      // Process autonumbers recursively (including repeatable groups)
      configChanged = processAutonumbers(updatedData, config.layout || [], updatedConfig);

      if (configChanged) {
        await db.module.update({
          where: { id: module.id },
          data: { config: updatedConfig }
        });
      }

      const layout = config.layout || [];
      const flattenFields = (fields: any[]): any[] => {
        const result: any[] = [];
        fields.forEach(f => {
          result.push(f);
          if (f.fields && f.type !== 'repeatableGroup' && f.type !== 'sub_module') {
            result.push(...flattenFields(f.fields));
          }
        });
        return result;
      };
      const allFields = flattenFields(layout);
      const requiredFields = allFields.filter((f: any) => f.required);

      const missingFields = requiredFields.filter((f: any) => {
        let actualVal = updatedData[f.id];
        if (actualVal === undefined || actualVal === null) {
          const containerTypes = ['fieldGroup', 'group', 'card', 'accordion', 'tabs_nested', 'stepper', 'timeline'];
          const group = layout.find((l: any) => containerTypes.includes(l.type) && l.fields?.some((nf: any) => nf.id === f.id));
          if (group) {
            actualVal = updatedData[group.id]?.[f.id];
          }
        }
        return actualVal === null || actualVal === undefined || (typeof actualVal === 'string' && actualVal.trim() === '');
      });

      if (missingFields.length > 0) {
        return res.status(400).json({ error: `Validation failed: Required fields missing: ${missingFields.map(f => f.label || f.id).join(', ')}` });
      }

      // Custom Validation Rules check
      if (config.validationRules && Array.isArray(config.validationRules)) {
        const validationErrors = validateRecordRules(updatedData, config.validationRules, allFields);
        const hardErrors = validationErrors.filter(e => e.severity === 'error');
        if (hardErrors.length > 0) {
          return res.status(400).json({ 
            error: `Validation failed: ${hardErrors.map(e => e.message).join(' | ')}` 
          });
        }
      }
    }

    const updatePayload: any = {
      data: updatedData,
      status: status || existing.status,
      associations: associations !== undefined ? associations : existing.associations,
      path: path !== undefined ? path : existing.path
    };

    if (module) {
      const config = module.config as any;
      const workflow = config?.workflow || (config?.workflows && config.workflows[0]);
      
      if (workflow) {
        try {
          if (transitionTo) {
            const targetNode = workflow.nodes.find((n: any) => n.id === transitionTo);
            if (targetNode) {
              const currentWorkflowState = (existing.workflowState as any) || { history: [] };
              const intermediateState = {
                currentNodeId: targetNode.id,
                activeNodeIds: [targetNode.id],
                history: [
                  ...(currentWorkflowState.history || []),
                  {
                    nodeId: targetNode.id,
                    timestamp: new Date().toISOString(),
                    action: 'Transitioned',
                    triggeredBy: (req as any).user?.name || (req as any).user?.email || 'System'
                  }
                ]
              };
              
              // Evaluate further conditional paths/actions from the manually transitioned node
              const evaluatedState = await WorkflowEngine.evaluate(
                { id, ...updatedData },
                workflow,
                intermediateState,
                config?.layout
              );
              
              updatePayload.workflowState = evaluatedState;
              updatePayload.status = getStatusFromState(evaluatedState, workflow, targetNode.name);
            }
          } else {
            // Auto-transition based on data changes from current node
            const currentWorkflowState = (existing.workflowState as any) || {
              currentNodeId: workflow.nodes.find((n: any) => n.type === 'START')?.id || workflow.nodes[0]?.id,
              activeNodeIds: workflow.nodes.find((n: any) => n.type === 'START')?.id ? [workflow.nodes.find((n: any) => n.type === 'START')?.id] : [workflow.nodes[0]?.id],
              history: []
            };
            const evaluatedState = await WorkflowEngine.evaluate(
              { id, ...updatedData },
              workflow,
              currentWorkflowState,
              config?.layout
            );
            
            if (
              evaluatedState.currentNodeId !== currentWorkflowState.currentNodeId ||
              JSON.stringify(evaluatedState.activeNodeIds) !== JSON.stringify(currentWorkflowState.activeNodeIds)
            ) {
              updatePayload.workflowState = evaluatedState;
              updatePayload.status = getStatusFromState(evaluatedState, workflow, existing.status || 'New');
            }
          }
        } catch (err) {
          console.error('[Workflow Error on PUT Update]:', err);
        }
      }
    }

    const finalStatus = updatePayload.status || existing.status;
    if (finalStatus && finalStatus !== existing.status) {
      const userLabel = (req as any).user?.name || (req as any).user?.email || 'System';
      const comments = [...(updatedData._comments || [])];
      comments.push({
        id: `comm_${Math.random().toString(36).substr(2, 9)}`,
        body: `Status changed from "${existing.status || 'New'}" to "${finalStatus}"`,
        author: userLabel === 'System' ? 'System Workflow' : userLabel,
        timestamp: new Date().toISOString()
      });
      updatedData._comments = comments;
      updatePayload.data = updatedData;
    }

    // 3. Perform update (using scoped client, handles RLS and returns included data in one transaction)
    const recordWithMember = await db.record.update({
      where: { id },
      data: updatePayload,
      include: { createdByMember: true }
    });

    const record = recordWithMember; // For compatibility with rest of handler

    // Trigger automations asynchronously
    AutomationEngine.handleEvent({
      type: 'RECORD_UPDATED',
      tenantId,
      moduleId: record.moduleId,
      record: { id: record.id, ...updatedData }
    }, db).catch(err => console.error('[Automation Error on PUT Update]:', err));

    // Handle transition-specific triggers
    const oldData = (existing.data as Record<string, any>) || {};
    const newData = (record.data as Record<string, any>) || {};

    if (existing.status !== record.status) {
      AutomationEngine.handleEvent({
        type: 'STATUS_CHANGED',
        tenantId,
        moduleId: record.moduleId,
        record: { id: record.id, ...newData },
        metadata: { fromStatus: existing.status, toStatus: record.status }
      }, db).catch(err => console.error('[Automation: STATUS_CHANGED error]:', err));
    }

    if (oldData.assigneeId !== newData.assigneeId) {
      AutomationEngine.handleEvent({
        type: 'ASSIGNEE_CHANGED',
        tenantId,
        moduleId: record.moduleId,
        record: { id: record.id, ...newData },
        metadata: { fromAssigneeId: oldData.assigneeId, toAssigneeId: newData.assigneeId }
      }, db).catch(err => console.error('[Automation: ASSIGNEE_CHANGED error]:', err));
    }

    if (JSON.stringify(existing.associations) !== JSON.stringify(record.associations)) {
      AutomationEngine.handleEvent({
        type: 'RELATION_LINKED',
        tenantId,
        moduleId: record.moduleId,
        record: { id: record.id, ...newData },
        metadata: { associations: record.associations }
      }, db).catch(err => console.error('[Automation: RELATION_LINKED error]:', err));
    }

    const formatted = {
      id: record.id,
      moduleId: record.moduleId,
      status: record.status,
      associations: record.associations,
      path: record.path,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: recordWithMember?.createdByMember ? `${recordWithMember.createdByMember.firstName || ''} ${recordWithMember.createdByMember.familyName || ''}`.trim() : 'System',
      ...(record.data as any),
      workflowState: record.workflowState
    };
    emitTenantUpdate(tenantId, 'record_updated', formatted);

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PARTIAL UPDATE record
router.patch('/records/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { moduleId, status, associations, path, transitionTo, ...data } = req.body;

    // 1. Fetch existing (using scoped client, handles RLS)
    const existing = await db.record.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    const updatedData = {
      ...(existing.data as any),
      ...data
    };

    // 2. Validation (Minimal check for fields provided in PATCH)
    const module = await db.module.findUnique({ 
      where: { id: moduleId || existing.moduleId }
    });

    if (module) {
      const config = module.config as any;
      let configChanged = false;
      const updatedConfig = { ...config };

      // Process autonumbers recursively (including repeatable groups)
      configChanged = processAutonumbers(updatedData, config.layout || [], updatedConfig);

      if (configChanged) {
        await db.module.update({
          where: { id: module.id },
          data: { config: updatedConfig }
        });
      }

      const layout = config.layout || [];
      const flattenFields = (fields: any[]): any[] => {
        const result: any[] = [];
        fields.forEach(f => {
          result.push(f);
          if (f.fields && f.type !== 'repeatableGroup' && f.type !== 'sub_module') {
            result.push(...flattenFields(f.fields));
          }
        });
        return result;
      };
      const allFields = flattenFields(layout);
      const fieldsToValidate = allFields.filter(f => data[f.id] !== undefined && f.required);
      
      const missing = fieldsToValidate.filter(f => {
        const val = data[f.id];
        return val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
      });

      if (missing.length > 0) {
        return res.status(400).json({ error: `Validation failed: ${missing.map(f => f.label || f.id).join(', ')} is required` });
      }

      // Custom Validation Rules check
      if (config.validationRules && Array.isArray(config.validationRules)) {
        const validationErrors = validateRecordRules(updatedData, config.validationRules, allFields);
        const hardErrors = validationErrors.filter(e => e.severity === 'error');
        if (hardErrors.length > 0) {
          return res.status(400).json({ 
            error: `Validation failed: ${hardErrors.map(e => e.message).join(' | ')}` 
          });
        }
      }
    }

    const updatePayload: any = {
      data: updatedData,
      status: status || existing.status,
      associations: associations !== undefined ? associations : existing.associations,
      path: path !== undefined ? path : existing.path
    };

    if (module) {
      const config = module.config as any;
      const workflow = config?.workflow || (config?.workflows && config.workflows[0]);
      
      if (workflow) {
        try {
          if (transitionTo) {
            const targetNode = workflow.nodes.find((n: any) => n.id === transitionTo);
            if (targetNode) {
              const currentWorkflowState = (existing.workflowState as any) || { history: [] };
              const intermediateState = {
                currentNodeId: targetNode.id,
                activeNodeIds: [targetNode.id],
                history: [
                  ...(currentWorkflowState.history || []),
                  {
                    nodeId: targetNode.id,
                    timestamp: new Date().toISOString(),
                    action: 'Transitioned',
                    triggeredBy: (req as any).user?.name || (req as any).user?.email || 'System'
                  }
                ]
              };
              
              // Evaluate further conditional paths/actions from the manually transitioned node
              const evaluatedState = await WorkflowEngine.evaluate(
                { id, ...updatedData },
                workflow,
                intermediateState,
                config?.layout
              );
              
              updatePayload.workflowState = evaluatedState;
              updatePayload.status = getStatusFromState(evaluatedState, workflow, targetNode.name);
            }
          } else {
            // Auto-transition based on data changes from current node
            const currentWorkflowState = (existing.workflowState as any) || {
              currentNodeId: workflow.nodes.find((n: any) => n.type === 'START')?.id || workflow.nodes[0]?.id,
              activeNodeIds: workflow.nodes.find((n: any) => n.type === 'START')?.id ? [workflow.nodes.find((n: any) => n.type === 'START')?.id] : [workflow.nodes[0]?.id],
              history: []
            };
            const evaluatedState = await WorkflowEngine.evaluate(
              { id, ...updatedData },
              workflow,
              currentWorkflowState,
              config?.layout
            );
            
            if (
              evaluatedState.currentNodeId !== currentWorkflowState.currentNodeId ||
              JSON.stringify(evaluatedState.activeNodeIds) !== JSON.stringify(currentWorkflowState.activeNodeIds)
            ) {
              updatePayload.workflowState = evaluatedState;
              updatePayload.status = getStatusFromState(evaluatedState, workflow, existing.status || 'New');
            }
          }
        } catch (err) {
          console.error('[Workflow Error on PATCH Update]:', err);
        }
      }
    }

    const finalStatus = updatePayload.status || existing.status;
    if (finalStatus && finalStatus !== existing.status) {
      const userLabel = (req as any).user?.name || (req as any).user?.email || 'System';
      const comments = [...(updatedData._comments || [])];
      comments.push({
        id: `comm_${Math.random().toString(36).substr(2, 9)}`,
        body: `Status changed from "${existing.status || 'New'}" to "${finalStatus}"`,
        author: userLabel === 'System' ? 'System Workflow' : userLabel,
        timestamp: new Date().toISOString()
      });
      updatedData._comments = comments;
      updatePayload.data = updatedData;
    }

    // 3. Perform update (using scoped client, handles RLS and returns included data)
    const recordWithMember = await db.record.update({
      where: { id },
      data: updatePayload,
      include: { createdByMember: true }
    });

    const record = recordWithMember; // For compatibility

    // Trigger automations asynchronously
    AutomationEngine.handleEvent({
      type: 'RECORD_UPDATED',
      tenantId,
      moduleId: record.moduleId,
      record: { id: record.id, ...updatedData }
    }, db).catch(err => console.error('[Automation Error on PATCH Update]:', err));

    // Handle transition-specific triggers
    const oldData = (existing.data as Record<string, any>) || {};
    const newData = (record.data as Record<string, any>) || {};

    if (existing.status !== record.status) {
      AutomationEngine.handleEvent({
        type: 'STATUS_CHANGED',
        tenantId,
        moduleId: record.moduleId,
        record: { id: record.id, ...newData },
        metadata: { fromStatus: existing.status, toStatus: record.status }
      }, db).catch(err => console.error('[Automation: STATUS_CHANGED error]:', err));
    }

    if (oldData.assigneeId !== newData.assigneeId) {
      AutomationEngine.handleEvent({
        type: 'ASSIGNEE_CHANGED',
        tenantId,
        moduleId: record.moduleId,
        record: { id: record.id, ...newData },
        metadata: { fromAssigneeId: oldData.assigneeId, toAssigneeId: newData.assigneeId }
      }, db).catch(err => console.error('[Automation: ASSIGNEE_CHANGED error]:', err));
    }

    if (JSON.stringify(existing.associations) !== JSON.stringify(record.associations)) {
      AutomationEngine.handleEvent({
        type: 'RELATION_LINKED',
        tenantId,
        moduleId: record.moduleId,
        record: { id: record.id, ...newData },
        metadata: { associations: record.associations }
      }, db).catch(err => console.error('[Automation: RELATION_LINKED error]:', err));
    }

    const formatted = {
      id: record.id,
      moduleId: record.moduleId,
      status: record.status,
      associations: record.associations,
      path: record.path,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: recordWithMember?.createdByMember ? `${recordWithMember.createdByMember.firstName || ''} ${recordWithMember.createdByMember.familyName || ''}`.trim() : 'System',
      ...(record.data as any),
      workflowState: record.workflowState
    };
    emitTenantUpdate(tenantId, 'record_updated', formatted);

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE
router.delete('/records/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    // RLS will ensure we can only delete if it belongs to current tenant
    const result = await db.record.deleteMany({ where: { id } });

    // Websocket emit
    emitTenantUpdate(tenantId, 'record_deleted', id);

    res.json({ success: true, count: result.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODULE MANAGEMENT ---

// CREATE module
router.post('/modules', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { name, category, iconName, type, isGlobal, templateId, enabled: enabledBody, status, ...config } = req.body;
    const enabled = enabledBody !== undefined ? enabledBody : (status === 'ACTIVE');
    console.log(`[DataAPI] Creating module: "${name}" for tenant: ${tenantId}`);

    // Find first workspace for this tenant (Prisma client is already scoped to tenant via RLS)
    let workspace = await db.workspace.findFirst();
    
    // Auto-onboarding: Create a workspace if one doesn't exist yet
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          name: 'Main Workspace',
          tenantId
        }
      });
    }

    const module = await db.module.create({
      data: {
        tenantId,
        workspaceId: workspace.id,
        name,
        category: category || 'Custom',
        icon: iconName || 'Box',
        type: type || 'RECORD',
        isGlobal: isGlobal || false,
        templateId: templateId || null,
        enabled: enabled !== undefined ? enabled : true,
        config: config as any
      }
    });

    const configData = module.config as any;
    const formatted = {
      ...configData,
      id: module.id,
      templateId: configData.id,
      name: module.name,
      createdAt: module.createdAt,
    };
    
    emitTenantUpdate(tenantId, 'module_added', formatted);

    res.json(formatted);
  } catch (err: any) {
    console.error('[DataAPI] Module create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE module
router.put('/modules/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { name, category, iconName, type, isGlobal, templateId, enabled: enabledBody, status, ...config } = req.body;
    const enabled = enabledBody !== undefined ? enabledBody : (status !== undefined ? status === 'ACTIVE' : undefined);

    const module = await db.module.update({
      where: { id },
      data: {
        name,
        category,
        icon: iconName,
        type,
        isGlobal,
        templateId,
        enabled,
        config: config as any
      }
    });

    const configData = module.config as any;
    const formatted = {
      ...configData,
      id: module.id,
      templateId: configData.id,
      name: module.name,
      createdAt: module.createdAt,
    };
    
    emitTenantUpdate(tenantId, 'module_updated', formatted);

    res.json(formatted);
  } catch (err: any) {
    console.error('[DataAPI] Module update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE module
router.delete('/modules/:id', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;

    await db.module.delete({ where: { id } });
    
    emitTenantUpdate(tenantId, 'module_deleted', id);

    res.json({ success: true });
  } catch (err: any) {
    console.error('[DataAPI] Module delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ADD FIELD to module
router.put('/modules/:id/fields', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { field } = req.body;

    const module = await db.module.findUnique({ where: { id } });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const config = module.config as any;
    const layout = config.layout || [];
    
    // Simple push to layout for now
    // In a real grid system, we would find the next available row/col
    const newField = {
      ...field,
      colSpan: field.colSpan || 6,
      startCol: field.startCol || 1,
      rowIndex: field.rowIndex || (layout.length > 0 ? Math.max(...layout.map((f: any) => f.rowIndex || 0)) + 1 : 0)
    };

    const updatedConfig = {
      ...config,
      layout: [...layout, newField]
    };

    await db.module.update({
      where: { id },
      data: { config: updatedConfig }
    });

    // Simulate underlying DB column addition (e.g., if using direct SQL tables)
    // await db.$executeRawUnsafe(`ALTER TABLE "tenant_data_${tenantId}_${id}" ADD COLUMN IF NOT EXISTS "${field.id}" TEXT;`);

    emitTenantUpdate(tenantId, 'module_updated', { ...updatedConfig, id: module.id });

    res.json({ success: true, field: newField });
  } catch (err: any) {
    console.error('[DataAPI] Add field error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function createConnectorLog(
  db: any,
  tenantId: string,
  connectorId: string,
  connectorName: string,
  moduleId: string | undefined,
  payload: any,
  response: any,
  status: 'SUCCESS' | 'ERROR',
  errorMessage?: string,
  metadata?: any
) {
  try {
    let moduleName: string | null = null;
    if (moduleId) {
      const moduleRecord = await db.module.findUnique({
        where: { id: moduleId },
        select: { name: true }
      });
      if (moduleRecord) {
        moduleName = moduleRecord.name;
      }
    }

    const savedPayload = {
      params: payload || {},
      metadata: metadata || {}
    };

    await db.connectorLog.create({
      data: {
        tenantId,
        connectorId,
        connectorName,
        moduleId: moduleId || null,
        moduleName,
        payload: savedPayload,
        response: response ? JSON.parse(JSON.stringify(response)) : null,
        status,
        errorMessage: errorMessage || null
      }
    });
  } catch (logErr) {
    console.error('[ConnectorLog] Failed to create log entry:', logErr);
  }
}

// SYNC connector data for a record
router.post('/nexus/execute', async (req: TenantRequest, res) => {
  let connector: any = null;
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { connectorId, moduleId, recordId } = req.body;

    console.log(`[DataAPI] Executing connector sync: connectorId=${connectorId}, moduleId=${moduleId}, recordId=${recordId}`);

    if (!connectorId || !moduleId || !recordId) {
      return res.status(400).json({ error: 'Missing required parameters: connectorId, moduleId, and recordId are required.' });
    }

    // 1. Fetch record
    const record = await db.record.findUnique({ where: { id: recordId } });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // 2. Fetch module
    const module = await db.module.findUnique({ where: { id: moduleId } });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // 3. Fetch connector
    connector = await globalPrisma.nexusConnector.findUnique({
      where: { id: connectorId }
    });
    if (!connector) {
      return res.status(404).json({ error: 'Connector not found' });
    }

    // 4. Fetch tenant connector config/secrets (optional for public ones)
    const tenantConnector = await db.tenantConnector.findUnique({
      where: { tenantId_connectorId: { tenantId, connectorId } },
      include: { secrets: true }
    });

    const secrets: Record<string, string> = {};
    tenantConnector?.secrets.forEach((s: any) => {
      secrets[s.secretKey] = s.secretValue;
    });

    // 5. Extract input values from record.data based on connectorTriggerField
    const config = module.config as any;
    const layout = config.layout || [];
    const connectorField = layout.find((f: any) => f.type === 'connector' && f.connectorId === connectorId);
    
    if (!connectorField) {
      return res.status(400).json({ error: `No connector field found in module layout matching connectorId: ${connectorId}` });
    }

    const primaryValue = (record.data as any)?.[connectorField.id] || '';

    // Map inputs based on connector ioSchema
    const params: Record<string, any> = {};
    const ioSchema = (connector.ioSchema as any) || { inputs: [], outputs: [] };
    if (ioSchema.inputs && ioSchema.inputs.length > 0) {
      const firstInput = ioSchema.inputs[0];
      params[firstInput.name] = primaryValue;

      ioSchema.inputs.slice(1).forEach((input: any) => {
        const matchingField = layout.find((f: any) => f.name === input.name || f.id === input.name || f.label === input.label);
        if (matchingField) {
          params[input.name] = (record.data as any)?.[matchingField.id];
        }
      });
    }

    // 6. Execute the connector
    let rawResultData: any = {};
    const connectorConfig = (connector.config as any) || {};
    const edgeFunctionLogic = connectorConfig.edgeFunctionLogic;

    let executionPath: 'vm' | 'http' | 'external' | 'simulation' = 'simulation';
    let targetUrl: string | string[] | null = null;
    let targetMethod: string | null = null;
    let targetHeaders: any = null;

    if (edgeFunctionLogic && typeof edgeFunctionLogic === 'string') {
      // Run custom VM sandbox execution locally (reused proxy logic)
        executionPath = 'vm';
        const requestedUrls: string[] = [];
        const wrappedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url || String(input));
          requestedUrls.push(urlStr);
          return fetch(input, init);
        };

        const vm = await import('vm');
        const context = {
          params,
          secrets,
          fetch: wrappedFetch,
          console,
          promise: null as any
        };
        vm.createContext(context);
        const wrapperCode = `
          promise = (async () => {
            const fn = ${edgeFunctionLogic};
            return await fn(params, secrets);
          })();
        `;
        const script = new vm.Script(wrapperCode);
        script.runInContext(context);
        rawResultData = (await context.promise) || {};
        targetUrl = requestedUrls.length === 1 ? requestedUrls[0] : (requestedUrls.length > 0 ? requestedUrls : null);
      } else if (connector.edgeFunctionUrl && connector.edgeFunctionUrl.startsWith('http') && !connector.edgeFunctionUrl.includes('/api/nexus-proxy/execute')) {
        executionPath = 'external';
        targetUrl = connector.edgeFunctionUrl;
        targetMethod = 'POST';

        // Call external edge function URL
        const fetchRes = await fetch(connector.edgeFunctionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectorId, payload: params, secrets })
        });
        if (!fetchRes.ok) {
          const errText = await fetchRes.text();
          throw new Error(`External API execution failed: ${errText}`);
        }
        const proxyResult = await fetchRes.json();
        rawResultData = proxyResult.data || proxyResult;
      } else if (connectorConfig.url) {
        executionPath = 'http';
        // Pure REST URL request configuration
        let targetUrlStr = connectorConfig.url;
        const replacePlaceholders = (str: string) => {
          if (!str || typeof str !== 'string') return str;
          let temp = str;
          Object.entries(params).forEach(([k, v]) => {
            temp = temp.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
          });
          Object.entries(secrets).forEach(([k, v]) => {
            temp = temp.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
          });
          return temp;
        };
        targetUrlStr = replacePlaceholders(targetUrlStr);
        targetUrl = targetUrlStr;
        const method = connectorConfig.method || 'GET';
        targetMethod = method;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (connectorConfig.headers && typeof connectorConfig.headers === 'object') {
          Object.entries(connectorConfig.headers).forEach(([k, v]) => {
            headers[k] = replacePlaceholders(v as string);
          });
        }
        targetHeaders = headers;

        let body: any = undefined;
        if (method !== 'GET' && method !== 'HEAD' && connectorConfig.body) {
          if (typeof connectorConfig.body === 'string') {
            body = replacePlaceholders(connectorConfig.body);
          } else if (typeof connectorConfig.body === 'object') {
            body = replacePlaceholders(JSON.stringify(connectorConfig.body));
          }
        }
        const fetchRes = await fetch(targetUrlStr, { method, headers, body });
        if (!fetchRes.ok) {
          const errText = await fetchRes.text();
          throw new Error(`REST API execution failed: ${errText}`);
        }
        rawResultData = await fetchRes.json();
      } else {
        // Fallback mockup
        if (connector.ioSchema) {
          ioSchema.outputs?.forEach((o: any) => {
            rawResultData[o.name] = `Sample ${o.label} Data`;
          });
        }
      }

      // 7. Apply Mappings
      const mappings = config.connectorMappings?.[connectorId];
      const reshapedData: Record<string, any> = {};
      if (mappings) {
        Object.entries(mappings).forEach(([sourceKey, targetFieldId]) => {
          if (targetFieldId && rawResultData[sourceKey] !== undefined) {
            reshapedData[targetFieldId as string] = rawResultData[sourceKey];
          }
        });
      }

      // 8. Update Record in Database
      const updatedData = {
        ...(record.data as any),
        ...reshapedData
      };

      const updatedRecord = await db.record.update({
        where: { id: recordId },
        data: { data: updatedData },
        include: { createdByMember: true }
      });

      // 9. Emit real-time Socket update
      emitTenantUpdate(tenantId, 'record:update', {
        id: recordId,
        moduleId,
        record: updatedRecord
      });

      const finalResponse = {
        id: updatedRecord.id,
        moduleId: updatedRecord.moduleId,
        status: updatedRecord.status,
        associations: updatedRecord.associations,
        path: updatedRecord.path,
        createdAt: updatedRecord.createdAt,
        updatedAt: updatedRecord.updatedAt,
        createdBy: (updatedRecord as any).createdByMember ? `${(updatedRecord as any).createdByMember.firstName || ''} ${(updatedRecord as any).createdByMember.familyName || ''}`.trim() : 'System',
        ...(updatedRecord.data as any),
        workflowState: updatedRecord.workflowState
      };

      await createConnectorLog(db, tenantId, connectorId, connector.name, moduleId, params, finalResponse, 'SUCCESS', undefined, {
        isTest: false,
        executionPath,
        requestUrl: targetUrl,
        requestMethod: targetMethod,
        requestHeaders: targetHeaders
      });

      // 10. Format and Return updated record
      res.json(finalResponse);

    } catch (err: any) {
      console.error('[DataAPI] Connector sync execution error:', err);
      if (req.db && req.tenantId && req.body?.connectorId) {
        let connName = 'Unknown Connector';
        try {
          const conn = await globalPrisma.nexusConnector.findUnique({ where: { id: req.body.connectorId } });
          if (conn) connName = conn.name;
        } catch {}
        await createConnectorLog(
          req.db,
          req.tenantId,
          req.body.connectorId,
          connector?.name || connName,
          req.body.moduleId,
          req.body.payload || req.body,
          null,
          'ERROR',
          err.message || String(err),
          {
            isTest: false,
            executionPath,
            requestUrl: targetUrl,
            requestMethod: targetMethod,
            requestHeaders: targetHeaders
          }
        );
      }
      res.status(500).json({ error: err.message || 'Failed to sync connector data' });
    }
});

// GET comments for a record
router.get('/:recordId/comments', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const { recordId } = req.params;

    const record = await db.record.findUnique({
      where: { id: recordId }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const dataObj = (record.data as Record<string, any>) || {};
    const comments = dataObj._comments || [];

    res.json(comments);
  } catch (err: any) {
    console.error('[DataAPI] GET comments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST a new comment to a record
router.post('/:recordId/comments', async (req: TenantRequest, res) => {
  try {
    const db = req.db!;
    const tenantId = req.tenantId!;
    const { recordId } = req.params;
    const { body, author } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    const record = await db.record.findUnique({
      where: { id: recordId }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const dataObj = { ...(record.data as Record<string, any> || {}) };
    const comments = [...(dataObj._comments || [])];

    const newComment = {
      id: `comm_${Math.random().toString(36).substr(2, 9)}`,
      body,
      author: author || 'System User',
      timestamp: new Date().toISOString()
    };

    comments.push(newComment);
    dataObj._comments = comments;

    await db.record.update({
      where: { id: recordId },
      data: { data: dataObj }
    });

    if (body.includes('@')) {
      console.log(`[CommentsAPI] Mentions detected in comment: "${body}". Triggering USER_MENTIONED...`);
      AutomationEngine.handleEvent({
        type: 'USER_MENTIONED' as any,
        tenantId,
        moduleId: record.moduleId,
        record: {
          id: record.id,
          ...dataObj,
          latestComment: body
        }
      }, db).catch(err => {
        console.error('[CommentsAPI] Error triggering USER_MENTIONED event:', err);
      });
    }

    res.json(newComment);
  } catch (err: any) {
    console.error('[DataAPI] POST comment error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

