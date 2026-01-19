# ADR-010: Монолитный App.tsx компонент

**Статус:** Принято (требует рефакторинга)
**Дата:** 2024-01
**Автор:** Команда разработки

## Контекст

При разработке MVP frontend-приложения необходимо было быстро создать работающий прототип с множеством экранов:
- Авторизация
- Список поездок
- Создание поездки
- Детали поездки
- Профиль пользователя
- AI-ассистент

Ограниченные сроки и небольшая команда требовали быстрого прототипирования.

## Решение

Весь UI реализован в **одном файле App.tsx** (~1933 строки), включающем:
- Все экраны приложения
- Модальные окна
- Формы
- Состояние приложения
- Обработчики событий

```
frontend/App.tsx (1933 lines)
├── State declarations (useState hooks)
├── useEffect for data loading
├── Event handlers
├── LoginScreen component
├── HomeScreen component
├── CreateTripScreen component
├── TripDetailsScreen component
├── ProfileScreen component
├── AssistantModal component
├── ReviewModal component
└── Main render with Router
```

### Структура файла

```typescript
// App.tsx - упрощенная структура
function App() {
  // 1. State (~50 lines)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  // ... еще 15+ useState

  // 2. Effects (~100 lines)
  useEffect(() => { /* load user */ }, []);
  useEffect(() => { /* load trips */ }, [currentUser]);

  // 3. Handlers (~300 lines)
  const handleLogin = async (email: string) => { ... };
  const handleBookTrip = async (tripId: string) => { ... };
  // ... еще 20+ handlers

  // 4. Inline components (~1400 lines)
  const LoginScreen = () => ( ... );
  const HomeScreen = () => ( ... );
  const CreateTripScreen = () => ( ... );
  // ...

  // 5. Main render
  return (
    <HashRouter>
      <Routes>
        {!currentUser ? <LoginScreen /> : (
          <>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/create" element={<CreateTripScreen />} />
            ...
          </>
        )}
      </Routes>
    </HashRouter>
  );
}
```

## Альтернативы

### 1. Feature-based структура
```
src/
├── features/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── useAuth.ts
│   │   └── authApi.ts
│   ├── trips/
│   │   ├── TripsList.tsx
│   │   ├── TripDetails.tsx
│   │   └── useTrips.ts
│   └── profile/
│       └── ProfileScreen.tsx
├── shared/
│   ├── components/
│   └── hooks/
└── App.tsx (только роутинг)
```
- **Плюсы**: Четкое разделение, переиспользуемость, тестируемость
- **Минусы**: Больше файлов, начальная настройка

### 2. Page-based структура
```
src/
├── pages/
│   ├── Login.tsx
│   ├── Home.tsx
│   ├── CreateTrip.tsx
│   └── Profile.tsx
├── components/
└── hooks/
```
- **Плюсы**: Простая навигация по коду, понятная структура
- **Минусы**: Может привести к дублированию

### 3. Atomic Design
```
src/
├── atoms/       (Button, Input, Icon)
├── molecules/   (SearchBar, TripCard)
├── organisms/   (TripsList, Header)
├── templates/   (PageLayout)
└── pages/       (Home, Profile)
```
- **Плюсы**: Системный подход, design system
- **Минусы**: Избыточен для небольших проектов

## Последствия

### Положительные
- **Быстрый старт**: Минимум boilerplate для MVP
- **Простота навигации**: Все в одном месте
- **Нет prop drilling**: Состояние доступно везде
- **Быстрые изменения**: Не нужно переключаться между файлами

### Отрицательные
- **Плохая читаемость**: 1933 строки сложно охватить
- **Нет переиспользования**: Компоненты нельзя импортировать
- **Сложное тестирование**: Невозможно тестировать изолированно
- **Медленный HMR**: Любое изменение перезагружает весь файл
- **Git конфликты**: Все работают в одном файле
- **Performance**: Все компоненты пересоздаются при каждом рендере

### Метрики качества кода

| Метрика | Текущее | Целевое |
|---------|---------|---------|
| Строк в файле | 1933 | < 300 |
| Компонентов в файле | 12 | 1 |
| useState hooks | 18 | 3-5 |
| Цикломатическая сложность | Высокая | Низкая |

### План рефакторинга

```
Этап 1: Выделение экранов
├── pages/LoginScreen.tsx
├── pages/HomeScreen.tsx
├── pages/CreateTripScreen.tsx
├── pages/TripDetailsScreen.tsx
└── pages/ProfileScreen.tsx

Этап 2: Выделение состояния
├── hooks/useAuth.ts
├── hooks/useTrips.ts
├── hooks/useBookings.ts
└── context/AppContext.tsx

Этап 3: Выделение компонентов
├── components/TripCard.tsx
├── components/ReviewModal.tsx
├── components/AssistantModal.tsx
└── components/PreferenceSelector.tsx

Этап 4: Тесты
├── __tests__/LoginScreen.test.tsx
├── __tests__/useAuth.test.ts
└── __tests__/TripCard.test.tsx
```

### Технический долг

- [ ] **Высокий приоритет**: Выделить экраны в отдельные файлы
- [ ] Создать custom hooks для бизнес-логики
- [ ] Добавить React.memo для оптимизации
- [ ] Настроить code splitting (lazy loading)
- [ ] Добавить unit тесты для компонентов

## Связанные решения

- ADR-011: React Context вместо Redux
- ADR-009: React + Vite
