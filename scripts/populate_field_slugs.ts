import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateSlug(label: string, existingSlugs: Set<string>): string {
    // Basic slugification: lowercase, alphanumeric and underscores only
    let slug = label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    
    if (!slug) slug = 'field';
    
    let finalSlug = slug;
    let counter = 1;
    while (existingSlugs.has(finalSlug)) {
        finalSlug = `${slug}_${counter}`;
        counter++;
    }
    existingSlugs.add(finalSlug);
    return finalSlug;
}

function processFields(fields: any[], existingSlugs: Set<string>): boolean {
    let changed = false;
    for (const field of fields) {
        if (!field.name) {
            field.name = generateSlug(field.label || 'New Field', existingSlugs);
            changed = true;
        } else {
            existingSlugs.add(field.name);
        }
        
        if (field.fields && Array.isArray(field.fields)) {
            if (processFields(field.fields, existingSlugs)) changed = true;
        }
    }
    return changed;
}

async function main() {
    console.log('--- STARTING FIELD SLUG POPULATION ---');
    try {
        const modules = await prisma.module.findMany();
        console.log(`Analyzing ${modules.length} modules...`);

        for (const m of modules) {
            const config = (m.config as any) || {};
            const layout = config.layout || [];
            const existingSlugs = new Set<string>();
            
            if (processFields(layout, existingSlugs)) {
                console.log(`Updating slugs for module: ${m.name} (${m.id})`);
                await prisma.module.update({
                    where: { id: m.id },
                    data: { config: { ...config, layout } as any }
                });
            }
        }

        console.log('--- POPULATION COMPLETED ---');
    } catch (error) {
        console.error('Error during slug population:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
