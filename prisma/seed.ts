import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create Admin
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
    },
  });

  const realisticNames = [
    'Emma Watson', 'Liam Neeson', 'Olivia Wilde', 'Noah Centineo', 'Ava Max',
    'Elijah Wood', 'Sophia Loren', 'Lucas Hedges', 'Isabella Rossellini', 'Mason Mount',
    'Mia Farrow', 'Logan Lerman', 'Amelia Earhart', 'Oliver Twist', 'Harper Lee',
    'Ethan Hawke', 'Evelyn Waugh', 'Aiden Gillen', 'Abigail Breslin', 'Jackson Pollock'
  ];

  // Create Users
  const usersData = realisticNames.map((name, i) => ({
    name,
    email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@example.com`,
    phone: `+1 (555) 019-${String(i).padStart(3, '0')}`,
    status: i % 5 === 0 ? 'INACTIVE' : 'ACTIVE',
  }));

  const users = [];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone },
      create: u,
    });
    users.push(user);
  }

  // Create Transactions
  const statuses: any[] = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'];
  for (let i = 0; i < 50; i++) {
    const user = users[i % users.length];
    const amount = (Math.random() * 500 + 10).toFixed(2);
    await prisma.transaction.upsert({
      where: { reference: `TXN-839${1000 + i}` },
      update: {},
      create: {
        userId: user.id,
        amount,
        status: statuses[i % statuses.length],
        reference: `TXN-839${1000 + i}`,
        createdAt: new Date(Date.now() - Math.random() * 10000000000), // Random past date
      },
    });
  }

  // Create Bookings
  const bStatus: any[] = ['CONFIRMED', 'CANCELLED', 'PENDING', 'COMPLETED'];
  for (let i = 0; i < 50; i++) {
    const user = users[i % users.length];
    await prisma.booking.upsert({
      where: { reference: `BKG-442${1000 + i}` },
      update: {},
      create: {
        userId: user.id,
        status: bStatus[i % bStatus.length],
        bookingDate: new Date(Date.now() + Math.random() * 5000000000), // Random future date
        reference: `BKG-442${1000 + i}`,
      },
    });
  }

  console.log('Database seeded successfully with highly realistic data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
