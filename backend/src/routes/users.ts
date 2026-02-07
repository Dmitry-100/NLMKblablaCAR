import { createLogger } from '../utils/logger.js';
const log = createLogger('users');

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============ VALIDATION SCHEMAS ============

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  position: z.string().max(100).optional(),
  homeCity: z.enum(['Moscow', 'Lipetsk']).optional(),
  role: z.enum(['Driver', 'Passenger', 'Both']).optional(),
  defaultPreferences: z
    .object({
      music: z.enum(['Quiet', 'Normal', 'Loud']).optional(),
      smoking: z.boolean().optional(),
      pets: z.boolean().optional(),
      baggage: z.enum(['Hand', 'Medium', 'Suitcase']).optional(),
      conversation: z.enum(['Chatty', 'Quiet']).optional(),
      ac: z.boolean().optional(),
    })
    .optional(),
});

// ============ ROUTES ============

/**
 * GET /api/users/:id
 * Получить профиль пользователя
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user: formatUserResponse(user) });
  } catch (error) {
    log.error({ err: error }, 'Get user error:');
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

/**
 * PUT /api/users/:id
 * Обновить профиль пользователя (только свой)
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Проверяем, что пользователь обновляет свой профиль
    if (req.params.id !== req.userId) {
      return res.status(403).json({ error: 'Нельзя редактировать чужой профиль' });
    }

    const data = updateUserSchema.parse(req.body);

    // Формируем объект обновления
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.homeCity) updateData.homeCity = data.homeCity;
    if (data.role) updateData.role = data.role;

    // Обновляем preferences
    if (data.defaultPreferences) {
      const prefs = data.defaultPreferences;
      if (prefs.music !== undefined) updateData.prefMusic = prefs.music;
      if (prefs.smoking !== undefined) updateData.prefSmoking = prefs.smoking;
      if (prefs.pets !== undefined) updateData.prefPets = prefs.pets;
      if (prefs.baggage !== undefined) updateData.prefBaggage = prefs.baggage;
      if (prefs.conversation !== undefined) updateData.prefConversation = prefs.conversation;
      if (prefs.ac !== undefined) updateData.prefAc = prefs.ac;
    }

    const user = await req.prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ user: formatUserResponse(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Update user error:');
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

/**
 * GET /api/users/:id/trips
 * Получить поездки пользователя (как водителя)
 */
router.get('/:id/trips', async (req: Request, res: Response) => {
  try {
    const trips = await req.prisma.trip.findMany({
      where: { driverId: req.params.id },
      include: {
        driver: true,
        bookings: {
          include: { passenger: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ trips: trips.map(formatTripResponse) });
  } catch (error) {
    log.error({ err: error }, 'Get user trips error:');
    res.status(500).json({ error: 'Ошибка получения поездок' });
  }
});

/**
 * GET /api/users/:id/bookings
 * Получить бронирования пользователя (как пассажира)
 */
router.get('/:id/bookings', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Можно смотреть только свои бронирования
    if (req.params.id !== req.userId) {
      return res.status(403).json({ error: 'Нельзя смотреть чужие бронирования' });
    }

    const bookings = await req.prisma.booking.findMany({
      where: { passengerId: req.params.id },
      include: {
        trip: {
          include: { driver: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bookings: bookings.map(formatBookingResponse) });
  } catch (error) {
    log.error({ err: error }, 'Get user bookings error:');
    res.status(500).json({ error: 'Ошибка получения бронирований' });
  }
});

// ============ HELPERS ============

function formatUserResponse(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    phone: user.phone || '',
    bio: user.bio || '',
    position: user.position || '',
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

function formatTripResponse(trip: any) {
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

function formatBookingResponse(booking: any) {
  return {
    id: booking.id,
    tripId: booking.tripId,
    trip: booking.trip ? formatTripResponse(booking.trip) : null,
    passengerId: booking.passengerId,
    status: booking.status,
    createdAt: booking.createdAt,
  };
}

export default router;
