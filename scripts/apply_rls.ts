import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const sqlPath = path.join(__dirname, '../prisma/apply_rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Executing RLS script from ${sqlPath}...`);
  const client = await pool.connect();
  try {
    // Run the entire script as one block
    await client.query(sql);
    console.log('Successfully applied RLS policies to all tables.');
  } catch (err) {
    console.error('Error applying RLS policies:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
