import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'raised' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseStyles =
    'rounded-[var(--radius-card)] transition-all duration-150 relative overflow-hidden';

  const variantStyles = {
    default:
      'bg-surface border border-border-default shadow-[var(--shadow-card)]',
    secondary:
      'bg-surface-secondary border border-border-subtle shadow-xs',
    raised:
      'bg-surface-raised border border-border-default shadow-[var(--shadow-elevated)]',
    interactive:
      'bg-surface border border-border-default shadow-[var(--shadow-card)] hover:border-border-strong hover:shadow-[var(--shadow-elevated)] cursor-pointer active:scale-[0.99]',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
