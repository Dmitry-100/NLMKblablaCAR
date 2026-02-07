# NLMKblablaCAR - Корпоративный карпулинг NLMK

**Версия:** 2.8.0 | **Обновлено:** 2026-02-07

## Обзор проекта

**NLMKblablaCAR** — полнофункциональная веб-платформа для корпоративного карпулинга между Москвой и Липецком для сотрудников NLMK.

### Демо
- **Frontend:** https://steel-blablacar.netlify.app/
- **Backend API:** https://nlmkblablacar.onrender.com/api
- **Telegram бот:** [@SteelBlaBlaCarBot](https://t.me/SteelBlaBlaCarBot)

---

## Ключевые возможности

### Для пользователей
- **Telegram авторизация** — безопасный вход через Telegram Login Widget
- **Создание поездок** — водители указывают маршрут, время и предпочтения
- **Заявки пассажиров** — пассажиры создают заявки на нужные даты
- **Бронирование** — автоматическое управление местами (1-3 пассажира)
- **Telegram уведомления** — мгновенные оповещения о бронированиях
- **Система отзывов** — рейтинг и отзывы после поездок

### UX и интерфейс
- **Тёмная тема** — автоматическая адаптация через CSS-переменные
- **Дашборд статистики** — графики активности, популярные маршруты
- **Календарь поездок** — месячный обзор с навигацией
- **Геймификация** — уровни, достижения, streak-счётчик
- **Яндекс.Карты** — автодополнение адресов, выбор точки на карте
- **AI-помощник** — Google Gemini для поиска и рекомендаций

### Для администраторов
- **Админ-панель** — управление поездками, заявками, пользователями
- **Роли** — `user` / `admin` с авто-назначением по Telegram username

---

## Технический стек

### Backend
| Компонент | Технология |
|-----------|------------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js 4.21 |
| ORM | Prisma 5.22 |
| Database | PostgreSQL (Neon) |
| Auth | JWT + Telegram HMAC-SHA256 |
| Validation | Zod 3.23 |
| Bot | node-telegram-bot-api |

### Frontend
| Компонент | Технология |
|-----------|------------|
| Framework | React 19.2 |
| Build | Vite 6.2 |
| Routing | React Router DOM 7.10 |
| State | TanStack Query 5.x |
| Styling | Tailwind CSS 4.1 |
| Maps | Yandex Maps JS API v3 |
| AI | Google Gemini API |

### Инфраструктура
| Сервис | Платформа |
|--------|-----------|
| Frontend | Netlify |
| Backend | Render.com |
| Database | Neon PostgreSQL |
| Bot | Telegram @SteelBlaBlaCarBot |

---

## Архитектура проекта

```
NLMKblablaCAR/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Точка входа
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT + requireAdmin
│   │   ├── routes/
│   │   │   ├── admin.ts          # Админ-эндпоинты
│   │   │   ├── auth.ts           # Авторизация
│   │   │   ├── bookings.ts       # Бронирования
│   │   │   ├── requests.ts       # Заявки пассажиров
│   │   │   ├── reviews.ts        # Отзывы
│   │   │   ├── telegram.ts       # Telegram webhook
│   │   │   ├── trips.ts          # Поездки
│   │   │   └── users.ts          # Пользователи
│   │   ├── contracts/            # Zod-схемы (shared types)
│   │   └── services/
│   │       └── telegram.ts       # Уведомления
│   └── prisma/
│       └── schema.prisma         # Схема БД
│
├── frontend/
│   ├── App.tsx                   # Главный компонент (308 строк)
│   ├── features/
│   │   ├── admin/                # Админ-панель
│   │   ├── insights/             # Статистика и графики
│   │   ├── layout/               # AppLayout
│   │   ├── profile/              # Профиль пользователя
│   │   ├── requests/             # Заявки пассажиров
│   │   └── trips/                # Поездки
│   ├── components/
│   │   ├── auth/                 # Telegram Login
│   │   └── ui/                   # Button, Card, Skeleton...
│   ├── contracts/                # Zod-схемы (shared types)
│   ├── services/
│   │   ├── api.ts                # API клиент
│   │   └── geminiService.ts      # AI-помощник
│   └── utils/
│       ├── gamification.ts       # Уровни и достижения
│       ├── confetti.ts           # Анимации
│       └── haptics.ts            # Вибрация
│
├── docs/adr/                     # Architecture Decision Records
├── CHANGELOG.md
└── README.md
```

---

## База данных

### Основные модели

| Модель | Описание |
|--------|----------|
| User | Пользователи с Telegram ID, ролью, рейтингом |
| Trip | Поездки с маршрутом, предпочтениями, статусом |
| Booking | Бронирования мест |
| PassengerRequest | Заявки пассажиров с matching |
| Review | Отзывы и рейтинги |

### Ключевые поля User
```prisma
model User {
  telegramId       BigInt?  @unique
  telegramUsername String?
  telegramChatId   BigInt?  // Для уведомлений
  accountRole      String   @default("user") // user | admin
  rating           Float    @default(5.0)
}
```

---

## API Endpoints

### Авторизация
| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/auth/telegram` | Вход через Telegram |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/refresh` | Обновить токен |

### Поездки
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/trips` | Список с фильтрами |
| POST | `/api/trips` | Создать поездку |
| PUT | `/api/trips/:id` | Обновить |
| DELETE | `/api/trips/:id` | Отменить |

### Заявки
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/requests` | Все заявки |
| GET | `/api/requests/my` | Мои заявки |
| POST | `/api/requests` | Создать заявку |
| POST | `/api/requests/:id/link` | Связать с поездкой |

### Админ (требует `accountRole: admin`)
| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/admin/trips` | Все поездки |
| PUT | `/api/admin/trips/:id` | Редактировать любую |
| GET | `/api/admin/users` | Все пользователи |

---

## Локальная разработка

### 1. PostgreSQL (Docker)
```bash
docker compose up -d postgres
```

### 2. Backend
```bash
cd backend
npm install
cp .env.local.example .env.local
npm run db:push:local
npm run dev:local
# http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
npm install
echo 'VITE_API_URL=http://localhost:3001/api' > .env.local
npm run dev
# http://localhost:5173
```

### Environment Variables

**Backend (.env.local):**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
TELEGRAM_BOT_TOKEN=...
GEMINI_API_KEY=...
```

**Frontend (.env.local):**
```
VITE_API_URL=http://localhost:3001/api
VITE_YANDEX_MAPS_API_KEY=...
VITE_TELEGRAM_BOT_USERNAME=SteelBlaBlaCarBot
```

---

## Безопасность

### Реализовано
- Telegram HMAC-SHA256 валидация
- JWT access (15 мин) + refresh (7 дней) токены
- Rate limiting (100 req/15min, auth: 5 req/15min)
- Zod валидация на обеих сторонах
- CORS protection
- SQL injection protection (Prisma)
- Авторизация admin endpoints

### Контрактный слой
Типобезопасность между frontend и backend через shared Zod-схемы:
```
backend/src/contracts/  ←→  frontend/contracts/
```

---

## Документация

| Документ | Описание |
|----------|----------|
| [CHANGELOG.md](CHANGELOG.md) | История версий |
| [docs/adr/](docs/adr/) | Architecture Decision Records |
| [ADR-021](docs/adr/ADR-021-telegram-authentication.md) | Telegram авторизация |

---

## Roadmap

### Выполнено
- [x] MVP с email авторизацией (v1.0)
- [x] Backend API + PostgreSQL (v2.0)
- [x] Система отзывов (v2.2)
- [x] Яндекс.Карты + Gemini AI (v2.3)
- [x] TanStack Query + JWT refresh (v2.4)
- [x] Заявки пассажиров (v2.5)
- [x] Telegram авторизация и уведомления (v2.6)
- [x] Рефакторинг App.tsx + ESLint 9.x (v2.6.2)
- [x] Тёмная тема + статистика + геймификация (v2.7)
- [x] Админ-панель + контрактный слой (v2.8)

### Планируется
- [ ] Push уведомления (PWA)
- [ ] Мобильное приложение (React Native)
- [ ] Линия маршрута на карте

---

## Лицензия

Проект разработан для внутреннего использования NLMK.

---

*Версия документации: 2.8.0*
