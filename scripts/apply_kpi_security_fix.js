import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync('prisma/fix_supabase_kpi_security.sql', 'utf8');
  console.log('Applying prisma/fix_supabase_kpi_security.sql...');
  await client.query(sql);
  console.log('Successfully applied security fixes!');
  await client.end();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
