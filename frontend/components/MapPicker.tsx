/**
 * MapPicker Component
 * Полноэкранная карта для выбора точки
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, MapPin, Check, Loader2, Navigation2 } from 'lucide-react';
import { City } from '../types';
import { useYandexMaps } from '../services/YandexMapsProvider';
import {
  CITY_BOUNDS,
  getAddressFromCoords,
  LocationData,
  Coords,
  YandexMapInstance,
} from '../services/yandexMapsService';

// ============ TYPES ============

interface MapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: LocationData) => void;
  city: City;
  initialLocation?: LocationData;
}

// ============ COMPONENT ============

export function MapPicker({ isOpen, onClose, onSelect, city, initialLocation }: MapPickerProps) {
  const { isLoaded, ymaps } = useYandexMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YandexMapInstance | null>(null);
  const markerRef = useRef<unknown>(null);

  const [selectedCoords, setSelectedCoords] = useState<Coords | null>(
    initialLocation?.lat && initialLocation?.lng
      ? { lat: initialLocation.lat, lng: initialLocation.lng }
      : null
  );
  const [selectedAddress, setSelectedAddress] = useState(initialLocation?.address || '');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const cityBounds = CITY_BOUNDS[city];

  // Обновление маркера на карте
  const updateMarker = useCallback(
    (coords: Coords) => {
      if (!mapRef.current || !ymaps) return;

      const { YMapMarker } = ymaps;

      // Удаляем старый маркер
      if (markerRef.current) {
        mapRef.current.removeChild(markerRef.current);
      }

      // Создаём новый маркер
      const markerElement = document.createElement('div');
      markerElement.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #38bdf8, #3b82f6);
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `;

      const marker = new YMapMarker(
        {
          coordinates: [coords.lng, coords.lat],
        },
        markerElement
      );

      mapRef.current.addChild(marker);
      markerRef.current = marker;
    },
    [ymaps]
  );

  // Обработка клика по карте
  const handleMapClick = useCallback(
    async (coords: Coords) => {
      setSelectedCoords(coords);
      updateMarker(coords);

      // Получаем адрес по координатам
      setIsLoadingAddress(true);
      try {
        const address = await getAddressFromCoords(coords.lat, coords.lng);
        setSelectedAddress(address);
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        setSelectedAddress('');
      } finally {
        setIsLoadingAddress(false);
      }
    },
    [updateMarker]
  );

  // Инициализация карты
  useEffect(() => {
    if (!isOpen || !isLoaded || !ymaps || !mapContainerRef.current) {
      return;
    }

    const initMap = async () => {
      try {
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps;

        // Начальный центр: из initialLocation или центр города
        const initialCenter: [number, number] =
          initialLocation?.lat && initialLocation?.lng
            ? [initialLocation.lng, initialLocation.lat]
            : [cityBounds.center[1], cityBounds.center[0]];

        const map = new YMap(mapContainerRef.current, {
          location: {
            center: initialCenter,
            zoom: 13,
          },
        });

        map.addChild(new YMapDefaultSchemeLayer({}));
        map.addChild(new YMapDefaultFeaturesLayer({}));

        // Обработчик кликов
        const listener = new YMapListener({
          onClick: (_object: unknown, event: { coordinates?: [number, number] }) => {
            // В Yandex Maps API v3 координаты в event.coordinates
            const coordinates = event?.coordinates;
            if (coordinates && Array.isArray(coordinates)) {
              handleMapClick({
                lat: coordinates[1],
                lng: coordinates[0],
              });
            }
          },
        });
        map.addChild(listener);

        mapRef.current = map;

        // Устанавливаем начальный маркер если есть
        if (initialLocation?.lat && initialLocation?.lng) {
          updateMarker({
            lat: initialLocation.lat,
            lng: initialLocation.lng,
          });
        }
      } catch (error) {
        console.error('Map initialization error:', error);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, isLoaded, ymaps, city, initialLocation, handleMapClick, updateMarker, cityBounds]);

  // Определение текущего местоположения
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Проверяем, что точка в пределах города
        const bounds = cityBounds.bounds;
        if (
          coords.lat < bounds[0][0] ||
          coords.lat > bounds[1][0] ||
          coords.lng < bounds[0][1] ||
          coords.lng > bounds[1][1]
        ) {
          alert(
            `Ваше местоположение находится за пределами ${city === City.Moscow ? 'Москвы' : 'Липецка'}`
          );
          setIsLocating(false);
          return;
        }

        // Центрируем карту на местоположении
        if (mapRef.current) {
          mapRef.current.setLocation({
            center: [coords.lng, coords.lat],
            zoom: 15,
            duration: 500,
          });
        }

        handleMapClick(coords);
        setIsLocating(false);
      },
      error => {
        console.error('Geolocation error:', error);
        alert('Не удалось определить местоположение');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Подтверждение выбора
  const handleConfirm = () => {
    if (selectedCoords) {
      onSelect({
        address: selectedAddress,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[color:var(--app-surface-strong)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--app-border)] p-4">
        <button
          onClick={onClose}
          className="-ml-2 rounded-md p-2 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
        >
          <X size={24} />
        </button>
        <h2 className="font-semibold text-[color:var(--app-text)]">Выберите точку на карте</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <div className="flex h-full w-full items-center justify-center bg-[color:var(--app-surface-soft)]">
            <div className="flex items-center gap-2 text-[color:var(--app-text-muted)]">
              <Loader2 size={24} className="animate-spin" />
              <span>Загрузка карты...</span>
            </div>
          </div>
        ) : (
          <div ref={mapContainerRef} className="w-full h-full" />
        )}

        {/* Кнопка геолокации */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating || !isLoaded}
          className="absolute right-4 bottom-32 rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-3 shadow-lg transition-colors hover:bg-[color:var(--app-surface-soft)] disabled:opacity-50"
          title="Моё местоположение"
        >
          {isLocating ? (
            <Loader2 size={20} className="animate-spin text-[color:var(--steel-blue)]" />
          ) : (
            <Navigation2 size={20} className="text-[color:var(--steel-blue)]" />
          )}
        </button>
      </div>

      {/* Footer с выбранным адресом */}
      <div className="space-y-3 border-t border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-4">
        {/* Выбранный адрес */}
        <div className="min-h-[60px] rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3">
          {isLoadingAddress ? (
            <div className="flex items-center gap-2 text-[color:var(--app-text-muted)]">
              <Loader2 size={16} className="animate-spin" />
              <span>Определение адреса...</span>
            </div>
          ) : selectedAddress ? (
            <div className="flex items-start gap-2">
              <MapPin size={18} className="mt-0.5 flex-shrink-0 text-[color:var(--steel-blue)]" />
              <span className="text-sm text-[color:var(--app-text)]">{selectedAddress}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[color:var(--app-text-muted)]">
              <MapPin size={18} />
              <span className="text-sm">Нажмите на карту, чтобы выбрать точку</span>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-4 py-3 font-medium text-[color:var(--app-text)] transition-colors hover:border-[color:var(--app-border-strong)]"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCoords || isLoadingAddress}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[color:var(--steel-blue)] px-4 py-3 font-medium text-white transition-colors hover:bg-[color:var(--steel-blue-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={18} />
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

export default MapPicker;
