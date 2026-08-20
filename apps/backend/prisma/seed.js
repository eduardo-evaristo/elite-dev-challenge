const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const users = [
  {
    name: 'Cliente',
    lastName: 'Teste',
    email: 'cliente@test.com',
    password: '123456',
    role: 'CLIENT',
  },
  {
    name: 'Organizador',
    lastName: 'Teste',
    email: 'organizador@test.com',
    password: '123456',
    role: 'ORGANIZER',
  },
  {
    name: 'Portaria',
    lastName: 'Teste',
    email: 'portaria@test.com',
    password: '123456',
    role: 'GATE',
  },
  {
    name: 'Admin',
    lastName: 'Teste',
    email: 'admin@test.com',
    password: '123456',
    role: 'ADMIN',
  },
];

async function main() {
  console.log('Seeding users...');

  for (const user of users) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password, salt);

    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`  ${user.email} already exists, skipping.`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        password: hashedPassword,
        role: user.role,
      },
    });

    console.log(`  Created ${user.role}: ${user.email}`);
  }

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
