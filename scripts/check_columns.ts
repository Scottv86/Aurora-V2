import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const tables = [
    'nexus_connectors',
    'organizations',
    'parties',
    'party_relationships',
    'persons',
    'taxonomies',
    'tenant_connector_secrets',
    'tenant_connectors'
  ];

  const client = await pool.connect();
  try {
    for (const table of tables) {
      console.log(`\n--- Columns for ${table} ---`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [table]);
      console.table(res.rows);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
