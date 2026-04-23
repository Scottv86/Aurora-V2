export interface WorkflowAction {
  type: string;
  execute(record: any, config: any): Promise<any>;
}

export const ActionRegistry: Record<string, WorkflowAction> = {
  'UPDATE_RECORD': {
    type: 'UPDATE_RECORD',
    async execute(record, config) {
      console.log(`[Action: UPDATE_RECORD] Updating record ${record.id} with ${JSON.stringify(config)}`);
      // Implementation would call Prisma/Supabase to update the record
      return { success: true };
    }
  },
  'NOTIFY': {
    type: 'NOTIFY',
    async execute(record, config) {
      console.log(`[Action: NOTIFY] Alerting team: ${config.message}`);
      return { success: true };
    }
  },
  'GENERATE_DOC': {
    type: 'GENERATE_DOC',
    async execute(record, config) {
      console.log(`[Action: GENERATE_DOC] Creating PDF from template ${config.templateId}`);
      return { success: true, docUrl: 'https://example.com/doc.pdf' };
    }
  },
  'AI_AGENT': {
    type: 'AI_AGENT',
    async execute(record, config) {
      console.log(`[Action: AI_AGENT] Handing off to AI for ${config.task}`);
      return { success: true, analysis: 'Low risk' };
    }
  }
};
