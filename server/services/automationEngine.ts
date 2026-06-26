import { WorkflowEngine } from './workflowEngine';

export interface AutomationAction {
  type: 'CREATE_RECORD' | 'UPDATE_RECORD' | 'GET_RECORD' | 'SEND_EMAIL' | 'SEND_INTERNAL_PING';
  config: any;
}

export interface AutomationContext {
  trigger: {
    type: string;
    record: any;
  };
  inputs: Record<string, any>;
  steps: Record<string, { output: any }>;
}

export class AutomationEngine {
  /**
   * Main entrypoint for database event triggers.
   */
  static async handleEvent(
    event: { type: 'RECORD_CREATED' | 'RECORD_UPDATED'; tenantId: string; moduleId: string; record: any },
    db: any
  ) {
    try {
      console.log(`[AutomationEngine] Handling event ${event.type} for module ${event.moduleId}`);
      
      // 1. Fetch active automations for the tenant and module
      const automations = await db.automation.findMany({
        where: {
          tenantId: event.tenantId,
          isActive: true,
          moduleId: event.moduleId
        }
      });

      console.log(`[AutomationEngine] Found ${automations.length} active automations for module ${event.moduleId}`);

      for (const automation of automations) {
        // Find matching triggers
        const triggersConfig = Array.isArray(automation.triggers) ? automation.triggers : [];
        const matchingTrigger = triggersConfig.find((t: any) => t.type === 'MODULE_EVENT' && t.on === event.type);
        
        if (!matchingTrigger) continue;

        console.log(`[AutomationEngine] Trigger matched for automation "${automation.name}" (${automation.id})`);

        // 2. Evaluate conditions
        const isMatched = WorkflowEngine.evaluateCondition(
          event.record,
          automation.conditions,
          null
        );

        if (!isMatched) {
          console.log(`[AutomationEngine] Conditions did not match for automation "${automation.name}". Skipping.`);
          continue;
        }

        // 3. Run the pipeline
        // Run in background to not block the request
        this.runPipeline(automation, event.record, {}, 'MODULE_EVENT', db).catch((err) => {
          console.error(`[AutomationEngine] Pipeline failed for automation "${automation.name}":`, err);
        });
      }
    } catch (error) {
      console.error('[AutomationEngine] Error in handleEvent:', error);
    }
  }

  /**
   * Runs the automation pipeline step-by-step.
   */
  static async runPipeline(
    automation: any,
    triggerRecord: any,
    inputs: Record<string, any>,
    triggerSource: string,
    db: any
  ) {
    console.log(`[AutomationEngine] Starting run for automation "${automation.name}" (${automation.id})`);
    
    const actions = (automation.actions as AutomationAction[]) || [];
    const stepLogs: any[] = [];
    
    const context: AutomationContext = {
      trigger: {
        type: triggerSource,
        record: triggerRecord
      },
      inputs: inputs || {},
      steps: {}
    };

    // Create execution run log entry
    const run = await db.automationRun.create({
      data: {
        automationId: automation.id,
        tenantId: automation.tenantId,
        status: 'RUNNING',
        triggerSource,
        inputData: inputs || {},
        stepLogs: []
      }
    });

    try {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        console.log(`[AutomationEngine] [Step ${i}] Executing action ${action.type}`);
        
        let output: any = null;

        switch (action.type) {
          case 'CREATE_RECORD': {
            const targetModuleId = action.config.targetModuleId;
            if (!targetModuleId) throw new Error('targetModuleId is required for CREATE_RECORD');

            const interpolatedData = this.interpolateObject(action.config.fields || {}, context);
            
            output = await db.record.create({
              data: {
                tenantId: automation.tenantId,
                moduleId: targetModuleId,
                data: interpolatedData,
                status: 'New'
              }
            });
            break;
          }

          case 'UPDATE_RECORD': {
            const targetType = action.config.targetType || 'TRIGGERING'; // 'TRIGGERING' | 'SPECIFIC'
            let targetRecordId = null;

            if (targetType === 'TRIGGERING') {
              targetRecordId = triggerRecord?.id;
            } else {
              targetRecordId = this.interpolateString(action.config.recordId || '', context);
            }

            if (!targetRecordId) throw new Error('Could not resolve target record ID for UPDATE_RECORD');

            const interpolatedData = this.interpolateObject(action.config.fields || {}, context);

            // Fetch current record first to merge data object fields
            const existing = await db.record.findUnique({
              where: { id: targetRecordId }
            });

            if (!existing) throw new Error(`Record with ID ${targetRecordId} not found`);

            const mergedData = {
              ...(existing.data as Record<string, any> || {}),
              ...interpolatedData
            };

            output = await db.record.update({
              where: { id: targetRecordId },
              data: {
                data: mergedData
              }
            });
            break;
          }

          case 'GET_RECORD': {
            const targetModuleId = action.config.targetModuleId;
            const queryField = action.config.queryField;
            const queryValueRaw = action.config.queryValue;

            if (!targetModuleId || !queryField) throw new Error('targetModuleId and queryField are required for GET_RECORD');

            const queryValue = this.interpolateString(queryValueRaw || '', context);

            // Find first record matching module and field query
            const records = await db.record.findMany({
              where: {
                moduleId: targetModuleId,
                tenantId: automation.tenantId
              }
            });

            const match = records.find((r: any) => {
              const rData = r.data as Record<string, any>;
              return String(rData?.[queryField]) === String(queryValue);
            });

            if (match) {
              output = {
                id: match.id,
                status: match.status,
                ...((match.data as any) || {})
              };
            } else {
              output = null;
            }
            break;
          }

          case 'SEND_EMAIL': {
            const to = this.interpolateString(action.config.to || '', context);
            const subject = this.interpolateString(action.config.subject || '', context);
            const body = this.interpolateString(action.config.body || '', context);

            console.log(`[Email Simulator] TO: ${to} | SUBJECT: ${subject} | BODY:\n${body}`);
            output = { sent: true, simulated: true, to, subject };
            break;
          }

          case 'SEND_INTERNAL_PING': {
            const message = this.interpolateString(action.config.message || '', context);
            const channel = this.interpolateString(action.config.channel || 'system', context);

            console.log(`[Internal Ping] CHANNEL: ${channel} | MESSAGE: ${message}`);
            output = { success: true, channel, message };
            break;
          }

          default:
            throw new Error(`Unsupported action type: ${(action as any).type}`);
        }

        context.steps[String(i)] = { output };
        stepLogs.push({
          step: i,
          actionType: action.type,
          status: 'SUCCESS',
          output
        });
      }

      // Mark run as success
      await db.automationRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          stepLogs
        }
      });
      console.log(`[AutomationEngine] Successfully executed automation "${automation.name}"`);
    } catch (error: any) {
      console.error(`[AutomationEngine] Run failed for automation "${automation.name}":`, error);
      stepLogs.push({
        step: stepLogs.length,
        status: 'FAILED',
        error: error.message || 'Unknown execution error'
      });
      await db.automationRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message || 'Unknown execution error',
          stepLogs
        }
      });
    }
  }

  private static interpolateObject(obj: Record<string, any>, context: AutomationContext): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateString(value, context);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.interpolateObject(value, context);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private static interpolateString(str: string, context: AutomationContext): string {
    if (!str || typeof str !== 'string') return str;
    
    // Replace placeholders like {{ trigger.record.field }} or {{ steps.0.output.field }}
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
      const parts = path.trim().split('.');
      let currentVal: any = context;
      
      for (const part of parts) {
        if (currentVal === null || currentVal === undefined) {
          break;
        }
        currentVal = currentVal[part];
      }
      
      return currentVal !== undefined && currentVal !== null ? String(currentVal) : '';
    });
  }
}
