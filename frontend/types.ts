export enum City {
  Moscow = 'Moscow',
  Lipetsk = 'Lipetsk'
}

export enum Role {
  Driver = 'Driver',
  Passenger = 'Passenger',
  Both = 'Both'
}

export enum MusicPref {
  Quiet = 'Quiet',
  Normal = 'Normal',
  Loud = 'Loud'
}

export enum BaggageSize {
  Hand = 'Hand',
  Medium = 'Medium',
  Suitcase = 'Suitcase'
}

export enum ConversationPref {
  Chatty = 'Chatty',
  Quiet = 'Quiet'
}

export interface Preferences {
  music: MusicPref;
  smoking: boolean; // true = allowed, false = forbidden
  pets: boolean; // true = allowed
  baggage: BaggageSize;
  conversation: ConversationPref;
  ac: boolean; // true = has AC
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  phone: string;
  bio: string;
  position: string;
  homeCity: City;
  role: Role;
  defaultPreferences: Preferences;
  rating: number;
}

export interface Trip {
  id: string;
  driverId: string;
  driver: User;
  from: City;
  to: City;
  date: string; // ISO Date string YYYY-MM-DD
  time: string; // HH:mm
  pickupLocation: string;
  dropoffLocation: string;
  pickupLat?: number;  // Координаты места посадки
  pickupLng?: number;
  dropoffLat?: number; // Координаты места высадки
  dropoffLng?: number;
  seatsTotal: number;
  seatsBooked: number;
  preferences: Preferences;
  comment: string;
  tripGroupId?: string; // Links outbound and return trips
  isReturn?: boolean;
  passengers?: User[]; // List of passengers who booked the trip
  myBookingId?: string; // Booking id for current user (if passenger)
  status?: 'active' | 'completed' | 'cancelled' | 'archived';
}

export interface Review {
  id: string;
  tripId: string;
  authorId: string;
  author?: User;
  targetId: string;
  target?: User;
  rating: number;
  comment: string;
  skipped: boolean;
  createdAt: string;
}

export interface PendingReview {
  trip: {
    id: string;
    from: City;
    to: City;
    date: string;
    time: string;
    driverId: string;
    driver: User;
  };
  pendingFor: User[]; // Users who haven't been reviewed yet
}
