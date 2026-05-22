import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`ui-card rounded-xl p-5 transition-colors duration-200 ${className}`}
  >
    {children}
  </div>
);
