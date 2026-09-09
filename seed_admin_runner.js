const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  const superadminEmail = 'superadmin@mlx.com';
  let adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: superadminEmail },
        { name: 'Superadmin' },
        { phone: 'Superadmin' },
        { role: 'admin' }
      ]
    }
  });
  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        name: 'Superadmin',
        email: superadminEmail,
        phone: 'Superadmin',
        password: hashedPassword,
        role: 'admin'
      }
    });
    console.log('SUCCESS: Updated existing Superadmin user in DB!');
  } else {
    adminUser = await prisma.user.create({
      data: {
        name: 'Superadmin',
        email: superadminEmail,
        phone: 'Superadmin',
        password: hashedPassword,
        role: 'admin'
      }
    });
    console.log('SUCCESS: Created new Superadmin user in DB!');
  }
  console.log('Admin ID:', adminUser.id);
  console.log('Admin Email:', adminUser.email);
  console.log('Admin Name:', adminUser.name);
}
main().catch(console.error).finally(() => prisma['']());