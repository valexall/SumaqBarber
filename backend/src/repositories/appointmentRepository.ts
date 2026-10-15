import prisma from '../config/prisma';
import { AppointmentStatus } from '@prisma/client';

export interface CreateAppointmentDTO {
  customerId: string;
  barberId: string;
  serviceId: string;
  date: Date;
  durationMinutes?: number;
  notes?: string;
}

export const findAppointmentsByCustomer = async (customerId: string) => {
  return prisma.appointment.findMany({
    where: { customerId },
    orderBy: { date: 'desc' },
    include: {
      service: true,
      barber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

export const createAppointmentWithTransaction = async (data: CreateAppointmentDTO) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const slotStart = data.date;
      const slotEnd = new Date(slotStart.getTime() + (data.durationMinutes || 45) * 60 * 1000);
      const earliestPossibleOverlap = new Date(slotStart.getTime() - 180 * 60 * 1000);

      // 1. Check for slot collision within the transaction
      const potentialConflicts = await tx.appointment.findMany({
        where: {
          barberId: data.barberId,
          status: { not: 'CANCELED' },
          date: {
            gte: earliestPossibleOverlap,
            lt: slotEnd,
          },
        },
        include: {
          service: {
            select: {
              duration: true,
            },
          },
        },
      });

      const hasConflict = potentialConflicts.some((existing) => {
        const existingDuration = existing.service?.duration || 45;
        const existingStart = existing.date.getTime();
        const existingEnd = existingStart + existingDuration * 60 * 1000;
        const newStart = slotStart.getTime();
        const newEnd = slotEnd.getTime();
        return existingStart < newEnd && newStart < existingEnd;
      });

      if (hasConflict) {
        throw new Error('El barbero seleccionado ya tiene una cita reservada en ese horario. Por favor elige otro horario.');
      }

      // 2. Clear out any previous CANCELED appointment at this exact slot to allow reuse
      await tx.appointment.deleteMany({
        where: {
          barberId: data.barberId,
          date: data.date,
          status: 'CANCELED',
        },
      });

      // 3. Atomically insert the new appointment
      return tx.appointment.create({
        data: {
          customerId: data.customerId,
          barberId: data.barberId,
          serviceId: data.serviceId,
          date: data.date,
          notes: data.notes,
        },
        include: {
          service: true,
          barber: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
      });
    });
  } catch (error: any) {
    // Catch unique constraint collision (P2002) from concurrent requests
    if (error.code === 'P2002' || error.message?.includes('Unique constraint failed')) {
      throw new Error('El barbero seleccionado ya tiene una cita reservada en ese horario. Por favor elige otro horario.');
    }
    throw error;
  }
};

export const cancelAppointment = async (appointmentId: string, customerId?: string) => {
  // Single roundtrip cancel with updateMany
  const result = await prisma.appointment.updateMany({
    where: {
      id: appointmentId,
      ...(customerId ? { customerId } : {}),
      status: { not: 'CANCELED' },
    },
    data: { status: 'CANCELED' },
  });

  if (result.count === 0) {
    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!existing) {
      throw new Error('La cita no existe.');
    }
    if (existing.status === 'CANCELED') {
      return existing;
    }
    if (customerId && existing.customerId !== customerId) {
      throw new Error('No tienes permiso para cancelar esta cita.');
    }
  }

  return { id: appointmentId, status: 'CANCELED' };
};

export const findConflictingAppointment = async (
  barberId: string,
  slotStart: Date,
  durationMinutes: number
) => {
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
  const earliestPossibleOverlap = new Date(slotStart.getTime() - 180 * 60 * 1000);

  // Index range scan on (barberId, date)
  const candidates = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { not: 'CANCELED' },
      date: {
        gte: earliestPossibleOverlap,
        lt: slotEnd,
      },
    },
    include: {
      service: {
        select: {
          duration: true,
        },
      },
    },
  });

  return candidates.find((existing) => {
    const existingDuration = existing.service?.duration || 45;
    const existingStart = existing.date.getTime();
    const existingEnd = existingStart + existingDuration * 60 * 1000;
    const newStart = slotStart.getTime();
    const newEnd = slotEnd.getTime();

    return existingStart < newEnd && newStart < existingEnd;
  });
};

export interface FindAppointmentsFilter {
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number | string;
  page?: number | string;
  barberId?: string;
  status?: string;
}

export const findAppointments = async (filters: FindAppointmentsFilter = {}) => {
  const take = Math.min(Math.max(1, Number(filters.limit) || 50), 50);
  const page = Math.max(1, Number(filters.page) || 1);
  const skip = (page - 1) * take;

  const where: any = {};

  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (typeof filters.startDate === 'string' && !filters.startDate.includes('T')) {
        start.setHours(0, 0, 0, 0);
      }
      where.date.gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (typeof filters.endDate === 'string' && !filters.endDate.includes('T')) {
        end.setHours(23, 59, 59, 999);
      }
      where.date.lte = end;
    }
  }

  if (filters.barberId) {
    where.barberId = filters.barberId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  return prisma.appointment.findMany({
    where,
    take,
    skip,
    orderBy: { date: 'desc' },
    include: {
      service: true,
      barber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  });
};

export interface FindBarberAppointmentsFilter {
  barberId?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string | Date;
  endDate?: string | Date;
  status?: string;
}

export const findBarberAppointments = async (filters: FindBarberAppointmentsFilter) => {
  const where: any = {};

  if (filters.barberId) {
    where.barberId = filters.barberId;
  }

  if (filters.date) {
    const [year, month, day] = filters.date.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    where.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (typeof filters.startDate === 'string' && !filters.startDate.includes('T')) {
        start.setHours(0, 0, 0, 0);
      }
      where.date.gte = start;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (typeof filters.endDate === 'string' && !filters.endDate.includes('T')) {
        end.setHours(23, 59, 59, 999);
      }
      where.date.lte = end;
    }
  }

  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status as AppointmentStatus;
  }

  return prisma.appointment.findMany({
    where,
    orderBy: { date: 'asc' }, // Chronological for barber's agenda
    include: {
      service: true,
      barber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  });
};

export const getBarberDailyStats = async (barberId: string, dateStr?: string) => {
  let targetDate = new Date();
  if (dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    targetDate = new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Start & End of week (Monday to Sunday)
  const dayOfWeek = targetDate.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const startOfWeek = new Date(targetDate);
  startOfWeek.setDate(targetDate.getDate() - distanceToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const [dayAppointments, weekAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        service: {
          select: { price: true },
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        barberId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      include: {
        service: {
          select: { price: true },
        },
      },
    }),
  ]);

  const todayTotal = dayAppointments.length;
  let pendingCount = 0;
  let confirmedCount = 0;
  let completedCount = 0;
  let canceledCount = 0;
  let todayRevenue = 0;
  let projectedRevenue = 0;

  for (const app of dayAppointments) {
    if (app.status === 'PENDING') pendingCount++;
    else if (app.status === 'CONFIRMED') {
      confirmedCount++;
      projectedRevenue += app.service?.price || 0;
    } else if (app.status === 'COMPLETED') {
      completedCount++;
      todayRevenue += app.service?.price || 0;
      projectedRevenue += app.service?.price || 0;
    } else if (app.status === 'CANCELED') {
      canceledCount++;
    }
  }

  let weekCompletedCount = 0;
  let weekRevenue = 0;
  for (const app of weekAppointments) {
    if (app.status === 'COMPLETED') {
      weekCompletedCount++;
      weekRevenue += app.service?.price || 0;
    }
  }

  return {
    todayTotal,
    pendingCount,
    confirmedCount,
    completedCount,
    canceledCount,
    todayRevenue,
    projectedRevenue,
    weekCompletedCount,
    weekRevenue,
  };
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  barberId: string,
  newStatus: AppointmentStatus,
  userRole: string,
  notes?: string
) => {
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error('La cita no existe.');
  }

  if (userRole !== 'OWNER' && userRole !== 'ADMIN' && existing.barberId !== barberId) {
    throw new Error('No tienes permisos para modificar el estado de esta cita.');
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: newStatus,
      ...(notes !== undefined ? { notes } : {}),
    },
    include: {
      service: true,
      barber: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  });
};

