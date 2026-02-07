import { z } from 'zod';

export const citySchema = z.enum(['Moscow', 'Lipetsk']);
export const roleSchema = z.enum(['Driver', 'Passenger', 'Both']);
export const musicPrefSchema = z.enum(['Quiet', 'Normal', 'Loud']);
export const baggageSchema = z.enum(['Hand', 'Medium', 'Suitcase']);
export const conversationSchema = z.enum(['Chatty', 'Quiet']);
export const tripStatusSchema = z.enum(['active', 'completed', 'cancelled', 'archived']);

export const preferencesSchema = z.object({
  music: musicPrefSchema,
  smoking: z.boolean(),
  pets: z.boolean(),
  baggage: baggageSchema,
  conversation: conversationSchema,
  ac: z.boolean(),
});

export const partialPreferencesSchema = preferencesSchema.partial();

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string(),
  avatarUrl: z.string(),
  phone: z.string(),
  bio: z.string(),
  position: z.string(),
  homeCity: citySchema,
  role: roleSchema,
  accountRole: z.enum(['user', 'admin']).optional(),
  isBlocked: z.boolean().optional(),
  rating: z.number(),
  defaultPreferences: preferencesSchema,
});

export const createTripSchema = z.object({
  from: citySchema,
  to: citySchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Формат времени: HH:mm'),
  pickupLocation: z.string().min(1, 'Укажите место посадки'),
  dropoffLocation: z.string().min(1, 'Укажите место высадки'),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  // Stores total seats in car including driver:
  // 2..4 means 1..3 passenger seats.
  seatsTotal: z.number().int().min(2).max(4).default(3),
  comment: z.string().optional().default(''),
  tripGroupId: z.string().optional(),
  isReturn: z.boolean().optional().default(false),
  preferences: partialPreferencesSchema.optional(),
});

export const updateTripSchema = createTripSchema.partial();

export const tripQuerySchema = z.object({
  from: citySchema.optional(),
  to: citySchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: tripStatusSchema.optional(),
  includeArchived: z.enum(['true', 'false']).optional(),
});

export const tripResponseSchema = z.object({
  id: z.string(),
  driverId: z.string(),
  driver: userResponseSchema.nullable(),
  from: citySchema,
  to: citySchema,
  date: z.string(),
  time: z.string(),
  pickupLocation: z.string(),
  dropoffLocation: z.string(),
  pickupLat: z.number().nullable().optional(),
  pickupLng: z.number().nullable().optional(),
  dropoffLat: z.number().nullable().optional(),
  dropoffLng: z.number().nullable().optional(),
  seatsTotal: z.number(),
  seatsBooked: z.number(),
  preferences: preferencesSchema,
  comment: z.string(),
  tripGroupId: z.string().nullable().optional(),
  isReturn: z.boolean(),
  status: tripStatusSchema,
  passengers: z.array(userResponseSchema),
  myBookingId: z.string().optional(),
});

export const getTripsResponseSchema = z.object({
  trips: z.array(tripResponseSchema),
});

export const getTripResponseSchema = z.object({
  trip: tripResponseSchema,
});

export const createTripResponseSchema = getTripResponseSchema;
export const updateTripResponseSchema = getTripResponseSchema;

export type City = 'Moscow' | 'Lipetsk';
export type Role = 'Driver' | 'Passenger' | 'Both';
export type TripStatus = 'active' | 'completed' | 'cancelled' | 'archived';
export type MusicPref = 'Quiet' | 'Normal' | 'Loud';
export type BaggagePref = 'Hand' | 'Medium' | 'Suitcase';
export type ConversationPref = 'Chatty' | 'Quiet';

export interface Preferences {
  music: MusicPref;
  smoking: boolean;
  pets: boolean;
  baggage: BaggagePref;
  conversation: ConversationPref;
  ac: boolean;
}

export interface UserResponse {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string;
  phone: string;
  bio: string;
  position: string;
  homeCity: City;
  role: Role;
  rating: number;
  defaultPreferences: Preferences;
}

export interface CreateTripInput {
  from: City;
  to: City;
  date: string;
  time: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  seatsTotal?: number;
  comment?: string;
  tripGroupId?: string;
  isReturn?: boolean;
  preferences?: Partial<Preferences>;
}

export type UpdateTripInput = Partial<CreateTripInput>;

export interface TripsQuery {
  from?: City;
  to?: City;
  dateFrom?: string;
  dateTo?: string;
  status?: TripStatus;
  includeArchived?: 'true' | 'false';
}

export interface TripResponseDto {
  id: string;
  driverId: string;
  driver: UserResponse | null;
  from: City;
  to: City;
  date: string;
  time: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  seatsTotal: number;
  seatsBooked: number;
  preferences: Preferences;
  comment: string;
  tripGroupId?: string | null;
  isReturn: boolean;
  status: TripStatus;
  passengers: UserResponse[];
  myBookingId?: string;
}

export interface GetTripsResponse {
  trips: TripResponseDto[];
}

export interface GetTripResponse {
  trip: TripResponseDto;
}
