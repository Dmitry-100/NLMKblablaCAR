import { z } from 'zod';
import {
  baggageSchema,
  citySchema,
  conversationSchema,
  musicPrefSchema,
  roleSchema,
  userResponseSchema,
} from './trips.js';

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  position: z.string().max(100).optional(),
  homeCity: citySchema.optional(),
  role: roleSchema.optional(),
  defaultPreferences: z
    .object({
      music: musicPrefSchema.optional(),
      smoking: z.boolean().optional(),
      pets: z.boolean().optional(),
      baggage: baggageSchema.optional(),
      conversation: conversationSchema.optional(),
      ac: z.boolean().optional(),
    })
    .optional(),
});

export const userProfileResponseSchema = z.object({
  user: userResponseSchema,
});

export const userTripResponseSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  driver: userResponseSchema.nullable(),
  from: citySchema,
  to: citySchema,
  date: z.string(),
  time: z.string(),
  pickupLocation: z.string(),
  dropoffLocation: z.string(),
  seatsTotal: z.number(),
  seatsBooked: z.number(),
  preferences: z.object({
    music: musicPrefSchema,
    smoking: z.boolean(),
    pets: z.boolean(),
    baggage: baggageSchema,
    conversation: conversationSchema,
    ac: z.boolean(),
  }),
  comment: z.string(),
  tripGroupId: z.string().nullable().optional(),
  isReturn: z.boolean(),
});

export const userTripsResponseSchema = z.object({
  trips: z.array(userTripResponseSchema),
});

export const userBookingResponseSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  trip: userTripResponseSchema.nullable(),
  passengerId: z.string(),
  status: z.string(),
  createdAt: z.date(),
});

export const userBookingsResponseSchema = z.object({
  bookings: z.array(userBookingResponseSchema),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
export type UserTripResponseDto = z.infer<typeof userTripResponseSchema>;
export type UserTripsResponse = z.infer<typeof userTripsResponseSchema>;
export type UserBookingResponseDto = z.infer<typeof userBookingResponseSchema>;
export type UserBookingsResponse = z.infer<typeof userBookingsResponseSchema>;
