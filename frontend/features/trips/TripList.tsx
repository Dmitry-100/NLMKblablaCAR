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
    <div className="relative overflow-hidden rounded-xl">
      {enabled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end bg-[color:var(--app-surface-soft)] px-4 text-[color:var(--success)]">
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
      <div className="grid gap-4 animate-fade-in">
        {Array.from({ length: 3 }).map((_, index) => (
          <TripCardSkeleton key={`trip-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 animate-fade-in">
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
              <Card className="route-card relative group overflow-hidden">
                <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge color={trip.from === City.Moscow ? 'blue' : 'pink'}>
                        {getCityName(trip.from)} → {getCityName(trip.to)}
                      </Badge>
                      {trip.isReturn && <Badge color="gray">Обратно</Badge>}
                      {isMyTrip && <Badge color="green">Ваша поездка</Badge>}
                      {new Date(`${trip.date}T${trip.time}`).getTime() - Date.now() < 7200000 &&
                        new Date(`${trip.date}T${trip.time}`).getTime() > Date.now() && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--warning)] animate-pulse">
                            <Clock size={12} /> Скоро отправление
                          </span>
                        )}
                    </div>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="industrial-kicker mb-1">Отправление</p>
                        <h3 className="text-3xl font-light leading-tight text-[color:var(--app-text)]">
                          {formatTime(trip.time)}
                        </h3>
                        <p className="text-sm text-[color:var(--app-text-muted)]">
                          {formatDate(trip.date)}
                        </p>
                      </div>
                      <Link
                        to={`/user/${trip.driver.id}`}
                        className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-surface-soft)]"
                      >
                        <Avatar src={trip.driver.avatarUrl} alt={trip.driver.name} size={38} />
                        <div>
                          <p className="text-sm font-medium text-[color:var(--app-text)] hover:text-[color:var(--steel-blue)]">
                            {trip.driver.name}
                          </p>
                          <p className="text-xs text-[color:var(--app-text-muted)]">
                            ★ {trip.driver.rating.toFixed(1)} водитель
                          </p>
                        </div>
                      </Link>
                    </div>

                    <div className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-3 w-3 rounded-full border-2 border-[color:var(--app-surface-strong)] bg-[color:var(--steel-blue)]"></div>
                            <div className="route-line h-7 w-0.5"></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="mb-0.5 text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                              Откуда
                            </p>
                            <p className="text-sm leading-tight text-[color:var(--app-text)]">
                              {trip.pickupLocation}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-3 w-3 rounded-full border-2 border-[color:var(--app-surface-strong)] bg-[color:var(--app-text)]"></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="mb-0.5 text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                              Куда
                            </p>
                            <p className="text-sm leading-tight text-[color:var(--app-text)]">
                              {trip.dropoffLocation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {passengers.length > 0 && (
                      <div className="mt-4 rounded-lg border border-[color:var(--app-border)] p-3">
                        <div className="mb-2 flex items-center gap-2 text-sm text-[color:var(--success)]">
                          <Users size={14} />
                          <span className="font-medium">Пассажиры ({passengers.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {passengers.map(p => (
                            <Link
                              key={p.id}
                              to={`/user/${p.id}`}
                              className="flex items-center gap-2 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-2 py-1 transition-colors hover:border-[color:var(--steel-blue)]"
                            >
                              <Avatar src={p.avatarUrl} alt={p.name} size={24} />
                              <span className="text-xs text-[color:var(--app-text)]">{p.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {trip.comment && (
                      <div className="mt-4 border-l-2 border-[color:var(--app-border-strong)] pl-3 text-sm italic text-[color:var(--app-text-muted)]">
                        "{trip.comment}"
                      </div>
                    )}

                    <div className="mt-4 border-t border-[color:var(--app-border)] pt-4">
                      <PreferenceRow prefs={trip.preferences} />
                    </div>
                  </div>

                  <aside className="flex flex-col justify-between rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                        Свободно
                      </p>
                      <div className="mt-1 text-4xl font-light text-[color:var(--app-text)]">
                        {availableSeats}
                      </div>
                      <p className="text-xs text-[color:var(--app-text-muted)]">
                        из {maxPassengers} пассажирских мест
                      </p>
                    </div>

                    <div className="mt-5 space-y-2">
                      {isMyTrip && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onEdit(trip);
                            }}
                            className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-2 text-[color:var(--steel-blue)] transition-colors hover:border-[color:var(--steel-blue)]"
                            title="Редактировать"
                          >
                            <Edit2 size={18} className="mx-auto" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDelete(trip.id);
                            }}
                            className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-2 text-[color:var(--danger)] transition-colors hover:border-[color:var(--danger)]"
                            disabled={deletingId === trip.id}
                            title="Удалить"
                          >
                            {deletingId === trip.id ? (
                              <Loader2 size={18} className="mx-auto animate-spin" />
                            ) : (
                              <Trash2 size={18} className="mx-auto" />
                            )}
                          </button>
                        </div>
                      )}
                      {!isMyTrip && myBookingId && (
                        <Button
                          onClick={() => handleCancelBooking(myBookingId)}
                          variant="danger"
                          className="w-full px-4 py-2 text-sm"
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
                          className="w-full px-4 py-2 text-sm"
                          loading={joiningId === trip.id}
                        >
                          {isBooked ? 'Вы записаны' : isFull ? 'Занято' : 'Поехать'}
                        </Button>
                      )}
                    </div>
                  </aside>
                </div>
              </Card>
            </SwipeActionWrapper>
          );
        })
      )}
    </div>
  );
}
