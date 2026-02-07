import { z } from 'zod';
import {
  baggageSchema,
  citySchema,
  conversationSchema,
  musicPrefSchema,
  userResponseSchema,
} from './trips.js';

export const requestStatusSchema = z.enum(['pending', 'fulfilled', 'cancelled', 'expired']);

export const requestPreferencesSchema = z.object({
  music: musicPrefSchema,
  smoking: z.boolean(),
  pets: z.boolean(),
  baggage: baggageSchema,
  conversation: conversationSchema,
  ac: z.boolean(),
});

export const requestPreferencesPartialSchema = requestPreferencesSchema.partial();

export const createRequestSchema = z
  .object({
    from: citySchema,
    to: citySchema,
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
    timePreferred: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Формат времени: HH:mm')
      .optional(),
    passengersCount: z.number().int().min(1).max(3).default(1),
    comment: z.string().max(500).optional().default(''),
    preferences: requestPreferencesPartialSchema.optional(),
  })
  .refine(data => data.from !== data.to, {
    message: 'Города отправления и назначения должны отличаться',
  })
  .refine(data => data.dateFrom <= data.dateTo, {
    message: 'Дата "от" должна быть не позже даты "до"',
  });

export const updateRequestSchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  timePreferred: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  passengersCount: z.number().int().min(1).max(3).optional(),
  comment: z.string().max(500).optional(),
  preferences: requestPreferencesPartialSchema.optional(),
});

export const requestsQuerySchema = z.object({
  from: citySchema.optional(),
  to: citySchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: requestStatusSchema.optional(),
});

export const matchingRequestsQuerySchema = z.object({
  from: citySchema,
  to: citySchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seatsAvailable: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
});

export const requestStatsResponseSchema = z.object({
  stats: z.object({
    moscowToLipetsk: z.number(),
    lipetskToMoscow: z.number(),
    total: z.number(),
  }),
});

export const linkedTripSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  driver: userResponseSchema.nullable(),
});

export const requestResponseSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  requester: userResponseSchema.nullable(),
  from: citySchema,
  to: citySchema,
  dateFrom: z.string(),
  dateTo: z.string(),
  timePreferred: z.string().nullable().optional(),
  passengersCount: z.number(),
  preferences: requestPreferencesSchema,
  comment: z.string(),
  status: requestStatusSchema,
  linkedTripId: z.string().nullable().optional(),
  linkedTrip: linkedTripSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getRequestsResponseSchema = z.object({
  requests: z.array(requestResponseSchema),
});

export const getRequestResponseSchema = z.object({
  request: requestResponseSchema,
});

export const createRequestResponseSchema = getRequestResponseSchema;
export const updateRequestResponseSchema = getRequestResponseSchema;
export const linkRequestResponseSchema = getRequestResponseSchema;

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type RequestsQuery = z.infer<typeof requestsQuerySchema>;
export type MatchingRequestsQuery = z.infer<typeof matchingRequestsQuerySchema>;
export type RequestResponseDto = z.infer<typeof requestResponseSchema>;
export type GetRequestsResponse = z.infer<typeof getRequestsResponseSchema>;
export type GetRequestResponse = z.infer<typeof getRequestResponseSchema>;
export type RequestStatsResponse = z.infer<typeof requestStatsResponseSchema>;
