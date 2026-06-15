import { globalPrisma } from '../server/lib/prisma';

async function main() {
  const searchTerm = 'LIC-9'; // Based on the screenshot

  console.log(`Searching for records with data containing "${searchTerm}"...`);

  try {
    const records = await globalPrisma.record.findMany({
      where: {
        OR: [
          { id: 'cmop73ulw0001j8n3vrgt45xh' },
          { data: { path: ['_record_key'], equals: searchTerm } as any }
        ]
      }
    });

    if (records.length === 0) {
       console.log('No records found. Searching by _record_key in data blob...');
       const allRecords = await globalPrisma.record.findMany();
       const matches = allRecords.filter((r: any) => 
         r.id === 'cmop73ulw0001j8n3vrgt45xh' || 
         r.data?._record_key === searchTerm || 
         r.data?.key === searchTerm
       );
       console.log(`Found ${matches.length} matches:`, matches);
    } else {
       console.log(`Found ${records.length} matches:`, records);
    }

  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    await globalPrisma.$disconnect();
  }
}

main();
