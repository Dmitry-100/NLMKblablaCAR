import React, { createContext, useContext, useMemo, useState } from 'react';
import { Trip } from '../../types';

export type InsightsPeriod = '7d' | '30d' | '90d' | 'all';

export const insightsPeriodOptions: Array<{ value: InsightsPeriod; label: string }> = [
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
  { value: 'all', label: 'За всё время' },
];

interface InsightsPeriodContextValue {
  period: InsightsPeriod;
  setPeriod: (period: InsightsPeriod) => void;
}

const InsightsPeriodContext = createContext<InsightsPeriodContextValue | undefined>(undefined);

export function isTripInInsightsPeriod(trip: Trip, period: InsightsPeriod): boolean {
  if (period === 'all') return true;

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const tripDate = new Date(`${trip.date}T00:00:00`);

  return tripDate >= start && tripDate <= now;
}

export function InsightsPeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<InsightsPeriod>('30d');

  const value = useMemo(
    () => ({
      period,
      setPeriod,
    }),
    [period]
  );

  return <InsightsPeriodContext.Provider value={value}>{children}</InsightsPeriodContext.Provider>;
}

export function useInsightsPeriod() {
  const context = useContext(InsightsPeriodContext);
  if (!context) {
    throw new Error('useInsightsPeriod must be used within InsightsPeriodProvider');
  }
  return context;
}
