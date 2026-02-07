# ADR-021: Telegram авторизация и уведомления

**Статус:** Принято
**Дата:** 2026-02-07
**Автор:** Команда разработки
**Заменяет:** ADR-006 (Упрощенная авторизация без пароля)

## Контекст

Предыдущая система авторизации (ADR-006) имела критические проблемы безопасности:
- Отсутствие верификации email
- Возможность входа под чужим email
- Нет защиты аккаунта

Для корпоративного приложения NLMK требуется:
- Надёжная идентификация пользователей
- Push-уведомления о событиях (бронирования, отмены)
- Быстрый вход без паролей
- Минимальный барьер для пользователей

## Решение

Реализована **авторизация через Telegram Login Widget** с уведомлениями через Telegram бота.

```
┌──────────────────────────────────────────────────────────────┐
│                    Поток Telegram авторизации                  │
└──────────────────────────────────────────────────────────────┘

Пользователь нажимает "Войти через Telegram"
         │
         ▼
    ┌─────────────────────────┐
    │ Telegram Login Widget   │
    │ (popup от Telegram)     │
    └─────────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │ Widget возвращает       │
    │ подписанные данные      │
    │ (id, name, hash, etc.)  │
    └─────────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │ POST /api/auth/telegram │
    │ { id, hash, ... }       │
    └─────────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │ Backend проверяет       │
    │ HMAC-SHA256 подпись     │
    └─────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Валидно   Невалидно
    │         │
    ▼         ▼
 Создать/   401 Error
 Найти
 пользователя
    │
    ▼
 Вернуть JWT токены
```

### Архитектура

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                    │
│  ┌─────────────────────┐                                                │
│  │ TelegramLoginButton │ ──── Telegram Widget Script                    │
│  └─────────────────────┘                                                │
└──────────────────────────────────────────┬──────────────────────────────┘
                                           │
                                           │ POST /api/auth/telegram
                                           │ { id, first_name, hash, ... }
                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Backend                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ telegram.ts routes  │    │ telegram.ts service │                     │
│  │ - /auth/telegram    │    │ - validateAuth()    │                     │
│  │ - /telegram/webhook │    │ - sendMessage()     │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
└──────────────────────────────────────────┬──────────────────────────────┘
                                           │
                                           │ Webhook: POST /api/telegram/webhook
                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Telegram Bot API                               │
│  @SteelBlaBlaCarBot                                                     │
│  - Получает /start команду                                              │
│  - Отправляет уведомления                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Реализация

#### 1. Валидация Telegram Login Widget (backend)

```typescript
// backend/src/services/telegram.ts
export function validateTelegramAuth(data: TelegramAuthData): boolean {
  const { hash, ...authData } = data;

  // Проверка возраста данных (макс. 24 часа)
  const authAge = Math.floor(Date.now() / 1000) - authData.auth_date;
  if (authAge > 86400) return false;

  // Формируем строку для проверки
  const checkString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n');

  // HMAC-SHA256 с секретным ключом = SHA256(bot_token)
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  return calculatedHash === hash;
}
```

#### 2. Telegram Login Widget (frontend)

```typescript
// frontend/components/auth/TelegramLoginButton.tsx
const script = document.createElement('script');
script.src = 'https://telegram.org/js/telegram-widget.js?22';
script.setAttribute('data-telegram-login', 'SteelBlaBlaCarBot');
script.setAttribute('data-size', 'large');
script.setAttribute('data-onauth', 'TelegramLoginWidgetCallback(user)');
script.setAttribute('data-request-access', 'write');
```

#### 3. Уведомления

```typescript
// backend/src/services/telegram.ts
export async function sendMessage(options: SendMessageOptions): Promise<boolean> {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: options.chatId.toString(),
      text: options.text,
      parse_mode: 'HTML',
    }),
  });
  return response.ok;
}
```

### Схема базы данных

```prisma
model User {
  // Email теперь опционален
  email            String?  @unique

  // Telegram поля
  telegramId       BigInt?  @unique
  telegramUsername String?
  telegramChatId   BigInt?           // Для отправки уведомлений
  telegramPhotoUrl String?

  @@index([telegramId])
}
```

## Альтернативы

### 1. Magic Link (email verification)
- **Плюсы**: Безопасно, верификация email
- **Минусы**: Требует email-сервис, задержка входа, нет push-уведомлений

### 2. OAuth через Google/VK
- **Плюсы**: Широко распространены
- **Минусы**: Не все сотрудники имеют, нет push-уведомлений

### 3. Корпоративный SSO (LDAP/AD)
- **Плюсы**: Единая точка входа
- **Минусы**: Сложная интеграция, нет push-уведомлений

### 4. Firebase Authentication + FCM
- **Плюсы**: Push-уведомления, много провайдеров
- **Минусы**: Vendor lock-in, сложнее для PWA

## Почему Telegram?

| Критерий | Telegram | Magic Link | OAuth | SSO |
|----------|----------|------------|-------|-----|
| Верификация пользователя | + | + | + | + |
| Push-уведомления | + | - | - | - |
| Скорость входа | ++ | - | + | + |
| Простота интеграции | + | + | + | - |
| Не требует email | + | - | +/- | - |
| Популярность в России | ++ | N/A | + | N/A |

## Последствия

### Положительные
- **Верификация**: Telegram гарантирует, что пользователь владеет номером телефона
- **Push-уведомления**: Водители и пассажиры получают мгновенные уведомления
- **Мгновенный вход**: Один клик для авторизованных в Telegram
- **Нет паролей**: Telegram отвечает за безопасность аккаунта
- **Минимум кода**: Не нужен email-сервис

### Отрицательные
- **Зависимость от Telegram**: Если Telegram недоступен, вход невозможен
- **Требуется Telegram**: Пользователи без Telegram не смогут войти
- **Настройка бота**: Требуется создание и настройка бота через @BotFather

### Риски

| Риск | Уровень | Митигация |
|------|---------|-----------|
| Telegram недоступен | Низкий | Россия - один из основных рынков Telegram |
| Пользователь без Telegram | Средний | 99% целевой аудитории используют Telegram |
| Компрометация бота | Низкий | Токен хранится в env, не в коде |

## Настройка

### 1. Создание бота
```
@BotFather → /newbot → SteelBlaBlaCarBot
@BotFather → /setdomain → steel-blablacar.netlify.app
```

### 2. Environment Variables (Render)
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Environment Variables (Netlify)
```
VITE_TELEGRAM_BOT_USERNAME=SteelBlaBlaCarBot
```

### 4. Webhook
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://nlmkblablacar-api.onrender.com/api/telegram/webhook"
```

## Технический долг

- [ ] Добавить inline keyboards для быстрых действий в уведомлениях
- [ ] Реализовать команды бота (/mytrips, /mybookings)
- [ ] Добавить возможность привязки email как резервного метода
- [ ] Мониторинг доставки уведомлений

## Связанные решения

- ADR-005: JWT-аутентификация
- ADR-006: Упрощенная авторизация (заменено)
- ADR-027: RESTful API
