import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function inspectColumns() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const tables = [
    'forms', 'workflows', 'connector_mappings', 'validation_rulesets',
    'antigravity_scheduled_tasks', 'solution_blueprints', 'recycling_bin_items',
    'sites', 'connector_logs', 'industry_blueprints'
  ];

  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `, [t]);
    const cols = res.rows.map(r => r.column_name);
    console.log(`${t.padEnd(30)}: ${cols.join(', ')}`);
  }

  await client.end();
}

inspectColumns();
