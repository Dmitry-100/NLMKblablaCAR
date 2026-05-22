import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Trip, User } from '../types';
import { launchConfetti } from '../utils/confetti';
import { hapticSuccess } from '../utils/haptics';

export type CreateRequestPayload = Parameters<(typeof api)['createRequest']>[0];

interface TelegramLoginPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useAppController() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.getTrips(),
    enabled: !!user,
  });

  const { data: pendingReviews = [] } = useQuery({
    queryKey: ['pendingReviews'],
    queryFn: () => api.getPendingReviews(),
    enabled: !!user,
  });

  const { data: userReviews = [] } = useQuery({
    queryKey: ['userReviews', user?.id],
    queryFn: () => api.getUserReviews(user!.id),
    enabled: !!user,
  });

  const { data: requestStats } = useQuery({
    queryKey: ['requestStats'],
    queryFn: () => api.getRequestStats(),
    enabled: !!user,
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
    enabled: !!user,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.getMyRequests(),
    enabled: !!user,
  });

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      setLoading(true);
      const currentUser = await api.getCurrentUser();
      if (isMounted && currentUser) {
        setUser(currentUser);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
    queryClient.invalidateQueries({ queryKey: ['userReviews'] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    queryClient.invalidateQueries({ queryKey: ['myRequests'] });
    queryClient.invalidateQueries({ queryKey: ['requestStats'] });
  };

  const refreshTrips = async () => {
    await queryClient.invalidateQueries({ queryKey: ['trips'] });
  };

  const handleTelegramLogin = async (telegramData: TelegramLoginPayload) => {
    setLoading(true);
    try {
      const loggedInUser = await api.loginWithTelegram(telegramData);
      setUser(loggedInUser);
    } catch (error) {
      alert(`Ошибка входа через Telegram: ${getErrorMessage(error, 'не удалось войти')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!import.meta.env.DEV) {
      alert('Локальный вход доступен только в dev-режиме');
      return;
    }

    const devEmail = import.meta.env.VITE_DEV_LOGIN_EMAIL || 'local-smoke@nlmk.com';
    setLoading(true);
    try {
      const loggedInUser = await api.login(devEmail);
      setUser(loggedInUser);
    } catch (error) {
      alert(`Ошибка локального входа: ${getErrorMessage(error, 'не удалось войти')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    queryClient.clear();
  };

  const addTrip = async (newTrips: Trip[]) => {
    try {
      for (const trip of newTrips) {
        await api.createTrip(trip);
      }
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    } catch (error) {
      console.error('Error creating trip:', error);
      alert(`Ошибка создания поездки: ${getErrorMessage(error, 'не удалось создать поездку')}`);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const savedUser = await api.updateUser(updatedUser);
      setUser(savedUser);
    } catch (error) {
      alert(`Ошибка обновления профиля: ${getErrorMessage(error, 'не удалось сохранить профиль')}`);
    }
  };

  const joinTrip = async (tripId: string) => {
    try {
      await api.bookTrip(tripId);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      hapticSuccess();
      launchConfetti();
      alert('Вы присоединились к поездке!');
    } catch (error) {
      console.error('Error joining trip:', error);
      alert(`Ошибка бронирования: ${getErrorMessage(error, 'не удалось забронировать поездку')}`);
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      await api.cancelTrip(tripId);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      alert('Поездка отменена');
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert(`Ошибка отмены: ${getErrorMessage(error, 'не удалось отменить поездку')}`);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      await api.cancelBooking(bookingId);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      alert('Бронирование отменено');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(
        `Ошибка отмены бронирования: ${getErrorMessage(error, 'не удалось отменить бронирование')}`
      );
    }
  };

  const handleSaveTrip = async (updatedTrip: Trip) => {
    try {
      await api.updateTrip(updatedTrip);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setEditingTrip(null);
      alert('Поездка обновлена');
    } catch (error) {
      console.error('Error updating trip:', error);
      alert(`Ошибка обновления: ${getErrorMessage(error, 'не удалось обновить поездку')}`);
    }
  };

  const addRequest = async (requestData: CreateRequestPayload) => {
    try {
      await api.createRequest(requestData);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      queryClient.invalidateQueries({ queryKey: ['requestStats'] });
    } catch (error) {
      console.error('Error creating request:', error);
      alert(`Ошибка создания заявки: ${getErrorMessage(error, 'не удалось создать заявку')}`);
      throw error;
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await api.cancelRequest(requestId);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      queryClient.invalidateQueries({ queryKey: ['requestStats'] });
      alert('Заявка отменена');
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert(`Ошибка отмены заявки: ${getErrorMessage(error, 'не удалось отменить заявку')}`);
    }
  };

  const handleSubmitReview = async (
    tripId: string,
    targetUserId: string,
    rating: number,
    comment: string
  ) => {
    try {
      await api.submitReview(tripId, targetUserId, rating, comment);
      const updatedUser = await api.getCurrentUser();
      if (updatedUser) setUser(updatedUser);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(`Ошибка отправки отзыва: ${getErrorMessage(error, 'не удалось отправить отзыв')}`);
    }
  };

  const handleSkipReview = async (tripId: string, targetUserId: string) => {
    try {
      await api.skipReview(tripId, targetUserId);
    } catch (error) {
      console.error('Error skipping review:', error);
      alert(`Ошибка: ${getErrorMessage(error, 'не удалось пропустить отзыв')}`);
    }
  };

  return {
    user,
    loading,
    trips,
    tripsLoading,
    pendingReviews,
    userReviews,
    requestStats,
    requests,
    requestsLoading,
    myRequests,
    editingTrip,
    handleTelegramLogin,
    handleDevLogin,
    handleLogout,
    addTrip,
    updateUser,
    joinTrip,
    deleteTrip,
    cancelBooking,
    handleEditTrip: setEditingTrip,
    handleSaveTrip,
    addRequest,
    cancelRequest,
    handleSubmitReview,
    handleSkipReview,
    refreshAllData,
    refreshTrips,
    closeEditTrip: () => setEditingTrip(null),
  };
}
