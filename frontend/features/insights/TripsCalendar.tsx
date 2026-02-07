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
        <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-600">
          <CalendarDays size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Календарь поездок</h1>
          <p className="text-sm text-slate-500">Месячный обзор ваших поездок</p>
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
                  ? 'bg-sky-500 text-white'
                  : 'app-surface-soft app-text-muted border border-transparent hover:border-slate-200'
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
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-medium text-slate-800">
            {currentMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            type="button"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Следующий месяц"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
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
                className={`relative min-h-16 rounded-xl border p-1 transition ${
                  isSelected
                    ? 'border-sky-400 bg-sky-50'
                    : cell.inMonth
                      ? 'border-slate-100 bg-white hover:border-slate-200'
                      : 'border-transparent bg-slate-50 text-slate-300'
                }`}
              >
                <div className={`text-sm ${isToday ? 'font-bold text-sky-600' : 'text-slate-700'}`}>
                  {cell.date.getDate()}
                </div>
                {tripsCount > 0 && (
                  <div className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {tripsCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
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
                <div key={trip.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-700">
                      {getCityName(trip.from)} → {getCityName(trip.to)}
                    </div>
                    <span className="text-xs text-slate-500">{formatTime(trip.time)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
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
