import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
}) => {
  const baseStyle =
    'px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg shadow-sky-200 hover:shadow-sky-300',
    secondary: 'bg-white text-gray-700 border border-gray-100 shadow-sm hover:bg-gray-50',
    ghost: 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-700',
    danger: 'bg-red-50 text-red-500 hover:bg-red-100',
    success: 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : children}
    </button>
  );
};
