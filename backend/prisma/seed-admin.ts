import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();

  if (!email) {
    throw new Error('ADMIN_EMAIL is required. Example: ADMIN_EMAIL=you@company.com npm run db:seed-admin');
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { accountRole: 'admin', isBlocked: false },
    });
    console.log(`Updated existing user ${email} as admin`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      homeCity: 'Moscow',
      role: 'Both',
      accountRole: 'admin',
      isBlocked: false,
    },
  });

  console.log(`Created admin user ${email}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
