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
      await AutomationEngine.runPipeline(automation, record, config.inputs || {}, 'WORKFLOW_NODE', globalPrisma);
      return { success: true };
    }
  }
};

