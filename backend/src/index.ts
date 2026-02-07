import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import tripsRoutes from './routes/trips.js';
import bookingsRoutes from './routes/bookings.js';
import reviewsRoutes from './routes/reviews.js';
import aiRoutes from './routes/ai.js';
import requestsRoutes from './routes/requests.js';
import telegramRoutes from './routes/telegram.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('server');

// ============ SETUP ============

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ============ MIDDLEWARE ============

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));

// ============ RATE LIMITING ============

// Global rate limit: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for auth: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limit to all API routes
app.use('/api', globalLimiter);

// Добавляем prisma в request для использования в роутах
declare global {
  namespace Express {
    interface Request {
      prisma: PrismaClient;
      userId?: string;
    }
  }
}

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// ============ ROUTES ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/auth/telegram', authLimiter); // Rate limit only Telegram auth, not webhook
app.use('/api', telegramRoutes); // Telegram routes (webhook without rate limit)
app.use('/api/users', usersRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/requests', requestsRoutes);

// ============ ERROR HANDLING ============

interface AppError extends Error {
  status?: number;
}

app.use(
  (err: AppError, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log.error({ err, path: req.path, method: req.method }, 'Request error');
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ============ AUTO-ARCHIVE PAST TRIPS ============

/**
 * Архивирует поездки, которые уже состоялись (дата < сегодня)
 * Переводит их статус из 'active' в 'completed'
 */
async function archivePastTrips() {
  try {
    // Формируем локальную дату в формате YYYY-MM-DD без UTC сдвигов.
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const result = await prisma.trip.updateMany({
      where: {
        status: 'active',
        date: {
          lt: todayStr,
        },
      },
      data: {
        status: 'completed',
      },
    });

    if (result.count > 0) {
      log.info({ count: result.count }, 'Archived past trips');
    }
  } catch (error) {
    log.error({ err: error }, 'Failed to archive past trips');
  }
}

/**
 * Архивирует заявки, у которых истёк срок (dateTo < сегодня)
 * Переводит их статус из 'pending' в 'expired'
 */
async function archiveExpiredRequests() {
  try {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const result = await prisma.passengerRequest.updateMany({
      where: {
        status: 'pending',
        dateTo: {
          lt: todayStr,
        },
      },
      data: {
        status: 'expired',
      },
    });

    if (result.count > 0) {
      log.info({ count: result.count }, 'Archived expired requests');
    }
  } catch (error) {
    log.error({ err: error }, 'Failed to archive expired requests');
  }
}

/**
 * Запускает все задачи архивации
 */
async function runArchiveTasks() {
  await archivePastTrips();
  await archiveExpiredRequests();
}

// ============ START ============

async function main() {
  try {
    await prisma.$connect();
    log.info('Database connected');

    // Архивируем прошедшие поездки и заявки при старте
    await runArchiveTasks();

    // Запускаем периодическую архивацию каждый час
    setInterval(runArchiveTasks, 60 * 60 * 1000);

    app.listen(PORT, () => {
      log.info({ port: PORT }, 'Server started');
    });
  } catch (error) {
    log.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
