import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const tenants = await prisma.tenant.findMany()
  const users = await prisma.user.findMany()
  const memberships = await prisma.tenantMember.findMany()

  console.log('--- TENANTS ---')
  console.log(JSON.stringify(tenants, null, 2))
  console.log('\n--- USERS ---')
  console.log(JSON.stringify(users, null, 2))
  console.log('\n--- MEMBERSHIPS ---')
  console.log(JSON.stringify(memberships, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
