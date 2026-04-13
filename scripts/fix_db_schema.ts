import { globalPrisma } from '../server/lib/prisma';

async function main() {
  console.log('--- Starting Database Schema Fix ---');
  
  try {
    // We add columns manually using raw SQL because prisma db push is failing connectivity tests
    console.log('Adding "metadata" column to "tenants" table...');
    await globalPrisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='metadata') THEN
          ALTER TABLE tenants ADD COLUMN metadata JSONB;
        END IF;
      END $$;
    `);

    console.log('Adding "workspace_settings" column to "tenants" table...');
    await globalPrisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='workspace_settings') THEN
          ALTER TABLE tenants ADD COLUMN workspace_settings JSONB;
        END IF;
      END $$;
    `);

    console.log('--- Schema Fix Completed Successfully ---');
  } catch (error) {
    console.error('!!! Schema Fix Failed !!!');
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
