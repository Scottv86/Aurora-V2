import "dotenv/config";
import pg from 'pg';

async function testPartySql() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const tenantId = 'cmnx01q3s0000mon3pbr44ju4';

    try {
        console.log('Testing Party query via Raw SQL (with RLS mock)...');
        
        await pool.query(`SET app.current_tenant_id = '${tenantId}'`);
        await pool.query(`SET app.current_user_id = 'mock-user'`);
        
        const res = await pool.query(`
            SELECT p.*, pers.first_name, pers.last_name, org.legal_name 
            FROM parties p
            LEFT JOIN persons pers ON p.id = pers.party_id
            LEFT JOIN organizations org ON p.id = org.party_id
            WHERE p.tenant_id = '${tenantId}'
            LIMIT 5
        `);

        console.log('Found parties:', res.rows.length);
        res.rows.forEach((p: any) => {
            const name = p.party_type === 'PERSON' 
                ? `${p.first_name || ''} ${p.last_name || ''}`.trim()
                : p.legal_name || 'Unknown Org';
            console.log(` - ${name} (${p.party_type})`);
        });

        console.log('SUCCESS: SQL query for platform module is working.');
    } catch (err: any) {
        console.error('FAILED:', err.message);
    } finally {
        await pool.end();
    }
}

testPartySql();
