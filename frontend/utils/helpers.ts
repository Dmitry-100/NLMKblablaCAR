import { City } from '../types';

/**
 * Get display name for city
 */
export const getCityName = (city: City): string => {
  return city === City.Moscow ? 'Москва' : 'Липецк';
};

/**
 * Format date from YYYY-MM-DD to DD.MM.YYYY (European format)
 */
export const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
};

/**
 * Format time (already 24h, ensure consistency)
 */
export const formatTime = (timeStr: string): string => timeStr;

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if a date string is in the past
 */
export const isDateInPast = (dateStr: string): boolean => {
  return dateStr < getTodayDate();
};
