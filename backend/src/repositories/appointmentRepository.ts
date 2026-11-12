import prisma from '../config/prisma';
import { AppointmentStatus, Prisma } from '@prisma/client';

const limaDayRange = (date: string) => ({
  start: new Date(`${date}T00:00:00.000-05:00`),
  end: new Date(`${date}T23:59:59.999-05:00`),
});

const currentLimaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export interface CreateAppointmentDTO {
  customerId: string;
  barberId: string;
  serviceId: string;
  date: Date;
  durationMinutes: number;
  priceAtBooking: Prisma.Decimal | number | string;
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
  const slotEnd = new Date(data.date.getTime() + data.durationMinutes * 60 * 1000);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
      const slotStart = data.date;
      const conflict = await tx.appointment.findFirst({
        where: {
          barberId: data.barberId,
          status: { not: 'CANCELED' },
          date: { lt: slotEnd },
          endAt: { gt: slotStart },
        },
        select: { id: true },
      });

      if (conflict) {
        throw new Error('El barbero seleccionado ya tiene una cita reservada en ese horario. Por favor elige otro horario.');
      }

      return tx.appointment.create({
        data: {
          customerId: data.customerId,
          barberId: data.barberId,
          serviceId: data.serviceId,
          date: data.date,
          endAt: slotEnd,
          durationMinutes: data.durationMinutes,
          priceAtBooking: data.priceAtBooking,
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
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error.code === 'P2034' && attempt === 0) continue;
      if (error.code === 'P2002' || error.code === 'P2004' || error.message?.includes('constraint')) {
        throw new Error('El barbero seleccionado ya tiene una cita reservada en ese horario. Por favor elige otro horario.');
      }
      throw error;
    }
  }
  throw new Error('No se pudo completar la reserva. Intenta nuevamente.');
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
  return prisma.appointment.findFirst({
    where: {
      barberId,
      status: { not: 'CANCELED' },
      date: { lt: slotEnd },
      endAt: { gt: slotStart },
    },
    select: { id: true },
  });
};

export const findAppointmentStatus = (appointmentId: string) =>
  prisma.appointment.findUnique({ where: { id: appointmentId }, select: { status: true } });

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
        where.date.gte = limaDayRange(filters.startDate).start;
      } else {
        where.date.gte = start;
      }
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (typeof filters.endDate === 'string' && !filters.endDate.includes('T')) {
        where.date.lte = limaDayRange(filters.endDate).end;
      } else {
        where.date.lte = end;
      }
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
    const { start: startOfDay, end: endOfDay } = limaDayRange(filters.date);
    where.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (typeof filters.startDate === 'string' && !filters.startDate.includes('T')) {
        where.date.gte = limaDayRange(filters.startDate).start;
      } else {
        where.date.gte = start;
      }
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (typeof filters.endDate === 'string' && !filters.endDate.includes('T')) {
        where.date.lte = limaDayRange(filters.endDate).end;
      } else {
        where.date.lte = end;
      }
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

export const getBarberDailyStats = async (barberId?: string, dateStr?: string) => {
  const targetDateString = dateStr || currentLimaDate();
  const { start: startOfDay, end: endOfDay } = limaDayRange(targetDateString);
  const targetDate = new Date(`${targetDateString}T12:00:00-05:00`);

  // Start & End of week (Monday to Sunday)
  const dayOfWeek = targetDate.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const startOfWeekDate = new Date(targetDate);
  startOfWeekDate.setUTCDate(targetDate.getUTCDate() - distanceToMonday);
  const weekStartString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(startOfWeekDate);
  const startOfWeek = limaDayRange(weekStartString).start;

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7);
  endOfWeek.setUTCMilliseconds(endOfWeek.getUTCMilliseconds() - 1);

  const [dayAppointments, weekAppointments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...(barberId ? { barberId } : {}),
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { status: true, priceAtBooking: true },
    }),
    prisma.appointment.findMany({
      where: {
        ...(barberId ? { barberId } : {}),
        date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      select: { status: true, priceAtBooking: true },
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
      projectedRevenue += Number(app.priceAtBooking);
    } else if (app.status === 'COMPLETED') {
      completedCount++;
      todayRevenue += Number(app.priceAtBooking);
      projectedRevenue += Number(app.priceAtBooking);
    } else if (app.status === 'CANCELED') {
      canceledCount++;
    }
  }

  let weekCompletedCount = 0;
  let weekRevenue = 0;
  for (const app of weekAppointments) {
    if (app.status === 'COMPLETED') {
      weekCompletedCount++;
      weekRevenue += Number(app.priceAtBooking);
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

