import { Request, Response } from 'express';
import * as serviceService from '../services/serviceService';

export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const services = await serviceService.getServices();
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json({ success: true, data: services });
  } catch (error: any) {
    console.error('Error in getServices:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener servicios' });
  }
};

export const getBarbers = async (req: Request, res: Response): Promise<void> => {
  try {
    const barbers = await serviceService.getBarbers();
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json({ success: true, data: barbers });
  } catch (error: any) {
    console.error('Error in getBarbers:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener barberos' });
  }
};
