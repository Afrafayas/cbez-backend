import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { shop: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total users in MongoDB database: ${users.length}`);
  users.forEach(u => {
    console.log(`- ID: ${u.id} | Name: "${u.name}" | Email: "${u.email}" | Phone: "${u.phone}" | Role: "${u.role}" | Shop: ${u.shop ? u.shop.name : 'None'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
