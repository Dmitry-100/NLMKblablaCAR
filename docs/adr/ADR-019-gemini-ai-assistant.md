# ADR-019: Google Gemini AI для ассистента

**Статус:** Принято
**Дата:** 2024-01
**Автор:** Команда разработки

## Контекст

Для улучшения пользовательского опыта планируется добавить AI-ассистента, который поможет пользователям:
- Получить информацию о погоде на маршруте
- Составить комментарии к поездкам
- Ответить на вопросы о приложении
- Дать рекомендации по поездкам

Ассистент должен понимать русский язык и работать в контексте карпулинга.

## Решение

Выбран **Google Gemini API** (модель gemini-2.0-flash) как LLM для AI-ассистента.

### Архитектура интеграции

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐     HTTP/REST      ┌─────────────────────┐
│ AssistantModal  │ ◄────────────────► │ Google Gemini API   │
│ (React)         │                    │ (gemini-2.0-flash)  │
├─────────────────┤                    └─────────────────────┘
│ • Input prompt  │
│ • Display response                   Прямой вызов из browser
│ • Loading state │                    (без backend proxy)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ geminiService   │
│ .ts             │
├─────────────────┤
│ generateResponse│
│ (prompt) →      │
│ string          │
└─────────────────┘
```

### Реализация

```typescript
// services/geminiService.ts
import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `
Ты — помощник приложения NLMKblablaCAR для совместных поездок между Москвой и Липецком.

Твои задачи:
- Отвечать на вопросы о приложении
- Помогать с информацией о погоде на маршруте
- Предлагать комментарии для поездок
- Давать советы по безопасным поездкам

Отвечай кратко (до 50 слов), дружелюбно, на русском языке.
`;

export async function generateAssistantResponse(
  userPrompt: string
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return 'API ключ не настроен. Обратитесь к администратору.';
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 150,
        temperature: 0.7
      }
    });

    return response.text || 'Не удалось получить ответ.';
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Произошла ошибка. Попробуйте позже.';
  }
}
```

### Компонент UI

```typescript
// В App.tsx
function AssistantModal({ isOpen, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    const result = await generateAssistantResponse(prompt);
    setResponse(result);
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Задайте вопрос..."
      />
      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Думаю...' : 'Спросить'}
      </button>
      {response && <div className="response">{response}</div>}
    </Modal>
  );
}
```

## Альтернативы

### 1. OpenAI GPT-4 / GPT-3.5
```typescript
const openai = new OpenAI({ apiKey });
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: prompt }]
});
```
- **Плюсы**: Лучшее качество ответов, больше документации
- **Минусы**: Дороже, нет бесплатного tier'а, требует оплату

### 2. Anthropic Claude
```typescript
const anthropic = new Anthropic({ apiKey });
const message = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  messages: [{ role: 'user', content: prompt }]
});
```
- **Плюсы**: Высокое качество, хорошее понимание контекста
- **Минусы**: Дороже, нет бесплатного tier'а

### 3. Локальная LLM (Ollama + Llama)
```typescript
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({ model: 'llama2', prompt })
});
```
- **Плюсы**: Бесплатно, приватность данных, нет лимитов
- **Минусы**: Требует сервер с GPU, сложнее деплой

### 4. Yandex GPT
```typescript
const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
  headers: { 'Authorization': `Bearer ${iamToken}` },
  body: JSON.stringify({ modelUri, completionOptions, messages })
});
```
- **Плюсы**: Хороший русский язык, российский сервис
- **Минусы**: Сложная аутентификация (IAM token), меньше документации

## Сравнение

| Критерий | Gemini | OpenAI | Claude | YandexGPT |
|----------|--------|--------|--------|-----------|
| Бесплатный tier | ✅ 60 req/min | ❌ | ❌ | ⚠️ Ограничен |
| Русский язык | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★★ |
| Качество | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| Простота API | ★★★★★ | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| Цена (платно) | $ | $$$ | $$ | $ |

## Последствия

### Положительные
- **Бесплатный tier**: 60 запросов/мин, 1M токенов/день
- **Простой API**: Минимум кода для интеграции
- **Быстрые ответы**: gemini-2.0-flash оптимизирован для скорости
- **Мультимодальность**: Возможность добавить обработку изображений
- **Официальный SDK**: @google/genai с TypeScript поддержкой

### Отрицательные
- **API key в браузере**: Ключ доступен в DevTools (риск)
- **Нет контекста разговора**: Каждый запрос независимый
- **Зависимость от внешнего сервиса**: При недоступности API ассистент не работает
- **Качество на русском**: Иногда странные формулировки

### Риски безопасности

| Риск | Уровень | Митигация |
|------|---------|-----------|
| API key exposure | 🔴 Высокий | Proxy через backend |
| Prompt injection | 🟡 Средний | Валидация input, system prompt |
| Data leakage | 🟡 Средний | Не передавать персональные данные |
| Cost overrun | 🟢 Низкий | Rate limiting на frontend |

### Рекомендуемая архитектура (production)

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │ ──► │ Backend │ ──► │ Gemini  │
│         │     │ (proxy) │     │ API     │
└─────────┘     └─────────┘     └─────────┘

Backend:
- Хранит API key
- Rate limiting
- Логирование
- Кэширование частых вопросов
```

### Технический долг

- [ ] **КРИТИЧНО**: Перенести API key на backend (proxy)
- [ ] Добавить rate limiting на клиенте
- [ ] Реализовать историю чата (контекст)
- [ ] Кэшировать частые вопросы
- [ ] Добавить fallback при недоступности API
- [ ] Мониторинг использования квот

## Связанные решения

- ADR-001: Разделение Frontend/Backend
- ADR-018: Yandex Maps (геоданные для контекста)
