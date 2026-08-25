import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
  rounded?: 'pill' | 'default';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  rounded = 'pill',
  icon,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-semibold select-none border shrink-0';

  const sizeStyles = {
    sm: 'text-[11px] leading-tight px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const roundedStyles = {
    pill: 'rounded-full',
    default: 'rounded-[var(--radius-control)]',
  };

  const variantStyles = {
    success:
      'bg-status-success-bg text-status-success-text border-status-success/20',
    warning:
      'bg-status-warning-bg text-status-warning-text border-status-warning/20',
    danger:
      'bg-status-danger-bg text-status-danger-text border-status-danger/20',
    info:
      'bg-status-info-bg text-status-info-text border-status-info/20',
    neutral:
      'bg-surface-secondary text-text-secondary border-border-default',
    brand:
      'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${roundedStyles[rounded]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
