process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function test() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=-34.9285&longitude=138.6007&current_weather=true';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Temperature:`, data.current_weather?.temperature);
  } catch (err: any) {
    console.error(`Error:`, err.message || err);
  }
}

test();
