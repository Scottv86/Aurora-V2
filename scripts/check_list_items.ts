import "dotenv/config";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT data FROM global_list_items WHERE list_id = 'b0c5d933-0378-4dec-8313-fd21a266ce05' AND is_active = true;");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await pool.end();
  }
}

main();
