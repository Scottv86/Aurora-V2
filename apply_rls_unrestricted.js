import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRlsMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const migrationPath = path.join(__dirname, 'prisma', 'apply_rls_unrestricted.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying RLS enablement & policies to unrestricted tables...');
    await client.query(sql);
    console.log('Successfully enabled RLS and applied tenant isolation policies!');

  } catch (err) {
    console.error('Error applying RLS migration:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runRlsMigration();
