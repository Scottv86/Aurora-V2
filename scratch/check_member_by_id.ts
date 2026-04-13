import { Pool } from 'pg';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const result = await pool.query(`
    SELECT tm.id, u.email, a.name as agent_name, tm.team_id
    FROM tenant_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    LEFT JOIN agents a ON tm.agent_id = a.id
    WHERE tm.id = 'cmnttdk780001bcn327n1f8n0'
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
