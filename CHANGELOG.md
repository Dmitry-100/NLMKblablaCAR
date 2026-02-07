# Changelog

Все значимые изменения в проекте документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

## [2.6.1] - 2026-02-07

### Fixed
- **Критическая уязвимость**: Исправлена проверка авторизации в `POST /api/requests/:id/link` - теперь только водитель поездки может связать заявку со своей поездкой

### Changed
- **ESLint миграция**: Обновлена конфигурация ESLint на flat config формат (ESLint 9.x)
- Удалены устаревшие `.eslintrc.cjs` файлы
- Backend: добавлен `"type": "module"` в package.json
- Frontend: установлен порог предупреждений 50 для CI

### Tech Debt
Документированы следующие пункты технического долга:
- `App.tsx` (~2800 строк) - требуется декомпозиция на отдельные модули
- `Date.now()` в render - нарушает чистоту компонентов React
- Паттерны `setState` в useEffect - требуют рефакторинга
- Неиспользуемые переменные и `any` типы (45 предупреждений)

## [2.6.0] - 2026-02-07

### Added
- **Telegram авторизация**: Вход через Telegram Login Widget
- **Telegram уведомления**: Бот @SteelBlaBlaCarBot отправляет уведомления о:
  - Новых бронированиях (водителю)
  - Отменах бронирований
  - Отмене поездок (пассажирам)
  - Подходящих поездках для заявок пассажиров
- Новые поля в модели User: `telegramId`, `telegramUsername`, `telegramChatId`, `telegramPhotoUrl`
- Webhook endpoint для Telegram бота (`POST /api/telegram/webhook`)
- Команда `/start` в боте для подключения уведомлений

### Changed
- Email авторизация удалена из UI (backend endpoints сохранены для обратной совместимости)
- Поле `email` в User стало опциональным

### Deprecated
- `POST /api/auth/login` - используйте `POST /api/auth/telegram`
- `POST /api/auth/register` - используйте `POST /api/auth/telegram`

### Security
- HMAC-SHA256 валидация данных от Telegram Login Widget
- Webhook endpoint не имеет rate limiting для корректной работы с Telegram

## [2.5.0] - 2026-02-06

### Added
- **Заявки пассажиров**: Пассажиры могут создавать заявки на поездки
- Matching заявок с создаваемыми поездками
- Автоархивация просроченных заявок
- Статистика заявок по маршрутам

### Changed
- Навигация: "Расписание" переименовано в "Поездки"
- Добавлена вкладка "Заявки" в навигацию

## [2.4.0] - 2026-02-05

### Added
- TanStack Query для умного кэширования данных
- Механизм refresh токенов для JWT
- Rate limiting для защиты API

### Changed
- Улучшена производительность загрузки данных

## [2.3.0] - 2026-02-04

### Added
- Gemini AI Assistant для поиска поездок
- Yandex Maps интеграция для выбора мест посадки/высадки

### Security
- API ключ Gemini перенесён на backend

## [2.2.0] - 2026-02-03

### Added
- Система отзывов и рейтингов
- Профили пользователей с историей поездок

## [2.1.0] - 2026-02-02

### Added
- Бронирование поездок
- Уведомления о бронированиях (in-app)

## [2.0.0] - 2026-02-01

### Added
- Backend API на Express.js
- PostgreSQL база данных (Neon)
- JWT аутентификация
- Prisma ORM

### Changed
- Миграция с localStorage на полноценный backend

## [1.0.0] - 2026-01-28

### Added
- Первый релиз MVP
- Создание и просмотр поездок
- Простая авторизация по email
- Хранение данных в localStorage
