import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('--- ALL TABLES RLS STATUS CHECK ---');
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        tablename, 
        rowsecurity 
      FROM 
        pg_tables 
      WHERE 
        schemaname = 'public'
      ORDER BY 
        tablename;
    `);
    
    console.table(res.rows);

    const disabledTables = res.rows.filter(r => !r.rowsecurity).map(r => r.tablename);
    if (disabledTables.length > 0) {
      console.log('\nTables with RLS DISABLED:');
      console.log(disabledTables.join(', '));
    } else {
      console.log('\nAll tables have RLS enabled!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
