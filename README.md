# NLMKblablaCAR - Корпоративный карпулинг NLMK

## 📋 Обзор проекта

**NLMKblablaCAR** - полнофункциональная веб-платформа для корпоративного карпулинга между городами Москва и Липецк для сотрудников NLMK.

### Основная идея
Сотрудники могут:
- **Водители** - создавать поездки с указанием маршрута, времени и предпочтений
- **Пассажиры** - искать подходящие поездки и бронировать места
- Система автоматически управляет доступными местами и бронированиями

### Ключевые особенности
- 🔐 Упрощенная авторизация по email (auto-registration)
- 🚗 Создание и управление поездками
- 📅 Фильтрация по маршруту и датам
- ⭐ Система предпочтений (музыка, курение, животные, разговоры)
- 📱 Адаптивный интерфейс на React
- 🔄 Real-time обновление доступных мест
- 🌐 Интеграция с Google Gemini AI для улучшенного UX

---

## 🛠 Технический стек

### Backend
```
- Runtime: Node.js + TypeScript
- Framework: Express.js 4.21
- Database ORM: Prisma 5.22
- Database: PostgreSQL (production) / SQLite (dev)
- Authentication: JWT (jsonwebtoken 9.0)
- Validation: Zod 3.23
- Security: bcryptjs, CORS
```

### Frontend
```
- Framework: React 19.2
- Build tool: Vite 6.2
- Routing: React Router DOM 7.10
- Styling: Tailwind CSS 4.1
- Icons: Lucide React 0.556
- AI Integration: Google Gemini API 1.32
- Language: TypeScript 5.8
```

### DevOps & Deployment
```
- Version Control: Git
- Backend Hosting: Render.com (Free Plan)
- Frontend Hosting: Netlify
- Database: PostgreSQL на Render
- CI/CD: Автоматический деплой через Git
```

---

## 🏗 Архитектура проекта

### Структура директорий

```
NLMKblablaCAR/
├── backend/                    # Backend API (Express + Prisma)
│   ├── src/
│   │   ├── index.ts           # Точка входа сервера
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT authentication middleware
│   │   └── routes/
│   │       ├── auth.ts        # Авторизация и регистрация
│   │       ├── users.ts       # Управление пользователями
│   │       ├── trips.ts       # CRUD поездок
│   │       └── bookings.ts    # Бронирование мест
│   ├── prisma/
│   │   ├── schema.prisma      # Схема базы данных
│   │   └── dev.db             # SQLite БД (development)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                   # DATABASE_URL, JWT_SECRET
│
├── frontend/                   # React приложение
│   ├── App.tsx                # Главный компонент приложения
│   ├── index.tsx              # Точка входа React
│   ├── index.html             # HTML template
│   ├── services/
│   │   ├── api.ts             # API клиент
│   │   └── geminiService.ts   # Google Gemini интеграция
│   ├── types.ts               # TypeScript типы
│   ├── constants.ts           # Константы приложения
│   ├── components/            # React компоненты
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.local             # VITE_API_URL, GEMINI_API_KEY
│
├── .git/                      # Git репозиторий
├── .gitignore
├── README.md
├── render.yaml                # Конфигурация Render.com
└── netlify.toml               # Конфигурация Netlify
```

---

## 💾 База данных (Prisma Schema)

### Модели данных

#### 1️⃣ User (Пользователь)
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  avatarUrl String   @default("")
  phone     String   @default("")
  bio       String   @default("")
  position  String   @default("")
  homeCity  String   @default("Moscow")      // "Moscow" | "Lipetsk"
  role      String   @default("Passenger")   // "Driver" | "Passenger" | "Both"
  rating    Float    @default(5.0)
  
  // Предпочтения пользователя (по умолчанию)
  prefMusic        String  @default("Normal")    // "Quiet" | "Normal" | "Loud"
  prefSmoking      Boolean @default(false)
  prefPets         Boolean @default(false)
  prefBaggage      String  @default("Hand")      // "Hand" | "Medium" | "Suitcase"
  prefConversation String  @default("Chatty")    // "Chatty" | "Quiet"
  prefAc           Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Связи
  tripsAsDriver    Trip[]    @relation("DriverTrips")
  bookings         Booking[]
  reviewsGiven     Review[]  @relation("ReviewAuthor")
  reviewsReceived  Review[]  @relation("ReviewTarget")
}
```

**Поля:**
- `id` - уникальный CUID
- `email` - email сотрудника (уникальный, используется для входа)
- `name` - имя пользователя
- `avatarUrl` - ссылка на аватар (генерируется через dicebear.com)
- `phone`, `bio`, `position` - дополнительная информация профиля
- `homeCity` - домашний город ("Moscow" или "Lipetsk")
- `role` - роль: водитель, пассажир или оба
- `rating` - рейтинг пользователя (1.0-5.0)
- `pref*` - набор предпочтений для поездок

#### 2️⃣ Trip (Поездка)
```prisma
model Trip {
  id              String   @id @default(cuid())
  driverId        String
  driver          User     @relation("DriverTrips", fields: [driverId], references: [id])
  
  // Маршрут
  fromCity        String   // "Moscow" | "Lipetsk"
  toCity          String
  date            String   // YYYY-MM-DD
  time            String   // HH:mm
  pickupLocation  String   // Адрес посадки
  dropoffLocation String   // Адрес высадки
  
  // Места
  seatsTotal      Int      @default(3)
  seatsBooked     Int      @default(0)
  
  // Предпочтения поездки (копируются из профиля водителя)
  prefMusic        String  @default("Normal")
  prefSmoking      Boolean @default(false)
  prefPets         Boolean @default(false)
  prefBaggage      String  @default("Hand")
  prefConversation String  @default("Chatty")
  prefAc           Boolean @default(true)
  
  comment         String   @default("")
  
  // Группировка поездок (туда-обратно)
  tripGroupId     String?
  isReturn        Boolean  @default(false)
  
  status          String   @default("active") // "active" | "completed" | "cancelled"
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  bookings        Booking[]
  reviews         Review[]
}
```

**Бизнес-логика:**
- Максимум 2 пассажира на поездку (водитель + 2 места)
- Статусы: `active` (доступна), `completed` (завершена), `cancelled` (отменена)
- Поддержка связанных поездок (туда-обратно) через `tripGroupId`

#### 3️⃣ Booking (Бронирование)
```prisma
model Booking {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  passengerId String
  passenger   User     @relation(fields: [passengerId], references: [id])
  status      String   @default("confirmed") // "pending" | "confirmed" | "cancelled"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([tripId, passengerId]) // Один пассажир - одна бронь
}
```

**Ограничения:**
- Один пассажир может забронировать только одно место в поездке
- При отмене поездки все бронирования автоматически отменяются (CASCADE)
- Водитель не может забронировать свою поездку

#### 4️⃣ Review (Отзыв)
```prisma
model Review {
  id        String   @id @default(cuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id])
  authorId  String
  author    User     @relation("ReviewAuthor", fields: [authorId], references: [id])
  targetId  String
  target    User     @relation("ReviewTarget", fields: [targetId], references: [id])
  rating    Int      // 1-5
  comment   String   @default("")
  createdAt DateTime @default(now())
  
  @@unique([tripId, authorId, targetId])
}
```

---

## 🔌 API Документация

**Base URL:** `http://localhost:3001/api` (dev) / `https://your-app.onrender.com/api` (prod)

### 🔐 Authentication

#### POST `/auth/login`
Авторизация по email (с auto-registration)

**Request:**
```json
{
  "email": "ivanov@nlmk.com"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clx123...",
    "email": "ivanov@nlmk.com",
    "name": "Ivanov",
    "avatarUrl": "https://api.dicebear.com/...",
    "homeCity": "Moscow",
    "role": "Passenger",
    "rating": 5.0,
    "defaultPreferences": { ... }
  }
}
```

#### POST `/auth/register`
Регистрация нового пользователя

**Request:**
```json
{
  "email": "petrov@nlmk.com",
  "name": "Петр Петров",
  "homeCity": "Lipetsk",
  "role": "Driver"
}
```

#### GET `/auth/me`
Получить текущего пользователя (требует токен)

**Headers:** `Authorization: Bearer <token>`

---

### 👤 Users

#### GET `/users/:id`
Получить профиль пользователя по ID

#### PUT `/users/:id`
Обновить профиль (требует авторизации)

**Request:**
```json
{
  "name": "Иван Иванов",
  "phone": "+7 900 123-45-67",
  "bio": "Люблю классическую музыку",
  "position": "Инженер",
  "homeCity": "Moscow",
  "role": "Both",
  "defaultPreferences": {
    "music": "Quiet",
    "smoking": false,
    "pets": true,
    "baggage": "Medium",
    "conversation": "Chatty",
    "ac": true
  }
}
```

---

### 🚗 Trips

#### GET `/trips`
Получить список поездок с фильтрами

**Query Parameters:**
- `from` - город отправления ("Moscow" | "Lipetsk")
- `to` - город назначения
- `dateFrom` - дата от (YYYY-MM-DD)
- `dateTo` - дата до
- `status` - статус ("active" | "completed" | "cancelled")

**Example:** `GET /trips?from=Moscow&to=Lipetsk&dateFrom=2024-01-10`

**Response:**
```json
{
  "trips": [
    {
      "id": "clx123...",
      "driverId": "clx456...",
      "driver": { ... },
      "from": "Moscow",
      "to": "Lipetsk",
      "date": "2024-01-15",
      "time": "08:00",
      "pickupLocation": "Метро Тульская",
      "dropoffLocation": "ул. Ленина 15",
      "seatsTotal": 3,
      "seatsBooked": 1,
      "preferences": {
        "music": "Normal",
        "smoking": false,
        "pets": false,
        "baggage": "Hand",
        "conversation": "Chatty",
        "ac": true
      },
      "comment": "Еду с остановкой в Туле",
      "status": "active",
      "passengers": [ ... ]
    }
  ]
}
```

#### GET `/trips/:id`
Получить детали поездки

#### POST `/trips`
Создать новую поездку (требует авторизации, только для водителей)

**Request:**
```json
{
  "from": "Moscow",
  "to": "Lipetsk",
  "date": "2024-01-20",
  "time": "09:00",
  "pickupLocation": "Павелецкий вокзал",
  "dropoffLocation": "Площадь Ленина",
  "seatsTotal": 3,
  "comment": "Спокойная поездка",
  "preferences": {
    "music": "Quiet",
    "smoking": false,
    "pets": false,
    "baggage": "Medium",
    "conversation": "Quiet",
    "ac": true
  }
}
```

#### PUT `/trips/:id`
Обновить поездку (только водитель)

#### DELETE `/trips/:id`
Отменить поездку (мягкое удаление - меняет status на "cancelled")

---

### 📝 Bookings

#### POST `/bookings`
Забронировать место в поездке

**Request:**
```json
{
  "tripId": "clx123..."
}
```

**Validation:**
- ✅ Поездка должна быть активна
- ✅ Должны быть свободные места (макс 2 пассажира)
- ✅ Водитель не может забронировать свою поездку
- ✅ Нельзя дважды забронировать одну поездку

#### GET `/bookings/my`
Получить мои бронирования (требует авторизации)

#### GET `/bookings/:id`
Детали бронирования (доступ только пассажиру или водителю)

#### DELETE `/bookings/:id`
Отменить бронирование (пассажир или водитель)

---

## 🎨 Frontend архитектура

### Основные компоненты

```
App.tsx - главный компонент с роутингом и состоянием
├── LoginScreen - экран авторизации
├── HomeScreen - главная страница с поиском
├── TripsListScreen - список найденных поездок
├── TripDetailsScreen - детали поездки
├── CreateTripScreen - создание поездки
├── ProfileScreen - профиль пользователя
└── MyTripsScreen - мои поездки и бронирования
```

### API Client (services/api.ts)

Centralized API client с автоматическим управлением токенами:

```typescript
import { api } from './services/api';

// Авторизация
const user = await api.login('user@nlmk.com');

// Получение поездок
const trips = await api.getTrips({
  from: 'Moscow',
  to: 'Lipetsk',
  dateFrom: '2024-01-10'
});

// Создание поездки
const newTrip = await api.createTrip({
  from: 'Moscow',
  to: 'Lipetsk',
  date: '2024-01-15',
  time: '09:00',
  // ... другие поля
});

// Бронирование
await api.bookTrip('trip-id');
```

### State Management

Использует React useState/useEffect (без Redux):
- Локальное состояние компонентов
- Подъем состояния в App.tsx для глобальных данных
- LocalStorage для токена авторизации

### Styling

Tailwind CSS с кастомной конфигурацией:
```javascript
// tailwind.config.js
{
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b'
      }
    }
  }
}
```

---

## 🔧 Настройка и запуск

### Локальная разработка

#### 1. Backend Setup

```bash
cd backend

# Установка зависимостей
npm install

# Настройка .env
echo 'DATABASE_URL="file:./dev.db"' > .env
echo 'JWT_SECRET="your-super-secret-key"' >> .env

# Создание БД и таблиц
npx prisma db push

# Генерация Prisma Client
npx prisma generate

# Запуск dev сервера
npm run dev
# Server: http://localhost:3001
```

#### 2. Frontend Setup

```bash
cd frontend

# Установка зависимостей
npm install

# Настройка .env.local
echo 'VITE_API_URL=http://localhost:3001/api' > .env.local
echo 'GEMINI_API_KEY=your-gemini-key' >> .env.local

# Запуск dev сервера
npm run dev
# App: http://localhost:3000
```

### Доступные команды

#### Backend
```bash
npm run dev       # Запуск dev сервера с hot-reload
npm run build     # Компиляция TypeScript в dist/
npm start         # Запуск production сервера
npm run db:push   # Применить схему к БД
npm run db:studio # Открыть Prisma Studio (GUI для БД)
```

#### Frontend
```bash
npm run dev       # Запуск Vite dev сервера
npm run build     # Production build в dist/
npm run preview   # Просмотр production build локально
```

---

## 🚀 Deployment

### Render.com (Backend)

Конфигурация в `render.yaml`:

```yaml
databases:
  - name: nlmkblablacar-db
    databaseName: nlmkblablacar
    user: nlmkblablacar
    plan: free

services:
  - type: web
    name: nlmkblablacar-api
    runtime: node
    plan: free
    rootDir: backend
    buildCommand: npm install --include=dev && npm run build && npx prisma db push
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: nlmkblablacar-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: FRONTEND_URL
        sync: false
      - key: NODE_ENV
        value: production
```

**Деплой:**
1. Push код в Git репозиторий
2. Подключить репозиторий к Render
3. Render автоматически создаст PostgreSQL БД и деплоит бэкенд

### Netlify (Frontend)

Конфигурация в `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Деплой:**
1. Push код в Git
2. Подключить репозиторий к Netlify
3. Настроить environment variables:
   - `VITE_API_URL` = URL вашего backend на Render
   - `GEMINI_API_KEY` = API ключ Google Gemini

---

## 🎯 Ключевые функции

### 1. Упрощенная авторизация
- Вход только по email (без пароля)
- Auto-registration: если пользователя нет - создается автоматически
- JWT токен с TTL 7 дней
- Автоматический logout при невалидном токене

### 2. Умный поиск поездок
- Фильтрация по маршруту (Москва ⇄ Липецк)
- Фильтр по датам
- Отображение доступных мест в реальном времени
- Показ предпочтений водителя

### 3. Система предпочтений
Каждый пользователь и поездка имеют набор предпочтений:
- **Музыка:** Тихо / Нормально / Громко
- **Курение:** Разрешено / Запрещено
- **Животные:** Можно / Нельзя
- **Багаж:** Ручная кладь / Средний / Чемодан
- **Разговоры:** Общительный / Тихий
- **Кондиционер:** Есть / Нет

### 4. Группировка поездок (туда-обратно)
- Создание связанных поездок через `tripGroupId`
- Отображение обратной поездки вместе с основной

### 5. Система бронирований
- Real-time проверка доступных мест
- Автоматический подсчет забронированных мест
- Возможность отмены бронирования
- Уведомления о статусе

### 6. Профиль пользователя
- Аватар (генерация через dicebear.com)
- Расширенная информация: телефон, био, должность
- Рейтинг (для будущей системы отзывов)
- Управление предпочтениями

---

## 📊 Статистика проекта

```
Backend:
├── 6 TypeScript файлов
├── 4 REST API модуля
├── 4 модели базы данных
└── ~400 строк кода

Frontend:
├── React SPA с routing
├── 8+ компонентов/экранов
├── 2 сервиса (API, Gemini)
└── ~800 строк кода

Total size: ~347 MB (включая node_modules)
Dependencies: ~200 npm пакетов
```

---

## 🔒 Безопасность

### Реализовано:
- ✅ JWT токены для авторизации
- ✅ CORS protection
- ✅ Валидация данных через Zod
- ✅ SQL injection protection (Prisma ORM)
- ✅ Environment variables для секретов

### TODO (для production):
- ⚠️ Добавить HTTPS
- ⚠️ Rate limiting
- ⚠️ Helmet.js для security headers
- ⚠️ Реальная система паролей (bcryptjs уже установлен)
- ⚠️ Email verification
- ⚠️ CSRF protection

---

## 🐛 Известные ограничения

1. **Авторизация:** Упрощенная, без паролей (демо-режим)
2. **Email уведомления:** Не реализованы
3. **Push уведомления:** Отсутствуют
4. **Система отзывов:** Модель готова, UI не реализован
5. **Оплата:** Не предусмотрена
6. **Карты:** Нет интеграции с Google Maps для маршрутов
7. **Chat:** Нет системы сообщений между пользователями

---

## 📝 Roadmap

### Phase 1 (MVP) ✅
- [x] Авторизация
- [x] CRUD поездок
- [x] Система бронирований
- [x] Базовый UI

### Phase 2 (В разработке)
- [ ] Система отзывов (UI)
- [ ] Email уведомления
- [ ] Реальная авторизация с паролями
- [ ] Admin панель

### Phase 3 (Планируется)
- [ ] Интеграция карт (Google Maps API)
- [ ] Система чатов
- [ ] Push уведомления
- [ ] Мобильное приложение

---

## 🤝 Контакты и поддержка

**Автор:** [Ваше имя]
**Email:** [Ваш email]
**GitHub:** [Ссылка на репозиторий]
**AI Studio:** https://ai.studio/apps/drive/1lisjJdxP6CgrZ2bkZApLsZlv_ch0Q4em

---

## 📜 Лицензия

Проект разработан для внутреннего использования NLMK.

---

*Документация создана: 2026-01-11*
*Версия проекта: 1.0.0*
