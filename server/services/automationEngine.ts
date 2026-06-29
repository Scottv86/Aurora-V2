import { WorkflowEngine } from './workflowEngine';
import { ActionRegistry } from '../workflow/actions/core';

export interface AutomationAction {
  id?: string;
  type: 
    | 'CREATE_RECORD' 
    | 'UPDATE_RECORD' 
    | 'GET_RECORD' 
    | 'SEND_EMAIL' 
    | 'SEND_INTERNAL_PING' 
    | 'SET_ASSIGNEE'
    | 'IF_CONDITION'
    | 'SWITCH_CASE'
    | 'LOOP_FOREACH'
    | 'DELAY'
    | 'GEMINI_PROMPT'
    | 'GENERATE_PDF'
    | 'GOOGLE_SHEETS_SYNC'
    | 'STRIPE_PAYMENT_LINK';
  config: any;
}

export interface AutomationContext {
  trigger: {
    type: string;
    record: any;
  };
  inputs: Record<string, any>;
  steps: Record<string, { output: any }>;
  loop?: {
    item: any;
    index: number;
  };
}

export class AutomationEngine {
  /**
   * Main entrypoint for database event triggers.
   */
  static async handleEvent(
    event: { type: string; tenantId: string; moduleId: string; record: any; metadata?: any },
    db: any
  ) {
    try {
      console.log(`[AutomationEngine] Handling event ${event.type} for module ${event.moduleId}`);
      
      const automations = await db.automation.findMany({
        where: {
          tenantId: event.tenantId,
          isActive: true,
          moduleId: event.moduleId
        }
      });

      console.log(`[AutomationEngine] Found ${automations.length} active automations for module ${event.moduleId}`);

      for (const automation of automations) {
        const triggersConfig = Array.isArray(automation.triggers) ? automation.triggers : [];
        const matchingTrigger = triggersConfig.find((t: any) => {
          if (t.type === 'MODULE_EVENT' && t.on === event.type) return true;
          if (t.type === 'STATUS_CHANGED' && event.type === 'STATUS_CHANGED') {
            const fromMatch = !t.fromStatus || t.fromStatus === event.metadata?.fromStatus;
            const toMatch = !t.toStatus || t.toStatus === event.metadata?.toStatus;
            return fromMatch && toMatch;
          }
          if (t.type === 'ASSIGNEE_CHANGED' && event.type === 'ASSIGNEE_CHANGED') return true;
          if (t.type === 'RELATION_LINKED' && event.type === 'RELATION_LINKED') {
            return !t.linkedModuleId || t.linkedModuleId === event.metadata?.linkedModuleId;
          }
          if (t.type === 'USER_MENTIONED' && event.type === 'USER_MENTIONED') return true;
          if (t.type === 'FORM_SUBMITTED' && event.type === 'FORM_SUBMITTED') {
            return !t.formId || t.formId === event.metadata?.formId;
          }
          return false;
        });
        
        if (!matchingTrigger) continue;

        console.log(`[AutomationEngine] Trigger matched for automation "${automation.name}" (${automation.id})`);

        const isMatched = WorkflowEngine.evaluateCondition(
          event.record,
          automation.conditions,
          null
        );

        if (!isMatched) {
          console.log(`[AutomationEngine] Conditions did not match for automation "${automation.name}". Skipping.`);
          continue;
        }

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
    
    const mappedTriggerRecord = await this.getMappedRecord(triggerRecord, automation.moduleId, db);

    const context: AutomationContext = {
      trigger: {
        type: triggerSource,
        record: mappedTriggerRecord || triggerRecord
      },
      inputs: inputs || {},
      steps: {}
    };

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
      // Execute the step chain recursively
      await this.executeSteps(actions, context, stepLogs, automation.tenantId, db);

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

  /**
   * Executes steps recursively, supporting logical branching and loops.
   */
  private static async executeSteps(
    steps: any[],
    context: AutomationContext,
    stepLogs: any[],
    tenantId: string,
    db: any
  ) {
    for (let i = 0; i < steps.length; i++) {
      const action = steps[i];
      console.log(`[AutomationEngine] Executing action ${action.type}`);
      let output: any = null;

      switch (action.type) {
        case 'CREATE_RECORD': {
          const targetModuleId = action.config.targetModuleId;
          if (!targetModuleId) throw new Error('targetModuleId is required for CREATE_RECORD');

          const interpolatedData = this.interpolateObject(action.config.fields || {}, context);
          const finalData = await this.generateKeysAndAutonumbers(targetModuleId, interpolatedData, db);

          const created = await db.record.create({
            data: {
              tenantId,
              moduleId: targetModuleId,
              data: finalData,
              status: 'New'
            }
          });
          output = await this.getMappedRecord(created, targetModuleId, db);
          break;
        }

        case 'SET_ASSIGNEE': {
          const targetType = action.config.targetType || 'TRIGGERING';
          let targetRecordId = null;

          if (targetType === 'TRIGGERING') {
            targetRecordId = context.trigger.record?.id;
          } else {
            targetRecordId = this.interpolateString(action.config.recordId || '', context);
          }

          if (!targetRecordId) throw new Error('Could not resolve target record ID for SET_ASSIGNEE');

          const assigneeId = this.interpolateString(action.config.assigneeId || '', context);

          const existing = await db.record.findUnique({
            where: { id: targetRecordId }
          });

          if (!existing) throw new Error(`Record with ID ${targetRecordId} not found`);

          const mergedData = {
            ...(existing.data as Record<string, any> || {}),
            assigneeId: assigneeId
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

        case 'UPDATE_RECORD': {
          const targetType = action.config.targetType || 'TRIGGERING';
          let targetRecordId = null;

          if (targetType === 'TRIGGERING') {
            targetRecordId = context.trigger.record?.id;
          } else {
            targetRecordId = this.interpolateString(action.config.recordId || '', context);
          }

          if (!targetRecordId) throw new Error('Could not resolve target record ID for UPDATE_RECORD');

          const interpolatedData = this.interpolateObject(action.config.fields || {}, context);

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

          const records = await db.record.findMany({
            where: {
              moduleId: targetModuleId,
              tenantId
            }
          });

          const match = records.find((r: any) => {
            const rData = r.data as Record<string, any>;
            return String(rData?.[queryField]) === String(queryValue);
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

        case 'IF_CONDITION': {
          const condition = action.config.condition;
          const thenSteps = action.config.thenSteps || [];
          const elseSteps = action.config.elseSteps || [];

          const isMatched = WorkflowEngine.evaluateCondition(
            context.trigger.record,
            condition,
            null
          );

          console.log(`[AutomationEngine] IF_CONDITION evaluated to: ${isMatched}`);
          const nestedLogs: any[] = [];
          if (isMatched) {
            await this.executeSteps(thenSteps, context, nestedLogs, tenantId, db);
          } else {
            await this.executeSteps(elseSteps, context, nestedLogs, tenantId, db);
          }

          output = { conditionMatched: isMatched, nestedLogs };
          break;
        }

        case 'SWITCH_CASE': {
          const switchValueRaw = action.config.switchValue;
          const cases = action.config.cases || {};
          const defaultSteps = action.config.defaultSteps || [];

          const switchValue = this.interpolateString(switchValueRaw || '', context);
          console.log(`[AutomationEngine] SWITCH_CASE switchValue: "${switchValue}"`);

          const targetSteps = cases[switchValue] || defaultSteps;
          const nestedLogs: any[] = [];
          await this.executeSteps(targetSteps, context, nestedLogs, tenantId, db);

          output = { switchValue, matchedCase: cases[switchValue] ? switchValue : 'default', nestedLogs };
          break;
        }

        case 'LOOP_FOREACH': {
          const arrayPath = action.config.arrayPath;
          const loopSteps = action.config.loopSteps || [];

          const parts = (arrayPath || '').split('.');
          let listVal: any = context;
          for (const part of parts) {
            if (listVal === null || listVal === undefined) break;
            listVal = listVal[part];
          }

          console.log(`[AutomationEngine] LOOP_FOREACH resolved size: ${Array.isArray(listVal) ? listVal.length : 0}`);
          const loopResults: any[] = [];

          if (Array.isArray(listVal)) {
            for (let index = 0; index < listVal.length; index++) {
              const item = listVal[index];
              const loopContext: AutomationContext = {
                ...context,
                loop: { item, index }
              };
              const nestedLogs: any[] = [];
              await this.executeSteps(loopSteps, loopContext, nestedLogs, tenantId, db);
              loopResults.push({ index, item, nestedLogs });
            }
          }

          output = { loopResults };
          break;
        }

        case 'DELAY': {
          const delaySeconds = parseInt(this.interpolateString(action.config.delaySeconds || '0', context), 10);
          console.log(`[AutomationEngine] DELAY: Sleeping for ${delaySeconds} seconds...`);
          if (delaySeconds > 0) {
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
          }
          output = { sleptSeconds: delaySeconds };
          break;
        }

        default: {
          // Check if it is a shared action from the core ActionRegistry
          const sharedAction = ActionRegistry[action.type];
          if (sharedAction) {
            const interpolatedConfig = this.interpolateObject(action.config || {}, context);
            output = await sharedAction.execute(context.trigger.record, interpolatedConfig);
            break;
          }
          throw new Error(`Unsupported action type: ${action.type}`);
        }
      }

      const stepKey = action.id || String(stepLogs.length);
      context.steps[stepKey] = { output };
      
      stepLogs.push({
        step: stepLogs.length,
        actionType: action.type,
        status: 'SUCCESS',
        output
      });
    }
  }

  private static async getMappedRecord(recordObj: any, moduleId: string, db: any) {
    if (!recordObj) return null;
    
    let flatRecord = recordObj;
    if (recordObj.data && typeof recordObj.data === 'object' && !recordObj.hasOwnProperty('__is_flat__')) {
      flatRecord = {
        id: recordObj.id,
        status: recordObj.status,
        ...((recordObj.data as any) || {}),
        __is_flat__: true
      };
    }

    let targetModuleId = moduleId;
    if (!targetModuleId && recordObj && recordObj.id) {
      const dbRecord = await db.record.findUnique({
        where: { id: recordObj.id }
      });
      if (dbRecord) {
        targetModuleId = dbRecord.moduleId;
      }
    }

    if (!targetModuleId) {
      return flatRecord;
    }

    const module = await db.module.findFirst({
      where: { id: targetModuleId }
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
