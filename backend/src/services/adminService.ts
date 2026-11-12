import prisma from '../config/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import { normalizePhone } from '../utils/normalize';

export interface CreateBarberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  bio?: string;
  experience?: number;
}

export const listBarbers = async () => {
  const barbers = await prisma.user.findMany({
    where: { role: Role.BARBER, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      barberProfile: {
        select: {
          bio: true,
          experience: true,
        },
      },
      _count: {
        select: {
          appointmentsAsBarber: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return barbers.map((b) => ({
    id: b.id,
    firstName: b.firstName,
    lastName: b.lastName,
    email: b.email,
    phone: b.phone,
    role: b.role,
    bio: b.barberProfile?.bio || '',
    experience: b.barberProfile?.experience || 0,
    totalAppointments: b._count.appointmentsAsBarber,
    createdAt: b.createdAt,
  }));
};

export const createBarber = async (input: CreateBarberInput) => {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    throw new Error('Ya existe un usuario registrado con este correo electrónico.');
  }

  if (input.phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone: normalizePhone(input.phone) } });
    if (existingPhone) {
      throw new Error('Ya existe un usuario registrado con este número de teléfono.');
    }
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const newUser = await prisma.user.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone ? normalizePhone(input.phone) : null,
      password: hashedPassword,
      role: Role.BARBER,
      barberProfile: {
        create: {
          bio: input.bio?.trim() || 'Master Barber Sumaq',
          experience: Number(input.experience) || 1,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      barberProfile: true,
      createdAt: true,
    },
  });

  return newUser;
};

export const updateBarber = async (id: string, input: Partial<CreateBarberInput>) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.BARBER) {
    throw new Error('Barbero no encontrado.');
  }

  const normalizedEmail = input.email?.trim().toLowerCase();
  if (normalizedEmail && normalizedEmail !== user.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) throw new Error('Ya existe un usuario registrado con este correo electrónico.');
  }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : undefined;
  if (normalizedPhone && normalizedPhone !== user.phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingPhone) throw new Error('Ya existe un usuario registrado con este número de teléfono.');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.firstName ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName ? { lastName: input.lastName.trim() } : {}),
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      ...(input.password ? { password: await bcrypt.hash(input.password, 12) } : {}),
      ...(input.bio !== undefined || input.experience !== undefined
        ? {
            barberProfile: {
              upsert: {
                create: {
                  bio: input.bio || '',
                  experience: Number(input.experience) || 0,
                },
                update: {
                  ...(input.bio !== undefined ? { bio: input.bio } : {}),
                  ...(input.experience !== undefined ? { experience: Number(input.experience) } : {}),
                },
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      barberProfile: true,
    },
  });

  return updated;
};

export const deleteBarber = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { appointmentsAsBarber: true } } },
  });

  if (!user || user.role !== Role.BARBER) {
    throw new Error('Barbero no encontrado.');
  }

  await prisma.user.update({ where: { id }, data: { isActive: false } });
  return { success: true, message: 'Barbero desactivado; su historial se conservó.' };
};

export const listCustomers = async () => {
  const customers = await prisma.user.findMany({
    where: { role: Role.CUSTOMER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      appointmentsAsCustomer: {
        select: {
          id: true,
          date: true,
          status: true,
          priceAtBooking: true,
          service: {
            select: { name: true },
          },
        },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return customers.map((c) => {
    const totalAppointments = c.appointmentsAsCustomer.length;
    const completedAppointments = c.appointmentsAsCustomer.filter((a) => a.status === 'COMPLETED').length;
    const canceledAppointments = c.appointmentsAsCustomer.filter((a) => a.status === 'CANCELED').length;
    const totalSpent = c.appointmentsAsCustomer
      .filter((a) => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + Number(a.priceAtBooking), 0);
    const lastAppointment = c.appointmentsAsCustomer[0]?.date || null;

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      totalAppointments,
      completedAppointments,
      canceledAppointments,
      totalSpent,
      lastAppointment,
      createdAt: c.createdAt,
    };
  });
};
