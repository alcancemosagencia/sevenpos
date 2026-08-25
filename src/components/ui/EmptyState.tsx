import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 text-center text-text-tertiary ${className}`}>
        {icon && <div className="mb-2 text-text-tertiary">{icon}</div>}
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-secondary border border-border-default flex items-center justify-center text-text-secondary mb-3 shadow-xs">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-text-secondary">{title}</h4>
      {description && (
        <p className="text-xs text-text-tertiary max-w-sm mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
