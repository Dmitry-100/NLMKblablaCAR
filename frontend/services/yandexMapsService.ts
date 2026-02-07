/**
 * Yandex Maps Service
 * Обёртка над Yandex Maps JavaScript API v3
 */

import { City } from '../types';

// ============ TYPES ============

export interface Coords {
  lat: number;
  lng: number;
}

export interface LocationData {
  address: string;
  lat?: number;
  lng?: number;
}

export interface SuggestItem {
  title: string;
  subtitle?: string;
  coords?: Coords;
}

export interface RouteData {
  distance: number; // в метрах
  duration: number; // в секундах
  coordinates: [number, number][]; // массив [lng, lat]
}

// ============ CITY BOUNDS ============

export const CITY_BOUNDS: Record<
  City,
  { center: [number, number]; bounds: [[number, number], [number, number]] }
> = {
  [City.Moscow]: {
    center: [55.7558, 37.6173],
    bounds: [
      [55.4, 37.0],
      [56.0, 38.0],
    ],
  },
  [City.Lipetsk]: {
    center: [52.6031, 39.5708],
    bounds: [
      [52.4, 39.3],
      [52.8, 39.9],
    ],
  },
};

// ============ STATE ============

let ymapsInstance: any = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

// ============ SCRIPT LOADING ============

/**
 * Загрузить Yandex Maps API скрипт
 */
export async function loadYandexMapsScript(apiKey: string): Promise<void> {
  if (ymapsInstance) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  isLoading = true;

  loadPromise = new Promise((resolve, reject) => {
    // Проверяем, не загружен ли уже скрипт
    if ((window as any).ymaps3) {
      ymapsInstance = (window as any).ymaps3;
      isLoading = false;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;

    script.onload = async () => {
      try {
        // Ждём инициализации ymaps3
        await (window as any).ymaps3.ready;
        ymapsInstance = (window as any).ymaps3;
        isLoading = false;
        resolve();
      } catch (error) {
        isLoading = false;
        reject(error);
      }
    };

    script.onerror = () => {
      isLoading = false;
      reject(new Error('Failed to load Yandex Maps script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Получить инстанс ymaps
 */
export function getYmaps(): any {
  return ymapsInstance;
}

/**
 * Проверить загружен ли API
 */
export function isYmapsLoaded(): boolean {
  return !!ymapsInstance;
}

/**
 * Проверить идёт ли загрузка
 */
export function isYmapsLoading(): boolean {
  return isLoading;
}

// ============ GEOCODING ============

/**
 * Поиск адресов (автодополнение)
 * Использует Yandex Geocoder API
 */
export async function searchAddress(query: string, city: City): Promise<SuggestItem[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Yandex Maps API key not found');
    return [];
  }

  const cityBounds = CITY_BOUNDS[city];
  const bbox = `${cityBounds.bounds[0][1]},${cityBounds.bounds[0][0]}~${cityBounds.bounds[1][1]},${cityBounds.bounds[1][0]}`;

  try {
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${encodeURIComponent(query)}&bbox=${bbox}&rspn=1&results=5`
    );

    if (!response.ok) {
      throw new Error('Geocoder request failed');
    }

    const data = await response.json();
    const featureMembers = data.response?.GeoObjectCollection?.featureMember || [];

    return featureMembers.map((item: any) => {
      const geoObject = item.GeoObject;
      const point = geoObject.Point?.pos?.split(' ');

      return {
        title: geoObject.name || geoObject.metaDataProperty?.GeocoderMetaData?.text,
        subtitle: geoObject.description,
        coords: point
          ? {
              lng: parseFloat(point[0]),
              lat: parseFloat(point[1]),
            }
          : undefined,
      };
    });
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
}

/**
 * Обратное геокодирование (координаты → адрес)
 */
export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Yandex Maps API key not found');
    return '';
  }

  try {
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&format=json&geocode=${lng},${lat}&results=1`
    );

    if (!response.ok) {
      throw new Error('Reverse geocoder request failed');
    }

    const data = await response.json();
    const geoObject = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;

    if (geoObject) {
      return geoObject.metaDataProperty?.GeocoderMetaData?.text || geoObject.name || '';
    }

    return '';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return '';
  }
}

// ============ ROUTING ============

/**
 * Построить маршрут между двумя точками
 * Использует Yandex Router API
 */
export async function getRoute(from: Coords, to: Coords): Promise<RouteData | null> {
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Yandex Maps API key not found');
    return null;
  }

  try {
    // Используем простой Geocoder для получения маршрута через points
    // Для реального приложения лучше использовать Yandex Router API
    const response = await fetch(
      `https://api.routing.yandex.net/v2/route?apikey=${apiKey}&waypoints=${from.lat},${from.lng}|${to.lat},${to.lng}&mode=driving`
    );

    if (!response.ok) {
      // Fallback: вернём прямую линию
      return {
        distance: calculateDistance(from, to),
        duration: 0,
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      };
    }

    const data = await response.json();
    const route = data.route?.legs?.[0];

    if (route) {
      return {
        distance: route.length?.value || 0,
        duration: route.duration?.value || 0,
        coordinates: route.steps?.flatMap((step: any) => step.polyline?.coordinates || []) || [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      };
    }

    return null;
  } catch (error) {
    console.error('Route request error:', error);
    // Fallback: прямая линия между точками
    return {
      distance: calculateDistance(from, to),
      duration: 0,
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    };
  }
}

/**
 * Вычислить расстояние между двумя точками (формула гаверсинуса)
 */
function calculateDistance(from: Coords, to: Coords): number {
  const R = 6371000; // Радиус Земли в метрах
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ============ EXPORT ============

export const yandexMapsService = {
  loadScript: loadYandexMapsScript,
  getYmaps,
  isLoaded: isYmapsLoaded,
  isLoading: isYmapsLoading,
  searchAddress,
  getAddressFromCoords,
  getRoute,
  CITY_BOUNDS,
};

export default yandexMapsService;
