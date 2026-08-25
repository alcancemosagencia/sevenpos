import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <span className="absolute left-3 text-text-tertiary pointer-events-none flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`w-full bg-surface-secondary text-text-primary placeholder:text-text-tertiary border rounded-[var(--radius-control)] text-sm px-3 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary disabled:opacity-50 disabled:bg-surface disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error
                ? 'border-status-danger focus:ring-status-danger/40 focus:border-status-danger'
                : 'border-border-default'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 text-text-tertiary flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <span className="text-xs text-status-danger font-medium">{error}</span>}
        {!error && helperText && (
          <span className="text-xs text-text-tertiary">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
