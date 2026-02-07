# Architecture Decision Records (ADR)

Документация архитектурных решений проекта NLMKblablaCAR.

**Обновлено:** 2026-02-07 | **Версия:** 2.8.0

## Что такое ADR?

ADR (Architecture Decision Record) — это документ, фиксирующий важное архитектурное решение вместе с контекстом и последствиями.

## Формат ADR

Каждый ADR содержит:
- **Статус**: Принято / Отклонено / Заменено / Устарело
- **Контекст**: Почему возникла необходимость в решении
- **Решение**: Что было решено
- **Альтернативы**: Какие варианты рассматривались
- **Последствия**: Положительные и отрицательные эффекты

## Индекс ADR

### Архитектура и безопасность

| # | Название | Статус | Описание |
|---|----------|--------|----------|
| [ADR-001](ADR-001-frontend-backend-separation.md) | Разделение Frontend/Backend | Принято | Архитектура с SPA + REST API |
| [ADR-005](ADR-005-jwt-authentication.md) | JWT-аутентификация | Принято | Stateless токены + refresh mechanism |
| [ADR-021](ADR-021-telegram-authentication.md) | Telegram авторизация | Принято | Login Widget + HMAC-SHA256 |
| [ADR-027](ADR-027-restful-api.md) | RESTful API | Принято | Дизайн HTTP API |

### Данные и хранение

| # | Название | Статус | Описание |
|---|----------|--------|----------|
| [ADR-003](ADR-003-prisma-orm.md) | Prisma ORM | Принято | Type-safe работа с PostgreSQL |
| [ADR-017](ADR-017-soft-delete.md) | Soft Delete | Принято | Архивация вместо удаления |

### Frontend

| # | Название | Статус | Описание |
|---|----------|--------|----------|
| [ADR-010](ADR-010-monolithic-app-component.md) | App.tsx структура | Заменено | Декомпозирован в v2.6.2 (308 строк) |
| [ADR-011](ADR-011-react-context-state.md) | React Context | Принято | State management + TanStack Query |
| [ADR-018](ADR-018-yandex-maps.md) | Yandex Maps | Принято | Карты и геолокация |
| [ADR-019](ADR-019-gemini-ai-assistant.md) | Gemini AI | Принято | LLM-ассистент (proxy через backend) |

### Устаревшие

| # | Название | Статус | Описание |
|---|----------|--------|----------|
| [ADR-006](ADR-006-passwordless-auth.md) | Email авторизация | Заменено | Заменено на Telegram (ADR-021) |

## Технический долг

### Выполнено (v2.8.0)

- [x] ~~ADR-006: Magic Link~~ → Telegram авторизация (ADR-021)
- [x] ~~ADR-019: Gemini API key на backend~~ → Proxy endpoint реализован
- [x] ~~ADR-010: Разбить App.tsx~~ → Feature-based структура (308 строк)
- [x] ~~ADR-005: Refresh token~~ → Access 15 мин + Refresh 7 дней
- [x] ~~ADR-005: Rate limiting~~ → 100 req/15min, auth: 5 req/15min
- [x] ~~ADR-017: Индексы для status~~ → Добавлены в Prisma schema

### Низкий приоритет (опционально)

- [ ] **ADR-011**: Разделить контексты (Auth, Trips, Bookings)
- [ ] **ADR-018**: Кэширование suggest запросов
- [ ] **ADR-027**: OpenAPI документация (альтернатива: контрактный слой)

## Связи между ADR

```
ADR-001 (Frontend/Backend)
    │
    ├──► ADR-005 (JWT) ──► ADR-021 (Telegram Auth)
    │         │                    │
    │         │                    └──► Заменил ADR-006
    │         │
    │         └──► Rate Limiting ✅
    │
    ├──► ADR-027 (REST API)
    │         │
    │         └──► Contracts Layer (Zod) ✅
    │
    └──► ADR-003 (Prisma) ──► ADR-017 (Soft Delete)

ADR-010 (App Structure)
    │
    └──► Feature-based архитектура ✅
              │
              └──► ADR-011 (TanStack Query) ✅

ADR-018 (Yandex Maps)
    │
    └──► ADR-019 (Gemini AI) ──► Backend Proxy ✅
```

## Как добавить новый ADR

1. Создайте файл `ADR-XXX-short-name.md`
2. Используйте шаблон из существующих ADR
3. Добавьте запись в этот README
4. Укажите связи с другими ADR

## Статусы ADR

- **Принято** — решение принято и реализовано
- **Принято (MVP)** — временное решение для MVP
- **Отклонено** — решение рассмотрено, но не принято
- **Заменено** — заменено другим ADR
- **Устарело** — больше не актуально
