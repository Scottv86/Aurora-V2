import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkFunctions() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT routine_name, routine_definition 
    FROM information_schema.routines 
    WHERE routine_name = 'is_superadmin';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
checkFunctions();
