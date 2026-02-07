/**
 * Yandex Maps Provider
 * React Context для инициализации Yandex Maps API
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { loadYandexMapsScript, isYmapsLoaded, getYmaps } from './yandexMapsService';

// ============ TYPES ============

interface YandexMapsContextValue {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  ymaps: any;
}

interface YandexMapsProviderProps {
  children: ReactNode;
  apiKey?: string;
}

// ============ CONTEXT ============

const YandexMapsContext = createContext<YandexMapsContextValue>({
  isLoaded: false,
  isLoading: true,
  error: null,
  ymaps: null,
});

// ============ PROVIDER ============

export function YandexMapsProvider({ children, apiKey }: YandexMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(isYmapsLoaded());
  const [isLoading, setIsLoading] = useState(!isYmapsLoaded());
  const [error, setError] = useState<Error | null>(null);
  const [ymaps, setYmaps] = useState<any>(getYmaps());

  useEffect(() => {
    const key = apiKey || import.meta.env.VITE_YANDEX_MAPS_API_KEY;

    if (!key) {
      console.warn('Yandex Maps API key not provided. Maps functionality will be limited.');
      setIsLoading(false);
      return;
    }

    if (isYmapsLoaded()) {
      setIsLoaded(true);
      setIsLoading(false);
      setYmaps(getYmaps());
      return;
    }

    setIsLoading(true);

    loadYandexMapsScript(key)
      .then(() => {
        setIsLoaded(true);
        setYmaps(getYmaps());
      })
      .catch(err => {
        console.error('Failed to load Yandex Maps:', err);
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [apiKey]);

  const value: YandexMapsContextValue = {
    isLoaded,
    isLoading,
    error,
    ymaps,
  };

  return <YandexMapsContext.Provider value={value}>{children}</YandexMapsContext.Provider>;
}

// ============ HOOK ============

export function useYandexMaps(): YandexMapsContextValue {
  const context = useContext(YandexMapsContext);

  if (context === undefined) {
    throw new Error('useYandexMaps must be used within a YandexMapsProvider');
  }

  return context;
}

// ============ EXPORT ============

export default YandexMapsProvider;
