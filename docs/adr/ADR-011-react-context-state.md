# ADR-011: React Context для управления состоянием

**Статус:** Принято
**Дата:** 2024-01
**Автор:** Команда разработки

## Контекст

Frontend приложения требует управления глобальным состоянием:
- Текущий пользователь (аутентификация)
- Список поездок
- Бронирования пользователя
- Ожидающие отзывы
- Инициализация Yandex Maps API

Необходимо выбрать подход к state management, который обеспечит:
- Доступ к данным из любого компонента
- Реактивное обновление UI
- Простоту реализации для MVP

## Решение

Выбран **React Context API** в сочетании с локальным состоянием (useState) без внешних библиотек.

### Архитектура состояния

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
├─────────────────────────────────────────────────────────────┤
│  useState:                                                   │
│  ├── currentUser: User | null                               │
│  ├── trips: Trip[]                                          │
│  ├── bookings: Booking[]                                    │
│  ├── pendingReviews: PendingReview[]                        │
│  └── isLoading: boolean                                     │
├─────────────────────────────────────────────────────────────┤
│  Handlers (передаются через props):                         │
│  ├── handleLogin(email)                                     │
│  ├── handleLogout()                                         │
│  ├── handleBookTrip(tripId)                                 │
│  └── handleSubmitReview(reviewData)                         │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ Screen A │        │ Screen B │        │ Screen C │
   │ (props)  │        │ (props)  │        │ (props)  │
   └──────────┘        └──────────┘        └──────────┘
```

### React Context для Yandex Maps

```typescript
// services/YandexMapsProvider.tsx
const YandexMapsContext = createContext<YandexMapsContextType | null>(null);

export function YandexMapsProvider({ children }) {
  const [ymaps, setYmaps] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadYandexMapsScript(apiKey)
      .then(instance => {
        setYmaps(instance);
        setIsLoaded(true);
      })
      .catch(setError);
  }, []);

  return (
    <YandexMapsContext.Provider value={{ ymaps, isLoaded, error }}>
      {children}
    </YandexMapsContext.Provider>
  );
}

// Использование
const { ymaps, isLoaded } = useYandexMaps();
```

## Альтернативы

### 1. Redux / Redux Toolkit
```typescript
// store.ts
const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    bookings: bookingsReducer
  }
});
```
- **Плюсы**: Предсказуемость, DevTools, middleware, time-travel debugging
- **Минусы**: Boilerplate, learning curve, избыточен для MVP

### 2. Zustand
```typescript
const useStore = create((set) => ({
  user: null,
  trips: [],
  setUser: (user) => set({ user }),
  addTrip: (trip) => set((state) => ({ trips: [...state.trips, trip] }))
}));
```
- **Плюсы**: Минимальный API, нет boilerplate, хорошая производительность
- **Минусы**: Дополнительная зависимость, менее известен

### 3. Jotai / Recoil
```typescript
const userAtom = atom<User | null>(null);
const tripsAtom = atom<Trip[]>([]);
```
- **Плюсы**: Атомарный подход, fine-grained updates
- **Минусы**: Другая ментальная модель, меньше документации

### 4. TanStack Query (React Query)
```typescript
const { data: trips } = useQuery({
  queryKey: ['trips'],
  queryFn: () => api.getTrips()
});
```
- **Плюсы**: Кэширование, автообновление, оптимистичные обновления
- **Минусы**: Только для server state, нужен для client state

## Последствия

### Положительные
- **Нулевые зависимости**: Встроено в React
- **Простота**: Понятный API (useState + useContext)
- **Быстрый старт**: Не нужна настройка store
- **Гибкость**: Легко комбинировать с другими подходами

### Отрицательные
- **Re-renders**: Любое изменение context перерисовывает всех потребителей
- **Нет middleware**: Нельзя добавить логирование, persistence
- **Нет DevTools**: Сложнее отлаживать состояние
- **Prop drilling**: Часть данных всё равно передаётся через props
- **Нет оптимистичных обновлений**: Ждём ответа сервера

### Проблемы производительности

```typescript
// Проблема: весь App перерисовывается при любом изменении
const [trips, setTrips] = useState<Trip[]>([]);
const [user, setUser] = useState<User | null>(null);

// При setTrips([...]) все компоненты, использующие user, тоже перерисуются
```

**Решение** (не реализовано):
```typescript
// Разделить контексты
const UserContext = createContext<User | null>(null);
const TripsContext = createContext<Trip[]>([]);

// Или использовать useMemo/React.memo
const MemoizedTripCard = React.memo(TripCard);
```

### Сравнение подходов

| Критерий | Context | Redux | Zustand | React Query |
|----------|---------|-------|---------|-------------|
| Boilerplate | Низкий | Высокий | Низкий | Средний |
| Производительность | Средняя | Высокая | Высокая | Высокая |
| DevTools | Нет | Да | Да | Да |
| Server state | Нет | Частично | Нет | Да |
| Learning curve | Низкая | Высокая | Низкая | Средняя |
| Bundle size | 0 KB | ~15 KB | ~3 KB | ~12 KB |

### Рекомендации по миграции

```
Текущее состояние (Context + useState)
    │
    ▼
Этап 1: Разделить контексты
    ├── AuthContext (user, login, logout)
    ├── TripsContext (trips, filters)
    └── BookingsContext (bookings)
    │
    ▼
Этап 2: Добавить React Query для server state
    ├── useQuery для GET запросов
    ├── useMutation для POST/PUT/DELETE
    └── Автоматическое кэширование
    │
    ▼
Этап 3 (опционально): Zustand для client state
    └── UI state (modals, filters, preferences)
```

### Технический долг

- [ ] Разделить один большой контекст на несколько маленьких
- [ ] Добавить React.memo для предотвращения лишних рендеров
- [ ] Рассмотреть React Query для server state
- [ ] Добавить persistence (localStorage) для офлайн-режима

## Связанные решения

- ADR-010: Монолитный App.tsx компонент
- ADR-009: React + Vite
