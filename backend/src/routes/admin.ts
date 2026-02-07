import { Router, Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { createLogger } from '../utils/logger.js';
import { authUserResponseSchema } from '../contracts/auth.js';

const router = Router();
const log = createLogger('admin');

const updateUserByAdminSchema = z.object({
  name: z.string().min(2).optional(),
  homeCity: z.enum(['Moscow', 'Lipetsk']).optional(),
  role: z.enum(['Driver', 'Passenger', 'Both']).optional(),
  accountRole: z.enum(['user', 'admin']).optional(),
  isBlocked: z.boolean().optional(),
});

const addPassengerSchema = z.object({
  passengerId: z.string().min(1),
});

const updateRequestByAdminSchema = z.object({
  status: z.enum(['pending', 'fulfilled', 'cancelled', 'expired']).optional(),
  comment: z.string().max(500).optional(),
  passengersCount: z.number().int().min(1).max(3).optional(),
});

const linkRequestSchema = z.object({
  tripId: z.string().min(1),
});

router.use(authMiddleware, requireAdmin);

async function logAdminAction(
  prisma: PrismaClient,
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Prisma.InputJsonValue
) {
  await prisma.adminActionLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      details,
    },
  });
}

function formatUserResponse(user: {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string;
  phone: string;
  bio: string;
  position: string;
  homeCity: string;
  role: string;
  accountRole: string;
  isBlocked: boolean;
  rating: number;
  prefMusic: string;
  prefSmoking: boolean;
  prefPets: boolean;
  prefBaggage: string;
  prefConversation: string;
  prefAc: boolean;
}) {
  return authUserResponseSchema.parse({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    phone: user.phone || '',
    bio: user.bio || '',
    position: user.position || '',
    homeCity: user.homeCity,
    role: user.role,
    accountRole: user.accountRole as 'user' | 'admin',
    isBlocked: user.isBlocked,
    rating: user.rating,
    defaultPreferences: {
      music: user.prefMusic,
      smoking: user.prefSmoking,
      pets: user.prefPets,
      baggage: user.prefBaggage,
      conversation: user.prefConversation,
      ac: user.prefAc,
    },
  });
}

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [usersTotal, usersBlocked, tripsTotal, tripsActive, requestsTotal, requestsPending] =
      await Promise.all([
        req.prisma.user.count(),
        req.prisma.user.count({ where: { isBlocked: true } }),
        req.prisma.trip.count(),
        req.prisma.trip.count({ where: { status: 'active' } }),
        req.prisma.passengerRequest.count(),
        req.prisma.passengerRequest.count({ where: { status: 'pending' } }),
      ]);

    res.json({
      stats: {
        usersTotal,
        usersBlocked,
        tripsTotal,
        tripsActive,
        requestsTotal,
        requestsPending,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Admin stats error');
    res.status(500).json({ error: 'Ошибка получения статистики админ-панели' });
  }
});

router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const logs = await req.prisma.adminActionLog.findMany({
      include: {
        admin: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({
      logs: logs.map(item => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        details: item.details,
        createdAt: item.createdAt,
        admin: formatUserResponse(item.admin),
      })),
    });
  } catch (error) {
    log.error({ err: error }, 'Admin logs error');
    res.status(500).json({ error: 'Ошибка получения логов админ-панели' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await req.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users: users.map(formatUserResponse) });
  } catch (error) {
    log.error({ err: error }, 'Admin get users error');
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

router.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const data = updateUserByAdminSchema.parse(req.body);
    const targetUserId = req.params.id;

    if (targetUserId === req.userId && data.accountRole === 'user') {
      return res.status(400).json({ error: 'Нельзя снять права администратора у самого себя' });
    }

    const updated = await req.prisma.user.update({
      where: { id: targetUserId },
      data: data,
    });

    await logAdminAction(req.prisma, req.userId!, 'update_user', 'user', targetUserId, data);

    res.json({ user: formatUserResponse(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Admin update user error');
    res.status(500).json({ error: 'Ошибка обновления пользователя' });
  }
});

router.post('/users/:id/block', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
    }

    await req.prisma.user.update({
      where: { id: targetUserId },
      data: { isBlocked: true },
    });

    await logAdminAction(req.prisma, req.userId!, 'block_user', 'user', targetUserId);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Admin block user error');
    res.status(500).json({ error: 'Ошибка блокировки пользователя' });
  }
});

router.post('/users/:id/unblock', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    await req.prisma.user.update({
      where: { id: targetUserId },
      data: { isBlocked: false },
    });

    await logAdminAction(req.prisma, req.userId!, 'unblock_user', 'user', targetUserId);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Admin unblock user error');
    res.status(500).json({ error: 'Ошибка разблокировки пользователя' });
  }
});

router.get('/trips', async (req: Request, res: Response) => {
  try {
    const trips = await req.prisma.trip.findMany({
      include: {
        driver: true,
        bookings: {
          where: { status: 'confirmed' },
          include: { passenger: true },
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
    });

    res.json({ trips });
  } catch (error) {
    log.error({ err: error }, 'Admin get trips error');
    res.status(500).json({ error: 'Ошибка получения поездок' });
  }
});

router.put('/trips/:id', async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const allowed = z
      .object({
        date: z.string().optional(),
        time: z.string().optional(),
        pickupLocation: z.string().optional(),
        dropoffLocation: z.string().optional(),
        seatsTotal: z.number().int().min(2).max(4).optional(),
        comment: z.string().optional(),
        status: z.enum(['active', 'completed', 'cancelled', 'archived']).optional(),
      })
      .parse(req.body);

    const updated = await req.prisma.trip.update({
      where: { id: tripId },
      data: allowed,
    });

    await logAdminAction(req.prisma, req.userId!, 'update_trip', 'trip', tripId, allowed);
    res.json({ trip: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Admin update trip error');
    res.status(500).json({ error: 'Ошибка обновления поездки' });
  }
});

router.delete('/trips/:id', async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    await req.prisma.trip.update({
      where: { id: tripId },
      data: { status: 'cancelled' },
    });

    await logAdminAction(req.prisma, req.userId!, 'cancel_trip', 'trip', tripId);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Admin cancel trip error');
    res.status(500).json({ error: 'Ошибка отмены поездки' });
  }
});

router.post('/trips/:id/passengers', async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const { passengerId } = addPassengerSchema.parse(req.body);

    await req.prisma.$transaction(async tx => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new Error('TRIP_NOT_FOUND');
      if (trip.status !== 'active') throw new Error('TRIP_NOT_ACTIVE');
      if (trip.seatsBooked >= trip.seatsTotal - 1) throw new Error('NO_SEATS');

      const existing = await tx.booking.findFirst({
        where: { tripId, passengerId, status: 'confirmed' },
      });
      if (existing) throw new Error('BOOKING_EXISTS');

      await tx.booking.create({
        data: {
          tripId,
          passengerId,
          status: 'confirmed',
        },
      });

      await tx.trip.update({
        where: { id: tripId },
        data: { seatsBooked: { increment: 1 } },
      });
    });

    await logAdminAction(req.prisma, req.userId!, 'add_passenger', 'trip', tripId, {
      passengerId,
    });
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error instanceof Error) {
      if (error.message === 'NO_SEATS') {
        return res.status(400).json({ error: 'Нет свободных мест' });
      }
      if (error.message === 'BOOKING_EXISTS') {
        return res.status(400).json({ error: 'Пассажир уже добавлен' });
      }
      if (error.message === 'TRIP_NOT_FOUND') {
        return res.status(404).json({ error: 'Поездка не найдена' });
      }
    }
    log.error({ err: error }, 'Admin add passenger error');
    res.status(500).json({ error: 'Ошибка добавления пассажира' });
  }
});

router.delete('/trips/:id/passengers/:passengerId', async (req: Request, res: Response) => {
  try {
    const tripId = req.params.id;
    const passengerId = req.params.passengerId;

    const booking = await req.prisma.booking.findFirst({
      where: { tripId, passengerId, status: 'confirmed' },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Бронь не найдена' });
    }

    await req.prisma.$transaction([
      req.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled' },
      }),
      req.prisma.trip.update({
        where: { id: tripId },
        data: { seatsBooked: { decrement: 1 } },
      }),
    ]);

    await logAdminAction(req.prisma, req.userId!, 'remove_passenger', 'trip', tripId, {
      passengerId,
    });
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Admin remove passenger error');
    res.status(500).json({ error: 'Ошибка удаления пассажира' });
  }
});

router.get('/requests', async (req: Request, res: Response) => {
  try {
    const requests = await req.prisma.passengerRequest.findMany({
      include: {
        requester: true,
        linkedTrip: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json({ requests });
  } catch (error) {
    log.error({ err: error }, 'Admin get requests error');
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

router.put('/requests/:id', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    const data = updateRequestByAdminSchema.parse(req.body);

    const updated = await req.prisma.passengerRequest.update({
      where: { id: requestId },
      data,
    });

    await logAdminAction(req.prisma, req.userId!, 'update_request', 'request', requestId, data);
    res.json({ request: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Admin update request error');
    res.status(500).json({ error: 'Ошибка обновления заявки' });
  }
});

router.delete('/requests/:id', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    await req.prisma.passengerRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled' },
    });

    await logAdminAction(req.prisma, req.userId!, 'cancel_request', 'request', requestId);
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error }, 'Admin cancel request error');
    res.status(500).json({ error: 'Ошибка отмены заявки' });
  }
});

router.post('/requests/:id/link', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    const { tripId } = linkRequestSchema.parse(req.body);

    const updated = await req.prisma.passengerRequest.update({
      where: { id: requestId },
      data: {
        linkedTripId: tripId,
        status: 'fulfilled',
      },
    });

    await logAdminAction(req.prisma, req.userId!, 'link_request_to_trip', 'request', requestId, {
      tripId,
    });

    res.json({ request: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Admin link request error');
    res.status(500).json({ error: 'Ошибка связывания заявки с поездкой' });
  }
});

export default router;
