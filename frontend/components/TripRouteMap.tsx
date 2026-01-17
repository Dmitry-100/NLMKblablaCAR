/**
 * TripRouteMap Component
 * Компактная карта с маршрутом поездки
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { City } from '../types';
import { useYandexMaps } from '../services/YandexMapsProvider';
import { CITY_BOUNDS, Coords } from '../services/yandexMapsService';

// ============ TYPES ============

interface TripRouteMapProps {
  pickupLocation: string;
  dropoffLocation: string;
  pickupCoords?: Coords;
  dropoffCoords?: Coords;
  fromCity: City;
  toCity: City;
  className?: string;
  onClick?: () => void;
}

// ============ COMPONENT ============

export function TripRouteMap({
  pickupLocation,
  dropoffLocation,
  pickupCoords,
  dropoffCoords,
  fromCity,
  toCity,
  className = '',
  onClick
}: TripRouteMapProps) {
  const { isLoaded, ymaps } = useYandexMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Если нет координат, показываем fallback
  const hasCoords = pickupCoords && dropoffCoords;

  // Инициализация карты
  useEffect(() => {
    if (!isLoaded || !ymaps || !hasCoords || !mapContainerRef.current) {
      return;
    }

    let map: any = null;

    const initMap = async () => {
      try {
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps;

        // Центр между двумя точками
        const centerLat = (pickupCoords.lat + dropoffCoords.lat) / 2;
        const centerLng = (pickupCoords.lng + dropoffCoords.lng) / 2;

        // Вычисляем zoom на основе расстояния
        const distance = Math.sqrt(
          Math.pow(pickupCoords.lat - dropoffCoords.lat, 2) +
          Math.pow(pickupCoords.lng - dropoffCoords.lng, 2)
        );
        const zoom = distance > 1 ? 8 : distance > 0.1 ? 11 : 14;

        map = new YMap(mapContainerRef.current, {
          location: {
            center: [centerLng, centerLat],
            zoom: zoom
          }
        });

        map.addChild(new YMapDefaultSchemeLayer({}));
        map.addChild(new YMapDefaultFeaturesLayer({}));

        // Маркер отправления (синий)
        const pickupMarkerElement = document.createElement('div');
        pickupMarkerElement.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #38bdf8, #3b82f6);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `;

        const pickupMarker = new YMapMarker({
          coordinates: [pickupCoords.lng, pickupCoords.lat]
        }, pickupMarkerElement);

        map.addChild(pickupMarker);

        // Маркер прибытия (розовый)
        const dropoffMarkerElement = document.createElement('div');
        dropoffMarkerElement.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #f472b6, #ec4899);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `;

        const dropoffMarker = new YMapMarker({
          coordinates: [dropoffCoords.lng, dropoffCoords.lat]
        }, dropoffMarkerElement);

        map.addChild(dropoffMarker);

        mapRef.current = map;
        setIsMapReady(true);

      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError(true);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [isLoaded, ymaps, hasCoords, pickupCoords, dropoffCoords]);

  // Fallback: текстовое отображение без карты
  if (!hasCoords || mapError) {
    return (
      <div
        className={`bg-gradient-to-r from-sky-50 to-pink-50 rounded-xl p-3 ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-sky-600">
            <div className="w-2 h-2 rounded-full bg-sky-400"></div>
            <span className="truncate max-w-[120px]">{pickupLocation}</span>
          </div>
          <Navigation size={14} className="text-gray-300 flex-shrink-0" />
          <div className="flex items-center gap-2 text-pink-600">
            <div className="w-2 h-2 rounded-full bg-pink-400"></div>
            <span className="truncate max-w-[120px]">{dropoffLocation}</span>
          </div>
        </div>
      </div>
    );
  }

  // Загрузка карты
  if (!isLoaded || !isMapReady) {
    return (
      <div
        className={`bg-gray-100 rounded-xl flex items-center justify-center ${className}`}
        style={{ minHeight: '128px' }}
      >
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Загрузка карты...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`rounded-xl overflow-hidden ${className}`}
      style={{ minHeight: '128px', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    />
  );
}

export default TripRouteMap;
