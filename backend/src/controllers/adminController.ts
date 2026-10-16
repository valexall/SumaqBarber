import { Request, Response } from 'express';
import * as adminService from '../services/adminService';

export const getBarbers = async (req: Request, res: Response): Promise<void> => {
  try {
    const barbers = await adminService.listBarbers();
    res.status(200).json({ success: true, data: barbers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error al obtener barberos' });
  }
};

export const createBarber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, phone, password, bio, experience } = req.body;
    if (!firstName || !lastName || !email) {
      res.status(400).json({ success: false, message: 'Nombre, apellido y correo son requeridos.' });
      return;
    }

    const newBarber = await adminService.createBarber({
      firstName,
      lastName,
      email,
      phone,
      password,
      bio,
      experience: experience ? Number(experience) : undefined,
    });

    res.status(201).json({ success: true, data: newBarber, message: 'Barbero registrado exitosamente.' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Error al registrar barbero.' });
  }
};

export const updateBarber = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updated = await adminService.updateBarber(id, req.body);
    res.status(200).json({ success: true, data: updated, message: 'Barbero actualizado correctamente.' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Error al actualizar barbero.' });
  }
};

export const deleteBarber = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const result = await adminService.deleteBarber(id);
    res.status(200).json({ success: true, message: result.message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Error al eliminar barbero.' });
  }
};

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await adminService.listCustomers();
    res.status(200).json({ success: true, data: customers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error al obtener directorio de clientes.' });
  }
};
