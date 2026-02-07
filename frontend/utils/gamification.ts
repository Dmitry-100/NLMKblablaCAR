import { PassengerRequest, Review, Trip, User } from '../types';

export type UserLevel = 'Новичок' | 'Опытный' | 'Эксперт';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface UserProgress {
  points: number;
  level: UserLevel;
  nextLevelAt: number | null;
  currentStreak: number;
  bestStreak: number;
  achievements: Achievement[];
  unlockedCount: number;
}

interface ProgressInput {
  user: User;
  trips: Trip[];
  reviews?: Review[];
  requests?: PassengerRequest[];
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeStreaks(dateKeys: string[]): { currentStreak: number; bestStreak: number } {
  if (dateKeys.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const daySet = new Set(dateKeys);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let current = 0;
  const cursor = new Date(start);
  while (daySet.has(toDateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...daySet].sort();
  let best = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  return { currentStreak: current, bestStreak: best };
}

function getLevel(points: number): { level: UserLevel; nextLevelAt: number | null } {
  if (points >= 1200) return { level: 'Эксперт', nextLevelAt: null };
  if (points >= 450) return { level: 'Опытный', nextLevelAt: 1200 };
  return { level: 'Новичок', nextLevelAt: 450 };
}

export function getUserProgress({
  user,
  trips,
  reviews = [],
  requests = [],
}: ProgressInput): UserProgress {
  const myTrips = trips.filter(
    t => t.driverId === user.id || t.passengers?.some(p => p.id === user.id)
  );
  const driverTrips = trips.filter(t => t.driverId === user.id);
  const passengerTrips = myTrips.filter(t => t.driverId !== user.id);

  const totalPassengers = driverTrips.reduce(
    (sum, t) => sum + (t.passengers?.length ?? t.seatsBooked ?? 0),
    0
  );
  const uniqueRouteCount = new Set(myTrips.map(t => `${t.from}-${t.to}`)).size;
  const earlyTrips = myTrips.filter(t => t.time <= '08:30').length;
  const weekendTrips = myTrips.filter(t => {
    const day = new Date(t.date).getDay();
    return day === 0 || day === 6;
  }).length;
  const longComments = myTrips.filter(t => (t.comment || '').trim().length >= 40).length;
  const highRatedReviews = reviews.filter(r => r.rating >= 5).length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;

  const uniqueTripDays = Array.from(new Set(myTrips.map(t => t.date)));
  const { currentStreak, bestStreak } = computeStreaks(uniqueTripDays);

  const points =
    myTrips.length * 35 +
    driverTrips.length * 20 +
    totalPassengers * 25 +
    Math.round(user.rating * 12) +
    bestStreak * 30 +
    highRatedReviews * 10;

  const { level, nextLevelAt } = getLevel(points);

  const achievements: Achievement[] = [
    {
      id: 'first-trip',
      title: 'Первая поездка',
      description: 'Опубликовали или совершили первую поездку',
      icon: '🚗',
      unlocked: myTrips.length >= 1,
    },
    {
      id: 'five-trips',
      title: 'Первые 5 поездок',
      description: '5 завершенных поездок в истории',
      icon: '🛣️',
      unlocked: myTrips.length >= 5,
    },
    {
      id: 'route-regular',
      title: 'Маршрутный регуляр',
      description: '10 поездок на платформе',
      icon: '📍',
      unlocked: myTrips.length >= 10,
    },
    {
      id: 'ten-passengers',
      title: '10 пассажиров',
      description: 'Подвезли минимум 10 человек',
      icon: '👥',
      unlocked: totalPassengers >= 10,
    },
    {
      id: 'twenty-five-passengers',
      title: '25 пассажиров',
      description: 'Сильный вклад в карпулинг-комьюнити',
      icon: '🚌',
      unlocked: totalPassengers >= 25,
    },
    {
      id: 'eco',
      title: 'Экологичный',
      description: '5+ совместных поездок с пассажирами',
      icon: '🌿',
      unlocked:
        driverTrips.filter(t => (t.passengers?.length ?? t.seatsBooked ?? 0) > 0).length >= 5,
    },
    {
      id: 'mentor-driver',
      title: 'Наставник водителей',
      description: '15 поездок в роли водителя',
      icon: '🧭',
      unlocked: driverTrips.length >= 15,
    },
    {
      id: 'stable-rating',
      title: 'Стабильный рейтинг',
      description: 'Рейтинг 4.8 и выше',
      icon: '⭐',
      unlocked: user.rating >= 4.8,
    },
    {
      id: 'five-stars',
      title: 'Пять звезд',
      description: '10 отзывов с оценкой 5',
      icon: '✨',
      unlocked: highRatedReviews >= 10,
    },
    {
      id: 'streak-3',
      title: 'Серия x3',
      description: '3 дня подряд с поездками',
      icon: '🔥',
      unlocked: bestStreak >= 3,
    },
    {
      id: 'streak-7',
      title: 'Серия x7',
      description: '7 дней подряд с поездками',
      icon: '🔥',
      unlocked: bestStreak >= 7,
    },
    {
      id: 'streak-14',
      title: 'Серия x14',
      description: '14 дней подряд с поездками',
      icon: '🏁',
      unlocked: bestStreak >= 14,
    },
    {
      id: 'early-bird',
      title: 'Ранняя пташка',
      description: '5 поездок до 08:30',
      icon: '🌅',
      unlocked: earlyTrips >= 5,
    },
    {
      id: 'weekend-hero',
      title: 'Герой выходных',
      description: '3 поездки в выходные',
      icon: '🎉',
      unlocked: weekendTrips >= 3,
    },
    {
      id: 'multiroute',
      title: 'Исследователь маршрутов',
      description: '3 уникальных направления',
      icon: '🧳',
      unlocked: uniqueRouteCount >= 3,
    },
    {
      id: 'well-documented',
      title: 'Подробные поездки',
      description: '5 поездок с развернутым комментарием',
      icon: '📝',
      unlocked: longComments >= 5,
    },
    {
      id: 'active-passenger',
      title: 'Активный пассажир',
      description: '8 поездок в роли пассажира',
      icon: '🙌',
      unlocked: passengerTrips.length >= 8,
    },
    {
      id: 'request-pro',
      title: 'Планировщик',
      description: 'Есть активные заявки на поездки',
      icon: '📌',
      unlocked: pendingRequests >= 1,
    },
  ];

  return {
    points,
    level,
    nextLevelAt,
    currentStreak,
    bestStreak,
    achievements,
    unlockedCount: achievements.filter(a => a.unlocked).length,
  };
}
