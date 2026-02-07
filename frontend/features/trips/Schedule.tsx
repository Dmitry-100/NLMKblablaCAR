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
      className="pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="sticky top-0 z-10 -mt-4 mb-3 flex justify-center"
          style={{ height: `${Math.max(20, pullDistance)}px` }}
        >
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-500 shadow-sm">
            <Loader2 size={14} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
            {isRefreshing
              ? 'Обновляем...'
              : pullDistance >= triggerPull
                ? 'Отпустите, чтобы обновить'
                : 'Потяните вниз для обновления'}
          </div>
        </div>
      )}
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-light text-slate-800">Расписание</h1>
          <p className="text-sm text-gray-400">Корпоративный карпулинг</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterDir('all')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-gray-600'}`}
          >
            Все поездки
          </button>
          <button
            onClick={() => setFilterDir('my-trips')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'my-trips' ? 'bg-green-500 text-white' : 'bg-white text-gray-600'}`}
          >
            Мои поездки
          </button>
          <button
            onClick={() => setFilterDir('moscow-lipetsk')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'moscow-lipetsk' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'}`}
          >
            Москва → Липецк
          </button>
          <button
            onClick={() => setFilterDir('lipetsk-moscow')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'lipetsk-moscow' ? 'bg-pink-500 text-white' : 'bg-white text-gray-600'}`}
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
              className="pl-8 pr-4 py-2 bg-white rounded-xl text-sm text-gray-600 shadow-sm border border-transparent focus:border-sky-300 outline-none w-full"
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
              className="pl-8 pr-4 py-2 bg-white rounded-xl text-sm text-gray-600 shadow-sm border border-transparent focus:border-sky-300 outline-none w-full"
              placeholder="Конец"
            />
          </div>
          {(filterDateStart || filterDateEnd) && (
            <button
              onClick={() => {
                setFilterDateStart('');
                setFilterDateEnd('');
              }}
              className="px-3 py-2 text-gray-500 bg-white rounded-xl shadow-sm hover:bg-gray-100"
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
