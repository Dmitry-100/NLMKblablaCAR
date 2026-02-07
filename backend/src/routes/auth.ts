import { createLogger } from '../utils/logger.js';
const log = createLogger('auth');

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authMiddleware,
} from '../middleware/auth.js';
import { UserBasic } from '../types/index.js';
import {
  authMeResponseSchema,
  authSuccessResponseSchema,
  authUserResponseSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '../contracts/auth.js';

const router = Router();
const ADMIN_TELEGRAM_USERNAMES = new Set(['dmitry_100']);

function normalizeTelegramUsername(username?: string | null): string | null {
  if (!username) return null;
  return username.replace(/^@/, '').trim().toLowerCase() || null;
}

function shouldPromoteToAdminByTelegramUsername(username?: string | null): boolean {
  const normalized = normalizeTelegramUsername(username);
  return !!normalized && ADMIN_TELEGRAM_USERNAMES.has(normalized);
}

// ============ ROUTES ============

/**
 * POST /api/auth/login
 * @deprecated Use Telegram auth instead (POST /api/auth/telegram)
 * Авторизация по email (упрощённая - без пароля для демо)
 * Сохранено для обратной совместимости с существующими пользователями
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = loginSchema.parse(req.body);

    // Ищем пользователя
    let user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Если пользователя нет - создаём нового (auto-register)
    if (!user) {
      const nameFromEmail = email.split('@')[0];
      const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);

      user = await req.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: capitalizedName,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          homeCity: 'Moscow',
          role: 'Passenger',
        },
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    // Генерируем токены
    if (
      user.accountRole !== 'admin' &&
      shouldPromoteToAdminByTelegramUsername(user.telegramUsername)
    ) {
      user = await req.prisma.user.update({
        where: { id: user.id },
        data: { accountRole: 'admin' },
      });
    }

    const accessToken = generateAccessToken(user.id, user.email || '');
    const refreshToken = generateRefreshToken(user.id);

    // Возвращаем пользователя и токены
    const response = authSuccessResponseSchema.parse({
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Login error:');
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Проверяем, не занят ли email
    const existing = await req.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Создаём пользователя
    const user = await req.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
        homeCity: data.homeCity || 'Moscow',
        role: data.role || 'Passenger',
      },
    });

    const accessToken = generateAccessToken(user.id, user.email || '');
    const refreshToken = generateRefreshToken(user.id);

    const response = authSuccessResponseSchema.parse({
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Register error:');
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

/**
 * GET /api/auth/me
 * Получить текущего пользователя по токену
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    let user = await req.prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (
      user.accountRole !== 'admin' &&
      shouldPromoteToAdminByTelegramUsername(user.telegramUsername)
    ) {
      user = await req.prisma.user.update({
        where: { id: user.id },
        data: { accountRole: 'admin' },
      });
    }

    const response = authMeResponseSchema.parse({ user: formatUserResponse(user) });
    res.json(response);
  } catch (error) {
    log.error({ err: error }, 'Get me error:');
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

/**
 * POST /api/auth/refresh
 * Обновить access token используя refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const userId = verifyRefreshToken(refreshToken);
    if (!userId) {
      return res.status(401).json({ error: 'Недействительный refresh token' });
    }

    // Get user from DB
    let user = await req.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    if (
      user.accountRole !== 'admin' &&
      shouldPromoteToAdminByTelegramUsername(user.telegramUsername)
    ) {
      user = await req.prisma.user.update({
        where: { id: user.id },
        data: { accountRole: 'admin' },
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.email || '');
    const newRefreshToken = generateRefreshToken(user.id);

    const response = authSuccessResponseSchema.parse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: formatUserResponse(user),
    });
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Refresh error:');
    res.status(500).json({ error: 'Ошибка обновления токена' });
  }
});

// ============ HELPERS ============

function formatUserResponse(user: UserBasic) {
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

export default router;
