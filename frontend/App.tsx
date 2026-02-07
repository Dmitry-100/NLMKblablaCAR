import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Auth } from './components/auth/Auth';
import { api } from './services/api';
import { YandexMapsProvider } from './services/YandexMapsProvider';
import { Trip, User } from './types';
import { launchConfetti } from './utils/confetti';
import { hapticSuccess } from './utils/haptics';
import { AppLayout } from './features/layout/AppLayout';
import { InsightsPeriodProvider, StatsDashboard, TripsCalendar } from './features/insights';
import { CreateRequest, CreateRequestPayload, RequestsList } from './features/requests';
import { Profile, UserProfileWrapper } from './features/profile';
import { CreateTrip, EditTripModal, Schedule } from './features/trips';

export default function App() {
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

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  const handleTelegramLogin = async (telegramData: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  }) => {
    setLoading(true);
    try {
      const u = await api.loginWithTelegram(telegramData);
      setUser(u);
    } catch (error) {
      alert(`Ошибка входа через Telegram: ${getErrorMessage(error, 'не удалось войти')}`);
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

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
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

  if (!user) {
    return <Auth onTelegramLogin={handleTelegramLogin} loading={loading} />;
  }

  return (
    <YandexMapsProvider apiKey={import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''}>
      <InsightsPeriodProvider>
        <HashRouter>
          <AppLayout requestStats={requestStats} user={user} trips={trips}>
            <Routes>
              <Route
                path="/"
                element={
                  <Schedule
                    trips={trips}
                    joinTrip={joinTrip}
                    cancelBooking={cancelBooking}
                    deleteTrip={deleteTrip}
                    onEdit={handleEditTrip}
                    user={user}
                    loading={tripsLoading}
                    onRefresh={refreshTrips}
                  />
                }
              />
              <Route path="/create" element={<CreateTrip user={user} addTrip={addTrip} />} />
              <Route
                path="/requests"
                element={
                  <RequestsList
                    requests={requests}
                    user={user}
                    loading={requestsLoading}
                    onCancelRequest={cancelRequest}
                  />
                }
              />
              <Route
                path="/request"
                element={<CreateRequest user={user} addRequest={addRequest} />}
              />
              <Route
                path="/profile"
                element={
                  <Profile
                    user={user}
                    updateUser={updateUser}
                    onLogout={handleLogout}
                    trips={trips}
                    pendingReviews={pendingReviews}
                    userReviews={userReviews}
                    onSubmitReview={handleSubmitReview}
                    onSkipReview={handleSkipReview}
                    refreshReviews={refreshAllData}
                    myRequests={myRequests}
                    onCancelRequest={cancelRequest}
                  />
                }
              />
              <Route path="/calendar" element={<TripsCalendar trips={trips} user={user} />} />
              <Route path="/dashboard" element={<StatsDashboard trips={trips} user={user} />} />
              <Route path="/user/:userId" element={<UserProfileWrapper />} />
            </Routes>
          </AppLayout>

          {editingTrip && (
            <EditTripModal
              trip={editingTrip}
              onSave={handleSaveTrip}
              onClose={() => setEditingTrip(null)}
            />
          )}
        </HashRouter>
      </InsightsPeriodProvider>
    </YandexMapsProvider>
  );
}
