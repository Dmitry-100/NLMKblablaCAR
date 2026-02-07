import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const log = createLogger('telegram');

// Telegram Bot Token from environment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Telegram API base URL
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ============ TYPES ============

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface SendMessageOptions {
  chatId: bigint | number | string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableNotification?: boolean;
}

// ============ VALIDATION ============

/**
 * Validates Telegram Login Widget authentication data
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramAuth(data: TelegramAuthData): boolean {
  if (!BOT_TOKEN) {
    log.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  const { hash, ...authData } = data;

  // Check auth_date is not too old (allow 1 day)
  const authAge = Math.floor(Date.now() / 1000) - authData.auth_date;
  if (authAge > 86400) {
    log.warn({ authAge }, 'Telegram auth data too old');
    return false;
  }

  // Build data-check-string
  const checkString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key as keyof typeof authData]}`)
    .join('\n');

  // Create secret key from bot token
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();

  // Calculate HMAC-SHA256
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  const isValid = calculatedHash === hash;

  if (!isValid) {
    log.warn({ provided: hash, calculated: calculatedHash }, 'Invalid Telegram auth hash');
  }

  return isValid;
}

// ============ NOTIFICATIONS ============

/**
 * Send a message to a Telegram user
 */
export async function sendMessage(options: SendMessageOptions): Promise<boolean> {
  if (!BOT_TOKEN) {
    log.warn('TELEGRAM_BOT_TOKEN not configured, skipping notification');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: options.chatId.toString(),
        text: options.text,
        parse_mode: options.parseMode || 'HTML',
        disable_notification: options.disableNotification || false,
      }),
    });

    const result = (await response.json()) as { ok: boolean; description?: string };

    if (!result.ok) {
      log.error({ error: result.description, chatId: options.chatId }, 'Failed to send Telegram message');
      return false;
    }

    log.info({ chatId: options.chatId }, 'Telegram message sent');
    return true;
  } catch (error) {
    log.error({ err: error, chatId: options.chatId }, 'Error sending Telegram message');
    return false;
  }
}

// ============ NOTIFICATION TEMPLATES ============

/**
 * Notify user about new booking on their trip
 */
export async function notifyNewBooking(
  driverChatId: bigint | null,
  passengerName: string,
  tripDate: string,
  tripTime: string,
  from: string,
  to: string
): Promise<void> {
  if (!driverChatId) return;

  const fromCity = from === 'Moscow' ? 'Москвы' : 'Липецка';
  const toCity = to === 'Moscow' ? 'Москву' : 'Липецк';

  await sendMessage({
    chatId: driverChatId,
    text: `🚗 <b>Новое бронирование!</b>\n\n` +
      `Пассажир: ${passengerName}\n` +
      `Маршрут: из ${fromCity} в ${toCity}\n` +
      `Дата: ${tripDate} в ${tripTime}\n\n` +
      `Откройте приложение для деталей.`,
  });
}

/**
 * Notify passenger about booking confirmation
 */
export async function notifyBookingConfirmed(
  passengerChatId: bigint | null,
  driverName: string,
  tripDate: string,
  tripTime: string,
  from: string,
  to: string,
  pickupLocation: string
): Promise<void> {
  if (!passengerChatId) return;

  const fromCity = from === 'Moscow' ? 'Москвы' : 'Липецка';
  const toCity = to === 'Moscow' ? 'Москву' : 'Липецк';

  await sendMessage({
    chatId: passengerChatId,
    text: `✅ <b>Бронирование подтверждено!</b>\n\n` +
      `Водитель: ${driverName}\n` +
      `Маршрут: из ${fromCity} в ${toCity}\n` +
      `Дата: ${tripDate} в ${tripTime}\n` +
      `Место посадки: ${pickupLocation}\n\n` +
      `Хорошей поездки!`,
  });
}

/**
 * Notify about booking cancellation
 */
export async function notifyBookingCancelled(
  chatId: bigint | null,
  cancelledBy: 'driver' | 'passenger',
  tripDate: string,
  from: string,
  to: string
): Promise<void> {
  if (!chatId) return;

  const fromCity = from === 'Moscow' ? 'Москвы' : 'Липецка';
  const toCity = to === 'Moscow' ? 'Москву' : 'Липецк';
  const byWhom = cancelledBy === 'driver' ? 'водителем' : 'пассажиром';

  await sendMessage({
    chatId,
    text: `❌ <b>Бронирование отменено</b>\n\n` +
      `Отменено ${byWhom}\n` +
      `Маршрут: из ${fromCity} в ${toCity}\n` +
      `Дата: ${tripDate}\n\n` +
      `Ищите новые поездки в приложении.`,
  });
}

/**
 * Notify about trip cancellation (to all passengers)
 */
export async function notifyTripCancelled(
  passengerChatId: bigint | null,
  driverName: string,
  tripDate: string,
  from: string,
  to: string
): Promise<void> {
  if (!passengerChatId) return;

  const fromCity = from === 'Moscow' ? 'Москвы' : 'Липецка';
  const toCity = to === 'Moscow' ? 'Москву' : 'Липецк';

  await sendMessage({
    chatId: passengerChatId,
    text: `🚫 <b>Поездка отменена</b>\n\n` +
      `Водитель ${driverName} отменил поездку\n` +
      `Маршрут: из ${fromCity} в ${toCity}\n` +
      `Дата: ${tripDate}\n\n` +
      `Ищите новые поездки в приложении.`,
  });
}

/**
 * Notify passenger when a matching trip is created
 */
export async function notifyMatchingTrip(
  passengerChatId: bigint | null,
  driverName: string,
  tripDate: string,
  tripTime: string,
  from: string,
  to: string
): Promise<void> {
  if (!passengerChatId) return;

  const fromCity = from === 'Moscow' ? 'Москвы' : 'Липецка';
  const toCity = to === 'Moscow' ? 'Москву' : 'Липецк';

  await sendMessage({
    chatId: passengerChatId,
    text: `🎉 <b>Найдена подходящая поездка!</b>\n\n` +
      `Водитель: ${driverName}\n` +
      `Маршрут: из ${fromCity} в ${toCity}\n` +
      `Дата: ${tripDate} в ${tripTime}\n\n` +
      `Откройте приложение, чтобы забронировать место.`,
  });
}

/**
 * Set webhook URL for the bot
 */
export async function setWebhook(url: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    log.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const result = (await response.json()) as { ok: boolean; description?: string };

    if (!result.ok) {
      log.error({ error: result.description }, 'Failed to set webhook');
      return false;
    }

    log.info({ url }, 'Webhook set successfully');
    return true;
  } catch (error) {
    log.error({ err: error }, 'Error setting webhook');
    return false;
  }
}

/**
 * Get bot info
 */
export async function getBotInfo(): Promise<{ username: string } | null> {
  if (!BOT_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const result = (await response.json()) as {
      ok: boolean;
      description?: string;
      result?: { username: string };
    };

    if (!result.ok) {
      log.error({ error: result.description }, 'Failed to get bot info');
      return null;
    }

    return { username: result.result?.username || '' };
  } catch (error) {
    log.error({ err: error }, 'Error getting bot info');
    return null;
  }
}
