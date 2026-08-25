import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  children,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 ${className}`}
    >
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-text-secondary">
            {subtitle}
          </p>
        )}
      </div>

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
          {children}
          {actions}
        </div>
      )}
    </div>
  );
};
