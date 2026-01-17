import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ============ VALIDATION SCHEMAS ============

const createTripSchema = z.object({
  from: z.enum(['Moscow', 'Lipetsk']),
  to: z.enum(['Moscow', 'Lipetsk']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Формат времени: HH:mm'),
  pickupLocation: z.string().min(1, 'Укажите место посадки'),
  dropoffLocation: z.string().min(1, 'Укажите место высадки'),
  seatsTotal: z.number().int().min(1).max(4).default(3),
  comment: z.string().optional().default(''),
  tripGroupId: z.string().optional(),
  isReturn: z.boolean().optional().default(false),
  preferences: z.object({
    music: z.enum(['Quiet', 'Normal', 'Loud']).optional(),
    smoking: z.boolean().optional(),
    pets: z.boolean().optional(),
    baggage: z.enum(['Hand', 'Medium', 'Suitcase']).optional(),
    conversation: z.enum(['Chatty', 'Quiet']).optional(),
    ac: z.boolean().optional()
  }).optional()
});

const updateTripSchema = createTripSchema.partial();

const querySchema = z.object({
  from: z.enum(['Moscow', 'Lipetsk']).optional(),
  to: z.enum(['Moscow', 'Lipetsk']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional()
});

// ============ ROUTES ============

/**
 * GET /api/trips
 * Получить список поездок с фильтрами
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);
    
    // Строим фильтры
    const where: any = {
      status: query.status || 'active'
    };
    
    if (query.from) where.fromCity = query.from;
    if (query.to) where.toCity = query.to;
    
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = query.dateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }
    
    const trips = await req.prisma.trip.findMany({
      where,
      include: {
        driver: true,
        bookings: {
          where: { status: 'confirmed' },
          include: { passenger: true }
        }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });
    
    res.json({ trips: trips.map((trip) => formatTripResponse(trip, req.userId)) });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Get trips error:', error);
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
          include: { passenger: true }
        }
      }
    });
    
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }
    
    res.json({ trip: formatTripResponse(trip, req.userId) });
    
  } catch (error) {
    console.error('Get trip error:', error);
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

    // Проверяем, что дата поездки не в прошлом
    const tripDate = new Date(data.date + 'T' + data.time);
    const now = new Date();
    if (tripDate < now) {
      return res.status(400).json({ error: 'Нельзя создать поездку в прошлом' });
    }

    // Получаем пользователя для копирования preferences
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId }
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
        prefAc: data.preferences?.ac ?? user.prefAc
      },
      include: {
        driver: true
      }
    });
    
    res.status(201).json({ trip: formatTripResponse(trip, req.userId) });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create trip error:', error);
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
      where: { id: req.params.id }
    });
    
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }
    
    if (trip.driverId !== req.userId) {
      return res.status(403).json({ error: 'Только водитель может редактировать поездку' });
    }
    
    const data = updateTripSchema.parse(req.body);
    
    // Формируем объект обновления
    const updateData: any = {};
    
    if (data.from) updateData.fromCity = data.from;
    if (data.to) updateData.toCity = data.to;
    if (data.date) updateData.date = data.date;
    if (data.time) updateData.time = data.time;
    if (data.pickupLocation) updateData.pickupLocation = data.pickupLocation;
    if (data.dropoffLocation) updateData.dropoffLocation = data.dropoffLocation;
    if (data.seatsTotal) updateData.seatsTotal = data.seatsTotal;
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
      include: { driver: true }
    });
    
    res.json({ trip: formatTripResponse(updatedTrip, req.userId) });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Update trip error:', error);
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
      where: { id: req.params.id }
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
      data: { status: 'cancelled' }
    });
    
    // Отменяем все бронирования
    await req.prisma.booking.updateMany({
      where: { tripId: req.params.id },
      data: { status: 'cancelled' }
    });
    
    res.json({ success: true, message: 'Поездка отменена' });
    
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ error: 'Ошибка отмены поездки' });
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
      ac: user.prefAc
    }
  };
}

function formatTripResponse(trip: any, currentUserId?: string) {
  const myBooking = currentUserId
    ? trip.bookings?.find((booking: any) => booking.passengerId === currentUserId)
    : undefined;

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
    isReturn: trip.isReturn,
    status: trip.status,
    passengers: trip.bookings?.map((b: any) => formatUserResponse(b.passenger)) || [],
    myBookingId: myBooking?.id
  };
}

export default router;
