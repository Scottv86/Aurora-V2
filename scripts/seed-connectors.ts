import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Nexus Connectors...');

  const googleMaps = await prisma.nexusConnector.upsert({
    where: { id: 'google-maps-lookup' },
    update: {
      edgeFunctionUrl: '/api/nexus-proxy/execute',
      config: {
        edgeFunctionLogic: `async (params, secrets) => {
  if (secrets && secrets.apiKey) {
    try {
      const res = await fetch(\`https://maps.googleapis.com/maps/api/geocode/json?address=\${encodeURIComponent(params.address)}&key=\${secrets.apiKey}\`);
      const data = await res.json();
      if (data.results && data.results[0]) {
        const first = data.results[0];
        return {
          formatted_address: first.formatted_address,
          lat: first.geometry.location.lat,
          lng: first.geometry.location.lng,
          place_id: first.place_id
        };
      }
    } catch (err) {}
  }
  // Offline / fallback geocode response
  return {
    formatted_address: \`\${params.address}, Mock City, MC 12345\`,
    lat: -34.9285,
    lng: 138.6007,
    place_id: 'place_mock_12345'
  };
}`
      }
    },
    create: {
      id: 'google-maps-lookup',
      name: 'Google Maps Address Lookup',
      icon: 'GoogleMaps',
      category: 'Location',
      edgeFunctionUrl: '/api/nexus-proxy/execute',
      config: {
        edgeFunctionLogic: `async (params, secrets) => {
  if (secrets && secrets.apiKey) {
    try {
      const res = await fetch(\`https://maps.googleapis.com/maps/api/geocode/json?address=\${encodeURIComponent(params.address)}&key=\${secrets.apiKey}\`);
      const data = await res.json();
      if (data.results && data.results[0]) {
        const first = data.results[0];
        return {
          formatted_address: first.formatted_address,
          lat: first.geometry.location.lat,
          lng: first.geometry.location.lng,
          place_id: first.place_id
        };
      }
    } catch (err) {}
  }
  // Offline / fallback geocode response
  return {
    formatted_address: \`\${params.address}, Mock City, MC 12345\`,
    lat: -34.9285,
    lng: 138.6007,
    place_id: 'place_mock_12345'
  };
}`
      },
      ioSchema: {
        inputs: [
          {
            name: 'address',
            type: 'string',
            label: 'Search Address',
            description: 'The partial address to look up',
            required: true
          }
        ],
        outputs: [
          {
            name: 'formatted_address',
            type: 'string',
            label: 'Formatted Address'
          },
          {
            name: 'lat',
            type: 'number',
            label: 'Latitude'
          },
          {
            name: 'lng',
            type: 'number',
            label: 'Longitude'
          },
          {
            name: 'place_id',
            type: 'string',
            label: 'Place ID'
          }
        ],
        config: [
          {
            name: 'apiKey',
            type: 'password',
            label: 'Google Maps API Key',
            description: 'Your Google Cloud Maps JavaScript API Key',
            required: true
          }
        ]
      }
    }
  });

  console.log('Seeded connector:', googleMaps.name);

  const openMeteo = await prisma.nexusConnector.upsert({
    where: { id: 'open-meteo-weather' },
    update: {
      edgeFunctionUrl: '/api/nexus-proxy/execute',
      config: {
        edgeFunctionLogic: `async (params, secrets) => {
  const lat = params.latitude || '-34.9285';
  const lng = params.longitude || '138.6007';
  const res = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lng}&current_weather=true\`);
  const data = await res.json();
  if (!data.current_weather) {
    throw new Error('No current weather data returned from Open-Meteo');
  }
  return {
    temperature: data.current_weather.temperature,
    windspeed: data.current_weather.windspeed,
    weathercode: data.current_weather.weathercode
  };
}`
      }
    },
    create: {
      id: 'open-meteo-weather',
      name: 'Open-Meteo Weather Lookup',
      icon: 'CloudSun',
      category: 'Weather',
      edgeFunctionUrl: '/api/nexus-proxy/execute',
      config: {
        edgeFunctionLogic: `async (params, secrets) => {
  const lat = params.latitude || '-34.9285';
  const lng = params.longitude || '138.6007';
  const res = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lng}&current_weather=true\`);
  const data = await res.json();
  if (!data.current_weather) {
    throw new Error('No current weather data returned from Open-Meteo');
  }
  return {
    temperature: data.current_weather.temperature,
    windspeed: data.current_weather.windspeed,
    weathercode: data.current_weather.weathercode
  };
}`
      },
      ioSchema: {
        inputs: [
          {
            name: 'latitude',
            type: 'string',
            label: 'Latitude',
            description: 'Decimal latitude value (e.g. -34.92)',
            required: true
          },
          {
            name: 'longitude',
            type: 'string',
            label: 'Longitude',
            description: 'Decimal longitude value (e.g. 138.60)',
            required: true
          }
        ],
        outputs: [
          {
            name: 'temperature',
            type: 'number',
            label: 'Current Temperature (°C)'
          },
          {
            name: 'windspeed',
            type: 'number',
            label: 'Wind Speed (km/h)'
          },
          {
            name: 'weathercode',
            type: 'number',
            label: 'Weather Code'
          }
        ]
      }
    }
  });

  console.log('Seeded connector:', openMeteo.name);

  // Clean up deprecated rest-countries-lookup and its relations if they exist
  await prisma.tenantConnector.deleteMany({
    where: { connectorId: 'rest-countries-lookup' }
  });
  await prisma.nexusConnector.deleteMany({
    where: { id: 'rest-countries-lookup' }
  });

  const zipcodeLookup = await prisma.nexusConnector.upsert({
    where: { id: 'zipcode-lookup' },
    update: {
      edgeFunctionUrl: '/api/nexus-proxy/execute',
      config: {
        edgeFunctionLogic: `async (params, secrets) => {
  const zip = params.zipcode || '90210';
  const res = await fetch(\`https://api.zippopotam.us/us/\${encodeURIComponent(zip)}\`);
  if (!res.ok) {
    throw new Error(\`Failed to fetch postcode data: HTTP \${res.status}\`);
  }
  const data = await res.json();
  if (!data.places || !Array.isArray(data.places) || data.places.length === 0) {
    throw new Error('No postcode data found');
  }
  const place = data.places[0];
  return {
    placeName: place['place name'] || '',
    state: place.state || '',
    stateAbbreviation: place['state abbreviation'] || '',
    latitude: place.latitude || '',
    longitude: place.longitude || ''
  };
}`
      }
    },
    create: {
      id: 'zipcode-lookup',
      name: 'US Zipcode Lookup',
      icon: 'MapPin',
      category: 'Location',
      edgeFunctionUrl: '/api/nexus-proxy/execute',
      config: {
        edgeFunctionLogic: `async (params, secrets) => {
  const zip = params.zipcode || '90210';
  const res = await fetch(\`https://api.zippopotam.us/us/\${encodeURIComponent(zip)}\`);
  if (!res.ok) {
    throw new Error(\`Failed to fetch postcode data: HTTP \${res.status}\`);
  }
  const data = await res.json();
  if (!data.places || !Array.isArray(data.places) || data.places.length === 0) {
    throw new Error('No postcode data found');
  }
  const place = data.places[0];
  return {
    placeName: place['place name'] || '',
    state: place.state || '',
    stateAbbreviation: place['state abbreviation'] || '',
    latitude: place.latitude || '',
    longitude: place.longitude || ''
  };
}`
      },
      ioSchema: {
        inputs: [
          {
            name: 'zipcode',
            type: 'string',
            label: 'Zip Code',
            description: '5-digit US Zip Code (e.g. 90210)',
            required: true
          }
        ],
        outputs: [
          {
            name: 'placeName',
            type: 'string',
            label: 'City'
          },
          {
            name: 'state',
            type: 'string',
            label: 'State'
          },
          {
            name: 'stateAbbreviation',
            type: 'string',
            label: 'State Abbreviation'
          },
          {
            name: 'latitude',
            type: 'string',
            label: 'Latitude'
          },
          {
            name: 'longitude',
            type: 'string',
            label: 'Longitude'
          }
        ]
      }
    }
  });

  console.log('Seeded connector:', zipcodeLookup.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
