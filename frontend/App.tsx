import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Auth } from './components/auth/Auth';
import { YandexMapsProvider } from './services/YandexMapsProvider';
import { AppLayout } from './features/layout/AppLayout';
import { InsightsPeriodProvider, StatsDashboard, TripsCalendar } from './features/insights';
import { CreateRequest, RequestsList } from './features/requests';
import { Profile, UserProfileWrapper } from './features/profile';
import { CreateTrip, EditTripModal, Schedule } from './features/trips';
import { AdminPanel } from './features/admin';
import { useAppController } from './app/useAppController';

export default function App() {
  const controller = useAppController();

  if (!controller.user) {
    return (
      <Auth
        onTelegramLogin={controller.handleTelegramLogin}
        onDevLogin={controller.handleDevLogin}
        loading={controller.loading}
      />
    );
  }

  return (
    <YandexMapsProvider apiKey={import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''}>
      <InsightsPeriodProvider>
        <HashRouter>
          <AppLayout
            requestStats={controller.requestStats}
            user={controller.user}
            trips={controller.trips}
          >
            <Routes>
              <Route
                path="/"
                element={
                  <Schedule
                    trips={controller.trips}
                    joinTrip={controller.joinTrip}
                    cancelBooking={controller.cancelBooking}
                    deleteTrip={controller.deleteTrip}
                    onEdit={controller.handleEditTrip}
                    user={controller.user}
                    loading={controller.tripsLoading}
                    onRefresh={controller.refreshTrips}
                  />
                }
              />
              <Route
                path="/create"
                element={<CreateTrip user={controller.user} addTrip={controller.addTrip} />}
              />
              <Route
                path="/requests"
                element={
                  <RequestsList
                    requests={controller.requests}
                    user={controller.user}
                    loading={controller.requestsLoading}
                    onCancelRequest={controller.cancelRequest}
                  />
                }
              />
              <Route
                path="/request"
                element={
                  <CreateRequest user={controller.user} addRequest={controller.addRequest} />
                }
              />
              <Route
                path="/profile"
                element={
                  <Profile
                    user={controller.user}
                    updateUser={controller.updateUser}
                    onLogout={controller.handleLogout}
                    trips={controller.trips}
                    pendingReviews={controller.pendingReviews}
                    userReviews={controller.userReviews}
                    onSubmitReview={controller.handleSubmitReview}
                    onSkipReview={controller.handleSkipReview}
                    refreshReviews={controller.refreshAllData}
                    myRequests={controller.myRequests}
                    onCancelRequest={controller.cancelRequest}
                  />
                }
              />
              <Route
                path="/calendar"
                element={<TripsCalendar trips={controller.trips} user={controller.user} />}
              />
              <Route
                path="/dashboard"
                element={<StatsDashboard trips={controller.trips} user={controller.user} />}
              />
              <Route path="/user/:userId" element={<UserProfileWrapper />} />
              {controller.user.accountRole === 'admin' && (
                <Route path="/admin" element={<AdminPanel currentUser={controller.user} />} />
              )}
            </Routes>
          </AppLayout>

          {controller.editingTrip && (
            <EditTripModal
              trip={controller.editingTrip}
              onSave={controller.handleSaveTrip}
              onClose={controller.closeEditTrip}
            />
          )}
        </HashRouter>
      </InsightsPeriodProvider>
    </YandexMapsProvider>
  );
}
