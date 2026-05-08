import "dotenv/config";
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log('--- DATA ISOLATION TEST ---');
    
    // Test 1: Query without tenant context
    console.log('Test 1: Querying parties without tenant context...');
    const res1 = await client.query('SELECT count(*) FROM parties');
    console.log(`Results found: ${res1.rows[0].count} (Should be 0 if RLS is working and no superadmin role is active)`);

    // Test 2: Query with invalid tenant context
    console.log('\nTest 2: Querying parties with invalid tenant context...');
    await client.query("SET app.current_tenant_id = '00000000-0000-0000-0000-000000000000'");
    const res2 = await client.query('SELECT count(*) FROM parties');
    console.log(`Results found: ${res2.rows[0].count} (Should be 0)`);

    // Test 3: Query with superadmin bypass
    console.log('\nTest 3: Querying parties with superadmin bypass...');
    await client.query("SET app.is_superadmin = 'true'");
    const res3 = await client.query('SELECT count(*) FROM parties');
    console.log(`Results found: ${res3.rows[0].count} (Should be all records)`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
