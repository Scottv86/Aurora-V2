import { Pool } from 'pg';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query('SELECT id, user_id, team_id, role_id FROM tenant_members');
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
