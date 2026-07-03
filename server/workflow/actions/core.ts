import { globalPrisma } from '../../lib/prisma';
import { AutomationEngine } from '../../services/automationEngine';

export interface WorkflowAction {
  type: string;
  execute(record: any, config: any): Promise<any>;
}

export const ActionRegistry: Record<string, WorkflowAction> = {
  'UPDATE_RECORD': {
    type: 'UPDATE_RECORD',
    async execute(record, config) {
      console.log(`[Action: UPDATE_RECORD] Updating record ${record.id} with ${JSON.stringify(config)}`);
      const existing = await globalPrisma.record.findUnique({
        where: { id: record.id }
      });
      if (existing) {
        const existingData = (existing.data as any) || {};
        const updatedData = { ...existingData, ...config.fields };
        await globalPrisma.record.update({
          where: { id: record.id },
          data: { data: updatedData }
        });
      }
      return { success: true };
    }
  },
  'UPDATE': {
    type: 'UPDATE',
    async execute(record, config) {
      console.log(`[Action: UPDATE] Updating record ${record.id} with ${JSON.stringify(config)}`);
      const existing = await globalPrisma.record.findUnique({
        where: { id: record.id }
      });
      if (existing) {
        const existingData = (existing.data as any) || {};
        const updatedData = { ...existingData, ...config.fields };
        await globalPrisma.record.update({
          where: { id: record.id },
          data: { data: updatedData }
        });
      }
      return { success: true };
    }
  },
  'NOTIFY': {
    type: 'NOTIFY',
    async execute(_record, config) {
      console.log(`[Action: NOTIFY] Alerting team: ${config.message}`);
      return { success: true };
    }
  },
  'SLACK': {
    type: 'SLACK',
    async execute(_record, config) {
      console.log(`[Action: SLACK] Sending message to ${config.channel || 'default'}: ${config.message}`);
      return { success: true };
    }
  },
  'GENERATE_DOC': {
    type: 'GENERATE_DOC',
    async execute(_record, config) {
      console.log(`[Action: GENERATE_DOC] Creating PDF from template ${config.templateId}`);
      return { success: true, docUrl: 'https://example.com/doc.pdf' };
    }
  },
  'PDF': {
    type: 'PDF',
    async execute(_record, config) {
      console.log(`[Action: PDF] Generating PDF for template: ${config.templateId}`);
      return { success: true, docUrl: 'https://example.com/doc.pdf' };
    }
  },
  'AI_AGENT': {
    type: 'AI_AGENT',
    async execute(_record, config) {
      console.log(`[Action: AI_AGENT] Handing off to AI for ${config.task}`);
      return { success: true, analysis: 'Low risk' };
    }
  },
  'AI_SUMMARIZE': {
    type: 'AI_SUMMARIZE',
    async execute(_record, config) {
      console.log(`[Action: AI_SUMMARIZE] Summarizing field: ${config.sourceField}`);
      return { success: true, summary: 'AI summary output' };
    }
  },
  'EMAIL': {
    type: 'EMAIL',
    async execute(_record, config) {
      console.log(`[Action: EMAIL] TO: ${config.to} | SUBJECT: ${config.subject} | BODY:\n${config.body}`);
      return { success: true };
    }
  },
  'WEBHOOK': {
    type: 'WEBHOOK',
    async execute(_record, config) {
      console.log(`[Action: WEBHOOK] Calling ${config.url} with method ${config.method}`);
      return { success: true };
    }
  },
  'RUN_AUTOMATION': {
    type: 'RUN_AUTOMATION',
    async execute(record, config) {
      console.log(`[Action: RUN_AUTOMATION] Triggering automation ${config.automationId} for record ${record.id}`);
      if (!config.automationId) {
        console.warn(`[Action: RUN_AUTOMATION] No automationId configured.`);
        return { success: false, error: 'No automationId configured' };
      }
      const automation = await globalPrisma.automation.findUnique({
        where: { id: config.automationId }
      });
      if (!automation) {
        console.warn(`[Action: RUN_AUTOMATION] Automation ${config.automationId} not found.`);
        return { success: false, error: 'Automation not found' };
      }

      // Interpolate parameter inputs passed from the workflow node configuration against the record
      const inputs = config.inputs || {};
      const recordData = record.data && typeof record.data === 'object' 
        ? { ...record.data, id: record.id, status: record.status } 
        : record;

      const interpolatedInputs: Record<string, any> = {};
      for (const [key, val] of Object.entries(inputs)) {
        if (typeof val === 'string') {
          interpolatedInputs[key] = val.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
            const cleanPath = path.trim().replace(/^(trigger\.record\.|record\.)/, '');
            const parts = cleanPath.split('.');
            let current: any = recordData;
            for (const part of parts) {
              if (current === null || current === undefined) break;
              current = current[part];
            }
            return current !== undefined && current !== null ? String(current) : '';
          });
        } else {
          interpolatedInputs[key] = val;
        }
      }

      await AutomationEngine.runPipeline(automation, record, interpolatedInputs, 'WORKFLOW_NODE', globalPrisma);
      return { success: true };
    }
  },
  'GEMINI_PROMPT': {
    type: 'GEMINI_PROMPT',
    async execute(record, config) {
      const prompt = config.prompt || 'Analyze this record';
      console.log(`[Action: GEMINI_PROMPT] Prompting Gemini: "${prompt}"`);
      const responseText = `[Gemini AI Response] Analysis completed for record value: ${JSON.stringify(record?.amount || record?.name || 'Default')}`;
      return { success: true, response: responseText };
    }
  },
  'GENERATE_PDF': {
    type: 'GENERATE_PDF',
    async execute(record, config) {
      const template = config.template || 'Default Template';
      console.log(`[Action: GENERATE_PDF] Rendering PDF using template: "${template}"`);
      return { success: true, docUrl: 'https://example.com/invoice-generated.pdf', pages: 1 };
    }
  },
  'GOOGLE_SHEETS_SYNC': {
    type: 'GOOGLE_SHEETS_SYNC',
    async execute(record, config) {
      const sheetId = config.sheetId || 'default-sheet';
      console.log(`[Action: GOOGLE_SHEETS_SYNC] Appending row to Google Sheet "${sheetId}": ${JSON.stringify(record)}`);
      return { success: true, rowCount: 1, sheetId };
    }
  },
  'STRIPE_PAYMENT_LINK': {
    type: 'STRIPE_PAYMENT_LINK',
    async execute(record, config) {
      const amount = config.amount || record.amount || 1000;
      console.log(`[Action: STRIPE_PAYMENT_LINK] Generating Stripe payment link for amount: $${amount / 100}`);
      return { success: true, paymentLink: 'https://checkout.stripe.com/pay/cs_test_123', amount };
    }
  },
  'ROUTE_TO_MODULE': {
    type: 'ROUTE_TO_MODULE',
    async execute(record, config) {
      const targetModuleId = config.targetModuleId;
      if (!targetModuleId) throw new Error('ROUTE_TO_MODULE: targetModuleId config parameter is required');

      const targetModule = await globalPrisma.module.findUnique({
        where: { id: targetModuleId }
      });
      if (!targetModule) throw new Error(`ROUTE_TO_MODULE: Target module ${targetModuleId} not found`);

      const fieldMapping = config.fieldMapping || {};
      const targetData: Record<string, any> = {};

      for (const [targetKey, sourceExpr] of Object.entries(fieldMapping)) {
        if (typeof sourceExpr === 'string' && sourceExpr.startsWith('{{') && sourceExpr.endsWith('}}')) {
          const path = sourceExpr.replace(/[{}]/g, '').trim();
          const parts = path.split('.');
          let current: any = record;
          for (const part of parts) {
            if (part === 'trigger' || part === 'record') continue;
            if (current === null || current === undefined) break;
            current = current[part];
          }
          targetData[targetKey] = current !== undefined ? current : '';
        } else {
          targetData[targetKey] = sourceExpr;
        }
      }
      // 1. Get workflow configuration
      let workflowState = null;
      const targetConfig = (targetModule.config || {}) as any;
      const workflow = targetConfig.workflow || (targetConfig.workflows && targetConfig.workflows[0]);
      
      const getStatusFromState = (state: any, wf: any, fallback: string): string => {
        if (!state || !wf) return fallback;
        const currentNode = wf.nodes.find((n: any) => n.id === state.currentNodeId);
        return currentNode ? currentNode.name : fallback;
      };

      if (workflow && workflow.nodes && workflow.nodes.length > 0) {
        const startNode = workflow.nodes.find((n: any) => n.type === 'START') || workflow.nodes[0];
        workflowState = {
          currentNodeId: startNode.id,
          activeNodeIds: [startNode.id],
          history: [{
            nodeId: startNode.id,
            timestamp: new Date().toISOString(),
            action: 'Initialized',
            triggeredBy: 'System Triage'
          }]
        };
      }

      // Resolve autonumber record keys if configured
      let recordKey = undefined;
      if (targetConfig.recordKeyPrefix) {
        const prefix = targetConfig.recordKeyPrefix;
        const suffix = targetConfig.recordKeySuffix || '';
        const nextNum = targetConfig.nextKeyNumber !== undefined ? Number(targetConfig.nextKeyNumber) : 1;
        recordKey = `${prefix}-${nextNum}${suffix}`;
        
        await globalPrisma.module.update({
          where: { id: targetModuleId },
          data: {
            config: {
              ...targetConfig,
              nextKeyNumber: nextNum + 1
            }
          }
        });
      }

      if (recordKey) {
        targetData._record_key = recordKey;
      }

      let createdRecord = await globalPrisma.record.create({
        data: {
          tenantId: record.tenantId || 'cmnx01qd00002mon316pjfg9p',
          moduleId: targetModuleId,
          status: workflowState ? getStatusFromState(workflowState, workflow, 'New') : 'New',
          data: targetData,
          workflowState: workflowState as any
        }
      });

      // 2. Evaluate workflow transitions
      if (workflow && workflowState) {
        try {
          const { WorkflowEngine } = await import('../../services/workflowEngine');
          const evaluatedState = await WorkflowEngine.evaluate(
            { id: createdRecord.id, ...targetData },
            workflow,
            workflowState,
            targetConfig.layout
          );

          if (
            evaluatedState.currentNodeId !== workflowState.currentNodeId ||
            JSON.stringify(evaluatedState.activeNodeIds) !== JSON.stringify(workflowState.activeNodeIds)
          ) {
            const finalStatus = getStatusFromState(evaluatedState, workflow, createdRecord.status);

            createdRecord = await globalPrisma.record.update({
              where: { id: createdRecord.id },
              data: {
                status: finalStatus,
                workflowState: evaluatedState as any
              }
            });
          }
        } catch (err) {
          console.error('[Action: ROUTE_TO_MODULE] Workflow transition evaluation failed:', err);
        }
      }

      console.log(`[Action: ROUTE_TO_MODULE] Route success: Created record ${createdRecord.id} in module ${targetModuleId}`);

      if (config.archiveSource && record.id) {
        await globalPrisma.record.update({
          where: { id: record.id },
          data: { status: 'Archived' }
        }).catch(err => {
          console.error('[Action: ROUTE_TO_MODULE] Failed to archive source record:', err);
        });
      }

      return { success: true, createdRecordId: createdRecord.id };
    }
  }
};

