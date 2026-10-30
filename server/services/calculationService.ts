import { globalPrisma } from '../lib/prisma';

export interface CreateCalculationInput {
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  title?: string;
  mode?: string;
  expression?: string;
  result?: string;
  tape?: any[];
  variables?: Record<string, any>;
  notes?: string;
  isPinned?: boolean;
  moduleId?: string;
  recordId?: string;
  metadata?: any;
}

export interface UpdateCalculationInput {
  title?: string;
  mode?: string;
  expression?: string;
  result?: string;
  tape?: any[];
  variables?: Record<string, any>;
  notes?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  moduleId?: string;
  recordId?: string;
  metadata?: any;
}

export interface TapeEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
  mode?: string;
  variables?: Record<string, any>;
}

export class CalculationService {
  /**
   * List calculations for a tenant with optional filtering
   */
  static async getCalculations(
    tenantId: string,
    params: {
      authorId?: string;
      mode?: string;
      moduleId?: string;
      recordId?: string;
      isPinned?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const where: any = {
      tenantId,
      isArchived: false,
    };

    if (params.authorId) where.authorId = params.authorId;
    if (params.mode) where.mode = params.mode;
    if (params.moduleId) where.moduleId = params.moduleId;
    if (params.recordId) where.recordId = params.recordId;
    if (typeof params.isPinned === 'boolean') where.isPinned = params.isPinned;

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { expression: { contains: q, mode: 'insensitive' } },
      ];
    }

    const calculations = await (globalPrisma as any).universalCalculation.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: params.limit || 50,
      skip: params.offset || 0,
      include: {
        module: {
          select: { id: true, name: true, label: true, icon: true },
        },
        record: {
          select: { id: true, data: true, createdAt: true },
        },
      },
    });

    return calculations;
  }

  /**
   * Get single calculation sheet by ID
   */
  static async getCalculationById(tenantId: string, id: string) {
    const calc = await (globalPrisma as any).universalCalculation.findFirst({
      where: { id, tenantId },
      include: {
        module: {
          select: { id: true, name: true, label: true, icon: true },
        },
        record: {
          select: { id: true, data: true, createdAt: true },
        },
      },
    });
    return calc;
  }

  /**
   * Create a new calculation sheet
   */
  static async createCalculation(tenantId: string, input: CreateCalculationInput) {
    return await (globalPrisma as any).universalCalculation.create({
      data: {
        tenantId,
        authorId: input.authorId,
        authorName: input.authorName || 'User',
        authorEmail: input.authorEmail,
        title: input.title || 'Untitled Calculation',
        mode: input.mode || 'standard',
        expression: input.expression || '',
        result: input.result || '0',
        tape: input.tape || [],
        variables: input.variables || {},
        notes: input.notes || '',
        isPinned: input.isPinned || false,
        moduleId: input.moduleId || null,
        recordId: input.recordId || null,
        metadata: input.metadata || null,
      },
      include: {
        module: {
          select: { id: true, name: true, label: true, icon: true },
        },
      },
    });
  }

  /**
   * Update calculation sheet
   */
  static async updateCalculation(tenantId: string, id: string, input: UpdateCalculationInput) {
    const existing = await (globalPrisma as any).universalCalculation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Calculation not found');
    }

    return await (globalPrisma as any).universalCalculation.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.mode !== undefined && { mode: input.mode }),
        ...(input.expression !== undefined && { expression: input.expression }),
        ...(input.result !== undefined && { result: input.result }),
        ...(input.tape !== undefined && { tape: input.tape }),
        ...(input.variables !== undefined && { variables: input.variables }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.isPinned !== undefined && { isPinned: input.isPinned }),
        ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
        ...(input.moduleId !== undefined && { moduleId: input.moduleId }),
        ...(input.recordId !== undefined && { recordId: input.recordId }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        updatedAt: new Date(),
      },
      include: {
        module: {
          select: { id: true, name: true, label: true, icon: true },
        },
      },
    });
  }

  /**
   * Append a single tape item
   */
  static async appendTapeItem(tenantId: string, id: string, item: TapeEntry) {
    const existing = await (globalPrisma as any).universalCalculation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new Error('Calculation not found');
    }

    const currentTape = Array.isArray(existing.tape) ? existing.tape : [];
    const updatedTape = [item, ...currentTape].slice(0, 500); // retain up to 500 audit steps

    return await (globalPrisma as any).universalCalculation.update({
      where: { id },
      data: {
        tape: updatedTape,
        result: item.result,
        expression: item.expression,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Clear tape for a calculation
   */
  static async clearTape(tenantId: string, id: string) {
    return await (globalPrisma as any).universalCalculation.update({
      where: { id },
      data: {
        tape: [],
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete calculation
   */
  static async deleteCalculation(tenantId: string, id: string) {
    return await (globalPrisma as any).universalCalculation.deleteMany({
      where: { id, tenantId },
    });
  }

  /**
   * Live aggregate computation over module records
   */
  static async computeModuleAggregate(
    tenantId: string,
    params: {
      moduleId: string;
      fieldName: string;
      aggregateType: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'MEDIAN';
      filterField?: string;
      filterValue?: any;
    }
  ) {
    const { moduleId, fieldName, aggregateType, filterField, filterValue } = params;

    // Fetch records for this module and tenant
    const records = await (globalPrisma as any).record.findMany({
      where: {
        moduleId,
        tenantId,
        isArchived: false,
      },
      select: {
        id: true,
        data: true,
        createdAt: true,
      },
      take: 2000,
    });

    let filtered = records;
    if (filterField && filterValue !== undefined && filterValue !== '') {
      filtered = records.filter((r: any) => {
        const val = r.data?.[filterField];
        if (typeof val === 'string') {
          return val.toLowerCase() === String(filterValue).toLowerCase();
        }
        return val === filterValue;
      });
    }

    // Extract numbers from fieldName
    const numbers: number[] = [];
    filtered.forEach((r: any) => {
      const raw = r.data?.[fieldName];
      if (raw !== null && raw !== undefined) {
        // Strip out currency symbols or commas if stored as string
        const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[$,]/g, ''));
        if (!isNaN(parsed)) {
          numbers.push(parsed);
        }
      }
    });

    let value = 0;
    if (aggregateType === 'COUNT') {
      value = filtered.length;
    } else if (numbers.length > 0) {
      switch (aggregateType) {
        case 'SUM':
          value = numbers.reduce((acc, curr) => acc + curr, 0);
          break;
        case 'AVG':
          value = numbers.reduce((acc, curr) => acc + curr, 0) / numbers.length;
          break;
        case 'MIN':
          value = Math.min(...numbers);
          break;
        case 'MAX':
          value = Math.max(...numbers);
          break;
        case 'MEDIAN': {
          const sorted = [...numbers].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          value = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          break;
        }
      }
    }

    return {
      moduleId,
      fieldName,
      aggregateType,
      value: Math.round(value * 10000) / 10000,
      count: numbers.length,
      totalRecords: filtered.length,
      sampleSize: Math.min(filtered.length, 5),
    };
  }
}
