import { z } from 'zod';
import { citySchema, userResponseSchema } from './trips.js';

export const createReviewSchema = z.object({
  tripId: z.string().min(1, 'Укажите ID поездки'),
  targetUserId: z.string().min(1, 'Укажите ID пользователя'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(''),
});

export const skipReviewSchema = z.object({
  tripId: z.string().min(1, 'Укажите ID поездки'),
  targetUserId: z.string().min(1, 'Укажите ID пользователя'),
});

export const reviewResponseSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  authorId: z.string(),
  author: userResponseSchema.nullable().optional(),
  targetId: z.string(),
  target: userResponseSchema.nullable().optional(),
  rating: z.number(),
  comment: z.string(),
  skipped: z.boolean(),
  createdAt: z.date(),
});

export const createReviewResponseSchema = z.object({
  review: reviewResponseSchema,
});

export const skipReviewResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const pendingReviewTripSchema = z.object({
  id: z.string(),
  from: citySchema,
  to: citySchema,
  date: z.string(),
  time: z.string(),
  driverId: z.string(),
  driver: userResponseSchema,
});

export const pendingReviewResponseSchema = z.object({
  trip: pendingReviewTripSchema,
  pendingFor: z.array(userResponseSchema),
});

export const pendingReviewsResponseSchema = z.object({
  pendingReviews: z.array(pendingReviewResponseSchema),
});

export const userReviewsResponseSchema = z.object({
  reviews: z.array(reviewResponseSchema),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type SkipReviewInput = z.infer<typeof skipReviewSchema>;
export type ReviewResponseDto = z.infer<typeof reviewResponseSchema>;
export type CreateReviewResponse = z.infer<typeof createReviewResponseSchema>;
export type SkipReviewResponse = z.infer<typeof skipReviewResponseSchema>;
export type PendingReviewResponseDto = z.infer<typeof pendingReviewResponseSchema>;
export type PendingReviewsResponse = z.infer<typeof pendingReviewsResponseSchema>;
export type UserReviewsResponse = z.infer<typeof userReviewsResponseSchema>;
