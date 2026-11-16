import { globalPrisma } from '../lib/prisma';
import { emitTenantUpdate } from '../socket';
import { recordAudit } from '../lib/audit';

export type DedupeFrequency = 'OFF' | 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type DedupeSensitivity = 'STRICT' | 'BALANCED' | 'AGGRESSIVE';

export interface DedupeScheduleConfig {
  enabled: boolean;
  frequency: DedupeFrequency;
  time?: string; // e.g. "02:00"
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday...
  autoMergeExact: boolean;
  sensitivity: DedupeSensitivity;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunStats?: {
    clustersFound: number;
    partiesScanned: number;
    autoMergedCount: number;
    timestamp: string;
    durationMs: number;
  };
}

export const DEFAULT_DEDUPE_SCHEDULE: DedupeScheduleConfig = {
  enabled: true,
  frequency: 'DAILY',
  time: '02:00',
  dayOfWeek: 0,
  autoMergeExact: false,
  sensitivity: 'BALANCED',
};

export class DedupeService {
  /**
   * Calculate next execution timestamp based on schedule frequency and target time.
   */
  public static calculateNextRun(schedule: DedupeScheduleConfig, fromDate: Date = new Date()): string | undefined {
    if (!schedule.enabled || schedule.frequency === 'OFF') return undefined;

    const [hoursStr, minutesStr] = (schedule.time || '02:00').split(':');
    const targetHour = parseInt(hoursStr, 10) || 2;
    const targetMin = parseInt(minutesStr, 10) || 0;

    const next = new Date(fromDate);
    next.setSeconds(0, 0);

    switch (schedule.frequency) {
      case 'HOURLY': {
        next.setHours(next.getHours() + 1);
        next.setMinutes(targetMin);
        break;
      }
      case 'EVERY_6_HOURS': {
        next.setHours(next.getHours() + 6);
        next.setMinutes(targetMin);
        break;
      }
      case 'DAILY': {
        next.setHours(targetHour, targetMin, 0, 0);
        if (next <= fromDate) {
          next.setDate(next.getDate() + 1);
        }
        break;
      }
      case 'WEEKLY': {
        const targetDay = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 0;
        next.setHours(targetHour, targetMin, 0, 0);
        const dayDiff = (targetDay - next.getDay() + 7) % 7;
        next.setDate(next.getDate() + (dayDiff === 0 && next <= fromDate ? 7 : dayDiff));
        break;
      }
      case 'MONTHLY': {
        next.setDate(1);
        next.setHours(targetHour, targetMin, 0, 0);
        if (next <= fromDate) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
      }
      default:
        return undefined;
    }

    return next.toISOString();
  }

  /**
   * Retrieves the dedupe schedule configuration for a tenant.
   */
  public static async getScheduleConfig(tenantId: string): Promise<DedupeScheduleConfig> {
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true },
    });
    const settings = (tenant?.workspaceSettings as any) || {};
    const dirConfig = settings.directoryConfig || {};
    return {
      ...DEFAULT_DEDUPE_SCHEDULE,
      ...(dirConfig.dedupeSchedule || {}),
    };
  }

  /**
   * Updates the dedupe schedule configuration for a tenant.
   */
  public static async updateScheduleConfig(
    tenantId: string,
    updates: Partial<DedupeScheduleConfig>
  ): Promise<DedupeScheduleConfig> {
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true },
    });
    const currentSettings = (tenant?.workspaceSettings as any) || {};
    const currentDirConfig = currentSettings.directoryConfig || {};
    const currentSchedule: DedupeScheduleConfig = {
      ...DEFAULT_DEDUPE_SCHEDULE,
      ...(currentDirConfig.dedupeSchedule || {}),
    };

    const newSchedule: DedupeScheduleConfig = {
      ...currentSchedule,
      ...updates,
    };

    newSchedule.nextRunAt = this.calculateNextRun(newSchedule);

    await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        workspaceSettings: {
          ...currentSettings,
          directoryConfig: {
            ...currentDirConfig,
            dedupeSchedule: newSchedule,
          },
        },
      },
    });

    return newSchedule;
  }

  /**
   * Scans tenant directory records and detects duplicate clusters.
   */
  public static async detectDuplicates(
    tenantId: string,
    sensitivity: DedupeSensitivity = 'BALANCED'
  ): Promise<{ clusters: any[]; totalParties: number }> {
    const allParties = await globalPrisma.party.findMany({
      where: { tenantId },
      include: { person: true, organization: true },
      orderBy: { createdAt: 'asc' },
    });

    const enriched = allParties.map((p) => {
      const isPerson = p.partyType === 'PERSON';
      const displayName =
        p.displayName ||
        (isPerson
          ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
          : p.organization?.legalName || 'Unnamed');
      return {
        ...p,
        displayName,
      };
    });

    const clusters: Array<{
      id: string;
      reason: string;
      matchValue: string;
      confidence: number;
      parties: any[];
    }> = [];

    const seenPairs = new Set<string>();

    const addCluster = (reason: string, matchValue: string, confidence: number, group: any[]) => {
      if (group.length < 2) return;
      const key = group
        .map((g) => g.id)
        .sort()
        .join('|');
      if (seenPairs.has(key)) return;
      seenPairs.add(key);
      clusters.push({
        id: `dup_${clusters.length + 1}`,
        reason,
        matchValue,
        confidence,
        parties: group,
      });
    };

    // 1. Group by exact normalized email (Strict, Balanced, Aggressive)
    const byEmail = new Map<string, any[]>();
    for (const p of enriched) {
      const email = (p.email || '').trim().toLowerCase();
      if (email) {
        const list = byEmail.get(email) || [];
        list.push(p);
        byEmail.set(email, list);
      }
    }
    for (const [email, group] of byEmail.entries()) {
      addCluster('Identical Email Address', email, 0.98, group);
    }

    // 2. Group by Tax Identifier (ABN / EIN / ACN)
    const byTaxId = new Map<string, any[]>();
    for (const p of enriched) {
      const tax = (p.organization?.taxIdentifier || '').replace(/\s+/g, '').toUpperCase();
      if (tax && tax.length >= 5) {
        const list = byTaxId.get(tax) || [];
        list.push(p);
        byTaxId.set(tax, list);
      }
    }
    for (const [tax, group] of byTaxId.entries()) {
      addCluster('Identical Tax / Business Identifier', tax, 0.99, group);
    }

    // 3. Group by normalized Phone/Mobile (Balanced & Aggressive)
    if (sensitivity !== 'STRICT') {
      const byPhone = new Map<string, any[]>();
      for (const p of enriched) {
        const phone = (p.phone || p.mobile || '').replace(/[^0-9+]/g, '');
        if (phone && phone.length >= 7) {
          const list = byPhone.get(phone) || [];
          list.push(p);
          byPhone.set(phone, list);
        }
      }
      for (const [phone, group] of byPhone.entries()) {
        addCluster('Identical Phone Number', phone, 0.92, group);
      }
    }

    // 4. Group by normalized Display Name + PartyType (Balanced & Aggressive)
    if (sensitivity !== 'STRICT') {
      const minLength = sensitivity === 'AGGRESSIVE' ? 4 : 6;
      const byName = new Map<string, any[]>();
      for (const p of enriched) {
        const normName = `${p.partyType}:${(p.displayName || '')
          .toLowerCase()
          .replace(/\b(pty|ltd|inc|llc|corp|limited|corporation)\b/g, '')
          .replace(/[^a-z0-9]/g, '')}`;
        if (normName.length > minLength) {
          const list = byName.get(normName) || [];
          list.push(p);
          byName.set(normName, list);
        }
      }
      for (const [, group] of byName.entries()) {
        if (group.length >= 2) {
          addCluster('Similar Entity Name', group[0].displayName, sensitivity === 'AGGRESSIVE' ? 0.82 : 0.86, group);
        }
      }
    }

    return { clusters, totalParties: enriched.length };
  }

  /**
   * Merges one or more duplicate parties into a designated Master party.
   * Preserves all relationships, dynamic module lookups, invoices, bills, notes, and activity.
   */
  public static async mergeEntities(
    tenantId: string,
    masterId: string,
    dupIds: string[],
    actorId: string = 'SYSTEM'
  ): Promise<any> {
    const master = await globalPrisma.party.findUnique({
      where: { id: masterId, tenantId },
      include: { person: true, organization: true },
    });
    const duplicates = await globalPrisma.party.findMany({
      where: { id: { in: dupIds }, tenantId },
      include: { person: true, organization: true },
    });

    if (!master || duplicates.length === 0) {
      throw new Error('Master or duplicate record not found');
    }

    const duplicate = duplicates[0];

    // 1. Re-point relationships & foreign keys
    await Promise.all([
      globalPrisma.partyRelationship.updateMany({
        where: { tenantId, sourcePartyId: { in: dupIds }, targetPartyId: { not: masterId } },
        data: { sourcePartyId: masterId },
      }),
      globalPrisma.partyRelationship.updateMany({
        where: { tenantId, targetPartyId: { in: dupIds }, sourcePartyId: { not: masterId } },
        data: { targetPartyId: masterId },
      }),
      globalPrisma.invoice.updateMany({
        where: { tenantId, customerPartyId: { in: dupIds } },
        data: { customerPartyId: masterId },
      }),
      globalPrisma.bill.updateMany({
        where: { tenantId, supplierPartyId: { in: dupIds } },
        data: { supplierPartyId: masterId },
      }),
      globalPrisma.posOrder.updateMany({
        where: { tenantId, customerPartyId: { in: dupIds } },
        data: { customerPartyId: masterId },
      }),
      globalPrisma.paymentTransaction.updateMany({
        where: { tenantId, customerPartyId: { in: dupIds } },
        data: { customerPartyId: masterId },
      }),
      globalPrisma.returnRequest.updateMany({
        where: { tenantId, customerPartyId: { in: dupIds } },
        data: { customerPartyId: masterId },
      }),
      globalPrisma.voucher.updateMany({
        where: { tenantId, recipientPartyId: { in: dupIds } },
        data: { recipientPartyId: masterId },
      }),
      globalPrisma.journalLine.updateMany({
        where: { contactPartyId: { in: dupIds } },
        data: { contactPartyId: masterId },
      }),
      globalPrisma.serviceDeskSession.updateMany({
        where: { tenantId, partyId: { in: dupIds } },
        data: { partyId: masterId },
      }),
      globalPrisma.universalNote.updateMany({
        where: { tenantId, entityType: 'PARTY', entityId: { in: dupIds } },
        data: { entityId: masterId },
      }),
      globalPrisma.universalReminder.updateMany({
        where: { tenantId, entityType: 'PARTY', entityId: { in: dupIds } },
        data: { entityId: masterId },
      }),
      globalPrisma.universalDocumentLink.updateMany({
        where: { tenantId, recordId: { in: dupIds } },
        data: { recordId: masterId },
      }),
      globalPrisma.person.updateMany({
        where: { primaryOrgPartyId: { in: dupIds } },
        data: { primaryOrgPartyId: masterId },
      }),
      globalPrisma.organization.updateMany({
        where: { primaryContactPartyId: { in: dupIds } },
        data: { primaryContactPartyId: masterId },
      }),
    ]);

    const dupSet = new Set(dupIds);

    // 2. Re-point references in dynamic Module Records
    const allTenantRecords = await globalPrisma.record.findMany({ where: { tenantId } });
    for (const rec of allTenantRecords) {
      let modified = false;
      const dataObj = { ...((rec.data as Record<string, any>) || {}) };
      for (const [k, v] of Object.entries(dataObj)) {
        if (typeof v === 'string' && dupSet.has(v)) {
          dataObj[k] = masterId;
          modified = true;
        } else if (Array.isArray(v) && v.some((item) => dupSet.has(item))) {
          dataObj[k] = v.map((item) => (dupSet.has(item) ? masterId : item));
          modified = true;
        }
      }
      let assocs = Array.isArray(rec.associations) ? [...(rec.associations as any[])] : [];
      if (assocs.some((a) => a && (dupSet.has(a.record_id) || dupSet.has(a.partyId)))) {
        assocs = assocs.map((a) => {
          if (!a) return a;
          if (dupSet.has(a.record_id)) return { ...a, record_id: masterId };
          if (dupSet.has(a.partyId)) return { ...a, partyId: masterId };
          return a;
        });
        modified = true;
      }
      if (modified) {
        await globalPrisma.record.update({
          where: { id: rec.id },
          data: { data: dataObj, associations: assocs },
        });
      }
    }

    // 3. Merge attributes onto master
    const mergedClassifications = Array.from(
      new Set([
        ...(master.classifications || []),
        ...duplicates.flatMap((d) => d.classifications || []),
      ])
    );
    const mergedTags = Array.from(
      new Set([...(master.tags || []), ...duplicates.flatMap((d) => d.tags || [])])
    );
    const mergedCustomData = {
      ...((duplicate.customData as Record<string, any>) || {}),
      ...((master.customData as Record<string, any>) || {}),
    };

    const updatedMaster = await globalPrisma.party.update({
      where: { id: masterId },
      data: {
        email: master.email || duplicate.email,
        secondaryEmail: master.secondaryEmail || duplicate.secondaryEmail || duplicate.email,
        phone: master.phone || duplicate.phone,
        mobile: master.mobile || duplicate.mobile,
        website: master.website || duplicate.website,
        avatarUrl: master.avatarUrl || duplicate.avatarUrl,
        accountOwnerMemberId: master.accountOwnerMemberId || duplicate.accountOwnerMemberId,
        classifications: mergedClassifications,
        tags: mergedTags,
        customData: mergedCustomData,
      },
      include: { person: true, organization: true },
    });

    // 4. Delete duplicates
    await globalPrisma.party.deleteMany({ where: { id: { in: dupIds }, tenantId } });

    await recordAudit({
      tenantId,
      actorId,
      action: 'PEOPLE_ORG_MERGE',
      resourceId: masterId,
      oldValue: duplicates,
      newValue: updatedMaster,
    });

    return updatedMaster;
  }

  /**
   * Executes the full Deduplication Procedure for a tenant.
   * Can be triggered manually or run via background scheduler.
   */
  public static async runProcedure(
    tenantId: string,
    trigger: 'SCHEDULED' | 'MANUAL' = 'MANUAL',
    actorId: string = 'SYSTEM'
  ): Promise<{
    clustersFound: number;
    partiesScanned: number;
    autoMergedCount: number;
    clusters: any[];
    durationMs: number;
  }> {
    const startTime = Date.now();
    const schedule = await this.getScheduleConfig(tenantId);

    // 1. Scan and detect clusters
    const { clusters, totalParties } = await this.detectDuplicates(tenantId, schedule.sensitivity);

    let autoMergedCount = 0;
    const remainingClusters: any[] = [];

    // 2. If autoMergeExact is enabled, automatically merge clusters with confidence >= 0.98
    if (schedule.autoMergeExact && clusters.length > 0) {
      for (const cluster of clusters) {
        if (cluster.confidence >= 0.98 && cluster.parties.length >= 2) {
          try {
            // Select oldest record as master
            const sorted = [...cluster.parties].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            const masterId = sorted[0].id;
            const duplicateIds = sorted.slice(1).map((p) => p.id);

            await this.mergeEntities(tenantId, masterId, duplicateIds, `DEDUPE_PROCEDURE_${trigger}`);
            autoMergedCount += duplicateIds.length;
          } catch (mergeErr) {
            console.error(`[DedupeService] Auto-merge failed for cluster ${cluster.id}:`, mergeErr);
            remainingClusters.push(cluster);
          }
        } else {
          remainingClusters.push(cluster);
        }
      }
    } else {
      remainingClusters.push(...clusters);
    }

    const durationMs = Date.now() - startTime;
    const lastRunAt = new Date().toISOString();
    const nextRunAt = this.calculateNextRun(schedule, new Date());

    const lastRunStats = {
      clustersFound: remainingClusters.length,
      partiesScanned: totalParties,
      autoMergedCount,
      timestamp: lastRunAt,
      durationMs,
    };

    // 3. Persist run statistics in tenant settings
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { workspaceSettings: true },
    });
    const currentSettings = (tenant?.workspaceSettings as any) || {};
    const currentDirConfig = currentSettings.directoryConfig || {};

    await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        workspaceSettings: {
          ...currentSettings,
          directoryConfig: {
            ...currentDirConfig,
            dedupeSchedule: {
              ...schedule,
              lastRunAt,
              nextRunAt,
              lastRunStats,
            },
          },
        },
      },
    });

    // 4. Emit real-time notification & socket updates
    emitTenantUpdate(tenantId, 'directory_dedupe_completed', {
      trigger,
      stats: lastRunStats,
      clustersCount: remainingClusters.length,
    });

    if (remainingClusters.length > 0 || autoMergedCount > 0) {
      emitTenantUpdate(tenantId, 'notification', {
        id: `dedupe_run_${Date.now()}`,
        title: `Deduplication Procedure Completed (${trigger})`,
        message:
          autoMergedCount > 0
            ? `Auto-merged ${autoMergedCount} exact duplicates. ${remainingClusters.length} clusters pending review.`
            : `Identified ${remainingClusters.length} potential duplicate clusters requiring review.`,
        type: 'directory_dedupe',
        timestamp: lastRunAt,
      });
    }

    return {
      clustersFound: remainingClusters.length,
      partiesScanned: totalParties,
      autoMergedCount,
      clusters: remainingClusters,
      durationMs,
    };
  }

  /**
   * Invoked on every scheduler tick (every 60s) to evaluate all active tenant dedupe schedules.
   */
  public static async checkScheduledDedupe(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentDay = now.getDay();
      const currentDate = now.getDate();

      const tenants = await globalPrisma.tenant.findMany({
        select: { id: true, workspaceSettings: true },
      });

      for (const t of tenants) {
        const settings = (t.workspaceSettings as any) || {};
        const schedule: DedupeScheduleConfig | undefined = settings.directoryConfig?.dedupeSchedule;

        if (!schedule || !schedule.enabled || schedule.frequency === 'OFF') {
          continue;
        }

        const [schedHourStr, schedMinStr] = (schedule.time || '02:00').split(':');
        const schedHour = parseInt(schedHourStr, 10) || 2;
        const schedMin = parseInt(schedMinStr, 10) || 0;

        const lastRunTime = schedule.lastRunAt ? new Date(schedule.lastRunAt).getTime() : 0;
        const msSinceLastRun = now.getTime() - lastRunTime;

        let shouldRun = false;

        switch (schedule.frequency) {
          case 'HOURLY': {
            // Once per hour around the target minute
            if (msSinceLastRun >= 55 * 60 * 1000 && Math.abs(currentMin - schedMin) <= 2) {
              shouldRun = true;
            }
            break;
          }
          case 'EVERY_6_HOURS': {
            // Every 6 hours
            if (msSinceLastRun >= 5.5 * 60 * 60 * 1000) {
              shouldRun = true;
            }
            break;
          }
          case 'DAILY': {
            // Once per day at target hour:minute
            if (
              msSinceLastRun >= 22 * 60 * 60 * 1000 &&
              currentHour === schedHour &&
              Math.abs(currentMin - schedMin) <= 2
            ) {
              shouldRun = true;
            }
            break;
          }
          case 'WEEKLY': {
            // Once per week on scheduled dayOfWeek
            const targetDay = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 0;
            if (
              msSinceLastRun >= 6 * 24 * 60 * 60 * 1000 &&
              currentDay === targetDay &&
              currentHour === schedHour &&
              Math.abs(currentMin - schedMin) <= 2
            ) {
              shouldRun = true;
            }
            break;
          }
          case 'MONTHLY': {
            // Once per month on 1st of month
            if (
              msSinceLastRun >= 27 * 24 * 60 * 60 * 1000 &&
              currentDate === 1 &&
              currentHour === schedHour &&
              Math.abs(currentMin - schedMin) <= 2
            ) {
              shouldRun = true;
            }
            break;
          }
        }

        if (shouldRun) {
          console.log(`[Scheduler] Firing automated Dedupe Procedure for tenant ${t.id} (${schedule.frequency})`);
          this.runProcedure(t.id, 'SCHEDULED', 'SYSTEM').catch((err) => {
            console.error(`[Scheduler] Dedupe procedure failed for tenant ${t.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.warn('[Scheduler] Deduplication schedule polling notice:', err);
    }
  }
}
