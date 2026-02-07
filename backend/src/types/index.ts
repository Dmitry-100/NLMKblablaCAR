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

// Review with relations
export type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: {
    author: true;
    target: true;
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

// API Response types
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  phone: string;
  bio: string;
  position: string;
  homeCity: string;
  role: string;
  rating: number;
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
