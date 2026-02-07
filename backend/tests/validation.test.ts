import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import validation schemas (we'll test the schema logic directly)
const createTripSchema = z.object({
  from: z.enum(['Moscow', 'Lipetsk']),
  to: z.enum(['Moscow', 'Lipetsk']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm'),
  pickupLocation: z.string().min(1, 'Required'),
  dropoffLocation: z.string().min(1, 'Required'),
  seatsTotal: z.number().int().min(1).max(4).default(3),
  comment: z.string().optional().default(''),
});

const createRequestSchema = z.object({
  from: z.enum(['Moscow', 'Lipetsk']),
  to: z.enum(['Moscow', 'Lipetsk']),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  passengersCount: z.number().int().min(1).max(3).default(1),
  comment: z.string().max(500).optional().default(''),
});

describe('Trip Validation Schema', () => {
  it('should validate correct trip data', () => {
    const validTrip = {
      from: 'Moscow',
      to: 'Lipetsk',
      date: '2025-03-15',
      time: '08:00',
      pickupLocation: 'Metro Annino',
      dropoffLocation: 'Central Street',
      seatsTotal: 3,
    };

    const result = createTripSchema.safeParse(validTrip);
    expect(result.success).toBe(true);
  });

  it('should reject invalid city', () => {
    const invalidTrip = {
      from: 'InvalidCity',
      to: 'Lipetsk',
      date: '2025-03-15',
      time: '08:00',
      pickupLocation: 'Metro',
      dropoffLocation: 'Street',
    };

    const result = createTripSchema.safeParse(invalidTrip);
    expect(result.success).toBe(false);
  });

  it('should reject invalid date format', () => {
    const invalidTrip = {
      from: 'Moscow',
      to: 'Lipetsk',
      date: '15-03-2025', // Wrong format
      time: '08:00',
      pickupLocation: 'Metro',
      dropoffLocation: 'Street',
    };

    const result = createTripSchema.safeParse(invalidTrip);
    expect(result.success).toBe(false);
  });

  it('should reject invalid time format', () => {
    const invalidTrip = {
      from: 'Moscow',
      to: 'Lipetsk',
      date: '2025-03-15',
      time: '8:00', // Missing leading zero
      pickupLocation: 'Metro',
      dropoffLocation: 'Street',
    };

    const result = createTripSchema.safeParse(invalidTrip);
    expect(result.success).toBe(false);
  });

  it('should reject seats out of range', () => {
    const invalidTrip = {
      from: 'Moscow',
      to: 'Lipetsk',
      date: '2025-03-15',
      time: '08:00',
      pickupLocation: 'Metro',
      dropoffLocation: 'Street',
      seatsTotal: 10, // Too many
    };

    const result = createTripSchema.safeParse(invalidTrip);
    expect(result.success).toBe(false);
  });
});

describe('Request Validation Schema', () => {
  it('should validate correct request data', () => {
    const validRequest = {
      from: 'Moscow',
      to: 'Lipetsk',
      dateFrom: '2025-03-15',
      dateTo: '2025-03-20',
      passengersCount: 2,
    };

    const result = createRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should reject passengers count out of range', () => {
    const invalidRequest = {
      from: 'Moscow',
      to: 'Lipetsk',
      dateFrom: '2025-03-15',
      dateTo: '2025-03-20',
      passengersCount: 5, // Max is 3
    };

    const result = createRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should reject comment that is too long', () => {
    const invalidRequest = {
      from: 'Moscow',
      to: 'Lipetsk',
      dateFrom: '2025-03-15',
      dateTo: '2025-03-20',
      comment: 'a'.repeat(501), // Max is 500
    };

    const result = createRequestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });
});
