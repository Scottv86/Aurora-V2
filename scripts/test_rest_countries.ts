process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function test() {
  const query = 'australia';
  const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(query)}`;
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Is Array: ${Array.isArray(data)}`);
    console.log(`Type of data: ${typeof data}`);
    if (data && typeof data === 'object') {
      console.log(`Keys:`, Object.keys(data));
      console.log(`Preview:`, JSON.stringify(data).slice(0, 500));
    } else {
      console.log(`Raw:`, data);
    }
  } catch (err: any) {
    console.error(`Error:`, err.message || err);
  }
}

test();
