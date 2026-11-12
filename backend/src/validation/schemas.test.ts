import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingSchema, registerSchema } from './schemas';

const validBooking = {
  customerName: 'Ana Quispe',
  customerPhone: '987 654 321',
  customerEmail: 'ana@example.com',
  password: 'una-clave-segura',
  serviceId: 'c9d9f8fc-6741-4e81-b0d8-46c4ba3cfb33',
  date: '2027-01-15T15:00:00-05:00',
};

test('booking contract accepts the frontend ISO payload', () => {
  assert.equal(bookingSchema.safeParse(validBooking).success, true);
});

test('booking contract rejects caller-controlled customer identities', () => {
  assert.equal(bookingSchema.safeParse({ ...validBooking, customerId: 'victim-id' }).success, false);
});

test('public registration rejects privileged roles', () => {
  const result = registerSchema.safeParse({
    email: 'owner@example.com',
    password: 'una-clave-segura',
    firstName: 'Owner',
    role: 'ADMIN',
  });
  assert.equal(result.success, false);
});
