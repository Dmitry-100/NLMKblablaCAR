# ADR-027: RESTful API дизайн

**Статус:** Принято
**Дата:** 2024-01
**Автор:** Команда разработки

## Контекст

Backend приложения должен предоставлять API для frontend клиента. Необходимо выбрать архитектурный стиль API, который обеспечит:
- Простоту использования и понимания
- Хорошую совместимость с HTTP
- Возможность кэширования
- Стандартизированный подход

## Решение

Выбран **RESTful API** с JSON как форматом данных.

### Структура API

```
Base URL: /api

Authentication:
  POST   /auth/login              # Вход (email → token)
  POST   /auth/register           # Регистрация
  GET    /auth/me                 # Текущий пользователь

Users:
  GET    /users/:id               # Профиль пользователя
  PUT    /users/:id               # Обновление профиля

Trips:
  GET    /trips                   # Список поездок (с фильтрами)
  GET    /trips/:id               # Детали поездки
  POST   /trips                   # Создание поездки
  PUT    /trips/:id               # Обновление поездки
  DELETE /trips/:id               # Отмена поездки

Bookings:
  GET    /bookings/my             # Мои бронирования
  GET    /bookings/:id            # Детали бронирования
  POST   /bookings                # Создание бронирования
  DELETE /bookings/:id            # Отмена бронирования

Reviews:
  GET    /reviews/pending         # Ожидающие отзывы
  POST   /reviews                 # Создание отзыва
  POST   /reviews/:id/skip        # Пропуск отзыва
```

### HTTP методы и семантика

| Метод | Действие | Идемпотентность | Пример |
|-------|----------|-----------------|--------|
| GET | Чтение | ✅ Да | GET /trips |
| POST | Создание | ❌ Нет | POST /trips |
| PUT | Полное обновление | ✅ Да | PUT /users/123 |
| DELETE | Удаление | ✅ Да | DELETE /bookings/456 |

### Формат запросов

```typescript
// GET с query параметрами
GET /api/trips?from=Moscow&to=Lipetsk&dateFrom=2024-01-15&status=active

// POST с JSON body
POST /api/trips
Content-Type: application/json
Authorization: Bearer eyJhbG...

{
  "from": "Moscow",
  "to": "Lipetsk",
  "date": "2024-01-20",
  "time": "09:00",
  "pickupLocation": "м. Тульская",
  "dropoffLocation": "ул. Ленина, 1",
  "seatsTotal": 3,
  "preferences": {
    "music": "Normal",
    "smoking": false,
    "pets": false
  }
}
```

### Формат ответов

```typescript
// Успешный ответ (200/201)
{
  "trip": {
    "id": "clx123...",
    "from": "Moscow",
    "to": "Lipetsk",
    "date": "2024-01-20",
    "driver": {
      "id": "clx456...",
      "name": "Иван",
      "rating": 4.8
    },
    "bookings": []
  }
}

// Ошибка (400/401/404/500)
{
  "error": "Trip not found"
}

// Список с метаданными (опционально)
{
  "trips": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### HTTP Status Codes

```typescript
// backend/src/routes/trips.ts

// 200 OK - успешное чтение
router.get('/', async (req, res) => {
  const trips = await prisma.trip.findMany();
  res.json({ trips });
});

// 201 Created - успешное создание
router.post('/', async (req, res) => {
  const trip = await prisma.trip.create({ data });
  res.status(201).json({ trip });
});

// 400 Bad Request - ошибка валидации
router.post('/', async (req, res) => {
  try {
    const data = createTripSchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: e.errors[0].message });
  }
});

// 401 Unauthorized - нет токена или невалидный
if (!token) {
  return res.status(401).json({ error: 'Authentication required' });
}

// 403 Forbidden - нет прав
if (trip.driverId !== req.userId) {
  return res.status(403).json({ error: 'Not authorized' });
}

// 404 Not Found - ресурс не найден
if (!trip) {
  return res.status(404).json({ error: 'Trip not found' });
}

// 500 Internal Server Error - серверная ошибка
catch (error) {
  res.status(500).json({ error: 'Internal server error' });
}
```

## Альтернативы

### 1. GraphQL
```graphql
query GetTrips($from: City!, $to: City!) {
  trips(from: $from, to: $to) {
    id
    date
    driver { name rating }
    bookings { passenger { name } }
  }
}

mutation CreateTrip($input: TripInput!) {
  createTrip(input: $input) {
    id
  }
}
```
- **Плюсы**: Гибкие запросы, один endpoint, типизация, нет over-fetching
- **Минусы**: Сложнее настройка, learning curve, проблемы с кэшированием

### 2. tRPC
```typescript
// server
const appRouter = router({
  trips: {
    list: publicProcedure.query(() => prisma.trip.findMany()),
    create: protectedProcedure
      .input(createTripSchema)
      .mutation(({ input }) => prisma.trip.create({ data: input }))
  }
});

// client
const trips = await trpc.trips.list.query();
```
- **Плюсы**: End-to-end типобезопасность, автокомплит, нет кодогенерации
- **Минусы**: Только TypeScript клиенты, tight coupling

### 3. gRPC
```protobuf
service TripService {
  rpc GetTrips(GetTripsRequest) returns (GetTripsResponse);
  rpc CreateTrip(CreateTripRequest) returns (Trip);
}
```
- **Плюсы**: Высокая производительность, строгая типизация, streaming
- **Минусы**: Не работает напрямую в браузере, сложнее отладка

### 4. JSON-RPC
```json
{
  "jsonrpc": "2.0",
  "method": "trips.create",
  "params": { "from": "Moscow", "to": "Lipetsk" },
  "id": 1
}
```
- **Плюсы**: Простой протокол, один endpoint
- **Минусы**: Нет HTTP семантики, сложнее кэширование

## Сравнение

| Критерий | REST | GraphQL | tRPC | gRPC |
|----------|------|---------|------|------|
| Простота | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ |
| Типобезопасность | ★★☆☆☆ | ★★★★☆ | ★★★★★ | ★★★★★ |
| Кэширование | ★★★★★ | ★★☆☆☆ | ★★★☆☆ | ★★★☆☆ |
| Гибкость запросов | ★★☆☆☆ | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Browser support | ★★★★★ | ★★★★★ | ★★★★★ | ★★☆☆☆ |
| Документация | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |

## Последствия

### Положительные
- **Простота**: Понятный API, стандартные HTTP методы
- **Совместимость**: Работает с любым HTTP клиентом
- **Кэширование**: GET запросы кэшируются браузером/CDN
- **Инструменты**: Postman, curl, fetch - всё работает из коробки
- **Документация**: Легко описать в OpenAPI/Swagger

### Отрицательные
- **Over-fetching**: Клиент получает все поля, даже ненужные
- **Under-fetching**: Несколько запросов для связанных данных
- **Нет типобезопасности**: Нужно дублировать типы на клиенте
- **Версионирование**: Нужна стратегия при изменениях API

### Паттерны и конвенции

```typescript
// ✅ Правильно: существительные для ресурсов
GET /trips
GET /users/123

// ❌ Неправильно: глаголы в URL
GET /getTrips
POST /createUser

// ✅ Правильно: вложенные ресурсы
GET /trips/123/bookings
GET /users/123/reviews

// ✅ Правильно: фильтрация через query params
GET /trips?status=active&from=Moscow

// ✅ Правильно: единообразные ошибки
{ "error": "Описание ошибки" }
```

### Документация API (рекомендуется)

```yaml
# openapi.yaml (для будущей реализации)
openapi: 3.0.0
info:
  title: NLMKblablaCAR API
  version: 1.0.0

paths:
  /trips:
    get:
      summary: Получить список поездок
      parameters:
        - name: from
          in: query
          schema:
            type: string
            enum: [Moscow, Lipetsk]
      responses:
        200:
          description: Список поездок
          content:
            application/json:
              schema:
                type: object
                properties:
                  trips:
                    type: array
                    items:
                      $ref: '#/components/schemas/Trip'
```

### Технический долг

- [ ] Добавить OpenAPI/Swagger документацию
- [ ] Реализовать пагинацию для GET /trips
- [ ] Добавить HATEOAS ссылки (опционально)
- [ ] Версионирование API (/api/v1/...)
- [ ] Rate limiting headers (X-RateLimit-*)

## Связанные решения

- ADR-001: Разделение Frontend/Backend
- ADR-016: Zod для валидации запросов
- ADR-005: JWT-аутентификация
