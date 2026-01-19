# ADR-018: Yandex Maps API для геолокации

**Статус:** Принято
**Дата:** 2024-01
**Автор:** Команда разработки

## Контекст

Приложение карпулинга требует функциональности работы с картами:
- Выбор точки отправления и прибытия
- Автодополнение адресов при вводе
- Отображение маршрута поездки
- Геолокация пользователя

Целевая аудитория — пользователи в России (Москва ↔ Липецк), что требует хорошего покрытия российских адресов.

## Решение

Выбран **Yandex Maps JavaScript API v3** как основной картографический сервис.

### Архитектура интеграции

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Architecture                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ YandexMaps      │ ◄── React Context (инициализация SDK)
│ Provider        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ yandexMaps      │ ◄── Service layer (API wrapper)
│ Service.ts      │
├─────────────────┤
│ • suggest()     │     Автодополнение адресов
│ • reverseGeocode│     Координаты → адрес
│ • getRoute()    │     Построение маршрута
│ • getGeolocation│     Текущее местоположение
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Components      │
├─────────────────┤
│ LocationInput   │     Поле ввода с suggestions
│ MapPicker       │     Полноэкранный выбор на карте
│ TripRouteMap    │     Отображение маршрута
└─────────────────┘
```

### Реализация сервиса

```typescript
// services/yandexMapsService.ts

// Загрузка SDK
export async function loadYandexMapsScript(apiKey: string): Promise<YMaps> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
    script.onload = async () => {
      await ymaps3.ready;
      resolve(ymaps3);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Автодополнение адресов
export async function suggest(
  query: string,
  city: 'Moscow' | 'Lipetsk'
): Promise<SuggestItem[]> {
  const bounds = CITY_BOUNDS[city];
  const response = await ymaps3.suggest({
    text: query,
    bounds,
    results: 5
  });
  return response.map(item => ({
    title: item.title.text,
    subtitle: item.subtitle?.text,
    coordinates: item.geometry.coordinates
  }));
}

// Обратное геокодирование
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<LocationData> {
  const response = await ymaps3.geocode({
    coordinates: [lng, lat]
  });
  return {
    address: response[0]?.properties.name,
    coordinates: { lat, lng }
  };
}
```

### Компоненты

```typescript
// components/LocationInput.tsx
function LocationInput({ value, onChange, city }) {
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState(value);

  const handleInput = async (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      const items = await suggest(text, city);
      setSuggestions(items);
    }
  };

  return (
    <div className="relative">
      <input value={query} onChange={e => handleInput(e.target.value)} />
      {suggestions.length > 0 && (
        <ul className="absolute bg-white shadow-lg">
          {suggestions.map(item => (
            <li onClick={() => onChange(item)}>{item.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// components/MapPicker.tsx
function MapPicker({ onSelect, city }) {
  const { ymaps, isLoaded } = useYandexMaps();
  const mapRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    const map = new ymaps.YMap(mapRef.current, {
      location: { center: CITY_CENTERS[city], zoom: 12 }
    });

    map.events.add('click', async (e) => {
      const coords = e.get('coords');
      const location = await reverseGeocode(coords[0], coords[1]);
      onSelect(location);
    });
  }, [isLoaded]);

  return <div ref={mapRef} className="w-full h-screen" />;
}
```

## Альтернативы

### 1. Google Maps Platform
```typescript
const loader = new Loader({ apiKey, libraries: ['places'] });
const google = await loader.load();
new google.maps.Map(element, options);
```
- **Плюсы**: Лучшая документация, больше фич, глобальное покрытие
- **Минусы**: Дороже для России, хуже покрытие российских адресов

### 2. 2GIS API
```typescript
DG.then(() => {
  const map = DG.map('map', { center: [54.98, 82.89], zoom: 13 });
});
```
- **Плюсы**: Отличное покрытие России, детальные карты городов
- **Минусы**: Меньше городов, ограниченный API

### 3. OpenStreetMap + Leaflet
```typescript
const map = L.map('map').setView([51.505, -0.09], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
```
- **Плюсы**: Бесплатно, open source, гибкость
- **Минусы**: Нет geocoding из коробки, нужны сторонние сервисы

### 4. Mapbox
```typescript
mapboxgl.accessToken = 'pk.xxx';
const map = new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/...' });
```
- **Плюсы**: Красивые карты, хороший API
- **Минусы**: Ограниченное покрытие России, платный

## Сравнение

| Критерий | Yandex | Google | 2GIS | OSM |
|----------|--------|--------|------|-----|
| Покрытие России | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ |
| Документация | ★★★☆☆ | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| Цена | Бесплатно* | $$$$ | Бесплатно* | Бесплатно |
| Geocoding | ★★★★★ | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| Routing | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★☆☆ |

\* С ограничениями на количество запросов

## Последствия

### Положительные
- **Точные адреса**: Отличное покрытие Москвы и Липецка
- **Русский язык**: Нативная поддержка, правильные склонения
- **Бесплатный tier**: Достаточно для MVP (25k запросов/день)
- **Актуальные данные**: Частые обновления карт России
- **Интеграция с Яндекс.Навигатор**: Знакомый UX для пользователей

### Отрицательные
- **Документация**: Местами устаревшая, меньше примеров
- **API v3 beta**: Некоторые фичи нестабильны
- **Vendor lock-in**: Специфичный API, сложно мигрировать
- **Ограничения**: Нельзя использовать за пределами Яндекс.Карт

### Лимиты бесплатного тарифа

| Сервис | Лимит | Статус |
|--------|-------|--------|
| Geocoding | 25,000/день | ✅ Достаточно |
| Suggest | 25,000/день | ✅ Достаточно |
| Route | 10,000/день | ✅ Достаточно |
| Static Map | 25,000/день | ✅ Достаточно |

### Технический долг

- [ ] Добавить кэширование suggest запросов
- [ ] Реализовать debounce для автодополнения
- [ ] Добавить fallback при недоступности API
- [ ] Отображение маршрута на карте (TripRouteMap)
- [ ] Мониторинг использования квот

## Связанные решения

- ADR-001: Разделение Frontend/Backend
- ADR-019: Gemini AI (также использует геоданные)
