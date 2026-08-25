import React from 'react';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className = '',
}) => {
  if (orientation === 'vertical') {
    return <div className={`w-[1px] h-full bg-border-default self-stretch ${className}`} />;
  }
  return <div className={`w-full h-[1px] bg-border-default my-2 ${className}`} />;
};
