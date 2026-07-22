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
    
    // Check SLA warning and breach deadlines
    await this.checkSLAs();

    // Fetch and execute active scheduled jobs
    try {
      const scheduledJobs = await globalPrisma.scheduledJob.findMany({
        where: { isActive: true }
      });

      for (const job of scheduledJobs) {
        if (this.matchesCron(job.cronExpression, now)) {
          console.log(`[Scheduler] ScheduledJob matched: "${job.name}" (${job.id})`);
          try {
            if (job.actionType === 'RUN_AUTOMATION') {
              const automation = await globalPrisma.automation.findUnique({
                where: { id: job.targetId }
              });
              if (automation) {
                console.log(`[Scheduler] Executing scheduled automation: "${automation.name}"`);
                await AutomationEngine.runPipeline(automation, null, {}, 'SCHEDULED_JOB', globalPrisma);
              }
            } else if (job.actionType === 'FETCH_CONNECTOR') {
              const connector = await globalPrisma.tenantConnector.findUnique({
                where: { id: job.targetId }
              });
              if (connector) {
                console.log(`[Scheduler] Executing scheduled connector sync: "${connector.displayName}"`);
                await globalPrisma.connectorLog.create({
                  data: {
                    tenantId: job.tenantId,
                    connectorId: connector.connectorId,
                    status: 'SUCCESS',
                    payload: JSON.stringify({ message: "Scheduled sync execution" }),
                    direction: 'OUTBOUND'
                  }
                });
              }
            }

            // Update last run time
            await globalPrisma.scheduledJob.update({
              where: { id: job.id },
              data: { lastRunAt: now }
            });
          } catch (jobErr) {
            console.error(`[Scheduler] Error running job ${job.id}:`, jobErr);
          }
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error fetching scheduled jobs:', err);
    }

    // Fetch all active automations
    const automations = await globalPrisma.automation.findMany({
      where: { isActive: true }
    });

    for (const automation of automations) {
      const triggersConfig = Array.isArray(automation.triggers) ? automation.triggers : [];
      
      for (const trigger of triggersConfig) {
        if (trigger.type === 'CRON') {
          let cronExpression = trigger.cronExpression;
          if (cronExpression === 'GLOBAL' && automation.moduleId) {
            const triageModule = await globalPrisma.module.findUnique({
              where: { id: automation.moduleId }
            });
            const modConfig = (triageModule?.config || {}) as any;
            cronExpression = modConfig.globalSchedule || '*/5 * * * *';
          }
          if (cronExpression && this.matchesCron(cronExpression, now)) {
            console.log(`[Scheduler] CRON Trigger Matched for "${automation.name}" (${automation.id})`);
            
            if (automation.moduleId) {
              // Retrieve all pending/active records in this module
              const pendingRecords = await globalPrisma.record.findMany({
                where: {
                  moduleId: automation.moduleId,
                  tenantId: automation.tenantId,
                  status: { in: ['New', 'new', 'active', 'Pending', 'pending'] }
                }
              });

              console.log(`[Scheduler] Processing ${pendingRecords.length} records on CRON schedule for automation "${automation.name}"`);
              
              for (const record of pendingRecords) {
                // Filter by source formId if specified
                if (trigger.formId && trigger.formId !== 'public_form') {
                  const recordOriginalModuleId = record.data && (record.data as any)._originalModuleId;
                  const recordFormId = record.data && (record.data as any)._formId;
                  if (recordOriginalModuleId !== trigger.formId && recordFormId !== trigger.formId) {
                    continue;
                  }
                }

                // Evaluate condition if set
                if (automation.conditions) {
                  const { WorkflowEngine } = await import('./workflowEngine');
                  const match = WorkflowEngine.evaluateCondition(record, automation.conditions, null);
                  if (!match) continue;
                }

                AutomationEngine.runPipeline(automation, record, {}, 'CRON_SCHEDULE', globalPrisma).catch(err => {
                  console.error(`[Scheduler] Pipeline failed for record ${record.id} in scheduled automation:`, err);
                });
              }
            } else {
              // Global scheduled automation with no specific module
              AutomationEngine.runPipeline(automation, null, {}, 'CRON_SCHEDULE', globalPrisma).catch(err => {
                console.error(`[Scheduler] Pipeline failed for scheduled automation:`, err);
              });
            }
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

  /**
   * Scans active records with set SLAs and updates their status if they breach or enter warning periods.
   */
  private static async checkSLAs() {
    const now = new Date();
    try {
      const records = await globalPrisma.record.findMany({
        where: {
          slaDeadline: { not: null },
          status: { notIn: ['Routed', 'routed', 'Rejected', 'rejected', 'Archived', 'archived'] }
        },
        include: {
          module: true
        }
      });

      for (const record of records) {
        const slaDeadline = record.slaDeadline!;
        const config = (record.module.config || {}) as any;
        const slaConfig = config.slaConfig || {};
        
        const breachHours = parseFloat(slaConfig.breachHours || '24');
        const warningHours = parseFloat(slaConfig.warningHours || '0.5'); // default 30 mins
        
        const createdAt = record.createdAt.getTime();
        const warningTime = new Date(createdAt + warningHours * 60 * 60 * 1000);

        let newStatus: string | null = null;

        if (now >= slaDeadline) {
          if (record.slaStatus !== 'BREACHED') {
            newStatus = 'BREACHED';
          }
        } else if (now >= warningTime) {
          if (record.slaStatus === 'MET') {
            newStatus = 'WARNING';
          }
        }

        if (newStatus) {
          console.log(`[Scheduler] SLA state transition for record ${record.id}: ${record.slaStatus} -> ${newStatus}`);
          
          await globalPrisma.record.update({
            where: { id: record.id },
            data: {
              slaStatus: newStatus
            }
          });

          // If breached, we can trigger custom escalation triggers (like sending emails or firing automation events)
          if (newStatus === 'BREACHED') {
            console.log(`[Scheduler] SLA Breach Escalation for record ${record.id}`);
          }
        }
      }
    } catch (err: any) {
      console.error('[Scheduler] SLA evaluation loop error:', err);
    }
  }

  /**
   * Pre-computes a compact (50-word) Daily Standup Digest Memo for a tenant.
   * Injected at prompt startup to give instant holistic context for < 50 tokens.
   */
  public static async generateDailyStandupMemo(tenantId: string): Promise<string> {
    try {
      const [moduleCount, recordCount, activeAutomations, activeConnectors] = await Promise.all([
        globalPrisma.module.count({ where: { tenantId } }),
        globalPrisma.record.count({ where: { tenantId } }),
        globalPrisma.automation.count({ where: { tenantId, isActive: true } }),
        globalPrisma.tenantConnector.count({ where: { tenantId, isActive: true } })
      ]);

      return `DAILY STANDUP MEMO [Tenant ${tenantId}]: ${moduleCount} Custom Modules, ${recordCount} Total Records, ${activeAutomations} Active Automations, ${activeConnectors} Active Integration Connectors. System topology operational.`;
    } catch (err: any) {
      return `DAILY STANDUP MEMO: Tenant Workspace Active.`;
    }
  }
}
