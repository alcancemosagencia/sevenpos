import React from 'react';

export interface FilterToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * FilterToolbar: Canonical structural wrapper for search inputs, dropdown filters, and toolbar actions.
 * Rule: Standalone controls sitting directly on the PageContainer surface.
 * NO Card styling (no background, border, radius, shadow, or heavy padding).
 */
export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between ${className}`}
    >
      {children}
    </div>
  );
};
