import { globalPrisma } from '../server/lib/prisma';

async function check() {
  const models = Object.keys(globalPrisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
  console.log('Models in globalPrisma:', models);
  if ((globalPrisma as any).taxonomy) {
    console.log('Taxonomy model found!');
  } else {
    console.log('Taxonomy model NOT found!');
  }
}

check().catch(console.error);
