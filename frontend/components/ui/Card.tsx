import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`ui-card rounded-3xl p-6 backdrop-blur-lg transition-all duration-300 hover:shadow-2xl ${className}`}
  >
    {children}
  </div>
);
