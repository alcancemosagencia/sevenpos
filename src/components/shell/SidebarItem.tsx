import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';

export interface SidebarItemProps {
  id: string;
  title: string;
  icon: LucideIcon;
  href: string;
  isActive: boolean;
  isCollapsed?: boolean;
  shortcut?: string;
  badge?: string;
  onClick: () => void;
  isNested?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  title,
  icon: Icon,
  isActive,
  isCollapsed = false,
  shortcut,
  badge,
  onClick,
  isNested = false,
}) => {
  const buttonContent = (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className={`group w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-[var(--radius-button)] transition-all duration-150 cursor-pointer select-none relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 ${
        isNested ? 'pl-9 text-xs' : ''
      } ${
        isCollapsed ? 'justify-center px-2' : ''
      } ${
        isActive
          ? 'bg-surface-selected text-text-primary shadow-xs font-semibold border border-border-default'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
      }`}
    >
      <Icon
        size={isNested ? 16 : 18}
        className={`shrink-0 transition-colors ${
          isActive
            ? 'text-text-primary'
            : 'text-text-tertiary group-hover:text-text-primary'
        }`}
        strokeWidth={isActive ? 2.2 : 1.8}
      />

      {!isCollapsed && (
        <span className="truncate flex-1 text-left">{title}</span>
      )}

      {!isCollapsed && shortcut && (
        <Badge
          variant="neutral"
          size="sm"
          rounded="default"
          className="text-[10px] py-0 px-1.5 font-mono text-text-tertiary border-border-default bg-surface/50"
        >
          {shortcut}
        </Badge>
      )}

      {!isCollapsed && badge && (
        <Badge variant="brand" size="sm">
          {badge}
        </Badge>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip content={title} position="right" className="w-full">
        {buttonContent}
      </Tooltip>
    );
  }

  return buttonContent;
};
