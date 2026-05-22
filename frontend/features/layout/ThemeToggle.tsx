import React from 'react';
import { MonitorCog, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeProvider';

const options: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
  { value: 'light', label: 'Светлая', icon: <Sun size={14} /> },
  { value: 'dark', label: 'Тёмная', icon: <Moon size={14} /> },
  { value: 'system', label: 'Системная', icon: <MonitorCog size={14} /> },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="app-surface inline-flex items-center gap-1 rounded-md border p-1 dark-surface-fallback">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => setMode(option.value)}
          className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs transition-colors ${
            mode === option.value
              ? 'bg-[color:var(--steel-blue)] text-white'
              : 'text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]'
          }`}
          title={option.label}
          aria-label={option.label}
        >
          {option.icon}
          <span className="hidden lg:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
