import { z } from 'zod';
import { tripResponseSchema, userResponseSchema } from './trips.js';

export const bookingStatusSchema = z.enum(['confirmed', 'cancelled']);

export const createBookingSchema = z.object({
  tripId: z.string().min(1, 'Укажите ID поездки'),
});

export const bookingTripSchema = tripResponseSchema.pick({
  id: true,
  driverId: true,
  driver: true,
  from: true,
  to: true,
  date: true,
  time: true,
  pickupLocation: true,
  dropoffLocation: true,
  seatsTotal: true,
  seatsBooked: true,
  preferences: true,
  comment: true,
  tripGroupId: true,
  isReturn: true,
});

export const bookingResponseSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  trip: bookingTripSchema.nullable(),
  passengerId: z.string(),
  passenger: userResponseSchema.nullable(),
  status: bookingStatusSchema,
  createdAt: z.date(),
});

export const getMyBookingsResponseSchema = z.object({
  bookings: z.array(bookingResponseSchema),
});

export const getBookingResponseSchema = z.object({
  booking: bookingResponseSchema,
});

export const createBookingResponseSchema = z.object({
  booking: bookingResponseSchema,
  message: z.string(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingResponseDto = z.infer<typeof bookingResponseSchema>;
export type GetMyBookingsResponse = z.infer<typeof getMyBookingsResponseSchema>;
export type GetBookingResponse = z.infer<typeof getBookingResponseSchema>;
export type CreateBookingResponse = z.infer<typeof createBookingResponseSchema>;
