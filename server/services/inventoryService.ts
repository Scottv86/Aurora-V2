import { globalPrisma } from '../lib/prisma';
import { recordAudit } from '../lib/audit';
import { AccountingService } from './accountingService';

export interface MovementInput {
  locationId?: string;
  catalogItemId: string;
  variantId?: string | null;
  quantityDelta: number; // e.g. -1 for sale, +10 for receipt
  movementType: 'POS_SALE' | 'POS_RETURN' | 'ONLINE_ORDER' | 'PURCHASE_RECEIPT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT_WRITE_OFF' | 'SHRINKAGE';
  unitCost?: number;
  referenceId?: string | null;
  notes?: string | null;
  postToGeneralLedger?: boolean;
}

export class InventoryService {
  /**
   * Ensures default locations exist for the tenant
   */
  static async ensureDefaultLocations(tenantId: string, db: any = globalPrisma) {
    const count = await db.inventoryLocation.count({ where: { tenantId } });
    if (count === 0) {
      await db.inventoryLocation.createMany({
        data: [
          {
            tenantId,
            code: 'STORE-MAIN',
            name: 'Main Storefront & Registers',
            isDefault: true
          },
          {
            tenantId,
            code: 'WH-01',
            name: 'Central Warehouse Storage',
            isDefault: false
          }
        ]
      });
    }
  }

  /**
   * Gets default location for tenant
   */
  static async getDefaultLocation(tenantId: string, db: any = globalPrisma) {
    await this.ensureDefaultLocations(tenantId, db);
    const loc = await db.inventoryLocation.findFirst({
      where: { tenantId, isDefault: true }
    });
    return loc || (await db.inventoryLocation.findFirst({ where: { tenantId } }));
  }

  /**
   * Records an immutable inventory movement and updates stock allocations
   */
  static async recordMovement(tenantId: string, input: MovementInput, userId?: string, db: any = globalPrisma) {
    let locationId = input.locationId;
    if (!locationId) {
      const defaultLoc = await this.getDefaultLocation(tenantId, db);
      locationId = defaultLoc.id;
    }

    const item = await db.catalogItem.findUnique({
      where: { id: input.catalogItemId }
    });

    if (!item || item.tenantId !== tenantId) {
      throw new Error('Catalog item not found');
    }

    const unitCost = input.unitCost !== undefined ? Number(input.unitCost) : 0;
    const delta = Number(input.quantityDelta);

    // 1. Record immutable movement entry
    const movement = await db.inventoryMovement.create({
      data: {
        tenantId,
        locationId,
        catalogItemId: input.catalogItemId,
        variantId: input.variantId || null,
        quantityDelta: delta,
        unitCost,
        movementType: input.movementType,
        referenceId: input.referenceId || null,
        notes: input.notes || null
      }
    });

    // 2. Upsert stock allocation for this specific location & variant
    const existingAllocation = await db.stockAllocation.findUnique({
      where: {
        locationId_catalogItemId_variantId: {
          locationId,
          catalogItemId: input.catalogItemId,
          variantId: input.variantId || null as any
        }
      }
    });

    const newOnHand = Math.max(0, Number(existingAllocation?.onHandQuantity || 0) + delta);

    await db.stockAllocation.upsert({
      where: {
        locationId_catalogItemId_variantId: {
          locationId,
          catalogItemId: input.catalogItemId,
          variantId: input.variantId || null as any
        }
      },
      update: {
        onHandQuantity: newOnHand
      },
      create: {
        locationId,
        catalogItemId: input.catalogItemId,
        variantId: input.variantId || null,
        onHandQuantity: newOnHand,
        reorderPoint: item.reorderPoint || 0
      }
    });

    // 3. Update top-level catalog item global stock level
    const allAllocations = await db.stockAllocation.findMany({
      where: { catalogItemId: input.catalogItemId }
    });
    const totalGlobalStock = allAllocations.reduce((sum: number, a: any) => sum + Number(a.onHandQuantity), 0);

    await db.catalogItem.update({
      where: { id: input.catalogItemId },
      data: { stockLevel: Math.round(totalGlobalStock) }
    });

    // 4. If write-off / shrinkage, post journal to General Ledger
    if (input.postToGeneralLedger && (input.movementType === 'ADJUSTMENT_WRITE_OFF' || input.movementType === 'SHRINKAGE') && unitCost > 0) {
      const totalLossValue = Math.abs(delta) * unitCost;

      const shrinkageAcc = await db.chartOfAccount.findFirst({
        where: { tenantId, accountCode: '6300' } // Inventory Shrinkage
      });
      const inventoryAssetAcc = await db.chartOfAccount.findFirst({
        where: { tenantId, systemAccount: 'INVENTORY_ASSET' } // 1300 Inventory Asset
      });

      if (shrinkageAcc && inventoryAssetAcc && totalLossValue > 0) {
        await AccountingService.postJournalEntry(tenantId, {
          date: new Date(),
          sourceModule: 'INVENTORY_ADJUSTMENT',
          sourceReferenceId: movement.id,
          narration: `Stock Write-off: ${item.name} (-${Math.abs(delta)} units @ $${unitCost.toFixed(2)}) - ${input.notes || input.movementType}`,
          createdByUserId: userId,
          lines: [
            {
              accountId: shrinkageAcc.id,
              debit: totalLossValue,
              credit: 0,
              description: `Inventory shrinkage loss for ${item.name}`
            },
            {
              accountId: inventoryAssetAcc.id,
              debit: 0,
              credit: totalLossValue,
              description: `Reduction in inventory asset value for ${item.name}`
            }
          ]
        }, db);
      }
    }

    return movement;
  }

  /**
   * Fetches perpetual inventory stock status across all locations
   */
  static async getInventoryStatus(tenantId: string, db: any = globalPrisma) {
    await this.ensureDefaultLocations(tenantId, db);

    const items = await db.catalogItem.findMany({
      where: { tenantId },
      include: {
        variants: true,
        stockAllocations: {
          include: { location: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return items.map((item: any) => {
      const isLowStock = item.trackInventory && item.stockLevel <= item.reorderPoint;
      return {
        id: item.id,
        name: item.name,
        code: item.code,
        type: item.type,
        basePrice: item.basePrice,
        trackInventory: item.trackInventory,
        stockLevel: item.stockLevel,
        reorderPoint: item.reorderPoint,
        isLowStock,
        variants: item.variants,
        allocations: item.stockAllocations.map((a: any) => ({
          locationId: a.locationId,
          locationName: a.location.name,
          locationCode: a.location.code,
          variantId: a.variantId,
          onHandQuantity: Number(a.onHandQuantity),
          allocatedQuantity: Number(a.allocatedQuantity),
          reorderPoint: Number(a.reorderPoint)
        }))
      };
    });
  }
}
