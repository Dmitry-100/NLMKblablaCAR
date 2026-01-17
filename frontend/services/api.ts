/**
 * API Client для NLMKblablaCAR
 * Подключается к реальному бэкенду вместо localStorage
 */

import { Trip, User, Review, PendingReview } from '../types';

// ============ CONFIGURATION ============

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Токен хранится в localStorage
const TOKEN_KEY = 'nlmk_auth_token';

// ============ HELPERS ============

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
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
  
  const data = await response.json();
  
  if (!response.ok) {
    // Если токен невалидный - разлогиниваем
    if (response.status === 401) {
      removeToken();
    }
    throw new Error(data.error || 'Ошибка запроса');
  }
  
  return data;
}

// ============ API METHODS ============

export const api = {
  // --- AUTH ---
  
  /**
   * Авторизация по email
   * Возвращает пользователя и сохраняет токен
   */
  async login(email: string): Promise<User> {
    const { token, user } = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    
    setToken(token);
    return user;
  },
  
  /**
   * Получить текущего пользователя по токену
   */
  async getCurrentUser(): Promise<User | null> {
    const token = getToken();
    if (!token) return null;
    
    try {
      const { user } = await request<{ user: User }>('/auth/me');
      return user;
    } catch (error) {
      removeToken();
      return null;
    }
  },
  
  /**
   * Выйти из аккаунта
   */
  logout(): void {
    removeToken();
  },
  
  /**
   * Проверить, авторизован ли пользователь
   */
  isAuthenticated(): boolean {
    return !!getToken();
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
  async submitReview(tripId: string, targetUserId: string, rating: number, comment?: string): Promise<Review> {
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
    const { pendingReviews } = await request<{ pendingReviews: PendingReview[] }>('/reviews/pending');
    return pendingReviews;
  },

  /**
   * Получить отзывы о пользователе
   */
  async getUserReviews(userId: string): Promise<Review[]> {
    const { reviews } = await request<{ reviews: Review[] }>(`/reviews/user/${userId}`);
    return reviews;
  },
};

// ============ EXPORTS ============

export { getToken, setToken, removeToken };
export default api;
