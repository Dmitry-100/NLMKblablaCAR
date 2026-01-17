/**
 * TripRouteMap Component
 * Компактная карта с маршрутом поездки
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
        className={`bg-gradient-to-r from-sky-50 to-pink-50 rounded-xl p-4 ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <div className="space-y-3">
          {/* Откуда */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-sky-400 border-2 border-white shadow"></div>
              <div className="w-0.5 h-6 bg-gradient-to-b from-sky-300 to-pink-300"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Откуда</p>
              <p className="text-sm text-gray-700 leading-tight">{pickupLocation}</p>
            </div>
          </div>
          {/* Куда */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-pink-400 border-2 border-white shadow"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Куда</p>
              <p className="text-sm text-gray-700 leading-tight">{dropoffLocation}</p>
            </div>
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
