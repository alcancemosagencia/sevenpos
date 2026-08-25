import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'outline' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  ariaLabel,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 cursor-pointer select-none shrink-0';

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs rounded-[var(--radius-control)]',
    md: 'w-9 h-9 text-sm rounded-[var(--radius-button)]',
    lg: 'w-10 h-10 text-base rounded-[var(--radius-button)]',
  };

  const variantStyles = {
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent',
    secondary:
      'bg-surface-secondary text-text-primary hover:bg-surface-hover border border-border-default shadow-xs',
    outline:
      'bg-transparent text-text-secondary hover:text-text-primary border border-border-default hover:bg-surface-hover hover:border-border-strong',
    brand:
      'bg-brand-primary text-white hover:bg-brand-hover shadow-xs border border-transparent',
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
