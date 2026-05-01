import { globalPrisma as db } from '../lib/prisma';

/**
 * Utility to flatten field structures for auditing or processing.
 */
const flattenFields = (layout: any[]): any[] => {
  const fields: any[] = [];
  layout.forEach(item => {
    if (item.type === 'repeatableGroup' || item.type === 'fieldGroup' || item.type === 'group') {
      fields.push(item);
      if (item.fields) {
        fields.push(...flattenFields(item.fields));
      }
    } else {
      fields.push(item);
    }
  });
  return fields;
};

/**
 * Generates a default grid layout from a flat list of fields.
 */
const generateDefaultLayout = (fields: any[]) => {
  const layout: any[] = [];
  let currentRow = 0;
  let currentCol = 1;

  fields.forEach((field) => {
    // If it's already a grid-based field, keep its coordinates
    if (field.startCol !== undefined && field.colSpan !== undefined && field.rowIndex !== undefined) {
       layout.push(field);
       return;
    }

    const colSpan = (field.type === 'heading' || field.type === 'divider' || field.type === 'spacer') ? 12 : 6;
    
    // If it doesn't fit in current row, move to next
    if (currentCol + colSpan > 13) {
      currentRow++;
      currentCol = 1;
    }

    layout.push({
      ...field,
      startCol: currentCol,
      rowIndex: currentRow,
      colSpan: colSpan
    });

    currentCol += colSpan;
    if (currentCol > 12) {
      currentRow++;
      currentCol = 1;
    }
  });

  return layout;
};

async function migrate() {
  console.log("Starting Aurora Module Schema Migration...");
  console.log("Goal: Unify all modules to use grid-based 'layout' and remove legacy 'fields' array.");
  
  try {
    const modules = await db.module.findMany();
    console.log(`[INFO] Found ${modules.length} modules in database.`);

    let migratedCount = 0;
    let cleanedCount = 0;

    for (const mod of modules) {
      const config = mod.config as any;
      
      // Case 1: Legacy module with 'fields' but no 'layout'
      if (config.fields && (!config.layout || config.layout.length === 0)) {
        console.log(`[MIGRATE] Module: ${mod.name} (${mod.id})`);
        
        const newLayout = generateDefaultLayout(config.fields);
        
        // Remove 'fields' from config
        const { fields, ...restConfig } = config;
        
        await db.module.update({
          where: { id: mod.id },
          data: {
            config: {
              ...restConfig,
              layout: newLayout
            }
          }
        });
        console.log(`  - Successfully converted ${config.fields.length} fields to grid layout.`);
        migratedCount++;
      } 
      // Case 2: Module has both (cleanup required)
      else if (config.fields && config.layout) {
        console.log(`[CLEANUP] Module: ${mod.name} (${mod.id})`);
        const { fields, ...restConfig } = config;
        await db.module.update({
          where: { id: mod.id },
          data: {
            config: restConfig
          }
        });
        console.log(`  - Removed redundant 'fields' array.`);
        cleanedCount++;
      } else {
         console.log(`[OK] Module: ${mod.name} (${mod.id}) is already using the unified schema.`);
      }
    }

    console.log("\n--- Migration Summary ---");
    console.log(`Total Modules Processed: ${modules.length}`);
    console.log(`Modules Migrated:        ${migratedCount}`);
    console.log(`Redundant Fields Cleaned: ${cleanedCount}`);
    console.log("-------------------------\n");
    console.log("Aurora Module Schema Unification Complete.");
    process.exit(0);
  } catch (err) {
    console.error("[ERROR] Migration failed during execution:");
    console.error(err);
    process.exit(1);
  }
}

migrate();
