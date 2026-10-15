import prisma from '../config/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

export const generateToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '14d' });
};

export const register = async (data: {
  email: string;
  password?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role?: Role;
}) => {
  const { email, password, firstName, lastName, phone, role } = data;

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingByEmail) {
    throw new Error('Ya existe una cuenta con este correo electrónico. Por favor inicia sesión.');
  }

  if (phone) {
    const existingByPhone = await prisma.user.findFirst({
      where: { phone },
    });
    if (existingByPhone) {
      throw new Error('Ya existe una cuenta con este teléfono. Por favor inicia sesión.');
    }
  }

  const hashedPassword = await bcrypt.hash(password || `Sumaq_${Date.now()}`, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName: lastName || 'Cliente',
      phone: phone || null,
      role: role || Role.CUSTOMER,
    },
  });

  const token = generateToken(user.id, user.role);
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

export const login = async (data: { email?: string; credential?: string; password: string }) => {
  const { password } = data;
  const credential = (data.email || data.credential || '').trim();

  if (!credential || !password) {
    throw new Error('Por favor ingresa tu correo/teléfono y contraseña.');
  }

  // Si hay @ buscar por email unique; si no, por phone indexado (no OR ciego)
  const isEmail = credential.includes('@');
  const user = isEmail
    ? await prisma.user.findUnique({
        where: { email: credential.toLowerCase() },
      })
    : await prisma.user.findFirst({
        where: { phone: credential },
      });

  if (!user) {
    throw new Error('No se encontró una cuenta con ese correo o teléfono.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Contraseña incorrecta.');
  }

  const token = generateToken(user.id, user.role);
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return user;
};

export const updateProfile = async (
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string }
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName ? { firstName: data.firstName.trim() } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
};

