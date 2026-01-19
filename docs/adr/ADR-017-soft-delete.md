# ADR-017: Soft Delete для поездок

**Статус:** Принято
**Дата:** 2024-01
**Автор:** Команда разработки

## Контекст

В системе карпулинга поездки проходят жизненный цикл:
1. Создание (активная поездка)
2. Бронирование пассажирами
3. Выполнение поездки
4. Оставление отзывов
5. Завершение/архивация

Необходимо определить, как обрабатывать "удаление" поездок:
- Водитель отменяет поездку
- Поездка завершена
- Дата поездки прошла

## Решение

Реализован паттерн **Soft Delete** через поле `status` с возможными значениями:

```typescript
enum TripStatus {
  active = 'active',       // Доступна для бронирования
  completed = 'completed', // Поездка завершена, отзывы собраны
  cancelled = 'cancelled', // Отменена водителем
  archived = 'archived'    // Автоматически архивирована
}
```

### Жизненный цикл поездки

```
                    ┌─────────────┐
                    │   active    │
                    └─────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
   ┌───────────┐   ┌───────────┐   ┌───────────┐
   │ cancelled │   │ completed │   │ archived  │
   └───────────┘   └───────────┘   └───────────┘
         │                │                │
   Водитель         Все отзывы       Автоматически
   отменил          собраны          (дата прошла)
```

### Реализация

```typescript
// backend/src/routes/trips.ts

// Отмена поездки водителем
router.delete('/:id', authMiddleware, async (req, res) => {
  await prisma.trip.update({
    where: { id: req.params.id },
    data: { status: 'cancelled' }
  });
});

// Автоматическая архивация прошедших поездок
async function archivePastTrips() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.trip.updateMany({
    where: {
      date: { lt: yesterday.toISOString().split('T')[0] },
      status: 'active'
    },
    data: { status: 'archived' }
  });
}

// Запуск каждый час
setInterval(archivePastTrips, 60 * 60 * 1000);

// Проверка и завершение после сбора отзывов
async function checkAndArchiveTrip(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { bookings: true, reviews: true }
  });

  const requiredReviews = (trip.bookings.length + 1) * trip.bookings.length;
  if (trip.reviews.length >= requiredReviews) {
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: 'completed' }
    });
  }
}
```

### Фильтрация по статусу

```typescript
// Получение только активных поездок
router.get('/trips', async (req, res) => {
  const { status = 'active' } = req.query;

  const trips = await prisma.trip.findMany({
    where: { status },
    orderBy: { date: 'asc' }
  });
});

// На frontend показываем по умолчанию только активные
const [statusFilter, setStatusFilter] = useState<TripStatus>('active');
```

## Альтернативы

### 1. Hard Delete (физическое удаление)
```sql
DELETE FROM trips WHERE id = 'xxx';
```
- **Плюсы**: Простота, чистая БД, нет "мусора"
- **Минусы**: Потеря истории, каскадное удаление связанных данных, невозможность восстановления

### 2. Отдельная таблица архива
```sql
CREATE TABLE archived_trips AS SELECT * FROM trips WHERE 1=0;

-- При архивации
INSERT INTO archived_trips SELECT * FROM trips WHERE id = 'xxx';
DELETE FROM trips WHERE id = 'xxx';
```
- **Плюсы**: Чистая основная таблица, быстрые запросы
- **Минусы**: Дублирование схемы, сложные join'ы для отчётов

### 3. Флаг isDeleted
```typescript
model Trip {
  isDeleted Boolean @default(false)
  deletedAt DateTime?
}
```
- **Плюсы**: Проще чем статусы, бинарный выбор
- **Минусы**: Не отражает бизнес-состояния (cancelled vs completed)

### 4. Event Sourcing
```typescript
// Хранить все события
TripCreated, TripBooked, TripCancelled, TripCompleted
```
- **Плюсы**: Полная история, audit trail, восстановление состояния
- **Минусы**: Сложная реализация, избыточно для MVP

## Последствия

### Положительные
- **Сохранение истории**: Все поездки доступны для аналитики
- **Восстановление**: Можно вернуть отменённую поездку
- **Отзывы сохраняются**: История отзывов не теряется
- **Аудит**: Видно когда и почему поездка завершилась
- **Отчётность**: Статистика по всем типам поездок

### Отрицательные
- **Рост БД**: Данные накапливаются бесконечно
- **Сложные запросы**: Везде нужен WHERE status = 'active'
- **Производительность**: Индексы должны учитывать status
- **Каскадные операции**: Нужно продумать что делать со связанными данными

### Важные соображения

```typescript
// Правильно: всегда фильтруем по статусу
const activeTrips = await prisma.trip.findMany({
  where: { status: 'active' }
});

// Неправильно: забыли фильтр - показываем отменённые поездки!
const trips = await prisma.trip.findMany();
```

### Индексы для оптимизации

```prisma
model Trip {
  status String @default("active")

  @@index([status])
  @@index([status, date])
  @@index([driverId, status])
}
```

### Политика хранения данных

| Статус | Срок хранения | Действие |
|--------|---------------|----------|
| active | Бессрочно | — |
| completed | 2 года | Hard delete |
| cancelled | 6 месяцев | Hard delete |
| archived | 1 год | Hard delete |

### Технический долг

- [ ] Добавить составной индекс [status, date]
- [ ] Реализовать job для очистки старых записей
- [ ] Добавить поле deletedAt для аудита
- [ ] Создать Prisma middleware для автоматической фильтрации
- [ ] Рассмотреть партиционирование таблицы по дате

## Связанные решения

- ADR-003: Prisma ORM
- ADR-022: Система рейтингов и отзывов
