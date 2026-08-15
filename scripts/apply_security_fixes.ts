import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function applySecurityFixes() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connecting to database and applying Supabase Security Advisories Fixes...');

    const sqlPath = path.join(process.cwd(), 'prisma', 'fix_supabase_security_advisories.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('Successfully applied fix_supabase_security_advisories.sql!');
  } catch (err) {
    console.error('Error applying security fixes:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySecurityFixes();
