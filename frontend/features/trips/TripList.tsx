import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightCircle, Car, Clock, Edit2, Loader2, Trash2, Users } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, Skeleton } from '../../components/ui';
import { PreferenceRow } from '../../components/Icons';
import { City, Trip, User } from '../../types';
import { formatDate, formatTime, getCityName } from '../../utils/helpers';
import { hapticLight } from '../../utils/haptics';

interface TripListProps {
  trips: Trip[];
  joinTrip: (id: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  onEdit: (trip: Trip) => void;
  user: User;
  loading: boolean;
}

function TripCardSkeleton() {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-10 w-16" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </Card>
  );
}

interface SwipeActionWrapperProps {
  enabled: boolean;
  onAction: () => void;
  children: React.ReactNode;
}

const SwipeActionWrapper: React.FC<SwipeActionWrapperProps> = ({ enabled, onAction, children }) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const triggerDistance = 92;

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = e => {
    if (!enabled) return;
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = e => {
    if (!enabled || startX === null) return;
    const delta = e.touches[0].clientX - startX;
    if (delta <= 0) {
      setOffsetX(0);
      return;
    }
    setOffsetX(Math.min(120, delta));
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (!enabled) return;
    if (offsetX >= triggerDistance) {
      hapticLight();
      onAction();
    }
    setOffsetX(0);
    setStartX(null);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {enabled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end bg-gradient-to-r from-transparent via-emerald-100 to-emerald-200 px-4 text-emerald-700">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ArrowRightCircle size={18} />
            Свайп для брони
          </div>
        </div>
      )}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${offsetX}px)` }}
        className="transition-transform duration-150"
      >
        {children}
      </div>
    </div>
  );
};

export function TripList({
  trips,
  joinTrip,
  cancelBooking,
  deleteTrip,
  onEdit,
  user,
  loading,
}: TripListProps) {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    await joinTrip(id);
    setJoiningId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите отменить эту поездку?')) return;
    setDeletingId(id);
    await deleteTrip(id);
    setDeletingId(null);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Отменить ваше бронирование?')) return;
    setCancelingId(bookingId);
    await cancelBooking(bookingId);
    setCancelingId(null);
  };

  if (loading) {
    return (
      <div className="grid gap-6 animate-fade-in">
        {Array.from({ length: 3 }).map((_, index) => (
          <TripCardSkeleton key={`trip-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 animate-fade-in">
      {trips.length === 0 ? (
        <EmptyState
          title="Пока нет поездок"
          description="Создайте первую поездку, и коллеги смогут сразу к ней присоединиться."
          icon={Car}
          action={
            <Link to="/create">
              <Button>Создать поездку</Button>
            </Link>
          }
        />
      ) : (
        trips.map(trip => {
          const maxPassengers = Math.max(0, trip.seatsTotal - 1);
          const availableSeats = Math.max(0, maxPassengers - trip.seatsBooked);
          const isFull = availableSeats === 0;
          const isMyTrip = trip.driverId === user.id;
          const passengers = trip.passengers || [];
          const isPassenger = passengers.some(p => p.id === user.id);
          const myBookingId = trip.myBookingId;
          const isBooked = isPassenger || !!myBookingId;
          const canSwipeToBook = !isMyTrip && !isBooked && !isFull;

          return (
            <SwipeActionWrapper
              key={trip.id}
              enabled={canSwipeToBook}
              onAction={() => handleJoin(trip.id)}
            >
              <Card className="relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Car size={100} />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={trip.from === City.Moscow ? 'blue' : 'pink'}>
                        {getCityName(trip.from)} → {getCityName(trip.to)}
                      </Badge>
                      {trip.isReturn && <Badge color="gray">Обратно</Badge>}
                      {isMyTrip && <Badge color="green">Ваша поездка</Badge>}
                      {new Date(`${trip.date}T${trip.time}`).getTime() - Date.now() < 7200000 &&
                        new Date(`${trip.date}T${trip.time}`).getTime() > Date.now() && (
                          <span className="text-xs text-orange-500 font-bold animate-pulse flex items-center gap-1">
                            <Clock size={12} /> Скоро отправление
                          </span>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {formatTime(trip.time)}{' '}
                      <span className="text-sm font-normal text-gray-500">
                        {' '}
                        {formatDate(trip.date)}
                      </span>
                    </h3>
                  </div>
                  <div className="text-right flex items-center gap-2 relative z-10">
                    <div className="text-2xl font-light text-sky-600">
                      {availableSeats} <span className="text-xs text-gray-400">мест</span>
                    </div>
                    {isMyTrip && (
                      <>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onEdit(trip);
                          }}
                          className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors z-20"
                          title="Редактировать"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(trip.id);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-20"
                          disabled={deletingId === trip.id}
                          title="Удалить"
                        >
                          {deletingId === trip.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <Link
                  to={`/user/${trip.driver.id}`}
                  className="flex items-center gap-4 mb-4 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <Avatar
                    src={trip.driver.avatarUrl}
                    alt={trip.driver.name}
                    size={40}
                    className="border-2 border-white shadow-sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 hover:text-sky-600">
                      {trip.driver.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      ★ {trip.driver.rating.toFixed(1)} Водитель
                    </p>
                  </div>
                </Link>

                {passengers.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50/50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                      <Users size={14} />
                      <span className="font-medium">Пассажиры ({passengers.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {passengers.map(p => (
                        <Link
                          key={p.id}
                          to={`/user/${p.id}`}
                          className="flex items-center gap-2 bg-white px-2 py-1 rounded-full shadow-sm hover:bg-sky-50 transition-colors"
                        >
                          <Avatar src={p.avatarUrl} alt={p.name} size={24} />
                          <span className="text-xs text-gray-700 hover:text-sky-600">{p.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-sky-50 to-pink-50 rounded-xl p-4 mb-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-sky-400 border-2 border-white shadow"></div>
                        <div className="w-0.5 h-6 bg-gradient-to-b from-sky-300 to-pink-300"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">Откуда</p>
                        <p className="text-sm text-gray-700 leading-tight">{trip.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-pink-400 border-2 border-white shadow"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">Куда</p>
                        <p className="text-sm text-gray-700 leading-tight">
                          {trip.dropoffLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {trip.comment && (
                  <div className="mb-4 text-sm text-gray-500 italic">"{trip.comment}"</div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <PreferenceRow prefs={trip.preferences} />
                  {!isMyTrip && myBookingId && (
                    <Button
                      onClick={() => handleCancelBooking(myBookingId)}
                      variant="danger"
                      className="px-4 py-2 text-sm"
                      loading={cancelingId === myBookingId}
                    >
                      Отменить
                    </Button>
                  )}
                  {!isMyTrip && !myBookingId && (
                    <Button
                      onClick={() => handleJoin(trip.id)}
                      disabled={isFull || isBooked}
                      variant={isFull ? 'ghost' : 'primary'}
                      className="px-4 py-2 text-sm"
                      loading={joiningId === trip.id}
                    >
                      {isBooked ? 'Вы записаны' : isFull ? 'Занято' : 'Поехать'}
                    </Button>
                  )}
                </div>
              </Card>
            </SwipeActionWrapper>
          );
        })
      )}
    </div>
  );
}
