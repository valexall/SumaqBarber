import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Services
  const defaultServices = [
    { name: 'Corte Sumaq', description: 'Diagnóstico + corte personalizado + peinado final', price: 55, duration: 45 },
    { name: 'Corte & Barba', description: 'Ritual completo + perfilado de barba con navaja y toalla caliente', price: 80, duration: 65 },
    { name: 'Barba Clásica', description: 'Toalla caliente + diseño de barba + aceites aromáticos', price: 40, duration: 30 },
    { name: 'Tratamiento Capilar', description: 'Lavado detox + exfoliación + masaje capilar relajante', price: 70, duration: 40 },
  ];

  for (const item of defaultServices) {
    const existing = await prisma.service.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.service.create({ data: item });
      console.log(`  + Created service: ${item.name}`);
    }
  }

  // 2. Seed Barbers
  const passwordHash = await bcrypt.hash('SumaqBarber2026', 10);
  const defaultBarbers = [
    {
      firstName: 'Mateo',
      lastName: 'Ramos',
      email: 'mateo.barber@sumaqbarber.com',
      password: passwordHash,
      role: Role.BARBER,
      phone: '+51 987 111 222',
      bio: 'Master Barber especializado en fades modernos y visagismo.',
      experience: 7,
    },
    {
      firstName: 'Carlos',
      lastName: 'Mendoza',
      email: 'carlos.barber@sumaqbarber.com',
      password: passwordHash,
      role: Role.BARBER,
      phone: '+51 987 333 444',
      bio: 'Especialista en corte clásico a tijera y ritual de toalla caliente.',
      experience: 5,
    },
  ];

  for (const b of defaultBarbers) {
    const existing = await prisma.user.findUnique({ where: { email: b.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          firstName: b.firstName,
          lastName: b.lastName,
          email: b.email,
          password: b.password,
          role: b.role,
          phone: b.phone,
          barberProfile: {
            create: {
              bio: b.bio,
              experience: b.experience,
            },
          },
        },
      });
      console.log(`  + Created barber: ${b.firstName} ${b.lastName}`);
    }
  }

  console.log('✅ Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
