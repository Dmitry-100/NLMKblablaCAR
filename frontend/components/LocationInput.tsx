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
  onOpenMap,
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
  const handleSearch = useCallback(
    async (query: string) => {
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
    },
    [city]
  );

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
    setInputValue(suggestion.title);
    setSuggestions([]);
    setIsFocused(false);

    onChange({
      address: suggestion.title,
      lat: suggestion.coords?.lat,
      lng: suggestion.coords?.lng,
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
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
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
        <label className="mb-1 block text-xs text-[color:var(--app-text-muted)]">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--app-text-muted)]">
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
            industrial-input w-full pl-9 pr-20 py-3 text-sm
            ${showSuggestions ? 'rounded-b-none border-[color:var(--steel-blue)]' : ''}
          `}
        />

        {/* Кнопки справа */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 size={16} className="animate-spin text-[color:var(--app-text-muted)]" />
          )}

          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-1 text-[color:var(--app-text-muted)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
            >
              <X size={16} />
            </button>
          )}

          {onOpenMap && (
            <button
              type="button"
              onClick={onOpenMap}
              className="rounded-md p-1.5 text-[color:var(--steel-blue)] transition-colors hover:bg-[color:var(--app-surface-soft)]"
              title="Выбрать на карте"
            >
              <Map size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Список подсказок */}
      {showSuggestions && (
        <div className="app-surface absolute z-50 w-full overflow-hidden rounded-b-xl border border-t-0 border-[color:var(--steel-blue)] shadow-lg">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`
                w-full px-4 py-3 text-left flex items-start gap-3
                hover:bg-[color:var(--app-surface-soft)] transition-colors
                ${selectedIndex === index ? 'bg-[color:var(--app-surface-soft)]' : ''}
              `}
            >
              <MapPin
                size={16}
                className="mt-0.5 flex-shrink-0 text-[color:var(--app-text-muted)]"
              />
              <div className="min-w-0">
                <div className="truncate text-sm text-[color:var(--app-text)]">
                  {suggestion.title}
                </div>
                {suggestion.subtitle && (
                  <div className="truncate text-xs text-[color:var(--app-text-muted)]">
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
