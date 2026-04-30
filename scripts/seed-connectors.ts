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
    update: {},
    create: {
      id: 'google-maps-lookup',
      name: 'Google Maps Address Lookup',
      icon: 'GoogleMaps',
      category: 'Location',
      edgeFunctionUrl: 'https://zoqnvkgioetjgdykuwdp.supabase.co/functions/v1/nexus-proxy',
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
