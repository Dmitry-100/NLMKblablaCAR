# ADR-005: JWT-аутентификация

**Статус:** Принято
**Дата:** 2024-01
**Автор:** Команда разработки

## Контекст

Приложение требует аутентификации пользователей для:
- Создания поездок (только авторизованные пользователи)
- Бронирования мест
- Управления профилем
- Оставления отзывов

Архитектура с разделенными Frontend и Backend (ADR-001) требует stateless механизма аутентификации.

## Решение

Выбрана **JWT (JSON Web Token) аутентификация** с хранением токена на клиенте.

```
┌──────────────────────────────────────────────────────────────┐
│                        Поток аутентификации                   │
└──────────────────────────────────────────────────────────────┘

1. Login Request
   Client ──────────────────────────────────────────► Backend
          POST /auth/login { email: "user@nlmk.com" }

2. Token Generation
   Backend: jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })

3. Token Response
   Client ◄────────────────────────────────────────── Backend
          { token: "eyJhbG...", user: {...} }

4. Token Storage
   Client: localStorage.setItem('nlmk_auth_token', token)

5. Authenticated Requests
   Client ──────────────────────────────────────────► Backend
          Authorization: Bearer eyJhbG...

6. Token Verification
   Backend: jwt.verify(token, JWT_SECRET) → { userId, email }
```

### Реализация

```typescript
// Backend: middleware/auth.ts
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Frontend: services/api.ts
const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(token && { Authorization: `Bearer ${token}` })
});
```

## Альтернативы

### 1. Session-based аутентификация
- **Плюсы**: Простой revoke, меньше данных в каждом запросе
- **Минусы**: Требует session store (Redis), не подходит для stateless архитектуры

### 2. OAuth 2.0 / OpenID Connect
- **Плюсы**: Стандарт индустрии, SSO возможности, корпоративная интеграция
- **Минусы**: Сложнее реализация, требует OAuth провайдера

### 3. API Keys
- **Плюсы**: Простота, подходит для M2M
- **Минусы**: Не подходит для пользовательской аутентификации

### 4. httpOnly Cookies
- **Плюсы**: Защита от XSS, автоматическая отправка
- **Минусы**: CSRF уязвимость, сложнее с CORS

## Последствия

### Положительные
- **Stateless**: Не требует серверного хранилища сессий
- **Масштабируемость**: Любой инстанс backend может проверить токен
- **Простота**: Стандартная библиотека jsonwebtoken
- **Self-contained**: Токен содержит userId, не нужен запрос к БД
- **Cross-domain**: Работает с разделенными Frontend/Backend

### Отрицательные
- **Нет отзыва токена**: Невозможно инвалидировать до истечения срока
- **XSS уязвимость**: Токен в localStorage доступен JavaScript
- **Размер**: JWT больше session ID (~1KB vs ~32 bytes)
- **Нет refresh token**: При истечении нужен повторный логин

### Риски безопасности

| Риск | Митигация | Статус |
|------|-----------|--------|
| XSS атака | Content Security Policy, санитизация | ⚠️ Частично |
| Token theft | HTTPS only, короткий срок жизни | ✅ Реализовано |
| Brute force | Rate limiting | ❌ Не реализовано |
| JWT secret leak | Env variables, rotation | ✅ Реализовано |

### Технический долг
- [ ] Добавить refresh token механизм
- [ ] Реализовать rate limiting
- [ ] Рассмотреть httpOnly cookies для production
- [ ] Добавить token blacklist при logout

## Связанные решения

- ADR-006: Упрощенная авторизация без пароля
- ADR-007: Хранение токена в localStorage
- ADR-008: CORS-политика
