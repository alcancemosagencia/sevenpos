import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'default' | 'full' | 'narrow';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  maxWidth = 'default',
}) => {
  const maxWidthStyles = {
    default: 'max-w-[1440px]',
    full: 'max-w-full',
    narrow: 'max-w-5xl',
  };

  return (
    <div className="w-full flex-1 overflow-y-auto">
      <main
        className={`w-full mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5 ${maxWidthStyles[maxWidth]} ${className}`}
      >
        {children}
      </main>
    </div>
  );
};
