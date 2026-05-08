import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT current_setting('app.current_tenant_id', true) is null as is_null, current_setting('app.current_tenant_id', true) = '' as is_empty");
    console.table(res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
