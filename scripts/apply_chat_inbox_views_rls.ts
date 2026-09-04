import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function applyChatInboxViewsRls() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Applying RLS and tenant policies for Chat, Inbox, Saved Views & Migrations...');

    const sqlPath = path.join(process.cwd(), 'prisma', 'apply_chat_inbox_views_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('✅ Successfully enabled RLS and applied tenant policies to all remaining tables!');
  } catch (err) {
    console.error('Error applying security fixes:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyChatInboxViewsRls();
