import { createLogger } from '../utils/logger.js';
const log = createLogger('reviews');

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============ VALIDATION SCHEMAS ============

const createReviewSchema = z.object({
  tripId: z.string().min(1, 'Укажите ID поездки'),
  targetUserId: z.string().min(1, 'Укажите ID пользователя'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(''),
});

const skipReviewSchema = z.object({
  tripId: z.string().min(1, 'Укажите ID поездки'),
  targetUserId: z.string().min(1, 'Укажите ID пользователя'),
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
  };
}

function formatReviewResponse(review: any) {
  return {
    id: review.id,
    tripId: review.tripId,
    authorId: review.authorId,
    author: review.author ? formatUserResponse(review.author) : null,
    targetId: review.targetId,
    target: review.target ? formatUserResponse(review.target) : null,
    rating: review.rating,
    comment: review.comment,
    skipped: review.skipped,
    createdAt: review.createdAt,
  };
}

/**
 * Проверяет, все ли отзывы собраны, и архивирует поездку если да
 */
async function checkAndArchiveTrip(prisma: any, tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bookings: { where: { status: 'confirmed' } },
      reviews: true,
    },
  });

  if (!trip || trip.status !== 'completed') return;

  // Ожидаемое количество отзывов:
  // Водитель → каждому пассажиру = bookings.length
  // Каждый пассажир → водителю = bookings.length
  // Итого: bookings.length * 2
  const expectedReviews = trip.bookings.length * 2;

  // Если все отзывы (включая пропуски) собраны — архивируем
  if (trip.reviews.length >= expectedReviews) {
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: 'archived' },
    });
  }
}

/**
 * Пересчитывает рейтинг пользователя на основе полученных отзывов
 */
async function recalculateUserRating(prisma: any, userId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      targetId: userId,
      skipped: false, // Только реальные отзывы
    },
  });

  if (reviews.length === 0) {
    // Нет отзывов — оставляем рейтинг по умолчанию 5.0
    return;
  }

  const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;

  await prisma.user.update({
    where: { id: userId },
    data: { rating: Math.round(avgRating * 10) / 10 }, // Округляем до 1 знака
  });
}

/**
 * Проверяет, что пользователь участвовал в поездке
 */
async function validateParticipation(prisma: any, tripId: string, userId: string, trip: any) {
  if (trip.driverId === userId) {
    return true; // Водитель
  }

  const booking = await prisma.booking.findFirst({
    where: {
      tripId,
      passengerId: userId,
      status: 'confirmed',
    },
  });

  return !!booking; // Пассажир
}

// ============ ROUTES ============

/**
 * POST /api/reviews
 * Создать отзыв
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = createReviewSchema.parse(req.body);
    const { tripId, targetUserId, rating, comment } = data;

    // 1. Проверяем что поездка существует и завершена
    const trip = await req.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: { where: { status: 'confirmed' } },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    if (trip.status !== 'completed') {
      return res
        .status(400)
        .json({ error: 'Можно оставить отзыв только после завершения поездки' });
    }

    // 2. Проверяем что автор участвовал в поездке
    const authorParticipated = await validateParticipation(req.prisma, tripId, req.userId!, trip);
    if (!authorParticipated) {
      return res.status(403).json({ error: 'Вы не участвовали в этой поездке' });
    }

    // 3. Проверяем что target участвовал в поездке
    const targetParticipated = await validateParticipation(req.prisma, tripId, targetUserId, trip);
    if (!targetParticipated) {
      return res.status(400).json({ error: 'Этот пользователь не участвовал в поездке' });
    }

    // 4. Проверяем что автор ≠ target
    if (req.userId === targetUserId) {
      return res.status(400).json({ error: 'Нельзя оставить отзыв самому себе' });
    }

    // 5. Проверяем что отзыв ещё не оставлен
    const existingReview = await req.prisma.review.findUnique({
      where: {
        tripId_authorId_targetId: {
          tripId,
          authorId: req.userId!,
          targetId: targetUserId,
        },
      },
    });

    if (existingReview) {
      return res
        .status(400)
        .json({ error: 'Вы уже оставили отзыв этому пользователю за эту поездку' });
    }

    // 6. Создаём отзыв
    const review = await req.prisma.review.create({
      data: {
        tripId,
        authorId: req.userId!,
        targetId: targetUserId,
        rating,
        comment: comment || '',
        skipped: false,
      },
      include: {
        author: true,
        target: true,
      },
    });

    // 7. Пересчитываем рейтинг получателя
    await recalculateUserRating(req.prisma, targetUserId);

    // 8. Проверяем, нужно ли архивировать поездку
    await checkAndArchiveTrip(req.prisma, tripId);

    res.status(201).json({ review: formatReviewResponse(review) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Create review error:');
    res.status(500).json({ error: 'Ошибка создания отзыва' });
  }
});

/**
 * POST /api/reviews/skip
 * Пропустить отзыв
 */
router.post('/skip', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = skipReviewSchema.parse(req.body);
    const { tripId, targetUserId } = data;

    // Те же проверки что и для создания отзыва
    const trip = await req.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: { where: { status: 'confirmed' } },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    if (trip.status !== 'completed') {
      return res
        .status(400)
        .json({ error: 'Можно пропустить отзыв только после завершения поездки' });
    }

    const authorParticipated = await validateParticipation(req.prisma, tripId, req.userId!, trip);
    if (!authorParticipated) {
      return res.status(403).json({ error: 'Вы не участвовали в этой поездке' });
    }

    const targetParticipated = await validateParticipation(req.prisma, tripId, targetUserId, trip);
    if (!targetParticipated) {
      return res.status(400).json({ error: 'Этот пользователь не участвовал в поездке' });
    }

    if (req.userId === targetUserId) {
      return res.status(400).json({ error: 'Нельзя пропустить отзыв самому себе' });
    }

    const existingReview = await req.prisma.review.findUnique({
      where: {
        tripId_authorId_targetId: {
          tripId,
          authorId: req.userId!,
          targetId: targetUserId,
        },
      },
    });

    if (existingReview) {
      return res.status(400).json({ error: 'Вы уже оставили или пропустили отзыв' });
    }

    // Создаём запись с пропуском
    await req.prisma.review.create({
      data: {
        tripId,
        authorId: req.userId!,
        targetId: targetUserId,
        rating: 0,
        comment: '',
        skipped: true,
      },
    });

    // Проверяем, нужно ли архивировать поездку
    await checkAndArchiveTrip(req.prisma, tripId);

    res.json({ success: true, message: 'Отзыв пропущен' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Skip review error:');
    res.status(500).json({ error: 'Ошибка при пропуске отзыва' });
  }
});

/**
 * GET /api/reviews/pending
 * Получить поездки, ожидающие отзыва
 */
router.get('/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Находим все завершённые поездки, где пользователь участвовал
    const completedTrips = await req.prisma.trip.findMany({
      where: {
        status: 'completed',
        OR: [
          { driverId: req.userId },
          {
            bookings: {
              some: {
                passengerId: req.userId,
                status: 'confirmed',
              },
            },
          },
        ],
      },
      include: {
        driver: true,
        bookings: {
          where: { status: 'confirmed' },
          include: { passenger: true },
        },
        reviews: {
          where: { authorId: req.userId },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Формируем список с информацией о том, кому ещё не оставлен отзыв
    const pendingReviews = [];

    for (const trip of completedTrips) {
      const reviewedTargetIds = trip.reviews.map((r: any) => r.targetId);
      const pendingFor: any[] = [];

      // Определяем участников поездки, которым нужно оставить отзыв
      if (trip.driverId === req.userId) {
        // Я водитель — могу оставить отзыв пассажирам
        for (const booking of trip.bookings) {
          if (!reviewedTargetIds.includes(booking.passengerId)) {
            pendingFor.push(formatUserResponse(booking.passenger));
          }
        }
      } else {
        // Я пассажир — могу оставить отзыв водителю
        if (!reviewedTargetIds.includes(trip.driverId)) {
          pendingFor.push(formatUserResponse(trip.driver));
        }
      }

      if (pendingFor.length > 0) {
        pendingReviews.push({
          trip: {
            id: trip.id,
            from: trip.fromCity,
            to: trip.toCity,
            date: trip.date,
            time: trip.time,
            driverId: trip.driverId,
            driver: formatUserResponse(trip.driver),
          },
          pendingFor,
        });
      }
    }

    res.json({ pendingReviews });
  } catch (error) {
    log.error({ err: error }, 'Get pending reviews error:');
    res.status(500).json({ error: 'Ошибка получения списка поездок для отзыва' });
  }
});

/**
 * GET /api/reviews/user/:id
 * Получить отзывы о пользователе
 */
router.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const reviews = await req.prisma.review.findMany({
      where: {
        targetId: userId,
        skipped: false, // Только реальные отзывы
      },
      include: {
        author: true,
        trip: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      reviews: reviews.map(formatReviewResponse),
    });
  } catch (error) {
    log.error({ err: error }, 'Get user reviews error:');
    res.status(500).json({ error: 'Ошибка получения отзывов' });
  }
});

export default router;
