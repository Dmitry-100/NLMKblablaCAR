import { createLogger } from '../utils/logger.js';
const log = createLogger('bookings');

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import {
  UserBasic,
  TripWithDriver,
  BookingWithRelations,
  BookingWithTrip,
} from '../types/index.js';
import { notifyNewBooking, notifyBookingCancelled } from '../services/telegram.js';

// Union type for formatBookingResponse
type BookingForFormatting = BookingWithRelations | BookingWithTrip;

const router = Router();

// ============ VALIDATION SCHEMAS ============

const createBookingSchema = z.object({
  tripId: z.string().min(1, 'Укажите ID поездки'),
});

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ============ ROUTES ============

/**
 * POST /api/bookings
 * Забронировать место в поездке
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tripId } = createBookingSchema.parse(req.body);

    const booking = await req.prisma.$transaction(
      async tx => {
        const trip = await tx.trip.findUnique({
          where: { id: tripId },
        });

        if (!trip) {
          throw new ApiError(404, 'Поездка не найдена');
        }

        if (trip.status !== 'active') {
          throw new ApiError(400, 'Поездка недоступна для бронирования');
        }

        if (trip.driverId === req.userId) {
          throw new ApiError(400, 'Нельзя забронировать место в своей поездке');
        }

        const existingBooking = await tx.booking.findFirst({
          where: {
            tripId,
            passengerId: req.userId,
            status: { not: 'cancelled' },
          },
        });

        if (existingBooking) {
          throw new ApiError(400, 'Вы уже забронировали место в этой поездке');
        }

        const maxPassengers = Math.max(0, trip.seatsTotal - 1);
        if (trip.seatsBooked >= maxPassengers) {
          throw new ApiError(400, 'Нет свободных мест');
        }

        const createdBooking = await tx.booking.create({
          data: {
            tripId,
            passengerId: req.userId!,
            status: 'confirmed',
          },
        });

        const tripUpdate = await tx.trip.updateMany({
          where: {
            id: tripId,
            status: 'active',
            seatsBooked: trip.seatsBooked,
          },
          data: { seatsBooked: { increment: 1 } },
        });

        // Если строка не обновилась, кто-то уже занял место параллельно.
        if (tripUpdate.count === 0) {
          throw new ApiError(409, 'Место уже занято. Обновите список поездок и попробуйте снова');
        }

        return tx.booking.findUnique({
          where: { id: createdBooking.id },
          include: {
            trip: {
              include: { driver: true },
            },
            passenger: true,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    if (!booking) {
      throw new ApiError(500, 'Не удалось создать бронирование');
    }

    // Send notification to driver (async, don't wait)
    if (booking.trip.driver.telegramChatId) {
      notifyNewBooking(
        booking.trip.driver.telegramChatId,
        booking.passenger?.name || 'Пассажир',
        booking.trip.date,
        booking.trip.time,
        booking.trip.fromCity,
        booking.trip.toCity
      ).catch(err => log.error({ err }, 'Failed to send booking notification'));
    }

    res.status(201).json({
      booking: formatBookingResponse(booking),
      message: 'Место успешно забронировано!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    log.error({ err: error }, 'Create booking error:');
    res.status(500).json({ error: 'Ошибка бронирования' });
  }
});

/**
 * GET /api/bookings/my
 * Мои бронирования
 */
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bookings = await req.prisma.booking.findMany({
      where: { passengerId: req.userId },
      include: {
        trip: {
          include: { driver: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bookings: bookings.map(formatBookingResponse) });
  } catch (error) {
    log.error({ err: error }, 'Get my bookings error:');
    res.status(500).json({ error: 'Ошибка получения бронирований' });
  }
});

/**
 * GET /api/bookings/:id
 * Детали бронирования
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await req.prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        trip: {
          include: { driver: true },
        },
        passenger: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Бронирование не найдено' });
    }

    // Проверяем доступ (пассажир или водитель)
    if (booking.passengerId !== req.userId && booking.trip.driverId !== req.userId) {
      return res.status(403).json({ error: 'Нет доступа к этому бронированию' });
    }

    res.json({ booking: formatBookingResponse(booking) });
  } catch (error) {
    log.error({ err: error }, 'Get booking error:');
    res.status(500).json({ error: 'Ошибка получения бронирования' });
  }
});

/**
 * DELETE /api/bookings/:id
 * Отменить бронирование
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Get booking with full details for notification
    const bookingForNotification = await req.prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        trip: { include: { driver: true } },
        passenger: true,
      },
    });

    await req.prisma.$transaction(
      async tx => {
        const booking = await tx.booking.findUnique({
          where: { id: req.params.id },
          include: { trip: true },
        });

        if (!booking) {
          throw new ApiError(404, 'Бронирование не найдено');
        }

        if (booking.passengerId !== req.userId && booking.trip.driverId !== req.userId) {
          throw new ApiError(403, 'Нет прав на отмену этого бронирования');
        }

        if (booking.status === 'cancelled') {
          throw new ApiError(400, 'Бронирование уже отменено');
        }

        const bookingUpdate = await tx.booking.updateMany({
          where: {
            id: req.params.id,
            status: { not: 'cancelled' },
          },
          data: { status: 'cancelled' },
        });

        if (bookingUpdate.count === 0) {
          throw new ApiError(409, 'Бронирование уже было отменено');
        }

        await tx.trip.updateMany({
          where: {
            id: booking.tripId,
            seatsBooked: { gt: 0 },
          },
          data: { seatsBooked: { decrement: 1 } },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    // Send notification about cancellation
    if (bookingForNotification) {
      const cancelledBy =
        bookingForNotification.passengerId === req.userId ? 'passenger' : 'driver';
      const notifyUserId =
        cancelledBy === 'passenger'
          ? bookingForNotification.trip.driver.telegramChatId
          : bookingForNotification.passenger.telegramChatId;

      if (notifyUserId) {
        notifyBookingCancelled(
          notifyUserId,
          cancelledBy,
          bookingForNotification.trip.date,
          bookingForNotification.trip.fromCity,
          bookingForNotification.trip.toCity
        ).catch(err => log.error({ err }, 'Failed to send cancellation notification'));
      }
    }

    res.json({ success: true, message: 'Бронирование отменено' });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    log.error({ err: error }, 'Cancel booking error:');
    res.status(500).json({ error: 'Ошибка отмены бронирования' });
  }
});

// ============ HELPERS ============

function formatUserResponse(user: UserBasic) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    homeCity: user.homeCity,
    role: user.role,
    rating: user.rating,
    defaultPreferences: {
      music: user.prefMusic,
      smoking: user.prefSmoking,
      pets: user.prefPets,
      baggage: user.prefBaggage,
      conversation: user.prefConversation,
      ac: user.prefAc,
    },
  };
}

function formatTripResponse(trip: TripWithDriver) {
  return {
    id: trip.id,
    driverId: trip.driverId,
    driver: trip.driver ? formatUserResponse(trip.driver) : null,
    from: trip.fromCity,
    to: trip.toCity,
    date: trip.date,
    time: trip.time,
    pickupLocation: trip.pickupLocation,
    dropoffLocation: trip.dropoffLocation,
    seatsTotal: trip.seatsTotal,
    seatsBooked: trip.seatsBooked,
    preferences: {
      music: trip.prefMusic,
      smoking: trip.prefSmoking,
      pets: trip.prefPets,
      baggage: trip.prefBaggage,
      conversation: trip.prefConversation,
      ac: trip.prefAc,
    },
    comment: trip.comment,
    tripGroupId: trip.tripGroupId,
    isReturn: trip.isReturn,
  };
}

function formatBookingResponse(booking: BookingForFormatting) {
  const passenger = 'passenger' in booking ? booking.passenger : null;
  return {
    id: booking.id,
    tripId: booking.tripId,
    trip: booking.trip ? formatTripResponse(booking.trip) : null,
    passengerId: booking.passengerId,
    passenger: passenger ? formatUserResponse(passenger) : null,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

export default router;
