/**
 * API Client для NLMKblablaCAR
 * Подключается к реальному бэкенду с поддержкой refresh tokens
 */

import {
  BaggageSize,
  City,
  ConversationPref,
  MusicPref,
  Role,
  Trip,
  User,
  Review,
  PendingReview,
  PassengerRequest,
  RequestStats,
} from '../types';
import type {
  CreateTripRequest,
  TripDto,
  TripDetailsResponse,
  TripsListQuery,
  TripsListResponse,
  UpdateTripRequest,
} from '../contracts/trips';
import type { BookingDto, BookTripResponse, MyBookingsResponse } from '../contracts/bookings';
import type {
  CreateRequestRequest,
  RequestDetailsResponse,
  RequestDto,
  RequestsListResponse,
  RequestsListQuery,
  RequestsStatsResponse,
  UpdateRequestRequest,
} from '../contracts/requests';
import type { AuthUserDto, LoginResponse, MeResponse, RefreshResponse } from '../contracts/auth';
import type {
  PendingReviewDto,
  PendingReviewsResult,
  ReviewDto,
  SubmitReviewResponse,
  UserReviewsResult,
} from '../contracts/reviews';
import type { UserProfileResult } from '../contracts/users';
import type { TelegramAuthRequest, TelegramLoginResponse } from '../contracts/telegram';

interface Booking {
  id: string;
  tripId: string;
  passengerId: string;
  createdAt?: string;
  status?: string;
  trip?: Trip;
  passenger?: User;
}

interface UserDtoLike {
  id?: string;
  email?: string | null;
  name?: string;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  position?: string;
  homeCity?: string;
  role?: string;
  rating?: number;
  accountRole?: 'user' | 'admin';
  isBlocked?: boolean;
  defaultPreferences?: {
    music?: string;
    smoking?: boolean;
    pets?: boolean;
    baggage?: string;
    conversation?: string;
    ac?: boolean;
  };
}

function toCity(value: string): City {
  return value === 'Lipetsk' ? City.Lipetsk : City.Moscow;
}

function toRole(value: string): Role {
  if (value === 'Driver') return Role.Driver;
  if (value === 'Passenger') return Role.Passenger;
  return Role.Both;
}

function toMusicPref(value: string): MusicPref {
  if (value === 'Quiet') return MusicPref.Quiet;
  if (value === 'Loud') return MusicPref.Loud;
  return MusicPref.Normal;
}

function toBaggagePref(value: string): BaggageSize {
  if (value === 'Hand') return BaggageSize.Hand;
  if (value === 'Suitcase') return BaggageSize.Suitcase;
  return BaggageSize.Medium;
}

function toConversationPref(value: string): ConversationPref {
  return value === 'Quiet' ? ConversationPref.Quiet : ConversationPref.Chatty;
}

function toIsoString(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapUserDto(dto: UserDtoLike): User {
  return {
    id: dto.id ?? '',
    email: dto.email ?? null,
    name: dto.name ?? 'Пользователь',
    avatarUrl: dto.avatarUrl ?? '',
    phone: dto.phone ?? '',
    bio: dto.bio ?? '',
    position: dto.position ?? '',
    homeCity: toCity(dto.homeCity ?? 'Moscow'),
    role: toRole(dto.role ?? 'Passenger'),
    rating: dto.rating ?? 0,
    accountRole: dto.accountRole ?? 'user',
    isBlocked: dto.isBlocked ?? false,
    defaultPreferences: {
      music: toMusicPref(dto.defaultPreferences?.music ?? 'Normal'),
      smoking: dto.defaultPreferences?.smoking ?? false,
      pets: dto.defaultPreferences?.pets ?? false,
      baggage: toBaggagePref(dto.defaultPreferences?.baggage ?? 'Medium'),
      conversation: toConversationPref(dto.defaultPreferences?.conversation ?? 'Chatty'),
      ac: dto.defaultPreferences?.ac ?? true,
    },
  };
}

interface AdminStats {
  usersTotal: number;
  usersBlocked: number;
  tripsTotal: number;
  tripsActive: number;
  requestsTotal: number;
  requestsPending: number;
}

interface AdminLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: unknown;
  createdAt: string;
  admin: UserDtoLike;
}

interface AdminTripRow {
  id: string;
  fromCity: string;
  toCity: string;
  date: string;
  time: string;
  status: string;
}

interface AdminRequestRow {
  id: string;
  fromCity: string;
  toCity: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

function mapTripDto(dto: TripDto): Trip {
  const driverFallback: User = {
    id: dto.driverId,
    email: null,
    name: 'Водитель',
    avatarUrl: '',
    phone: '',
    bio: '',
    position: '',
    homeCity: toCity(dto.from),
    role: Role.Driver,
    rating: 0,
    defaultPreferences: {
      music: MusicPref.Normal,
      smoking: false,
      pets: false,
      baggage: BaggageSize.Medium,
      conversation: ConversationPref.Chatty,
      ac: true,
    },
  };

  return {
    id: dto.id,
    driverId: dto.driverId,
    driver: dto.driver ? mapUserDto(dto.driver) : driverFallback,
    from: toCity(dto.from),
    to: toCity(dto.to),
    date: dto.date,
    time: dto.time,
    pickupLocation: dto.pickupLocation,
    dropoffLocation: dto.dropoffLocation,
    pickupLat: dto.pickupLat === null ? undefined : dto.pickupLat,
    pickupLng: dto.pickupLng === null ? undefined : dto.pickupLng,
    dropoffLat: dto.dropoffLat === null ? undefined : dto.dropoffLat,
    dropoffLng: dto.dropoffLng === null ? undefined : dto.dropoffLng,
    seatsTotal: dto.seatsTotal,
    seatsBooked: dto.seatsBooked,
    preferences: {
      music: toMusicPref(dto.preferences.music),
      smoking: dto.preferences.smoking,
      pets: dto.preferences.pets,
      baggage: toBaggagePref(dto.preferences.baggage),
      conversation: toConversationPref(dto.preferences.conversation),
      ac: dto.preferences.ac,
    },
    comment: dto.comment,
    tripGroupId: dto.tripGroupId ?? undefined,
    isReturn: dto.isReturn,
    status: dto.status,
    passengers: dto.passengers.map(mapUserDto),
    myBookingId: dto.myBookingId,
  };
}

function mapRequestDto(dto: RequestDto): PassengerRequest {
  return {
    id: dto.id,
    requesterId: dto.requesterId,
    requester: dto.requester
      ? mapUserDto(dto.requester)
      : {
          id: dto.requesterId,
          email: null,
          name: 'Пользователь',
          avatarUrl: '',
          phone: '',
          bio: '',
          position: '',
          homeCity: City.Moscow,
          role: Role.Passenger,
          rating: 0,
          defaultPreferences: {
            music: MusicPref.Normal,
            smoking: false,
            pets: false,
            baggage: BaggageSize.Medium,
            conversation: ConversationPref.Chatty,
            ac: true,
          },
        },
    from: toCity(dto.from),
    to: toCity(dto.to),
    dateFrom: dto.dateFrom,
    dateTo: dto.dateTo,
    timePreferred: dto.timePreferred ?? undefined,
    passengersCount: dto.passengersCount,
    preferences: {
      music: toMusicPref(dto.preferences.music),
      smoking: dto.preferences.smoking,
      pets: dto.preferences.pets,
      baggage: toBaggagePref(dto.preferences.baggage),
      conversation: toConversationPref(dto.preferences.conversation),
      ac: dto.preferences.ac,
    },
    comment: dto.comment,
    status: dto.status,
    linkedTripId: dto.linkedTripId ?? undefined,
    linkedTrip: dto.linkedTrip
      ? {
          id: dto.linkedTrip.id,
          date: dto.linkedTrip.date,
          time: dto.linkedTrip.time,
          driver: dto.linkedTrip.driver
            ? mapUserDto(dto.linkedTrip.driver)
            : {
                id: '',
                email: null,
                name: 'Водитель',
                avatarUrl: '',
                phone: '',
                bio: '',
                position: '',
                homeCity: City.Moscow,
                role: Role.Driver,
                rating: 0,
                defaultPreferences: {
                  music: MusicPref.Normal,
                  smoking: false,
                  pets: false,
                  baggage: BaggageSize.Medium,
                  conversation: ConversationPref.Chatty,
                  ac: true,
                },
              },
        }
      : undefined,
    createdAt: toIsoString(dto.createdAt),
    updatedAt: toIsoString(dto.updatedAt),
  };
}

function mapBookingDto(dto: BookingDto): Booking {
  return {
    id: dto.id,
    tripId: dto.tripId,
    passengerId: dto.passengerId,
    status: dto.status,
    createdAt: toIsoString(dto.createdAt),
    trip: dto.trip
      ? {
          id: dto.trip.id,
          driverId: dto.trip.driverId,
          driver: dto.trip.driver
            ? mapUserDto(dto.trip.driver)
            : {
                id: dto.trip.driverId,
                email: null,
                name: 'Водитель',
                avatarUrl: '',
                phone: '',
                bio: '',
                position: '',
                homeCity: toCity(dto.trip.from),
                role: Role.Driver,
                rating: 0,
                defaultPreferences: {
                  music: MusicPref.Normal,
                  smoking: false,
                  pets: false,
                  baggage: BaggageSize.Medium,
                  conversation: ConversationPref.Chatty,
                  ac: true,
                },
              },
          from: toCity(dto.trip.from),
          to: toCity(dto.trip.to),
          date: dto.trip.date,
          time: dto.trip.time,
          pickupLocation: dto.trip.pickupLocation,
          dropoffLocation: dto.trip.dropoffLocation,
          seatsTotal: dto.trip.seatsTotal,
          seatsBooked: dto.trip.seatsBooked,
          preferences: {
            music: toMusicPref(dto.trip.preferences.music),
            smoking: dto.trip.preferences.smoking,
            pets: dto.trip.preferences.pets,
            baggage: toBaggagePref(dto.trip.preferences.baggage),
            conversation: toConversationPref(dto.trip.preferences.conversation),
            ac: dto.trip.preferences.ac,
          },
          comment: dto.trip.comment,
          tripGroupId: dto.trip.tripGroupId ?? undefined,
          isReturn: dto.trip.isReturn,
          passengers: [],
        }
      : undefined,
    passenger: dto.passenger ? mapUserDto(dto.passenger) : undefined,
  };
}

function mapReviewDto(dto: ReviewDto): Review {
  return {
    id: dto.id,
    tripId: dto.tripId,
    authorId: dto.authorId,
    author: dto.author ? mapUserDto(dto.author) : undefined,
    targetId: dto.targetId,
    target: dto.target ? mapUserDto(dto.target) : undefined,
    rating: dto.rating,
    comment: dto.comment,
    skipped: dto.skipped,
    createdAt: toIsoString(dto.createdAt),
  };
}

function mapPendingReviewDto(dto: PendingReviewDto): PendingReview {
  return {
    trip: {
      id: dto.trip.id,
      from: toCity(dto.trip.from),
      to: toCity(dto.trip.to),
      date: dto.trip.date,
      time: dto.trip.time,
      driverId: dto.trip.driverId,
      driver: mapUserDto(dto.trip.driver),
    },
    pendingFor: dto.pendingFor.map(mapUserDto),
  };
}

// ============ CONFIGURATION ============

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Токены хранятся в localStorage
const ACCESS_TOKEN_KEY = 'nlmk_access_token';
const REFRESH_TOKEN_KEY = 'nlmk_refresh_token';

// Флаг для предотвращения параллельных refresh запросов
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// ============ TOKEN HELPERS ============

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function removeTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Legacy support
function getToken(): string | null {
  return getAccessToken();
}

function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function removeToken(): void {
  removeTokens();
}

// ============ TOKEN REFRESH ============

async function refreshTokens(): Promise<boolean> {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        removeTokens();
        return false;
      }

      const data = (await response.json()) as RefreshResponse;
      setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      removeTokens();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ============ REQUEST HELPER ============

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - try to refresh token
  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      // Retry the request with new token
      return request<T>(endpoint, options, false);
    }
    // Refresh failed - user needs to login again
    removeTokens();
    throw new Error('Сессия истекла. Войдите снова.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка запроса');
  }

  return data;
}

// ============ API METHODS ============

export const api = {
  // --- AUTH ---

  /**
   * Авторизация по email
   * Возвращает пользователя и сохраняет токены
   */
  async login(email: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = (await response.json()) as Partial<LoginResponse> & { error?: string };

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка авторизации');
    }

    // Save both tokens
    setTokens(data.accessToken!, data.refreshToken!);
    return mapUserDto(data.user as AuthUserDto);
  },

  /**
   * Авторизация через Telegram
   */
  async loginWithTelegram(telegramData: TelegramAuthRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramData),
    });

    const data = (await response.json()) as Partial<TelegramLoginResponse> & { error?: string };

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка авторизации через Telegram');
    }

    // Save both tokens
    setTokens(data.accessToken!, data.refreshToken!);
    return mapUserDto(data.user as AuthUserDto);
  },

  /**
   * Получить текущего пользователя по токену
   */
  async getCurrentUser(): Promise<User | null> {
    const token = getAccessToken();
    if (!token) return null;

    try {
      const { user } = await request<MeResponse>('/auth/me');
      return mapUserDto(user);
    } catch {
      // Token invalid and refresh failed
      removeTokens();
      return null;
    }
  },

  /**
   * Выйти из аккаунта
   */
  logout(): void {
    removeTokens();
  },

  /**
   * Проверить, авторизован ли пользователь
   */
  isAuthenticated(): boolean {
    return !!getAccessToken() || !!getRefreshToken();
  },

  // --- USERS ---

  /**
   * Получить пользователя (для совместимости с текущим кодом)
   * @deprecated Используйте login() вместо этого
   */
  async getUser(email: string): Promise<User> {
    return this.login(email);
  },

  /**
   * Обновить профиль пользователя
   */
  async updateUser(user: User): Promise<User> {
    const { user: updatedUser } = await request<UserProfileResult>(`/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: user.name,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        bio: user.bio,
        position: user.position,
        homeCity: user.homeCity,
        role: user.role,
        defaultPreferences: user.defaultPreferences,
      }),
    });
    return mapUserDto(updatedUser);
  },

  /**
   * Получить профиль пользователя по ID
   */
  async getUserById(userId: string): Promise<User> {
    const { user } = await request<UserProfileResult>(`/users/${userId}`);
    return mapUserDto(user);
  },

  // --- TRIPS ---

  /**
   * Получить список поездок
   */
  async getTrips(filters?: TripsListQuery): Promise<Trip[]> {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    params.set('dateFrom', filters?.dateFrom || today);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);

    const query = params.toString();
    const endpoint = query ? `/trips?${query}` : '/trips';

    const { trips } = await request<TripsListResponse>(endpoint);
    return trips.map(mapTripDto);
  },

  /**
   * Получить детали поездки
   */
  async getTrip(id: string): Promise<Trip> {
    const { trip } = await request<TripDetailsResponse>(`/trips/${id}`);
    return mapTripDto(trip);
  },

  /**
   * Создать новую поездку
   */
  async createTrip(trip: CreateTripRequest): Promise<Trip> {
    const { trip: createdTrip } = await request<TripDetailsResponse>('/trips', {
      method: 'POST',
      body: JSON.stringify({
        from: trip.from,
        to: trip.to,
        date: trip.date,
        time: trip.time,
        pickupLocation: trip.pickupLocation,
        dropoffLocation: trip.dropoffLocation,
        pickupLat: trip.pickupLat,
        pickupLng: trip.pickupLng,
        dropoffLat: trip.dropoffLat,
        dropoffLng: trip.dropoffLng,
        seatsTotal: trip.seatsTotal,
        comment: trip.comment,
        tripGroupId: trip.tripGroupId,
        isReturn: trip.isReturn,
        preferences: trip.preferences,
      }),
    });
    return mapTripDto(createdTrip);
  },

  /**
   * Обновить поездку
   */
  async updateTrip(trip: Trip): Promise<Trip> {
    const updatePayload: UpdateTripRequest = {
      from: trip.from,
      to: trip.to,
      date: trip.date,
      time: trip.time,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      pickupLat: trip.pickupLat,
      pickupLng: trip.pickupLng,
      dropoffLat: trip.dropoffLat,
      dropoffLng: trip.dropoffLng,
      seatsTotal: trip.seatsTotal,
      comment: trip.comment,
      preferences: trip.preferences,
    };

    const { trip: updatedTrip } = await request<TripDetailsResponse>(`/trips/${trip.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatePayload),
    });
    return mapTripDto(updatedTrip);
  },

  /**
   * Отменить поездку
   */
  async cancelTrip(tripId: string): Promise<void> {
    await request(`/trips/${tripId}`, {
      method: 'DELETE',
    });
  },

  // --- BOOKINGS ---

  /**
   * Забронировать место в поездке
   */
  async bookTrip(tripId: string): Promise<void> {
    await request<BookTripResponse>('/bookings', {
      method: 'POST',
      body: JSON.stringify({ tripId }),
    });
  },

  /**
   * Получить мои бронирования
   */
  async getMyBookings(): Promise<Booking[]> {
    const { bookings } = await request<MyBookingsResponse>('/bookings/my');
    return bookings.map(mapBookingDto);
  },

  /**
   * Отменить бронирование
   */
  async cancelBooking(bookingId: string): Promise<void> {
    await request(`/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  },

  // --- REVIEWS ---

  /**
   * Создать отзыв о пользователе
   */
  async submitReview(
    tripId: string,
    targetUserId: string,
    rating: number,
    comment?: string
  ): Promise<Review> {
    const { review } = await request<SubmitReviewResponse>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ tripId, targetUserId, rating, comment: comment || '' }),
    });
    return mapReviewDto(review);
  },

  /**
   * Пропустить отзыв
   */
  async skipReview(tripId: string, targetUserId: string): Promise<void> {
    await request('/reviews/skip', {
      method: 'POST',
      body: JSON.stringify({ tripId, targetUserId }),
    });
  },

  /**
   * Получить поездки, ожидающие отзыва
   */
  async getPendingReviews(): Promise<PendingReview[]> {
    const { pendingReviews } = await request<PendingReviewsResult>('/reviews/pending');
    return pendingReviews.map(mapPendingReviewDto);
  },

  /**
   * Получить отзывы о пользователе
   */
  async getUserReviews(userId: string): Promise<Review[]> {
    const { reviews } = await request<UserReviewsResult>(`/reviews/user/${userId}`);
    return reviews.map(mapReviewDto);
  },

  // --- PASSENGER REQUESTS ---

  /**
   * Создать заявку на поездку
   */
  async createRequest(data: CreateRequestRequest): Promise<PassengerRequest> {
    const { request: passengerRequest } = await request<RequestDetailsResponse>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapRequestDto(passengerRequest);
  },

  /**
   * Получить список заявок (для водителей)
   */
  async getRequests(filters?: RequestsListQuery): Promise<PassengerRequest[]> {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.status) params.set('status', filters.status);

    const query = params.toString();
    const endpoint = query ? `/requests?${query}` : '/requests';

    const { requests } = await request<RequestsListResponse>(endpoint);
    return requests.map(mapRequestDto);
  },

  /**
   * Получить мои заявки
   */
  async getMyRequests(): Promise<PassengerRequest[]> {
    const { requests } = await request<RequestsListResponse>('/requests/my');
    return requests.map(mapRequestDto);
  },

  /**
   * Получить статистику заявок
   */
  async getRequestStats(): Promise<RequestStats> {
    const { stats } = await request<RequestsStatsResponse>('/requests/stats');
    return {
      moscowToLipetsk: stats.moscowToLipetsk ?? 0,
      lipetskToMoscow: stats.lipetskToMoscow ?? 0,
      total: stats.total ?? 0,
    };
  },

  /**
   * Получить заявки, подходящие под поездку
   */
  async getMatchingRequests(tripData: {
    from: string;
    to: string;
    date: string;
    seatsAvailable?: number;
  }): Promise<PassengerRequest[]> {
    const params = new URLSearchParams();
    params.set('from', tripData.from);
    params.set('to', tripData.to);
    params.set('date', tripData.date);
    if (tripData.seatsAvailable) params.set('seatsAvailable', tripData.seatsAvailable.toString());

    const { requests } = await request<RequestsListResponse>(
      `/requests/matching?${params.toString()}`
    );
    return requests.map(mapRequestDto);
  },

  /**
   * Обновить заявку
   */
  async updateRequest(id: string, data: UpdateRequestRequest): Promise<PassengerRequest> {
    const { request: passengerRequest } = await request<RequestDetailsResponse>(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return mapRequestDto(passengerRequest);
  },

  /**
   * Отменить заявку
   */
  async cancelRequest(id: string): Promise<void> {
    await request(`/requests/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Связать заявку с поездкой
   */
  async linkRequestToTrip(requestId: string, tripId: string): Promise<PassengerRequest> {
    const { request: passengerRequest } = await request<RequestDetailsResponse>(
      `/requests/${requestId}/link`,
      {
        method: 'POST',
        body: JSON.stringify({ tripId }),
      }
    );
    return mapRequestDto(passengerRequest);
  },

  // --- ADMIN ---

  async getAdminStats(): Promise<AdminStats> {
    const { stats } = await request<{ stats: AdminStats }>('/admin/stats');
    return stats;
  },

  async getAdminUsers(): Promise<User[]> {
    const { users } = await request<{ users: UserDtoLike[] }>('/admin/users');
    return users.map(mapUserDto);
  },

  async updateAdminUser(
    userId: string,
    data: {
      name?: string;
      homeCity?: 'Moscow' | 'Lipetsk';
      role?: 'Driver' | 'Passenger' | 'Both';
      accountRole?: 'user' | 'admin';
      isBlocked?: boolean;
    }
  ): Promise<User> {
    const { user } = await request<{ user: UserDtoLike }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return mapUserDto(user);
  },

  async blockUser(userId: string): Promise<void> {
    await request(`/admin/users/${userId}/block`, {
      method: 'POST',
    });
  },

  async unblockUser(userId: string): Promise<void> {
    await request(`/admin/users/${userId}/unblock`, {
      method: 'POST',
    });
  },

  async getAdminTrips(): Promise<
    Array<{
      id: string;
      from: City;
      to: City;
      date: string;
      time: string;
      status: string;
    }>
  > {
    const { trips } = await request<{ trips: AdminTripRow[] }>('/admin/trips');
    return trips.map(trip => ({
      id: trip.id,
      from: toCity(trip.fromCity),
      to: toCity(trip.toCity),
      date: trip.date,
      time: trip.time,
      status: trip.status,
    }));
  },

  async getAdminRequests(): Promise<
    Array<{
      id: string;
      from: City;
      to: City;
      dateFrom: string;
      dateTo: string;
      status: string;
    }>
  > {
    const { requests } = await request<{ requests: AdminRequestRow[] }>('/admin/requests');
    return requests.map(item => ({
      id: item.id,
      from: toCity(item.fromCity),
      to: toCity(item.toCity),
      dateFrom: item.dateFrom,
      dateTo: item.dateTo,
      status: item.status,
    }));
  },

  async getAdminLogs(limit = 100): Promise<
    Array<{
      id: string;
      action: string;
      entityType: string;
      entityId?: string;
      details?: unknown;
      createdAt: string;
      admin: User;
    }>
  > {
    const { logs } = await request<{ logs: AdminLog[] }>(`/admin/logs?limit=${limit}`);
    return logs.map(item => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      details: item.details,
      createdAt: item.createdAt,
      admin: mapUserDto(item.admin),
    }));
  },
};

// ============ EXPORTS ============

export { getToken, setToken, removeToken, getAccessToken, getRefreshToken };
export default api;
