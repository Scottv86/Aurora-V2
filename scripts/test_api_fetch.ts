import "dotenv/config";

async function main() {
  const tenantId = 'org_28XzR0M7D3jE4fG9K1L5P';
  const token = 'dev-token'; // We need a real token if dev-token doesn't work
  
  try {
    const response = await fetch('http://localhost:3001/api/connectors', {
      headers: {
        'x-tenant-id': tenantId,
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('FETCH ERROR:', err);
  }
}

main();
