import React from 'react';

export type BadgeColor = 'blue' | 'pink' | 'green' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  variant?: BadgeColor;
}

export const Badge: React.FC<BadgeProps> = ({ children, color, variant }) => {
  const resolvedColor = color ?? variant ?? 'blue';
  const colors: Record<BadgeColor, string> = {
    blue: 'ui-badge-blue',
    pink: 'ui-badge-pink',
    green: 'ui-badge-green',
    gray: 'ui-badge-gray',
  };

  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${colors[resolvedColor]}`}
    >
      {children}
    </span>
  );
};
