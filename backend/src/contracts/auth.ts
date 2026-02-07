import { z } from 'zod';
import { citySchema, roleSchema, userResponseSchema } from './trips.js';

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
});

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  name: z.string().min(2, 'Имя должно быть минимум 2 символа'),
  homeCity: citySchema.optional(),
  role: roleSchema.optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token обязателен'),
});

export const authUserResponseSchema = userResponseSchema.extend({
  telegramLinked: z.boolean().optional(),
  telegramUsername: z.string().nullable().optional(),
});

export const authSuccessResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserResponseSchema,
});

export const authMeResponseSchema = z.object({
  user: authUserResponseSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshTokenSchema>;
export type AuthUserResponseDto = z.infer<typeof authUserResponseSchema>;
export type AuthSuccessResponse = z.infer<typeof authSuccessResponseSchema>;
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
