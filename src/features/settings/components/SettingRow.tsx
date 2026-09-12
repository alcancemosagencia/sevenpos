import React from 'react';

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  verticalOnMobile?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  description,
  children,
  className = '',
}) => {
  return (
    <div
      className={`py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border-subtle last:border-b-0 w-full ${className}`}
    >
      <div className="w-full md:flex-1 md:max-w-xl md:pr-4 min-w-0">
        <h4 className="text-sm font-semibold text-text-primary leading-snug">{label}</h4>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="w-full md:w-auto shrink-0 flex items-center justify-between md:justify-end gap-2 min-w-0">
        {children}
      </div>
    </div>
  );
};

