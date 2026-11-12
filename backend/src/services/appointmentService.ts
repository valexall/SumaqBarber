import { AppointmentStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import * as appointmentRepository from '../repositories/appointmentRepository';
import { HttpError } from '../utils/httpError';
import type { BookingInput } from '../validation/schemas';
import * as authService from './authService';
import * as serviceService from './serviceService';
import { normalizePhone } from '../utils/normalize';

export type PublicBookingInput = BookingInput;

const getLimaSchedule = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return { weekday: value('weekday'), minutes: Number(value('hour')) * 60 + Number(value('minute')) };
};

export const createPublicAppointment = async (input: PublicBookingInput, authenticatedUserId?: string) => {
  const { customerName, customerPhone, customerEmail, password, serviceId, date, notes } = input;
  const appointmentDate = new Date(date);
  if (Number.isNaN(appointmentDate.getTime()) || appointmentDate.getTime() < Date.now() + 15 * 60 * 1000) {
    throw new HttpError(400, 'Selecciona un horario futuro con al menos 15 minutos de anticipación.');
  }

  const service = await prisma.service.findFirst({ where: { id: serviceId, isActive: true } });
  if (!service) throw new HttpError(404, 'El servicio seleccionado no existe o no está disponible.');

  const schedule = getLimaSchedule(appointmentDate);
  if (schedule.weekday === 'Sun' || schedule.minutes < 9 * 60 || schedule.minutes + service.duration > 20 * 60) {
    throw new HttpError(400, 'El horario debe estar entre lunes y sábado, de 9:00 a 20:00.');
  }

  const barbers = await serviceService.getBarbers();
  if (barbers.length === 0) throw new HttpError(409, 'No hay barberos disponibles en el sistema.');

  let targetBarberId: string | undefined;
  if (input.barberId) {
    if (!barbers.some((barber) => barber.id === input.barberId)) {
      throw new HttpError(400, 'El barbero seleccionado no está disponible.');
    }
    const conflict = await appointmentRepository.findConflictingAppointment(input.barberId, appointmentDate, service.duration);
    if (!conflict) targetBarberId = input.barberId;
  } else {
    for (const barber of barbers) {
      const conflict = await appointmentRepository.findConflictingAppointment(barber.id, appointmentDate, service.duration);
      if (!conflict) {
        targetBarberId = barber.id;
        break;
      }
    }
  }
  if (!targetBarberId) throw new HttpError(409, 'No hay disponibilidad para ese horario. Elige otra hora.');

  const cleanPhone = normalizePhone(customerPhone);
  const cleanEmail = customerEmail?.trim().toLowerCase();
  let customer;
  let sessionToken: string | undefined;

  if (authenticatedUserId) {
    customer = await prisma.user.findUnique({ where: { id: authenticatedUserId } });
    if (!customer) throw new HttpError(401, 'La sesión no corresponde a un usuario válido.');
  } else {
    if (!cleanEmail || !password) {
      throw new HttpError(400, 'El correo y la contraseña son obligatorios para tu primera reserva.');
    }
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: cleanEmail }, { phone: cleanPhone }] }, select: { id: true },
    });
    if (existing) throw new HttpError(409, 'Ya existe una cuenta con ese correo o teléfono. Inicia sesión para reservar.');

    const nameParts = customerName.trim().split(/\s+/);
    customer = await prisma.user.create({
      data: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || 'Cliente',
        phone: cleanPhone,
        email: cleanEmail,
        password: await bcrypt.hash(password, 12),
        role: Role.CUSTOMER,
      },
    });
    sessionToken = authService.generateToken(customer.id, customer.role);
  }

  const appointment = await appointmentRepository.createAppointmentWithTransaction({
    customerId: customer.id,
    barberId: targetBarberId,
    serviceId,
    date: appointmentDate,
    durationMinutes: service.duration,
    priceAtBooking: service.price,
    notes: notes?.trim() || undefined,
  });

  const bookingCode = `SB-${appointment.id.slice(0, 6).toUpperCase()}`;
  const barberShopPhone = process.env.WHATSAPP_PHONE || '51987111222';
  const appointmentLabel = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short',
  }).format(appointmentDate);
  const whatsappMsg = `¡Hola Sumaq Barber! Confirmo mi reserva ${bookingCode} a nombre de ${customer.firstName} ${customer.lastName}.\nServicio: ${service.name} (S/ ${service.price})\nFecha: ${appointmentLabel}.`;
  const whatsappUrl = `https://wa.me/${barberShopPhone}?text=${encodeURIComponent(whatsappMsg)}`;
  const { password: _password, ...customerSafe } = customer;

  return { appointment, user: customerSafe, sessionToken, bookingCode, whatsappUrl };
};

export const getAppointments = async (filters?: appointmentRepository.FindAppointmentsFilter) =>
  appointmentRepository.findAppointments(filters);

export const getMyAppointments = async (customerId: string) =>
  appointmentRepository.findAppointmentsByCustomer(customerId);

export const cancelAppointment = async (appointmentId: string, customerId?: string) =>
  appointmentRepository.cancelAppointment(appointmentId, customerId);

export const getBarberAppointments = async (
  userId: string,
  userRole: string,
  query: { barberId?: string; date?: string; startDate?: string; endDate?: string; status?: string }
) => {
  const effectiveBarberId = userRole === 'OWNER' || userRole === 'ADMIN' ? query.barberId : userId;
  return appointmentRepository.findBarberAppointments({ ...query, barberId: effectiveBarberId });
};

export const getBarberDailyStats = async (
  userId: string,
  userRole: string,
  query: { barberId?: string; date?: string }
) => {
  const effectiveBarberId = userRole === 'OWNER' || userRole === 'ADMIN' ? query.barberId : userId;
  return appointmentRepository.getBarberDailyStats(effectiveBarberId, query.date);
};

const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
};

export const updateAppointmentStatus = async (
  appointmentId: string,
  userId: string,
  userRole: string,
  status: AppointmentStatus,
  notes?: string
) => {
  const current = await appointmentRepository.findAppointmentStatus(appointmentId);
  if (!current) throw new HttpError(404, 'La cita no existe.');
  if (current.status !== status && !allowedTransitions[current.status].includes(status)) {
    throw new HttpError(409, `No se puede cambiar una cita ${current.status} a ${status}.`);
  }
  return appointmentRepository.updateAppointmentStatus(appointmentId, userId, status, userRole, notes);
};
