import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, EmptyState } from '../../components/ui';
import { Trip, User } from '../../types';
import { formatTime, getCityName } from '../../utils/helpers';
import {
  insightsPeriodOptions,
  isTripInInsightsPeriod,
  useInsightsPeriod,
} from './InsightsPeriodContext';

interface TripsCalendarProps {
  trips: Trip[];
  user: User;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function TripsCalendar({ trips, user }: TripsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));
  const { period, setPeriod } = useInsightsPeriod();

  const myTrips = useMemo(
    () =>
      trips.filter(
        t =>
          (t.driverId === user.id || t.passengers?.some(p => p.id === user.id)) &&
          isTripInInsightsPeriod(t, period)
      ),
    [period, trips, user.id]
  );

  const tripCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const trip of myTrips) {
      map.set(trip.date, (map.get(trip.date) ?? 0) + 1);
    }
    return map;
  }, [myTrips]);

  const monthGrid = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Array<{ date: Date; inMonth: boolean }> = [];

    const leading = (start.getDay() + 6) % 7;
    for (let i = leading - 1; i >= 0; i -= 1) {
      const d = new Date(start);
      d.setDate(start.getDate() - i - 1);
      days.push({ date: d, inMonth: false });
    }

    for (let day = 1; day <= end.getDate(); day += 1) {
      days.push({
        date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
        inMonth: true,
      });
    }

    let trailingOffset = 1;
    while (days.length % 7 !== 0) {
      const d = new Date(end);
      d.setDate(end.getDate() + trailingOffset);
      trailingOffset += 1;
      days.push({ date: d, inMonth: false });
    }

    return days;
  }, [currentMonth]);

  const selectedTrips = useMemo(() => {
    return myTrips
      .filter(t => t.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [myTrips, selectedDate]);

  return (
    <div className="pb-24 space-y-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <div className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3 text-[color:var(--steel-blue)]">
          <CalendarDays size={26} />
        </div>
        <div>
          <p className="industrial-kicker mb-1">Месячный план</p>
          <h1 className="industrial-page-title">Календарь поездок</h1>
          <p className="industrial-muted mt-1 text-sm">Месячный обзор ваших поездок</p>
        </div>
      </header>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {insightsPeriodOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                period === option.value
                  ? 'industrial-chip-active'
                  : 'industrial-chip hover:border-[color:var(--app-border-strong)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
            }
            className="rounded-md p-2 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-medium text-[color:var(--app-text)]">
            {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
            }
            className="rounded-md p-2 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
            aria-label="Следующий месяц"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs text-[color:var(--app-text-muted)]">
          {weekDays.map(day => (
            <div key={day} className="py-2 font-medium">
              {day}
            </div>
          ))}

          {monthGrid.map(cell => {
            const key = toDateKey(cell.date);
            const tripsCount = tripCountByDate.get(key) ?? 0;
            const isToday = key === toDateKey(new Date());
            const isSelected = key === selectedDate;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className={`relative min-h-16 rounded-md border p-1 transition ${
                  isSelected
                    ? 'border-[color:var(--steel-blue)] bg-[color:var(--app-chip)]'
                    : cell.inMonth
                      ? 'border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] hover:border-[color:var(--app-border-strong)]'
                      : 'border-transparent bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)] opacity-50'
                }`}
              >
                <div
                  className={`text-sm ${isToday ? 'font-bold text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text)]'}`}
                >
                  {cell.date.getDate()}
                </div>
                {tripsCount > 0 && (
                  <div className="mt-1 inline-flex rounded-sm bg-[color:var(--success)] px-2 py-0.5 text-[10px] font-medium text-white">
                    {tripsCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-[color:var(--app-text)]">
          Поездки на {new Date(selectedDate).toLocaleDateString('ru-RU')}
        </h3>
        {selectedTrips.length === 0 ? (
          <EmptyState
            title="На выбранную дату поездок нет"
            description="Выберите другой день в календаре или создайте новую поездку."
            icon={CalendarDays}
          />
        ) : (
          <div className="space-y-3">
            {selectedTrips.map(trip => {
              const iAmDriver = trip.driverId === user.id;
              return (
                <div
                  key={trip.id}
                  className="rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-medium text-[color:var(--app-text)]">
                      {getCityName(trip.from)} → {getCityName(trip.to)}
                    </div>
                    <span className="text-xs text-[color:var(--app-text-muted)]">
                      {formatTime(trip.time)}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--app-text-muted)]">
                    {iAmDriver ? 'Вы водитель' : 'Вы пассажир'} • {trip.pickupLocation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
