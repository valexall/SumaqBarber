import prisma from '../config/prisma';
import { Role } from '@prisma/client';

let cachedServices: any[] | null = null;
let lastServicesFetch = 0;
let cachedBarbers: any[] | null = null;
let lastBarbersFetch = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

export const getServices = async () => {
  const now = Date.now();
  if (cachedServices && now - lastServicesFetch < CACHE_TTL_MS) {
    return cachedServices;
  }

  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { price: 'asc' },
  });

  cachedServices = services;
  lastServicesFetch = now;
  return services;
};

export const getBarbers = async () => {
  const now = Date.now();
  if (cachedBarbers && now - lastBarbersFetch < CACHE_TTL_MS) {
    return cachedBarbers;
  }

  const barbers = await prisma.user.findMany({
    where: { role: Role.BARBER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      barberProfile: true,
    },
  });

  cachedBarbers = barbers;
  lastBarbersFetch = now;
  return barbers;
};

