import { Request, Response } from 'express';
import * as appointmentService from '../services/appointmentService';

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointment = await appointmentService.createPublicAppointment(req.body);
    res.status(201).json({
      success: true,
      message: '¡Cita reservada con éxito!',
      data: appointment,
    });
  } catch (error: any) {
    console.error('Error creating appointment:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al procesar la reserva',
    });
  }
};

export const getAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, limit, page, barberId, status } = req.query;

    const appointments = await appointmentService.getAppointments({
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      limit: limit ? Number(limit) : 50,
      page: page ? Number(page) : 1,
      barberId: barberId ? String(barberId) : undefined,
      status: status ? String(status) : undefined,
    });

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    console.error('Error fetching appointments:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener citas',
    });
  }
};

export const getMyAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const appointments = await appointmentService.getMyAppointments(userId);
    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    console.error('Error fetching my appointments:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al obtener tus citas',
    });
  }
};

export const cancelAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const id = String(req.params.id);
    const appointment = await appointmentService.cancelAppointment(id, userId);
    res.status(200).json({
      success: true,
      message: 'Cita cancelada con éxito',
      data: appointment,
    });
  } catch (error: any) {
    console.error('Error canceling appointment:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al cancelar la cita',
    });
  }
};

export const getBarberAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { barberId, date, startDate, endDate, status } = req.query;

    const appointments = await appointmentService.getBarberAppointments(
      user.userId,
      user.role,
      {
        barberId: barberId ? String(barberId) : undefined,
        date: date ? String(date) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        status: status ? String(status) : undefined,
      }
    );

    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    console.error('Error fetching barber appointments:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al obtener la agenda del barbero',
    });
  }
};

export const getBarberStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { barberId, date } = req.query;

    const stats = await appointmentService.getBarberDailyStats(
      user.userId,
      user.role,
      {
        barberId: barberId ? String(barberId) : undefined,
        date: date ? String(date) : undefined,
      }
    );

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching barber stats:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al obtener estadísticas del barbero',
    });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const id = String(req.params.id);
    const { status, notes } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'El estado es requerido (PENDING, CONFIRMED, COMPLETED, CANCELED)',
      });
      return;
    }

    const updated = await appointmentService.updateAppointmentStatus(
      id,
      user.userId,
      user.role,
      status,
      notes
    );

    res.status(200).json({
      success: true,
      message: `Cita actualizada a ${status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating appointment status:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al actualizar el estado de la cita',
    });
  }
};

