import { Pool } from 'pg';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(`
    SELECT tm.id, u.email, tm.role_id, tm.licence_type, tm.tenant_id
    FROM tenant_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE u.email = 'user1.acme@aurora.com'
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
