import fetch from 'node-fetch';

async function checkApi() {
  const url = 'http://localhost:3001/api/records/cmop73ulw0001j8n3vrgt45xh'; // Try 3001 for server
  const tenantId = 'cluzq1k6r00003b6w5z9y8x9z'; // Use a valid tenant ID from DB
  
  // Wait, I need a valid tenant ID. Let's find one.
  console.log('Fetching record from API...');
  try {
    const res = await fetch(url, {
      headers: {
        'x-tenant-id': tenantId
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('API Error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

// Wait, I don't know the port or a valid tenant ID.
// Let's check server/index.ts for the port.
// And check tenants table for a valid ID.
checkApi();
