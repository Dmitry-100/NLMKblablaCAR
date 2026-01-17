/**
 * LocationInput Component
 * Поле ввода с автодополнением адресов через Яндекс.Карты
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X, Loader2, Map } from 'lucide-react';
import { City } from '../types';
import { searchAddress, SuggestItem, LocationData } from '../services/yandexMapsService';

// ============ TYPES ============

interface LocationInputProps {
  value: string;
  onChange: (location: LocationData) => void;
  city: City;
  placeholder?: string;
  label?: string;
  required?: boolean;
  onOpenMap?: () => void;
}

// ============ COMPONENT ============

export function LocationInput({
  value,
  onChange,
  city,
  placeholder = 'Введите адрес',
  label,
  required = false,
  onOpenMap
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Синхронизация с внешним значением
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced search
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchAddress(query, city);
      setSuggestions(results);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [city]);

  // Обработка изменения ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Сбрасываем координаты при ручном вводе
    onChange({ address: newValue });

    // Debounce поиска
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(newValue);
    }, 300);
  };

  // Выбор подсказки
  const handleSelectSuggestion = (suggestion: SuggestItem) => {
    const fullAddress = suggestion.subtitle
      ? `${suggestion.title}, ${suggestion.subtitle}`
      : suggestion.title;

    setInputValue(suggestion.title);
    setSuggestions([]);
    setIsFocused(false);

    onChange({
      address: suggestion.title,
      lat: suggestion.coords?.lat,
      lng: suggestion.coords?.lng
    });
  };

  // Очистка поля
  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    onChange({ address: '' });
    inputRef.current?.focus();
  };

  // Клавиатурная навигация
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Очистка debounce при unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs text-gray-400 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin size={16} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            w-full bg-gray-50 pl-9 pr-20 py-3 rounded-xl text-sm
            border border-transparent
            focus:border-sky-300 focus:ring-2 focus:ring-sky-100
            outline-none transition-all
            ${showSuggestions ? 'rounded-b-none border-sky-300' : ''}
          `}
        />

        {/* Кнопки справа */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 size={16} className="animate-spin text-gray-400" />
          )}

          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          )}

          {onOpenMap && (
            <button
              type="button"
              onClick={onOpenMap}
              className="p-1.5 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
              title="Выбрать на карте"
            >
              <Map size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Список подсказок */}
      {showSuggestions && (
        <div className="absolute z-50 w-full bg-white border border-t-0 border-sky-300 rounded-b-xl shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`
                w-full px-4 py-3 text-left flex items-start gap-3
                hover:bg-sky-50 transition-colors
                ${selectedIndex === index ? 'bg-sky-50' : ''}
              `}
            >
              <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-gray-800 truncate">
                  {suggestion.title}
                </div>
                {suggestion.subtitle && (
                  <div className="text-xs text-gray-400 truncate">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocationInput;
