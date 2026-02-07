import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { createLogger } from '../utils/logger.js';
import { UserBasic, RequestWithRelations, RequestWithRequester } from '../types/index.js';

// Union type for formatRequestResponse
type RequestForFormatting = RequestWithRelations | RequestWithRequester;

const router = Router();
const log = createLogger('requests');

// ============ VALIDATION SCHEMAS ============

const createRequestSchema = z
  .object({
    from: z.enum(['Moscow', 'Lipetsk']),
    to: z.enum(['Moscow', 'Lipetsk']),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
    timePreferred: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Формат времени: HH:mm')
      .optional(),
    passengersCount: z.number().int().min(1).max(3).default(1),
    comment: z.string().max(500).optional().default(''),
    preferences: z
      .object({
        music: z.enum(['Quiet', 'Normal', 'Loud']).optional(),
        smoking: z.boolean().optional(),
        pets: z.boolean().optional(),
        baggage: z.enum(['Hand', 'Medium', 'Suitcase']).optional(),
        conversation: z.enum(['Chatty', 'Quiet']).optional(),
        ac: z.boolean().optional(),
      })
      .optional(),
  })
  .refine(data => data.from !== data.to, {
    message: 'Города отправления и назначения должны отличаться',
  })
  .refine(data => data.dateFrom <= data.dateTo, {
    message: 'Дата "от" должна быть не позже даты "до"',
  });

const updateRequestSchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  timePreferred: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  passengersCount: z.number().int().min(1).max(3).optional(),
  comment: z.string().max(500).optional(),
  preferences: z
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

const querySchema = z.object({
  from: z.enum(['Moscow', 'Lipetsk']).optional(),
  to: z.enum(['Moscow', 'Lipetsk']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['pending', 'fulfilled', 'cancelled', 'expired']).optional(),
});

const matchingQuerySchema = z.object({
  from: z.enum(['Moscow', 'Lipetsk']),
  to: z.enum(['Moscow', 'Lipetsk']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seatsAvailable: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
});

// ============ ROUTES ============

/**
 * GET /api/requests
 * Получить список заявок (для водителей)
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const query = querySchema.parse(req.query);

    const where: Prisma.PassengerRequestWhereInput = {};

    // По умолчанию показываем только pending
    where.status = query.status || 'pending';

    if (query.from) where.fromCity = query.from;
    if (query.to) where.toCity = query.to;

    // Фильтр по датам: заявка актуальна если диапазон пересекается
    if (query.dateFrom || query.dateTo) {
      if (query.dateFrom) {
        where.dateTo = { gte: query.dateFrom };
      }
      if (query.dateTo) {
        where.dateFrom = { lte: query.dateTo };
      }
    }

    const requests = await req.prisma.passengerRequest.findMany({
      where,
      include: {
        requester: true,
        linkedTrip: {
          include: { driver: true },
        },
      },
      orderBy: [{ dateFrom: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ requests: requests.map(r => formatRequestResponse(r)) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Get requests error');
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

/**
 * GET /api/requests/my
 * Получить мои заявки
 */
router.get('/my', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requests = await req.prisma.passengerRequest.findMany({
      where: { requesterId: req.userId },
      include: {
        requester: true,
        linkedTrip: {
          include: { driver: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests: requests.map(r => formatRequestResponse(r)) });
  } catch (error) {
    log.error({ err: error }, 'Get my requests error');
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

/**
 * GET /api/requests/stats
 * Статистика заявок по маршрутам
 */
router.get('/stats', optionalAuth, async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [moscowToLipetsk, lipetskToMoscow] = await Promise.all([
      req.prisma.passengerRequest.count({
        where: {
          status: 'pending',
          fromCity: 'Moscow',
          toCity: 'Lipetsk',
          dateTo: { gte: today },
        },
      }),
      req.prisma.passengerRequest.count({
        where: {
          status: 'pending',
          fromCity: 'Lipetsk',
          toCity: 'Moscow',
          dateTo: { gte: today },
        },
      }),
    ]);

    res.json({
      stats: {
        moscowToLipetsk,
        lipetskToMoscow,
        total: moscowToLipetsk + lipetskToMoscow,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Get request stats error');
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

/**
 * GET /api/requests/matching
 * Получить заявки, подходящие под поездку
 */
router.get('/matching', authMiddleware, async (req: Request, res: Response) => {
  try {
    const query = matchingQuerySchema.parse(req.query);

    const requests = await req.prisma.passengerRequest.findMany({
      where: {
        status: 'pending',
        fromCity: query.from,
        toCity: query.to,
        dateFrom: { lte: query.date },
        dateTo: { gte: query.date },
        // Исключаем свои заявки
        requesterId: { not: req.userId },
      },
      include: {
        requester: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Фильтруем по количеству мест если указано
    const filteredRequests = query.seatsAvailable
      ? requests.filter(r => r.passengersCount <= query.seatsAvailable!)
      : requests;

    res.json({ requests: filteredRequests.map(r => formatRequestResponse(r)) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Get matching requests error');
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

/**
 * GET /api/requests/:id
 * Получить детали заявки
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const request = await req.prisma.passengerRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requester: true,
        linkedTrip: {
          include: { driver: true },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    res.json({ request: formatRequestResponse(request) });
  } catch (error) {
    log.error({ err: error }, 'Get request error');
    res.status(500).json({ error: 'Ошибка получения заявки' });
  }
});

/**
 * POST /api/requests
 * Создать новую заявку
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createRequestSchema.parse(req.body);

    // Проверяем что dateFrom не в прошлом
    const today = new Date().toISOString().split('T')[0];
    if (data.dateFrom < today) {
      return res.status(400).json({ error: 'Дата начала не может быть в прошлом' });
    }

    // Получаем пользователя для preferences
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const request = await req.prisma.passengerRequest.create({
      data: {
        requesterId: req.userId!,
        fromCity: data.from,
        toCity: data.to,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
        timePreferred: data.timePreferred,
        passengersCount: data.passengersCount,
        comment: data.comment || '',
        // Preferences: из запроса или из профиля
        prefMusic: data.preferences?.music || user.prefMusic,
        prefSmoking: data.preferences?.smoking ?? user.prefSmoking,
        prefPets: data.preferences?.pets ?? user.prefPets,
        prefBaggage: data.preferences?.baggage || user.prefBaggage,
        prefConversation: data.preferences?.conversation || user.prefConversation,
        prefAc: data.preferences?.ac ?? user.prefAc,
      },
      include: {
        requester: true,
      },
    });

    res.status(201).json({ request: formatRequestResponse(request) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Create request error');
    res.status(500).json({ error: 'Ошибка создания заявки' });
  }
});

/**
 * PUT /api/requests/:id
 * Обновить заявку (только владелец, только pending)
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const request = await req.prisma.passengerRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (request.requesterId !== req.userId) {
      return res.status(403).json({ error: 'Только автор может редактировать заявку' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Можно редактировать только активные заявки' });
    }

    const data = updateRequestSchema.parse(req.body);

    // Проверяем даты
    const newDateFrom = data.dateFrom || request.dateFrom;
    const newDateTo = data.dateTo || request.dateTo;

    if (newDateFrom > newDateTo) {
      return res.status(400).json({ error: 'Дата "от" должна быть не позже даты "до"' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (newDateFrom < today) {
      return res.status(400).json({ error: 'Дата начала не может быть в прошлом' });
    }

    const updateData: Prisma.PassengerRequestUpdateInput = {};

    if (data.dateFrom) updateData.dateFrom = data.dateFrom;
    if (data.dateTo) updateData.dateTo = data.dateTo;
    if (data.timePreferred !== undefined) updateData.timePreferred = data.timePreferred;
    if (data.passengersCount !== undefined) updateData.passengersCount = data.passengersCount;
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

    const updatedRequest = await req.prisma.passengerRequest.update({
      where: { id: req.params.id },
      data: updateData,
      include: { requester: true },
    });

    res.json({ request: formatRequestResponse(updatedRequest) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Update request error');
    res.status(500).json({ error: 'Ошибка обновления заявки' });
  }
});

/**
 * DELETE /api/requests/:id
 * Отменить заявку
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const request = await req.prisma.passengerRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (request.requesterId !== req.userId) {
      return res.status(403).json({ error: 'Только автор может отменить заявку' });
    }

    await req.prisma.passengerRequest.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    res.json({ success: true, message: 'Заявка отменена' });
  } catch (error) {
    log.error({ err: error }, 'Delete request error');
    res.status(500).json({ error: 'Ошибка отмены заявки' });
  }
});

/**
 * POST /api/requests/:id/link
 * Связать заявку с поездкой (выполнить заявку)
 */
router.post('/:id/link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tripId } = z.object({ tripId: z.string() }).parse(req.body);

    const request = await req.prisma.passengerRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!request) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Заявка уже обработана' });
    }

    // Проверяем что поездка существует и подходит
    const trip = await req.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    if (trip.status !== 'active') {
      return res.status(400).json({ error: 'Поездка недоступна' });
    }

    // Проверяем совпадение маршрута
    if (trip.fromCity !== request.fromCity || trip.toCity !== request.toCity) {
      return res.status(400).json({ error: 'Маршрут поездки не совпадает с заявкой' });
    }

    // Проверяем что дата поездки в диапазоне заявки
    if (trip.date < request.dateFrom || trip.date > request.dateTo) {
      return res.status(400).json({ error: 'Дата поездки не входит в диапазон заявки' });
    }

    const updatedRequest = await req.prisma.passengerRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'fulfilled',
        linkedTripId: tripId,
      },
      include: {
        requester: true,
        linkedTrip: {
          include: { driver: true },
        },
      },
    });

    res.json({ request: formatRequestResponse(updatedRequest) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Link request error');
    res.status(500).json({ error: 'Ошибка связывания заявки' });
  }
});

// ============ HELPERS ============

function formatUserResponse(user: UserBasic) {
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

function formatRequestResponse(request: RequestForFormatting) {
  const linkedTrip = 'linkedTrip' in request && request.linkedTrip;
  return {
    id: request.id,
    requesterId: request.requesterId,
    requester: request.requester ? formatUserResponse(request.requester) : null,
    from: request.fromCity,
    to: request.toCity,
    dateFrom: request.dateFrom,
    dateTo: request.dateTo,
    timePreferred: request.timePreferred,
    passengersCount: request.passengersCount,
    preferences: {
      music: request.prefMusic,
      smoking: request.prefSmoking,
      pets: request.prefPets,
      baggage: request.prefBaggage,
      conversation: request.prefConversation,
      ac: request.prefAc,
    },
    comment: request.comment,
    status: request.status,
    linkedTripId: request.linkedTripId,
    linkedTrip: linkedTrip
      ? {
          id: linkedTrip.id,
          date: linkedTrip.date,
          time: linkedTrip.time,
          driver: linkedTrip.driver ? formatUserResponse(linkedTrip.driver) : null,
        }
      : null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export default router;
