import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { validateTelegramAuth, TelegramAuthData, sendMessage } from '../services/telegram.js';
import { generateAccessToken, generateRefreshToken, authMiddleware } from '../middleware/auth.js';
import { authUserResponseSchema } from '../contracts/auth.js';
import {
  telegramAuthResponseSchema,
  telegramAuthSchema,
  telegramLinkResponseSchema,
  telegramUnlinkResponseSchema,
  telegramWebhookResponseSchema,
} from '../contracts/telegram.js';

const router = Router();
const log = createLogger('telegram-auth');

const ADMIN_TELEGRAM_USERNAMES = new Set(['dmitry_100']);

function normalizeTelegramUsername(username?: string | null): string | null {
  if (!username) return null;
  return username.replace(/^@/, '').trim().toLowerCase() || null;
}

function isAdminTelegramUsername(username?: string | null): boolean {
  const normalized = normalizeTelegramUsername(username);
  return !!normalized && ADMIN_TELEGRAM_USERNAMES.has(normalized);
}

// ============ ROUTES ============

/**
 * POST /api/auth/telegram
 * Authenticate user via Telegram Login Widget
 */
router.post('/auth/telegram', async (req: Request, res: Response) => {
  try {
    const data = telegramAuthSchema.parse(req.body) as TelegramAuthData;

    // Validate Telegram auth data
    if (!validateTelegramAuth(data)) {
      return res.status(401).json({ error: 'Недействительные данные авторизации' });
    }

    const telegramId = BigInt(data.id);
    const fullName = data.last_name ? `${data.first_name} ${data.last_name}` : data.first_name;

    // Find or create user
    let user = await req.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      // Create new user
      user = await req.prisma.user.create({
        data: {
          telegramId,
          telegramUsername: data.username,
          telegramChatId: telegramId, // Same as telegramId for direct messages
          telegramPhotoUrl: data.photo_url,
          name: fullName,
          avatarUrl: data.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.id}`,
          homeCity: 'Moscow',
          role: 'Passenger',
          accountRole: isAdminTelegramUsername(data.username) ? 'admin' : 'user',
        },
      });

      log.info({ telegramId: data.id, name: fullName }, 'New user registered via Telegram');
    } else {
      if (user.isBlocked) {
        return res.status(403).json({ error: 'Аккаунт заблокирован' });
      }
      // Update existing user's Telegram data
      user = await req.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUsername: data.username,
          telegramChatId: telegramId,
          telegramPhotoUrl: data.photo_url,
          ...(isAdminTelegramUsername(data.username) ? { accountRole: 'admin' } : {}),
          // Update avatar if user doesn't have one
          ...(user.avatarUrl === '' && data.photo_url ? { avatarUrl: data.photo_url } : {}),
        },
      });

      log.info({ telegramId: data.id, userId: user.id }, 'User logged in via Telegram');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email || `tg:${data.id}`);
    const refreshToken = generateRefreshToken(user.id);

    const response = telegramAuthResponseSchema.parse({
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Telegram auth error');
    res.status(500).json({ error: 'Ошибка авторизации через Telegram' });
  }
});

/**
 * POST /api/telegram/webhook
 * Webhook for Telegram bot updates
 * Used to capture chat_id when user starts conversation with bot
 */
router.post('/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;

    log.info(
      { update_id: update.update_id, message_text: update.message?.text },
      'Webhook received'
    );

    // Handle /start command - this gives us the chat_id
    if (update.message?.text?.startsWith('/start')) {
      const chatId = BigInt(update.message.chat.id);
      const telegramId = BigInt(update.message.from.id);

      // Update user's chatId if they exist
      const user = await req.prisma.user.findUnique({
        where: { telegramId },
      });

      if (user) {
        await req.prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: chatId },
        });

        await sendMessage({
          chatId,
          text:
            `👋 Привет, ${user.name}!\n\n` +
            `Я буду присылать вам уведомления о:\n` +
            `• Новых бронированиях\n` +
            `• Отменах поездок\n` +
            `• Подходящих поездках для ваших заявок\n\n` +
            `Хорошей дороги! 🚗`,
        });

        log.info(
          { telegramId: Number(telegramId), chatId: Number(chatId) },
          'User chat_id updated'
        );
      } else {
        // User not registered yet
        await sendMessage({
          chatId,
          text:
            `👋 Привет!\n\n` +
            `Чтобы получать уведомления, сначала войдите в приложение через Telegram.\n\n` +
            `После этого вернитесь сюда и напишите /start`,
        });
      }
    }

    // Always respond with 200 OK to Telegram
    const response = telegramWebhookResponseSchema.parse({ ok: true });
    res.status(200).json(response);
  } catch (error) {
    log.error({ err: error }, 'Webhook error');
    // Still respond 200 to prevent Telegram from retrying
    const response = telegramWebhookResponseSchema.parse({ ok: true });
    res.status(200).json(response);
  }
});

/**
 * POST /api/telegram/link
 * Link Telegram account to existing user (for users who registered via email)
 */
router.post('/telegram/link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = telegramAuthSchema.parse(req.body) as TelegramAuthData;

    // Validate Telegram auth data
    if (!validateTelegramAuth(data)) {
      return res.status(401).json({ error: 'Недействительные данные авторизации' });
    }

    const telegramId = BigInt(data.id);

    // Check if Telegram account is already linked to another user
    const existingTelegramUser = await req.prisma.user.findUnique({
      where: { telegramId },
    });

    if (existingTelegramUser && existingTelegramUser.id !== req.userId) {
      return res.status(400).json({
        error: 'Этот Telegram аккаунт уже привязан к другому пользователю',
      });
    }

    // Link Telegram to current user
    const currentUser = await req.prisma.user.findUnique({
      where: { id: req.userId },
      select: { isBlocked: true },
    });

    if (!currentUser || currentUser.isBlocked) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    const user = await req.prisma.user.update({
      where: { id: req.userId },
      data: {
        telegramId,
        telegramUsername: data.username,
        telegramChatId: telegramId,
        telegramPhotoUrl: data.photo_url,
        ...(isAdminTelegramUsername(data.username) ? { accountRole: 'admin' } : {}),
      },
    });

    log.info({ userId: user.id, telegramId: data.id }, 'Telegram account linked');

    const response = telegramLinkResponseSchema.parse({
      success: true,
      message: 'Telegram аккаунт успешно привязан',
      user: formatUserResponse(user),
    });
    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    log.error({ err: error }, 'Telegram link error');
    res.status(500).json({ error: 'Ошибка привязки Telegram' });
  }
});

/**
 * DELETE /api/telegram/unlink
 * Unlink Telegram account from user
 */
router.delete('/telegram/unlink', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Check if user has email (can't unlink if Telegram is only auth method)
    if (!user.email && user.telegramId) {
      return res.status(400).json({
        error: 'Нельзя отвязать Telegram без привязанного email',
      });
    }

    await req.prisma.user.update({
      where: { id: req.userId },
      data: {
        telegramId: null,
        telegramUsername: null,
        telegramChatId: null,
        telegramPhotoUrl: null,
      },
    });

    log.info({ userId: user.id }, 'Telegram account unlinked');

    const response = telegramUnlinkResponseSchema.parse({
      success: true,
      message: 'Telegram аккаунт отвязан',
    });
    res.json(response);
  } catch (error) {
    log.error({ err: error }, 'Telegram unlink error');
    res.status(500).json({ error: 'Ошибка отвязки Telegram' });
  }
});

// ============ HELPERS ============

import { UserBasic } from '../types/index.js';

// Extended user type with Telegram fields
type UserWithTelegram = UserBasic & {
  telegramId: bigint | null;
  telegramUsername: string | null;
  telegramChatId: bigint | null;
  telegramPhotoUrl: string | null;
};

function formatUserResponse(user: UserWithTelegram) {
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
    telegramLinked: !!user.telegramId,
    telegramUsername: user.telegramUsername,
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
