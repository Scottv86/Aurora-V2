import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function inspectConnectorColumns() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tenant_connectors';
  `);
  console.log('tenant_connectors columns:', res.rows.map(r => r.column_name).join(', '));
  await client.end();
}

inspectConnectorColumns();
