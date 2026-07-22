import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function getColumns() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const tables = [
    'ai_usage_metrics',
    'antigravity_messages',
    'antigravity_sessions',
    'quarantine_records',
    'reports',
    'scheduled_jobs',
    'tenant_ai_keys',
    'tenant_ai_mappings',
    'webhook_subscriptions'
  ];

  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position;
    `, [table]);

    console.log(`Table '${table}':`, res.rows.map(r => r.column_name).join(', '));
  }

  await client.end();
}

getColumns();
