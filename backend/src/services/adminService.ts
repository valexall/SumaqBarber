import prisma from '../config/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';

export interface CreateBarberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  bio?: string;
  experience?: number;
}

export const listBarbers = async () => {
  const barbers = await prisma.user.findMany({
    where: { role: Role.BARBER },
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
    const existingPhone = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existingPhone) {
      throw new Error('Ya existe un usuario registrado con este número de teléfono.');
    }
  }

  const defaultPassword = input.password || 'SumaqBarber2026';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
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

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.firstName ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName ? { lastName: input.lastName.trim() } : {}),
      ...(input.phone ? { phone: input.phone.trim() } : {}),
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

  // Si tiene citas, podemos reasignarlas o eliminar en cascada si no hay restricciones
  // O cambiar su rol a CUSTOMER para preservar el historial de citas
  if (user._count.appointmentsAsBarber > 0) {
    await prisma.appointment.deleteMany({
      where: { barberId: id, status: 'PENDING' },
    });
  }

  await prisma.user.delete({
    where: { id },
  });

  return { success: true, message: 'Barbero eliminado correctamente' };
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
          service: {
            select: { name: true, price: true },
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
      .reduce((sum, a) => sum + (a.service?.price || 0), 0);
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
