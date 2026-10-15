import * as appointmentRepository from '../repositories/appointmentRepository';
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import * as serviceService from './serviceService';
import * as authService from './authService';

export interface PublicBookingInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  password?: string;
  customerId?: string;
  serviceId: string;
  barberId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (e.g., "10:30")
  notes?: string;
}

export const createPublicAppointment = async (input: PublicBookingInput) => {
  const { customerName, customerPhone, customerEmail, password, customerId, serviceId, date, time, notes } = input;

  if (!customerName || !customerPhone || !serviceId || !date || !time) {
    throw new Error('Por favor completa todos los campos requeridos (nombre, teléfono, servicio, fecha y hora).');
  }

  // Combine date and time in local time (avoiding UTC timezone backward shift)
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = date.includes('-')
    ? date.split('-').map(Number)
    : date.split('/').map(Number);

  const appointmentDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (isNaN(appointmentDate.getTime())) {
    throw new Error('La fecha u hora seleccionada no es válida.');
  }

  // Allow today and future dates (prevent past days)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const selectedDay = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (selectedDay < startOfToday) {
    throw new Error('No puedes agendar una cita en una fecha pasada.');
  }

  // Handle Barber assignment using memory cache
  const barbers = await serviceService.getBarbers();

  if (barbers.length === 0) {
    throw new Error('No hay barberos disponibles en el sistema.');
  }

  const targetBarberId: string = input.barberId && input.barberId !== 'any' ? input.barberId : barbers[0].id;

  // Clean customer credentials
  const cleanPhone = customerPhone.trim();
  const cleanEmail = customerEmail?.trim() || `${cleanPhone.replace(/\D/g, '') || Date.now()}@reserva.sumaqbarber.pe`;

  // Service verification
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    throw new Error('El servicio seleccionado no existe.');
  }

  // Customer lookup: si hay @ buscar por email unique; si no, por phone indexado (no OR ciego)
  let existingCustomer = null;
  if (customerId) {
    existingCustomer = await prisma.user.findUnique({ where: { id: customerId } });
  } else if (customerEmail && customerEmail.includes('@')) {
    existingCustomer = await prisma.user.findUnique({
      where: { email: cleanEmail.toLowerCase() },
    });
    if (!existingCustomer && cleanPhone) {
      existingCustomer = await prisma.user.findFirst({ where: { phone: cleanPhone } });
    }
  } else if (cleanPhone) {
    existingCustomer = await prisma.user.findFirst({ where: { phone: cleanPhone } });
  }

  // Customer handling & Account Registration
  let customer = existingCustomer;
  let userToken: string | null = null;

  if (!customer) {
    // New user registration
    const nameParts = customerName.trim().split(' ');
    const firstName = nameParts[0] || customerName;
    const lastName = nameParts.slice(1).join(' ') || 'Cliente';
    const rawPassword = password && password.trim().length >= 6 ? password.trim() : `Sumaq_${Date.now()}`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    customer = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone: cleanPhone,
        email: cleanEmail,
        password: hashedPassword,
        role: Role.CUSTOMER,
      },
    });

    userToken = authService.generateToken(customer.id, customer.role);
  } else {
    // Existing customer: If password provided, verify it
    if (password && password.trim()) {
      const isMatch = await bcrypt.compare(password.trim(), customer.password);
      if (!isMatch) {
        throw new Error('Ya existe una cuenta con este correo/teléfono. La contraseña ingresada es incorrecta.');
      }
      userToken = authService.generateToken(customer.id, customer.role);
    } else {
      userToken = authService.generateToken(customer.id, customer.role);
    }

    if (!customer.phone && cleanPhone) {
      await prisma.user.update({
        where: { id: customer.id },
        data: { phone: cleanPhone },
      });
    }
  }

  // Create the appointment atomically in a $transaction (check slot conflict + insert)
  const appointment = await appointmentRepository.createAppointmentWithTransaction({
    customerId: customer.id,
    barberId: targetBarberId,
    serviceId,
    date: appointmentDate,
    durationMinutes: service.duration,
    notes: notes?.trim() || undefined,
  });

  // Generate Booking Code & WhatsApp Confirmation URL
  const bookingCode = `SB-${appointment.id.slice(0, 6).toUpperCase()}`;
  const barberShopPhone = process.env.WHATSAPP_PHONE || '51987111222';
  const whatsappMsg = `¡Hola Sumaq Barber! 👋 Confirmo mi reserva ${bookingCode} a nombre de ${customer.firstName} ${customer.lastName}.\n✂️ Servicio: ${service.name} (S/ ${service.price})\n📅 Fecha: ${date}\n⏰ Hora: ${time} hrs.\n¡Quedo a la espera de su confirmación!`;
  const whatsappUrl = `https://wa.me/${barberShopPhone}?text=${encodeURIComponent(whatsappMsg)}`;

  const { password: _, ...customerSafe } = customer;

  return {
    appointment,
    user: customerSafe,
    token: userToken,
    bookingCode,
    whatsappUrl,
  };
};

export const getAppointments = async (filters?: appointmentRepository.FindAppointmentsFilter) => {
  return appointmentRepository.findAppointments(filters);
};

export const getMyAppointments = async (customerId: string) => {
  return appointmentRepository.findAppointmentsByCustomer(customerId);
};

export const cancelAppointment = async (appointmentId: string, customerId?: string) => {
  return appointmentRepository.cancelAppointment(appointmentId, customerId);
};

