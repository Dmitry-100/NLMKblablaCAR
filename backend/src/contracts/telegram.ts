import { z } from 'zod';
import { authSuccessResponseSchema, authUserResponseSchema } from './auth.js';

export const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

export const telegramAuthResponseSchema = authSuccessResponseSchema;

export const telegramWebhookResponseSchema = z.object({
  ok: z.boolean(),
});

export const telegramLinkResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: authUserResponseSchema,
});

export const telegramUnlinkResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>;
export type TelegramAuthResponse = z.infer<typeof telegramAuthResponseSchema>;
export type TelegramWebhookResponse = z.infer<typeof telegramWebhookResponseSchema>;
export type TelegramLinkResponse = z.infer<typeof telegramLinkResponseSchema>;
export type TelegramUnlinkResponse = z.infer<typeof telegramUnlinkResponseSchema>;
