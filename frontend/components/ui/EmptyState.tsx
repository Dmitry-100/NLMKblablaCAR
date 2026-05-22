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
      className={`relative overflow-hidden rounded-xl border app-surface p-8 text-center ${className}`}
    >
      <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)]">
        <Icon size={28} className="text-[color:var(--steel-blue)]" />
      </div>
      <h3 className="app-text relative mb-2 text-lg font-semibold">{title}</h3>
      <p className="app-text-muted relative mx-auto max-w-md text-sm">{description}</p>
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}
