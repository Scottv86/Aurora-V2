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
  private static async getMappedRecord(recordObj: any, moduleId: string, db: any) {
    if (!recordObj) return null;
    
    // Spread flat fields if it's a prisma record (i.e. has 'data' field)
    let flatRecord = recordObj;
    if (recordObj.data && typeof recordObj.data === 'object' && !recordObj.hasOwnProperty('__is_flat__')) {
      flatRecord = {
        id: recordObj.id,
        status: recordObj.status,
        ...((recordObj.data as any) || {}),
        __is_flat__: true
      };
    }

    const module = await db.module.findFirst({
      where: { id: moduleId }
    });

    if (module && module.config) {
      const config = module.config as any;
      const layout = config.layout || [];
      const flatten = (fields: any[]): any[] => {
        const res: any[] = [];
        (fields || []).forEach(f => {
          res.push(f);
          if (f.fields && Array.isArray(f.fields)) {
            res.push(...flatten(f.fields));
          }
        });
        return res;
      };
      const allFields = flatten(layout);
      const mapped = { ...flatRecord };
      allFields.forEach(f => {
        if (f.id) {
          const val = flatRecord[f.id] !== undefined ? flatRecord[f.id] : (f.name ? flatRecord[f.name] : undefined);
          if (val !== undefined) {
            mapped[f.id] = val;
            if (f.name) {
              mapped[f.name] = val;
            }
          }
        }
      });
      return mapped;
    }

    return flatRecord;
  }

  private static async generateKeysAndAutonumbers(targetModuleId: string, dataObject: Record<string, any>, db: any): Promise<Record<string, any>> {
    const module = await db.module.findFirst({
      where: { id: targetModuleId }
    });

    if (!module || !module.config) return dataObject;

    const config = module.config as any;
    let configChanged = false;
    const updatedConfig = { ...config };
    const finalData = { ...dataObject };

    // 1. Auto-generate Record Key (_record_key)
    if (config.recordKeyPrefix) {
      if (!finalData._record_key) {
        const nextNum = config.nextKeyNumber || 1;
        const prefix = config.recordKeyPrefix || '';
        const suffix = config.recordKeySuffix || '';
        const recordKey = `${prefix}-${nextNum}${suffix}`;
        
        finalData._record_key = recordKey;
        updatedConfig.nextKeyNumber = nextNum + 1;
        configChanged = true;
      }
    }

    // Helper function equivalent to processAutonumbers in dataRoutes
    const processAutonumbersInternal = (obj: any, fields: any[]): boolean => {
      if (!obj || typeof obj !== 'object' || !fields || !Array.isArray(fields)) return false;
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
          if (!obj[field.id]) {
            obj[field.id] = getNextAutonumber(field);
            changed = true;
          }
        } else if (field.type === 'repeatableGroup') {
          const arrayVal = obj[field.id];
          if (Array.isArray(arrayVal)) {
            arrayVal.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const itemChanged = processAutonumbersInternal(item, field.fields || []);
                if (itemChanged) changed = true;
              }
            });
          }
        } else if (field.fields && Array.isArray(field.fields)) {
          const nestedObj = obj[field.id];
          if (nestedObj && typeof nestedObj === 'object' && !Array.isArray(nestedObj)) {
            const nestedChanged = processAutonumbersInternal(nestedObj, field.fields);
            if (nestedChanged) changed = true;
          } else {
            const flatChanged = processAutonumbersInternal(obj, field.fields);
            if (flatChanged) changed = true;
          }
        }
      });

      return changed;
    };

    const autonumbersChanged = processAutonumbersInternal(finalData, config.layout || []);
    if (autonumbersChanged) {
      configChanged = true;
    }

    if (configChanged) {
      await db.module.update({
        where: { id: targetModuleId },
        data: { config: updatedConfig }
      });
    }

    return finalData;
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
    
    const mappedTriggerRecord = await this.getMappedRecord(triggerRecord, automation.moduleId, db);

    const context: AutomationContext = {
      trigger: {
        type: triggerSource,
        record: mappedTriggerRecord || triggerRecord
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
            
            const finalData = await this.generateKeysAndAutonumbers(targetModuleId, interpolatedData, db);

            const created = await db.record.create({
              data: {
                tenantId: automation.tenantId,
                moduleId: targetModuleId,
                data: finalData,
                status: 'New'
              }
            });
            output = await this.getMappedRecord(created, targetModuleId, db);
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

            const finalData = await this.generateKeysAndAutonumbers(existing.moduleId, mergedData, db);

            const updated = await db.record.update({
              where: { id: targetRecordId },
              data: {
                data: finalData
              }
            });
            output = await this.getMappedRecord(updated, existing.moduleId, db);
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
              return String(rData?.[queryField]) === String(queryValue) || String(rData?.[queryField]) === String(queryValue);
            });

            if (match) {
              output = await this.getMappedRecord(match, targetModuleId, db);
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
