import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { createLogger } from '../utils/logger.js';
import { notifyMatchingTrip, notifyTripCancelled } from '../services/telegram.js';
import {
  type BaggagePref,
  type City,
  type ConversationPref,
  createTripSchema,
  createTripResponseSchema,
  getTripResponseSchema,
  getTripsResponseSchema,
  type MusicPref,
  type Role,
  type TripStatus,
  tripQuerySchema,
  type TripResponseDto,
  updateTripResponseSchema,
  updateTripSchema,
} from '../contracts/trips.js';

const router = Router();
const log = createLogger('trips');

function ensureLocationCoordsPair(
  lat: number | undefined,
  lng: number | undefined,
  fieldLabel: string
) {
  if ((lat === undefined) !== (lng === undefined)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel}: нужно передать и lat, и lng`,
        path: [],
      },
    ]);
  }
}

function ensureTripDateIsNotPast(date: string, time: string) {
  const tripDate = new Date(`${date}T${time}`);
  const now = new Date();

  if (tripDate.getTime() < now.getTime()) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: 'Нельзя создать или обновить поездку в прошлом',
        path: [],
      },
    ]);
  }
}

// ============ ROUTES ============

/**
 * GET /api/trips
 * Получить список поездок с фильтрами
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const query = tripQuerySchema.parse(req.query);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    // Строим фильтры
    const where: Prisma.TripWhereInput = {};

    // Логика статусов:
    // - Если указан конкретный status — фильтруем по нему
    // - Если includeArchived=true — показываем active + archived
    // - Иначе по умолчанию только active
    if (query.status) {
      where.status = query.status;
    } else if (query.includeArchived === 'true') {
      where.status = { in: ['active', 'archived'] };
    } else {
      where.status = 'active';
    }

    if (query.from) where.fromCity = query.from;
    if (query.to) where.toCity = query.to;

    let showOnlyFuture = false;
    if (!query.status && query.includeArchived !== 'true') {
      showOnlyFuture = true;
    }
    if (query.status === 'active') {
      showOnlyFuture = true;
    }
    const minDate = showOnlyFuture ? today : undefined;
    const effectiveDateFrom =
      query.dateFrom && minDate
        ? query.dateFrom > minDate
          ? query.dateFrom
          : minDate
        : query.dateFrom || minDate;

    if (effectiveDateFrom || query.dateTo) {
      where.date = {};
      if (effectiveDateFrom) where.date.gte = effectiveDateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }

    const trips = await req.prisma.trip.findMany({
      where,
      include: {
        driver: true,
        bookings: {
          where: { status: 'confirmed' },
          include: { passenger: true },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    const response = getTripsResponseSchema.parse({
      trips: trips.map(trip => formatTripResponse(trip, req.userId)),
    });

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Get trips error');
    res.status(500).json({ error: 'Ошибка получения поездок' });
  }
});

/**
 * GET /api/trips/:id
 * Получить детали поездки
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const trip = await req.prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        driver: true,
        bookings: {
          where: { status: 'confirmed' },
          include: { passenger: true },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    const response = getTripResponseSchema.parse({
      trip: formatTripResponse(trip, req.userId),
    });

    res.json(response);
  } catch (error) {
    log.error({ err: error }, 'Get trip error');
    res.status(500).json({ error: 'Ошибка получения поездки' });
  }
});

/**
 * POST /api/trips
 * Создать новую поездку
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createTripSchema.parse(req.body);

    if (data.from === data.to) {
      return res.status(400).json({ error: 'Город отправления и назначения должны отличаться' });
    }

    ensureLocationCoordsPair(data.pickupLat, data.pickupLng, 'pickup');
    ensureLocationCoordsPair(data.dropoffLat, data.dropoffLng, 'dropoff');
    ensureTripDateIsNotPast(data.date, data.time);

    // Получаем пользователя для копирования preferences
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Создаём поездку
    const trip = await req.prisma.trip.create({
      data: {
        driverId: req.userId!,
        fromCity: data.from,
        toCity: data.to,
        date: data.date,
        time: data.time,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        // Coordinates from Yandex Maps
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        dropoffLat: data.dropoffLat,
        dropoffLng: data.dropoffLng,
        seatsTotal: data.seatsTotal,
        seatsBooked: 0,
        comment: data.comment || '',
        tripGroupId: data.tripGroupId,
        isReturn: data.isReturn,
        // Preferences: из запроса или из профиля пользователя
        prefMusic: data.preferences?.music || user.prefMusic,
        prefSmoking: data.preferences?.smoking ?? user.prefSmoking,
        prefPets: data.preferences?.pets ?? user.prefPets,
        prefBaggage: data.preferences?.baggage || user.prefBaggage,
        prefConversation: data.preferences?.conversation || user.prefConversation,
        prefAc: data.preferences?.ac ?? user.prefAc,
      },
      include: {
        driver: true,
      },
    });

    // Notify passengers with matching requests (async, don't wait)
    notifyMatchingPassengers(req.prisma, trip).catch(err =>
      log.error({ err }, 'Failed to notify matching passengers')
    );

    const response = createTripResponseSchema.parse({
      trip: formatTripResponse(trip, req.userId),
    });

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Create trip error');
    res.status(500).json({ error: 'Ошибка создания поездки' });
  }
});

/**
 * PUT /api/trips/:id
 * Обновить поездку (только водитель)
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const trip = await req.prisma.trip.findUnique({
      where: { id: req.params.id },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    if (trip.driverId !== req.userId) {
      return res.status(403).json({ error: 'Только водитель может редактировать поездку' });
    }

    const data = updateTripSchema.parse(req.body);

    const nextFrom = data.from ?? trip.fromCity;
    const nextTo = data.to ?? trip.toCity;
    const nextDate = data.date ?? trip.date;
    const nextTime = data.time ?? trip.time;
    const nextPickupLat = data.pickupLat ?? trip.pickupLat ?? undefined;
    const nextPickupLng = data.pickupLng ?? trip.pickupLng ?? undefined;
    const nextDropoffLat = data.dropoffLat ?? trip.dropoffLat ?? undefined;
    const nextDropoffLng = data.dropoffLng ?? trip.dropoffLng ?? undefined;

    if (nextFrom === nextTo) {
      return res.status(400).json({ error: 'Город отправления и назначения должны отличаться' });
    }

    ensureLocationCoordsPair(nextPickupLat, nextPickupLng, 'pickup');
    ensureLocationCoordsPair(nextDropoffLat, nextDropoffLng, 'dropoff');
    ensureTripDateIsNotPast(nextDate, nextTime);

    if (data.seatsTotal !== undefined && data.seatsTotal < trip.seatsBooked + 1) {
      return res.status(400).json({
        error: `Нельзя установить ${data.seatsTotal} мест(а): уже забронировано ${trip.seatsBooked}. Нужно минимум ${trip.seatsBooked + 1} (включая водителя)`,
      });
    }

    // Формируем объект обновления
    const updateData: Prisma.TripUpdateInput = {};

    if (data.from) updateData.fromCity = data.from;
    if (data.to) updateData.toCity = data.to;
    if (data.date) updateData.date = data.date;
    if (data.time) updateData.time = data.time;
    if (data.pickupLocation) updateData.pickupLocation = data.pickupLocation;
    if (data.dropoffLocation) updateData.dropoffLocation = data.dropoffLocation;
    // Coordinates from Yandex Maps (allow setting to null)
    if (data.pickupLat !== undefined) updateData.pickupLat = data.pickupLat;
    if (data.pickupLng !== undefined) updateData.pickupLng = data.pickupLng;
    if (data.dropoffLat !== undefined) updateData.dropoffLat = data.dropoffLat;
    if (data.dropoffLng !== undefined) updateData.dropoffLng = data.dropoffLng;
    if (data.seatsTotal !== undefined) updateData.seatsTotal = data.seatsTotal;
    if (data.comment !== undefined) updateData.comment = data.comment;

    if (data.preferences) {
      const prefs = data.preferences;
      if (prefs.music) updateData.prefMusic = prefs.music;
      if (prefs.smoking !== undefined) updateData.prefSmoking = prefs.smoking;
      if (prefs.pets !== undefined) updateData.prefPets = prefs.pets;
      if (prefs.baggage) updateData.prefBaggage = prefs.baggage;
      if (prefs.conversation) updateData.prefConversation = prefs.conversation;
      if (prefs.ac !== undefined) updateData.prefAc = prefs.ac;
    }

    const updatedTrip = await req.prisma.trip.update({
      where: { id: req.params.id },
      data: updateData,
      include: { driver: true },
    });

    const response = updateTripResponseSchema.parse({
      trip: formatTripResponse(updatedTrip, req.userId),
    });

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Update trip error');
    res.status(500).json({ error: 'Ошибка обновления поездки' });
  }
});

/**
 * DELETE /api/trips/:id
 * Отменить поездку (только водитель)
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const trip = await req.prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        driver: true,
        bookings: {
          where: { status: 'confirmed' },
          include: { passenger: true },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    if (trip.driverId !== req.userId) {
      return res.status(403).json({ error: 'Только водитель может отменить поездку' });
    }

    // Мягкое удаление - меняем статус на cancelled
    await req.prisma.trip.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    // Отменяем все бронирования
    await req.prisma.booking.updateMany({
      where: { tripId: req.params.id },
      data: { status: 'cancelled' },
    });

    // Notify passengers about cancellation (async, don't wait)
    for (const booking of trip.bookings) {
      if (booking.passenger.telegramChatId) {
        notifyTripCancelled(
          booking.passenger.telegramChatId,
          trip.driver?.name || 'Водитель',
          trip.date,
          trip.fromCity,
          trip.toCity
        ).catch(err => log.error({ err }, 'Failed to send trip cancellation notification'));
      }
    }

    res.json({ success: true, message: 'Поездка отменена' });
  } catch (error) {
    log.error({ err: error }, 'Delete trip error');
    res.status(500).json({ error: 'Ошибка отмены поездки' });
  }
});

// ============ HELPERS ============

import { User, Trip, Booking, PrismaClient } from '@prisma/client';

/**
 * Notify passengers who have matching requests for this new trip
 */
async function notifyMatchingPassengers(prisma: PrismaClient, trip: Trip & { driver?: User }) {
  // Find matching pending requests
  const matchingRequests = await prisma.passengerRequest.findMany({
    where: {
      status: 'pending',
      fromCity: trip.fromCity,
      toCity: trip.toCity,
      dateFrom: { lte: trip.date },
      dateTo: { gte: trip.date },
      requesterId: { not: trip.driverId }, // Exclude driver's own requests
    },
    include: {
      requester: true,
    },
  });

  // Notify each requester
  for (const request of matchingRequests) {
    if (request.requester.telegramChatId) {
      await notifyMatchingTrip(
        request.requester.telegramChatId,
        trip.driver?.name || 'Водитель',
        trip.date,
        trip.time,
        trip.fromCity,
        trip.toCity
      );
    }
  }

  if (matchingRequests.length > 0) {
    log.info({ tripId: trip.id, count: matchingRequests.length }, 'Notified matching passengers');
  }
}

type UserWithPrefs = User;
type TripWithBookings = Trip & {
  driver?: User;
  bookings?: (Booking & { passenger: User })[];
};

function formatUserResponse(user: UserWithPrefs) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    phone: user.phone || '',
    bio: user.bio || '',
    position: user.position || '',
    homeCity: user.homeCity as City,
    role: user.role as Role,
    rating: user.rating,
    defaultPreferences: {
      music: user.prefMusic as MusicPref,
      smoking: user.prefSmoking,
      pets: user.prefPets,
      baggage: user.prefBaggage as BaggagePref,
      conversation: user.prefConversation as ConversationPref,
      ac: user.prefAc,
    },
  };
}

function formatTripResponse(trip: TripWithBookings, currentUserId?: string): TripResponseDto {
  const myBooking = currentUserId
    ? trip.bookings?.find(booking => booking.passengerId === currentUserId)
    : undefined;

  return {
    id: trip.id,
    driverId: trip.driverId,
    driver: trip.driver ? formatUserResponse(trip.driver) : null,
    from: trip.fromCity as City,
    to: trip.toCity as City,
    date: trip.date,
    time: trip.time,
    pickupLocation: trip.pickupLocation,
    dropoffLocation: trip.dropoffLocation,
    // Coordinates from Yandex Maps
    pickupLat: trip.pickupLat,
    pickupLng: trip.pickupLng,
    dropoffLat: trip.dropoffLat,
    dropoffLng: trip.dropoffLng,
    seatsTotal: trip.seatsTotal,
    seatsBooked: trip.seatsBooked,
    preferences: {
      music: trip.prefMusic as MusicPref,
      smoking: trip.prefSmoking,
      pets: trip.prefPets,
      baggage: trip.prefBaggage as BaggagePref,
      conversation: trip.prefConversation as ConversationPref,
      ac: trip.prefAc,
    },
    comment: trip.comment,
    tripGroupId: trip.tripGroupId,
    isReturn: trip.isReturn,
    status: trip.status as TripStatus,
    passengers: trip.bookings?.map(b => formatUserResponse(b.passenger)) || [],
    myBookingId: myBooking?.id,
  };
}

export default router;
