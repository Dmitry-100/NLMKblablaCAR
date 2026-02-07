import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import {
  validateTelegramAuth,
  TelegramAuthData,
  sendMessage,
} from '../services/telegram.js';
import {
  generateAccessToken,
  generateRefreshToken,
  authMiddleware,
} from '../middleware/auth.js';

const router = Router();
const log = createLogger('telegram-auth');

// ============ VALIDATION SCHEMAS ============

const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

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
    const fullName = data.last_name
      ? `${data.first_name} ${data.last_name}`
      : data.first_name;

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
        },
      });

      log.info({ telegramId: data.id, name: fullName }, 'New user registered via Telegram');
    } else {
      // Update existing user's Telegram data
      user = await req.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUsername: data.username,
          telegramChatId: telegramId,
          telegramPhotoUrl: data.photo_url,
          // Update avatar if user doesn't have one
          ...(user.avatarUrl === '' && data.photo_url ? { avatarUrl: data.photo_url } : {}),
        },
      });

      log.info({ telegramId: data.id, userId: user.id }, 'User logged in via Telegram');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email || `tg:${data.id}`);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: formatUserResponse(user),
    });
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

    log.info({ update_id: update.update_id, message_text: update.message?.text }, 'Webhook received');

    // Handle /start command - this gives us the chat_id
    if (update.message?.text?.startsWith('/start')) {
      const chatId = BigInt(update.message.chat.id);
      const telegramId = BigInt(update.message.from.id);
      const username = update.message.from.username;

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
          text: `👋 Привет, ${user.name}!\n\n` +
            `Я буду присылать вам уведомления о:\n` +
            `• Новых бронированиях\n` +
            `• Отменах поездок\n` +
            `• Подходящих поездках для ваших заявок\n\n` +
            `Хорошей дороги! 🚗`,
        });

        log.info({ telegramId: Number(telegramId), chatId: Number(chatId) }, 'User chat_id updated');
      } else {
        // User not registered yet
        await sendMessage({
          chatId,
          text: `👋 Привет!\n\n` +
            `Чтобы получать уведомления, сначала войдите в приложение через Telegram.\n\n` +
            `После этого вернитесь сюда и напишите /start`,
        });
      }
    }

    // Always respond with 200 OK to Telegram
    res.status(200).json({ ok: true });
  } catch (error) {
    log.error({ err: error }, 'Webhook error');
    // Still respond 200 to prevent Telegram from retrying
    res.status(200).json({ ok: true });
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
    const user = await req.prisma.user.update({
      where: { id: req.userId },
      data: {
        telegramId,
        telegramUsername: data.username,
        telegramChatId: telegramId,
        telegramPhotoUrl: data.photo_url,
      },
    });

    log.info({ userId: user.id, telegramId: data.id }, 'Telegram account linked');

    res.json({
      success: true,
      message: 'Telegram аккаунт успешно привязан',
      user: formatUserResponse(user),
    });
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

    res.json({ success: true, message: 'Telegram аккаунт отвязан' });
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
  };
}

export default router;
