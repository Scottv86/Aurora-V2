import { globalPrisma } from '../lib/prisma';
import { AutomationEngine } from './automationEngine';
import { WorkflowState } from './workflowEngine';

export class AutomationScheduler {
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Starts the background scheduler daemon (polls once every 60 seconds).
   */
  public static start() {
    if (this.intervalId) return;
    
    console.log('[Scheduler] Starting Automation Scheduler Daemon...');
    // Run immediately on start, then poll every 60 seconds
    this.pollAndRun().catch(err => console.error('[Scheduler] Poll failed:', err));
    
    this.intervalId = setInterval(() => {
      this.pollAndRun().catch(err => console.error('[Scheduler] Poll failed:', err));
    }, 60000);
  }

  /**
   * Stops the background scheduler daemon.
   */
  public static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Scheduler] Stopped Automation Scheduler Daemon.');
    }
  }

  /**
   * Main scheduler polling loop.
   */
  private static async pollAndRun() {
    const now = new Date();
    // console.log(`[Scheduler] Polling triggers at ${now.toISOString()}...`);

    // Fetch all active automations
    const automations = await globalPrisma.automation.findMany({
      where: { isActive: true }
    });

    for (const automation of automations) {
      const triggersConfig = Array.isArray(automation.triggers) ? automation.triggers : [];
      
      for (const trigger of triggersConfig) {
        if (trigger.type === 'CRON') {
          const cronExpression = trigger.cronExpression;
          if (cronExpression && this.matchesCron(cronExpression, now)) {
            console.log(`[Scheduler] CRON Trigger Matched for "${automation.name}" (${automation.id})`);
            // Run the automation pipeline with an empty trigger record
            AutomationEngine.runPipeline(automation, null, {}, 'CRON_SCHEDULE', globalPrisma).catch(err => {
              console.error(`[Scheduler] Pipeline failed for scheduled automation:`, err);
            });
          }
        } 
        
        else if (trigger.type === 'SLA_AGE') {
          const statusName = trigger.statusName;
          const ageLimitHours = parseFloat(trigger.ageLimitHours || '24');
          
          if (!statusName || isNaN(ageLimitHours)) continue;

          // Find records matching the automation's module and current status
          const records = await globalPrisma.record.findMany({
            where: {
              moduleId: automation.moduleId,
              tenantId: automation.tenantId,
              status: statusName
            }
          });

          for (const record of records) {
            const wState = (record.workflowState as any) || {} as any;
            
            // Check if this SLA trigger has already fired for the current status state
            const slaTriggeredMap = wState.slaTriggered || {};
            if (slaTriggeredMap[automation.id]) {
              continue; // Already triggered for this record status instance
            }

            // Inspect last history timestamp to determine age of the current status
            const history = wState.history || [];
            if (history.length === 0) continue;
            
            const lastEntry = history[history.length - 1];
            const entryTime = new Date(lastEntry.timestamp);
            const ageMs = now.getTime() - entryTime.getTime();
            const ageHours = ageMs / (1000 * 60 * 60);

            if (ageHours >= ageLimitHours) {
              console.log(`[Scheduler] SLA_AGE Trigger Matched for record ${record.id} (Age: ${ageHours.toFixed(2)}h >= Limit: ${ageLimitHours}h)`);
              
              // Run automation pipeline
              AutomationEngine.runPipeline(automation, record, {}, 'SLA_AGE_VIOLATION', globalPrisma).catch(err => {
                console.error(`[Scheduler] SLA Pipeline failed:`, err);
              });

              // Mark SLA as triggered to prevent duplicates
              const updatedState = {
                ...wState,
                slaTriggered: {
                  ...slaTriggeredMap,
                  [automation.id]: true
                }
              };

              await globalPrisma.record.update({
                where: { id: record.id },
                data: { workflowState: updatedState }
              });
            }
          }
        }
      }
    }
  }

  /**
   * Evaluates standard 5-field cron expression against current date/time.
   */
  public static matchesCron(expression: string, date: Date): boolean {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return false;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const checkPart = (part: string, val: number, isDayOfWeek = false): boolean => {
      if (part === '*') return true;
      
      if (part.includes(',')) {
        return part.split(',').some(p => checkPart(p, val, isDayOfWeek));
      }
      
      if (part.startsWith('*/')) {
        const step = parseInt(part.substring(2), 10);
        return val % step === 0;
      }
      
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        return val >= start && val <= end;
      }
      
      return parseInt(part, 10) === val;
    };

    const currentMin = date.getMinutes();
    const currentHour = date.getHours();
    const currentDay = date.getDate();
    const currentMonth = date.getMonth() + 1;
    const currentDayOfWeek = date.getDay();

    return (
      checkPart(minute, currentMin) &&
      checkPart(hour, currentHour) &&
      checkPart(dayOfMonth, currentDay) &&
      checkPart(month, currentMonth) &&
      checkPart(dayOfWeek, currentDayOfWeek, true)
    );
  }
}
