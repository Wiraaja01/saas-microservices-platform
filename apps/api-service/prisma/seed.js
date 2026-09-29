const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Buat demo user
  const demoPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@linkforge.ai' },
    update: {},
    create: {
      email: 'demo@linkforge.ai',
      password: demoPassword,
      name: 'Demo User',
    },
  });

  console.log(`✅ Demo user created: ${user.email}`);

  // Buat API key untuk demo user (kalau belum ada)
  const existingKey = await prisma.apiKey.findFirst({
    where: { userId: user.id },
  });

  if (!existingKey) {
    const demoKey = await prisma.apiKey.create({
      data: {
        key: 'sk-demo1234567890abcdef1234567890abcdef',
        userId: user.id,
        name: 'Demo Key',
        isActive: true,
      },
    });
    console.log(`✅ Demo API key created: ${demoKey.key}`);
  } else {
    console.log('ℹ️  Demo API key already exists');
  }

  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('  🎉 Seeding completed!');
  console.log('════════════════════════════════════════════');
  console.log('  Login credentials:');
  console.log('  📧 Email:    demo@linkforge.ai');
  console.log('  🔑 Password: password123');
  console.log('════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });