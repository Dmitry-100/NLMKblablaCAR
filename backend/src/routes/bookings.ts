import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============ VALIDATION SCHEMAS ============

const createBookingSchema = z.object({
  tripId: z.string().min(1, 'Укажите ID поездки')
});

// ============ ROUTES ============

/**
 * POST /api/bookings
 * Забронировать место в поездке
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tripId } = createBookingSchema.parse(req.body);
    
    // Получаем поездку
    const trip = await req.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: { status: 'confirmed' }
        }
      }
    });
    
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }
    
    if (trip.status !== 'active') {
      return res.status(400).json({ error: 'Поездка недоступна для бронирования' });
    }
    
    // Проверяем, не водитель ли это
    if (trip.driverId === req.userId) {
      return res.status(400).json({ error: 'Нельзя забронировать место в своей поездке' });
    }
    
    // Проверяем, не забронировано ли уже
    const existingBooking = await req.prisma.booking.findFirst({
      where: {
        tripId,
        passengerId: req.userId,
        status: { not: 'cancelled' }
      }
    });
    
    if (existingBooking) {
      return res.status(400).json({ error: 'Вы уже забронировали место в этой поездке' });
    }
    
    // Проверяем доступные места (макс 2 пассажира)
    const maxPassengers = 2; // Бизнес-логика: 2 пассажира + водитель
    const currentBookings = trip.bookings.length;
    
    if (currentBookings >= maxPassengers) {
      return res.status(400).json({ error: 'Нет свободных мест' });
    }
    
    // Создаём бронирование
    const booking = await req.prisma.booking.create({
      data: {
        tripId,
        passengerId: req.userId!,
        status: 'confirmed'
      },
      include: {
        trip: {
          include: { driver: true }
        },
        passenger: true
      }
    });
    
    // Обновляем счётчик мест
    await req.prisma.trip.update({
      where: { id: tripId },
      data: { seatsBooked: { increment: 1 } }
    });
    
    res.status(201).json({ 
      booking: formatBookingResponse(booking),
      message: 'Место успешно забронировано!'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create booking error:', error);
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
          include: { driver: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ bookings: bookings.map(formatBookingResponse) });
    
  } catch (error) {
    console.error('Get my bookings error:', error);
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
          include: { driver: true }
        },
        passenger: true
      }
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
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Ошибка получения бронирования' });
  }
});

/**
 * DELETE /api/bookings/:id
 * Отменить бронирование
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await req.prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { trip: true }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Бронирование не найдено' });
    }
    
    // Проверяем, что это пассажир или водитель
    if (booking.passengerId !== req.userId && booking.trip.driverId !== req.userId) {
      return res.status(403).json({ error: 'Нет прав на отмену этого бронирования' });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Бронирование уже отменено' });
    }
    
    // Отменяем бронирование
    await req.prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' }
    });
    
    // Уменьшаем счётчик мест
    await req.prisma.trip.update({
      where: { id: booking.tripId },
      data: { seatsBooked: { decrement: 1 } }
    });
    
    res.json({ success: true, message: 'Бронирование отменено' });
    
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Ошибка отмены бронирования' });
  }
});

// ============ HELPERS ============

function formatUserResponse(user: any) {
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
      ac: user.prefAc
    }
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
      ac: trip.prefAc
    },
    comment: trip.comment,
    tripGroupId: trip.tripGroupId,
    isReturn: trip.isReturn
  };
}

function formatBookingResponse(booking: any) {
  return {
    id: booking.id,
    tripId: booking.tripId,
    trip: booking.trip ? formatTripResponse(booking.trip) : null,
    passengerId: booking.passengerId,
    passenger: booking.passenger ? formatUserResponse(booking.passenger) : null,
    status: booking.status,
    createdAt: booking.createdAt
  };
}

export default router;
