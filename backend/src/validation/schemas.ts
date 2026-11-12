import { z } from 'zod';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const phone = z.string().trim().min(7).max(24).regex(/^[+\d][\d\s()-]+$/);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
  firstName: trimmed(2, 80),
  lastName: trimmed(1, 80).optional(),
  phone: phone.optional(),
}).strict();

export const loginSchema = z.object({
  credential: trimmed(3, 254),
  password: z.string().min(1).max(72),
}).strict();

export const profileSchema = z.object({
  firstName: trimmed(2, 80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: phone.or(z.literal('')).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'No hay cambios para guardar.');

export const bookingSchema = z.object({
  customerName: trimmed(2, 160),
  customerPhone: phone,
  customerEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  password: z.string().min(8).max(72).optional(),
  serviceId: z.string().uuid(),
  barberId: z.string().uuid().optional(),
  date: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(500).optional(),
}).strict();

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD.'),
  serviceId: z.string().uuid(),
  barberId: z.string().uuid().optional(),
}).strict();

export const appointmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']),
  notes: z.string().trim().max(500).optional(),
}).strict();

export const barberSchema = z.object({
  firstName: trimmed(2, 80),
  lastName: trimmed(1, 80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: phone.optional(),
  password: z.string().min(12).max(72),
  bio: z.string().trim().max(500).optional(),
  experience: z.coerce.number().int().min(0).max(80).optional(),
}).strict();

export const updateBarberSchema = barberSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'No hay cambios para guardar.'
);

export type BookingInput = z.infer<typeof bookingSchema>;
