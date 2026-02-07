import React from 'react';

export type BadgeColor = 'blue' | 'pink' | 'green' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'blue' }) => {
  const colors: Record<BadgeColor, string> = {
    blue: 'ui-badge-blue',
    pink: 'ui-badge-pink',
    green: 'ui-badge-green',
    gray: 'ui-badge-gray',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};
