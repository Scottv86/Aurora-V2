import "dotenv/config";
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('--- TABLE ROW COUNTS ---');
    for (const row of res.rows) {
      const tableName = row.table_name;
      const countRes = await pool.query(`SELECT count(*) FROM "${tableName}"`);
      console.log(`${tableName.padEnd(25)}: ${countRes.rows[0].count}`);
    }
  } catch (error) {
    console.error('Error checking counts:', error);
  } finally {
    await pool.end();
  }
}

main();
