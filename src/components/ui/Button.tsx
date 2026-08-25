import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'brand' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  startContent,
  endContent,
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const effectiveStartIcon = startContent || leftIcon;
  const effectiveEndIcon = endContent || rightIcon;

  const baseStyles =
    'inline-flex items-center justify-center flex-row whitespace-nowrap font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 cursor-pointer select-none';

  const sizeStyles = {
    sm: 'h-8 sm:h-9 text-xs px-3 gap-1.5 rounded-[var(--radius-control)]',
    md: 'h-10 text-sm px-4 gap-2 rounded-[var(--radius-button)]',
    lg: 'h-11 sm:h-12 text-base px-5 gap-2.5 rounded-[var(--radius-button)]',
  };

  const variantStyles = {
    // High-contrast primary button (dark solid in light mode, crisp light in dark mode or solid brand)
    primary:
      'bg-text-primary text-background hover:opacity-90 shadow-sm border border-transparent',
    secondary:
      'bg-surface-secondary text-text-primary hover:bg-surface-hover border border-border-default shadow-xs',
    outline:
      'bg-transparent text-text-primary border border-border-default hover:bg-surface-hover hover:border-border-strong',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent',
    brand:
      'bg-brand-primary text-white hover:bg-brand-hover shadow-sm border border-transparent',
    danger:
      'bg-status-danger text-white hover:opacity-90 shadow-sm border border-transparent',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        effectiveStartIcon && <span className="inline-flex items-center justify-center shrink-0">{effectiveStartIcon}</span>
      )}
      {children && <span className="inline-flex items-center gap-2">{children}</span>}
      {!isLoading && effectiveEndIcon && <span className="inline-flex items-center justify-center shrink-0">{effectiveEndIcon}</span>}
    </button>
  );
};
