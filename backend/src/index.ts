import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import tripsRoutes from './routes/trips.js';
import bookingsRoutes from './routes/bookings.js';

// ============ SETUP ============

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ============ MIDDLEWARE ============

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

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

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/bookings', bookingsRoutes);

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

// ============ START ============

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
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
