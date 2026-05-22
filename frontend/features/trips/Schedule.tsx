import React, { useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { City, Trip, User } from '../../types';
import { hapticSuccess } from '../../utils/haptics';
import { TripList } from './TripList';

interface ScheduleProps {
  trips: Trip[];
  joinTrip: (id: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  onEdit: (trip: Trip) => void;
  user: User;
  loading: boolean;
  onRefresh?: () => Promise<void>;
}

export function Schedule({
  trips,
  joinTrip,
  cancelBooking,
  deleteTrip,
  onEdit,
  user,
  loading,
  onRefresh,
}: ScheduleProps) {
  const [filterDir, setFilterDir] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredTrips = useMemo(() => {
    const nowTs = Date.now();
    return trips
      .filter(t => {
        const tripTs = new Date(`${t.date}T${t.time}`).getTime();
        if (Number.isNaN(tripTs) || tripTs < nowTs) return false;

        if (filterDir === 'my-trips') {
          const isDriver = t.driverId === user.id;
          const isPassenger = t.passengers?.some(p => p.id === user.id);
          if (!isDriver && !isPassenger) return false;
        }

        if (filterDir === 'moscow-lipetsk' && t.from !== City.Moscow) return false;
        if (filterDir === 'lipetsk-moscow' && t.from !== City.Lipetsk) return false;

        if (filterDateStart && t.date < filterDateStart) return false;
        if (filterDateEnd && t.date > filterDateEnd) return false;

        return true;
      })
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      );
  }, [trips, filterDir, filterDateStart, filterDateEnd, user.id]);

  const canPull = typeof window !== 'undefined' && window.scrollY <= 0;
  const maxPull = 100;
  const triggerPull = 72;

  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = e => {
    if (isRefreshing || !canPull || !onRefresh) return;
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove: React.TouchEventHandler<HTMLDivElement> = e => {
    if (touchStartY === null || isRefreshing || !onRefresh) return;
    const delta = e.touches[0].clientY - touchStartY;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    setPullDistance(Math.min(maxPull, delta * 0.6));
  };

  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = async () => {
    if (!onRefresh) return;
    const shouldRefresh = pullDistance >= triggerPull;
    setTouchStartY(null);
    setPullDistance(0);
    if (!shouldRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      hapticSuccess();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      className="pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="sticky top-0 z-10 -mt-4 mb-3 flex justify-center"
          style={{ height: `${Math.max(20, pullDistance)}px` }}
        >
          <div className="app-surface flex items-center gap-2 rounded-md border px-3 py-1 text-xs text-[color:var(--app-text-muted)] shadow-sm">
            <Loader2
              size={14}
              className={isRefreshing ? 'animate-spin text-[color:var(--steel-blue)]' : ''}
            />
            {isRefreshing
              ? 'Обновляем...'
              : pullDistance >= triggerPull
                ? 'Отпустите, чтобы обновить'
                : 'Потяните вниз для обновления'}
          </div>
        </div>
      )}
      <header className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="industrial-kicker mb-2">Операционный список</p>
          <h1 className="industrial-page-title">Будущие поездки</h1>
          <p className="industrial-muted mt-2 text-sm">
            Корпоративный карпулинг Москва ↔ Липецк, только актуальные рейсы.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div className="metric-tile px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-[color:var(--app-text-muted)]">
              В списке
            </p>
            <p className="text-xl font-semibold text-[color:var(--app-text)]">
              {filteredTrips.length}
            </p>
          </div>
          <div className="metric-tile px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-[color:var(--app-text-muted)]">
              Москва
            </p>
            <p className="text-xl font-semibold text-[color:var(--app-text)]">
              {filteredTrips.filter(t => t.from === City.Moscow).length}
            </p>
          </div>
          <div className="metric-tile hidden px-3 py-2 sm:block">
            <p className="text-[11px] uppercase tracking-wide text-[color:var(--app-text-muted)]">
              Липецк
            </p>
            <p className="text-xl font-semibold text-[color:var(--app-text)]">
              {filteredTrips.filter(t => t.from === City.Lipetsk).length}
            </p>
          </div>
        </div>
      </header>

      <div className="app-surface mb-6 flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterDir('all')}
            className={`industrial-chip px-4 py-2 text-sm whitespace-nowrap transition-colors ${filterDir === 'all' ? 'industrial-chip-active' : 'hover:border-[color:var(--app-border-strong)]'}`}
          >
            Все поездки
          </button>
          <button
            onClick={() => setFilterDir('my-trips')}
            className={`industrial-chip px-4 py-2 text-sm whitespace-nowrap transition-colors ${filterDir === 'my-trips' ? 'industrial-chip-active' : 'hover:border-[color:var(--app-border-strong)]'}`}
          >
            Мои поездки
          </button>
          <button
            onClick={() => setFilterDir('moscow-lipetsk')}
            className={`industrial-chip px-4 py-2 text-sm whitespace-nowrap transition-colors ${filterDir === 'moscow-lipetsk' ? 'industrial-chip-active' : 'hover:border-[color:var(--app-border-strong)]'}`}
          >
            Москва → Липецк
          </button>
          <button
            onClick={() => setFilterDir('lipetsk-moscow')}
            className={`industrial-chip px-4 py-2 text-sm whitespace-nowrap transition-colors ${filterDir === 'lipetsk-moscow' ? 'industrial-chip-active' : 'hover:border-[color:var(--app-border-strong)]'}`}
          >
            Липецк → Москва
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-400">C</span>
            </div>
            <input
              type="date"
              value={filterDateStart}
              onChange={e => setFilterDateStart(e.target.value)}
              className="industrial-input py-2 pl-8 pr-4 text-sm"
              placeholder="Начало"
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-400">По</span>
            </div>
            <input
              type="date"
              value={filterDateEnd}
              onChange={e => setFilterDateEnd(e.target.value)}
              className="industrial-input py-2 pl-8 pr-4 text-sm"
              placeholder="Конец"
            />
          </div>
          {(filterDateStart || filterDateEnd) && (
            <button
              onClick={() => {
                setFilterDateStart('');
                setFilterDateEnd('');
              }}
              className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-3 py-2 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <TripList
        trips={filteredTrips}
        joinTrip={joinTrip}
        cancelBooking={cancelBooking}
        deleteTrip={deleteTrip}
        onEdit={onEdit}
        user={user}
        loading={loading}
      />
    </div>
  );
}
