import React from 'react';

export type BadgeColor = 'blue' | 'pink' | 'green' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'blue' }) => {
  const colors: Record<BadgeColor, string> = {
    blue: 'bg-sky-100 text-sky-700',
    pink: 'bg-pink-100 text-pink-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};
