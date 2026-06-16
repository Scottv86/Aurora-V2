process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function test() {
  const zip = '90210';
  const url = `https://api.zippopotam.us/us/${zip}`;
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response keys:`, Object.keys(data));
    console.log(`City:`, data.places?.[0]?.['place name']);
    console.log(`State:`, data.places?.[0]?.state);
  } catch (err: any) {
    console.error(`Error:`, err.message || err);
  }
}

test();
