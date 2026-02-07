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
    primary: 'ui-btn-primary',
    secondary: 'ui-btn-secondary',
    ghost: 'ui-btn-ghost',
    danger: 'ui-btn-danger',
    success: 'ui-btn-success',
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
