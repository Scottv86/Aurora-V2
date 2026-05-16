import fetch from 'node-fetch';

async function verifyPlatformLookup() {
    const API_BASE_URL = 'http://127.0.0.1:3001';
    // We need a valid token. I'll assume the dev token works if set in env, 
    // or I'll just try to hit it since I'm on the same machine and maybe it's open.
    // Actually, I'll use the tenant middleware's expected header if I can.
    
    try {
        console.log('Testing platform module lookup (People & Organisations)...');
        const url = `${API_BASE_URL}/api/data/records?platformModuleId=people-organisations&limit=5`;
        
        const res = await fetch(url, {
            headers: {
                'x-tenant-id': 'cmnx01q3s0000mon3pbr44ju4' // Mock tenant ID
            }
        });

        if (res.ok) {
            const data: any = await res.json();
            console.log('Total parties found:', data.total);
            data.records.forEach((r: any) => console.log(` - ${r.name} (${r.partyType})`));
            console.log('SUCCESS: Platform module lookup is working.');
        } else {
            console.error('FAILED:', res.status, await res.text());
        }
    } catch (err: any) {
        console.error('CRITICAL ERROR:', err.message);
    }
}

verifyPlatformLookup();
