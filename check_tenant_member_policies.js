import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function checkTenantMemberPolicies() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT policyname, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'tenant_members';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
checkTenantMemberPolicies();
