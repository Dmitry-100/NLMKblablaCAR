import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import tripsRoutes from './routes/trips.js';
import bookingsRoutes from './routes/bookings.js';
import reviewsRoutes from './routes/reviews.js';

// ============ SETUP ============

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ============ MIDDLEWARE ============

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
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
app.use('/api/users', usersRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);

// ============ ERROR HANDLING ============

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const result = await prisma.trip.updateMany({
      where: {
        status: 'active',
        date: {
          lt: todayStr
        }
      },
      data: {
        status: 'completed'
      }
    });

    if (result.count > 0) {
      console.log(`📦 Архивировано ${result.count} прошедших поездок`);
    }
  } catch (error) {
    console.error('Ошибка архивации поездок:', error);
  }
}

// ============ START ============

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // Архивируем прошедшие поездки при старте
    await archivePastTrips();

    // Запускаем периодическую архивацию каждый час
    setInterval(archivePastTrips, 60 * 60 * 1000);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API docs: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
