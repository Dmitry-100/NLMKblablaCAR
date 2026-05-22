import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Trophy } from 'lucide-react';
import { Button, Card, EmptyState } from '../../components/ui';
import { Trip, User } from '../../types';
import { getCityName } from '../../utils/helpers';
import {
  insightsPeriodOptions,
  isTripInInsightsPeriod,
  useInsightsPeriod,
} from './InsightsPeriodContext';
import { RouteSvgChart } from './RouteSvgChart';
import { WeekdaySvgChart } from './WeekdaySvgChart';

interface StatsDashboardProps {
  trips: Trip[];
  user: User;
}

const weekOrder = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function StatsDashboard({ trips, user }: StatsDashboardProps) {
  const { period, setPeriod } = useInsightsPeriod();
  const [topRoutesLimit, setTopRoutesLimit] = useState<5 | 8 | 12>(8);

  const filteredTrips = useMemo(
    () => trips.filter(trip => isTripInInsightsPeriod(trip, period)),
    [period, trips]
  );

  const myTrips = useMemo(
    () =>
      filteredTrips.filter(
        trip =>
          trip.driverId === user.id || trip.passengers?.some(passenger => passenger.id === user.id)
      ),
    [filteredTrips, user.id]
  );

  const stats = useMemo(() => {
    const byWeekday = new Map<string, number>(weekOrder.map(day => [day, 0]));
    const routeMap = new Map<string, number>();
    const driverMap = new Map<string, { name: string; count: number }>();

    for (const trip of filteredTrips) {
      const day = new Date(trip.date).getDay();
      const idx = (day + 6) % 7;
      const weekday = weekOrder[idx];
      byWeekday.set(weekday, (byWeekday.get(weekday) ?? 0) + 1);

      const route = `${getCityName(trip.from)} → ${getCityName(trip.to)}`;
      routeMap.set(route, (routeMap.get(route) ?? 0) + 1);

      const existingDriver = driverMap.get(trip.driverId);
      if (existingDriver) {
        existingDriver.count += 1;
      } else {
        driverMap.set(trip.driverId, { name: trip.driver.name, count: 1 });
      }
    }

    return {
      byWeekday: weekOrder.map(day => ({ day, count: byWeekday.get(day) ?? 0 })),
      topRoutes: [...routeMap.entries()]
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count),
      topDrivers: [...driverMap.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    };
  }, [filteredTrips]);

  const personal = useMemo(() => {
    const driven = myTrips.filter(trip => trip.driverId === user.id).length;
    const passenger = myTrips.length - driven;
    const co2Saved = Math.round(myTrips.length * 4.2);
    return { total: myTrips.length, driven, passenger, co2Saved };
  }, [myTrips, user.id]);

  const topRoutes = useMemo(
    () => stats.topRoutes.slice(0, topRoutesLimit),
    [stats.topRoutes, topRoutesLimit]
  );

  if (trips.length === 0) {
    return (
      <div className="pb-24 animate-fade-in">
        <EmptyState
          title="Недостаточно данных"
          description="Когда появятся поездки, здесь будут графики и статистика."
          icon={BarChart3}
        />
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-5 animate-fade-in">
      <header className="flex items-center gap-3">
        <div className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3 text-[color:var(--steel-blue)]">
          <BarChart3 size={26} />
        </div>
        <div>
          <p className="industrial-kicker mb-1">Аналитика</p>
          <h1 className="industrial-page-title">Дашборд статистики</h1>
          <p className="industrial-muted mt-1 text-sm">Поездки, маршруты, активность водителей</p>
        </div>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
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
      </Card>

      {filteredTrips.length === 0 ? (
        <Card>
          <EmptyState
            title="За этот период поездок нет"
            description="Выберите более длинный период, чтобы увидеть статистику."
            icon={BarChart3}
            action={
              <Button variant="secondary" onClick={() => setPeriod('all')}>
                Показать всё время
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                Мои поездки
              </p>
              <p className="text-2xl font-semibold text-[color:var(--app-text)]">
                {personal.total}
              </p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                Как водитель
              </p>
              <p className="text-2xl font-semibold text-[color:var(--app-text)]">
                {personal.driven}
              </p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                Как пассажир
              </p>
              <p className="text-2xl font-semibold text-[color:var(--app-text)]">
                {personal.passenger}
              </p>
            </Card>
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                CO2 сэкономлено
              </p>
              <p className="text-2xl font-semibold text-[color:var(--success)]">
                ~{personal.co2Saved} кг
              </p>
            </Card>
          </div>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[color:var(--app-text)]">
              <TrendingUp size={16} className="text-[color:var(--steel-blue)]" /> Поездки по дням
              недели
            </h2>
            <WeekdaySvgChart data={stats.byWeekday} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[color:var(--app-text)]">
                  Популярные маршруты
                </h2>
                <div className="inline-flex rounded-md border border-[color:var(--app-border)] p-1">
                  {[5, 8, 12].map(limit => (
                    <button
                      key={`top-routes-${limit}`}
                      type="button"
                      onClick={() => setTopRoutesLimit(limit as 5 | 8 | 12)}
                      className={`rounded-sm px-2 py-0.5 text-xs transition ${
                        topRoutesLimit === limit
                          ? 'bg-[color:var(--app-text)] text-[color:var(--app-surface-strong)]'
                          : 'text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]'
                      }`}
                    >
                      top {limit}
                    </button>
                  ))}
                </div>
              </div>
              <RouteSvgChart data={topRoutes} />
            </Card>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[color:var(--app-text)]">
                <Trophy size={16} className="text-amber-500" /> Рейтинг водителей по поездкам
              </h2>
              <div className="space-y-2">
                {stats.topDrivers.map((driver, idx) => (
                  <div
                    key={driver.name}
                    className="flex items-center justify-between rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-2"
                  >
                    <span className="text-sm text-[color:var(--app-text)]">
                      {idx + 1}. {driver.name}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {driver.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
