/**
 * API Client для NLMKblablaCAR
 * Подключается к реальному бэкенду с поддержкой refresh tokens
 */

import { Trip, User, Review, PendingReview, PassengerRequest, RequestStats } from '../types';

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

      const data = await response.json();
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка авторизации');
    }

    // Save both tokens
    setTokens(data.accessToken, data.refreshToken);
    return data.user;
  },

  /**
   * Авторизация через Telegram
   */
  async loginWithTelegram(telegramData: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Ошибка авторизации через Telegram');
    }

    // Save both tokens
    setTokens(data.accessToken, data.refreshToken);
    return data.user;
  },

  /**
   * Получить текущего пользователя по токену
   */
  async getCurrentUser(): Promise<User | null> {
    const token = getAccessToken();
    if (!token) return null;

    try {
      const { user } = await request<{ user: User }>('/auth/me');
      return user;
    } catch (error) {
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
    const { user: updatedUser } = await request<{ user: User }>(`/users/${user.id}`, {
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
    return updatedUser;
  },

  /**
   * Получить профиль пользователя по ID
   */
  async getUserById(userId: string): Promise<User> {
    const { user } = await request<{ user: User }>(`/users/${userId}`);
    return user;
  },

  // --- TRIPS ---

  /**
   * Получить список поездок
   */
  async getTrips(filters?: {
    from?: string;
    to?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Trip[]> {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);

    const query = params.toString();
    const endpoint = query ? `/trips?${query}` : '/trips';

    const { trips } = await request<{ trips: Trip[] }>(endpoint);
    return trips;
  },

  /**
   * Получить детали поездки
   */
  async getTrip(id: string): Promise<Trip> {
    const { trip } = await request<{ trip: Trip }>(`/trips/${id}`);
    return trip;
  },

  /**
   * Создать новую поездку
   */
  async createTrip(trip: Partial<Trip>): Promise<Trip> {
    const { trip: createdTrip } = await request<{ trip: Trip }>('/trips', {
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
    return createdTrip;
  },

  /**
   * Обновить поездку
   */
  async updateTrip(trip: Trip): Promise<Trip> {
    const { trip: updatedTrip } = await request<{ trip: Trip }>(`/trips/${trip.id}`, {
      method: 'PUT',
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
        preferences: trip.preferences,
      }),
    });
    return updatedTrip;
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
    await request('/bookings', {
      method: 'POST',
      body: JSON.stringify({ tripId }),
    });
  },

  /**
   * Получить мои бронирования
   */
  async getMyBookings(): Promise<any[]> {
    const { bookings } = await request<{ bookings: any[] }>('/bookings/my');
    return bookings;
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
    const { review } = await request<{ review: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ tripId, targetUserId, rating, comment: comment || '' }),
    });
    return review;
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
    const { pendingReviews } = await request<{ pendingReviews: PendingReview[] }>(
      '/reviews/pending'
    );
    return pendingReviews;
  },

  /**
   * Получить отзывы о пользователе
   */
  async getUserReviews(userId: string): Promise<Review[]> {
    const { reviews } = await request<{ reviews: Review[] }>(`/reviews/user/${userId}`);
    return reviews;
  },

  // --- PASSENGER REQUESTS ---

  /**
   * Создать заявку на поездку
   */
  async createRequest(data: {
    from: string;
    to: string;
    dateFrom: string;
    dateTo: string;
    timePreferred?: string;
    passengersCount?: number;
    comment?: string;
    preferences?: {
      music?: string;
      smoking?: boolean;
      pets?: boolean;
      baggage?: string;
      conversation?: string;
      ac?: boolean;
    };
  }): Promise<PassengerRequest> {
    const { request: passengerRequest } = await request<{ request: PassengerRequest }>(
      '/requests',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return passengerRequest;
  },

  /**
   * Получить список заявок (для водителей)
   */
  async getRequests(filters?: {
    from?: string;
    to?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }): Promise<PassengerRequest[]> {
    const params = new URLSearchParams();
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.status) params.set('status', filters.status);

    const query = params.toString();
    const endpoint = query ? `/requests?${query}` : '/requests';

    const { requests } = await request<{ requests: PassengerRequest[] }>(endpoint);
    return requests;
  },

  /**
   * Получить мои заявки
   */
  async getMyRequests(): Promise<PassengerRequest[]> {
    const { requests } = await request<{ requests: PassengerRequest[] }>('/requests/my');
    return requests;
  },

  /**
   * Получить статистику заявок
   */
  async getRequestStats(): Promise<RequestStats> {
    const { stats } = await request<{ stats: RequestStats }>('/requests/stats');
    return stats;
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

    const { requests } = await request<{ requests: PassengerRequest[] }>(
      `/requests/matching?${params.toString()}`
    );
    return requests;
  },

  /**
   * Обновить заявку
   */
  async updateRequest(
    id: string,
    data: {
      dateFrom?: string;
      dateTo?: string;
      timePreferred?: string | null;
      passengersCount?: number;
      comment?: string;
      preferences?: {
        music?: string;
        smoking?: boolean;
        pets?: boolean;
        baggage?: string;
        conversation?: string;
        ac?: boolean;
      };
    }
  ): Promise<PassengerRequest> {
    const { request: passengerRequest } = await request<{ request: PassengerRequest }>(
      `/requests/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return passengerRequest;
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
    const { request: passengerRequest } = await request<{ request: PassengerRequest }>(
      `/requests/${requestId}/link`,
      {
        method: 'POST',
        body: JSON.stringify({ tripId }),
      }
    );
    return passengerRequest;
  },
};

// ============ EXPORTS ============

export { getToken, setToken, removeToken, getAccessToken, getRefreshToken };
export default api;
