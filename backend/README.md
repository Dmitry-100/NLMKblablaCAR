# NLMKblablaCAR Backend

Backend API для корпоративного карпулинга NLMK.

## Технологии

- **Node.js + Express** — веб-сервер
- **TypeScript** — типизация
- **Prisma** — ORM для работы с БД
- **PostgreSQL** — база данных (dev/prod)
- **JWT** — авторизация
- **Zod** — валидация данных

## Быстрый старт

### 1. Установка зависимостей

```bash
cd backend
npm install
```

### 2. Настройка окружения

Отредактируйте `.env` файл:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nlmkblablacar"
JWT_SECRET="your-super-secret-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### 3. Инициализация базы данных

```bash
# Генерация Prisma Client
npm run db:generate

# Создание таблиц в БД
npm run db:push
```

### 4. Запуск сервера

```bash
# Режим разработки (с hot reload)
npm run dev

# Или production
npm run build
npm start
```

Сервер будет доступен на `http://localhost:3001`

## API Endpoints

### Авторизация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/login` | Вход по email |
| POST | `/api/auth/register` | Регистрация |
| GET | `/api/auth/me` | Текущий пользователь |

### Пользователи

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/users/:id` | Профиль пользователя |
| PUT | `/api/users/:id` | Обновить профиль |
| GET | `/api/users/:id/trips` | Поездки пользователя |
| GET | `/api/users/:id/bookings` | Бронирования пользователя |

### Поездки

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/trips` | Список поездок |
| GET | `/api/trips/:id` | Детали поездки |
| POST | `/api/trips` | Создать поездку |
| PUT | `/api/trips/:id` | Обновить поездку |
| DELETE | `/api/trips/:id` | Отменить поездку |

**Фильтры для GET /api/trips:**
- `from` — город отправления (Moscow, Lipetsk)
- `to` — город назначения
- `dateFrom` — дата с (YYYY-MM-DD)
- `dateTo` — дата по

### Бронирования

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/bookings` | Забронировать место |
| GET | `/api/bookings/my` | Мои бронирования |
| GET | `/api/bookings/:id` | Детали бронирования |
| DELETE | `/api/bookings/:id` | Отменить бронирование |

## Интеграция с фронтендом

### 1. Замените `services/api.ts`

Скопируйте содержимое `frontend-api.ts` в ваш проект:

```bash
cp frontend-api.ts ../your-frontend/services/api.ts
```

### 2. Добавьте переменную окружения

Создайте `.env.local` в корне фронтенда:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Обновите App.tsx

Основные изменения минимальны, так как API-интерфейс сохранён.

Добавьте проверку сессии при загрузке:

```tsx
useEffect(() => {
  // Проверяем, есть ли сохранённая сессия
  api.getCurrentUser().then(user => {
    if (user) setUser(user);
  });
}, []);
```

## Локальная PostgreSQL

1. Установите PostgreSQL и создайте БД:

```bash
createdb nlmkblablacar
```

2. Обновите `DATABASE_URL` в `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nlmkblablacar"
```

3. Примените схему:

```bash
npm run db:push
```

## Структура проекта

```
nlmk-backend/
├── prisma/
│   └── schema.prisma    # Схема БД
├── src/
│   ├── index.ts         # Точка входа
│   ├── middleware/
│   │   └── auth.ts      # JWT middleware
│   └── routes/
│       ├── auth.ts      # Авторизация
│       ├── users.ts     # Пользователи
│       ├── trips.ts     # Поездки
│       └── bookings.ts  # Бронирования
├── .env                 # Переменные окружения
├── package.json
└── tsconfig.json
```

## Деплой

### Railway / Render

1. Подключите репозиторий
2. Установите переменные окружения
3. Build command: `npm run build && npm run db:generate && npm run db:push`
4. Start command: `npm start`

### VPS (Ubuntu)

```bash
# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib

# Клонирование и запуск
git clone <repo>
cd nlmk-backend
npm install
npm run build
npm run db:push

# PM2 для фонового запуска
npm install -g pm2
pm2 start dist/index.js --name nlmk-api
pm2 save
```

## Тестирование API

```bash
# Health check
curl http://localhost:3001/api/health

# Логин
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@nlmk.com"}'

# Получить поездки (с токеном)
curl http://localhost:3001/api/trips \
  -H "Authorization: Bearer <token>"
```

## Лицензия

MIT
