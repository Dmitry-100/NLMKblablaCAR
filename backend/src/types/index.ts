import { Prisma } from '@prisma/client';

// User with all relations
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    tripsAsDriver: true;
    bookings: true;
    reviewsGiven: true;
    reviewsReceived: true;
    passengerRequests: true;
  };
}>;

// User without relations (basic)
export type UserBasic = Prisma.UserGetPayload<object>;

// Trip with driver and bookings
export type TripWithRelations = Prisma.TripGetPayload<{
  include: {
    driver: true;
    bookings: {
      include: {
        passenger: true;
      };
    };
  };
}>;

// Trip with driver only (for bookings context)
export type TripWithDriver = Prisma.TripGetPayload<{
  include: {
    driver: true;
  };
}>;

// Booking with relations
export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    trip: {
      include: {
        driver: true;
      };
    };
    passenger: true;
  };
}>;

// Booking with trip and driver only (no passenger)
export type BookingWithTrip = Prisma.BookingGetPayload<{
  include: {
    trip: {
      include: {
        driver: true;
      };
    };
  };
}>;

// Review with relations (all optional for flexible formatting)
export type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: {
    author: true;
    target: true;
    trip: true;
  };
}>;

// Review with partial relations
export type ReviewWithAuthorTarget = Prisma.ReviewGetPayload<{
  include: {
    author: true;
    target: true;
  };
}>;

export type ReviewWithAuthorTrip = Prisma.ReviewGetPayload<{
  include: {
    author: true;
    trip: true;
  };
}>;

// PassengerRequest with relations
export type RequestWithRelations = Prisma.PassengerRequestGetPayload<{
  include: {
    requester: true;
    linkedTrip: {
      include: {
        driver: true;
      };
    };
  };
}>;

// PassengerRequest with requester only
export type RequestWithRequester = Prisma.PassengerRequestGetPayload<{
  include: {
    requester: true;
  };
}>;

// API Response types
export interface UserResponse {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string;
  phone: string;
  bio: string;
  position: string;
  homeCity: string;
  role: string;
  rating: number;
  telegramLinked?: boolean;
  telegramUsername?: string | null;
  defaultPreferences: {
    music: string;
    smoking: boolean;
    pets: boolean;
    baggage: string;
    conversation: string;
    ac: boolean;
  };
}

export interface TripResponse {
  id: string;
  driverId: string;
  driver: UserResponse;
  from: string;
  to: string;
  date: string;
  time: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  seatsTotal: number;
  seatsBooked: number;
  preferences: {
    music: string;
    smoking: boolean;
    pets: boolean;
    baggage: string;
    conversation: string;
    ac: boolean;
  };
  comment: string;
  status: string;
  tripGroupId?: string;
  isReturn: boolean;
  passengers: UserResponse[];
  myBookingId?: string;
}

export interface BookingResponse {
  id: string;
  tripId: string;
  passengerId: string;
  status: string;
  trip: Omit<TripResponse, 'passengers' | 'myBookingId'>;
  passenger: UserResponse;
  createdAt: string;
}

export interface ReviewResponse {
  id: string;
  tripId: string;
  authorId: string;
  author?: UserResponse;
  targetId: string;
  target?: UserResponse;
  rating: number;
  comment: string;
  skipped: boolean;
  createdAt: string;
}

export interface RequestResponse {
  id: string;
  requesterId: string;
  requester: UserResponse;
  from: string;
  to: string;
  dateFrom: string;
  dateTo: string;
  timePreferred?: string;
  passengersCount: number;
  preferences: {
    music: string;
    smoking: boolean;
    pets: boolean;
    baggage: string;
    conversation: string;
    ac: boolean;
  };
  comment: string;
  status: string;
  linkedTripId?: string;
  linkedTrip?: {
    id: string;
    date: string;
    time: string;
    driver: UserResponse;
  };
  createdAt: string;
  updatedAt: string;
}

// Query filter types
export interface TripFilters {
  from?: string;
  to?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface RequestFilters {
  from?: string;
  to?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

// Error type
export interface AppError extends Error {
  status?: number;
}
