import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl shadow-sky-100/50 border border-white hover:shadow-2xl transition-all duration-300 ${className}`}
  >
    {children}
  </div>
);
