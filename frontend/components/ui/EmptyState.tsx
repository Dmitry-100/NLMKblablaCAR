import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border app-surface p-8 text-center shadow-sm ${className}`}
    >
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-sky-100/60 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-emerald-100/60 blur-2xl" />

      <div className="app-surface-strong relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm">
        <Icon size={30} className="text-sky-500" />
      </div>
      <h3 className="app-text relative mb-2 text-lg font-semibold">{title}</h3>
      <p className="app-text-muted relative mx-auto max-w-md text-sm">{description}</p>
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
