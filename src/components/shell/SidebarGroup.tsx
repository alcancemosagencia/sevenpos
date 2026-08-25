import React, { useState } from 'react';
import { LucideIcon, Plus, Minus } from 'lucide-react';
import { NavItem } from '../../types/navigation';
import { SidebarItem } from './SidebarItem';
import { Tooltip } from '../ui/Tooltip';

export interface SidebarGroupProps {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  activeId: string;
  isCollapsed?: boolean;
  onItemSelect: (id: string) => void;
  defaultExpanded?: boolean;
}

export const SidebarGroup: React.FC<SidebarGroupProps> = ({
  title,
  icon: Icon,
  items,
  activeId,
  isCollapsed = false,
  onItemSelect,
  defaultExpanded = false,
}) => {
  const isAnyChildActive = items.some((item) => item.id === activeId);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isAnyChildActive);

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  const groupButton = (
    <button
      type="button"
      onClick={toggleExpand}
      aria-label={title}
      className={`group w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm font-medium rounded-[var(--radius-button)] transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 ${
        isCollapsed ? 'justify-center px-2' : ''
      } ${
        isAnyChildActive && !isExpanded
          ? 'text-brand-primary bg-brand-primary/5 font-semibold'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon
          size={18}
          className={`shrink-0 transition-colors ${
            isAnyChildActive
              ? 'text-brand-primary'
              : 'text-text-tertiary group-hover:text-text-primary'
          }`}
          strokeWidth={1.8}
        />
        {!isCollapsed && <span className="truncate">{title}</span>}
      </div>

      {!isCollapsed && (
        <span className="text-text-tertiary group-hover:text-text-primary transition-transform duration-150">
          {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      )}
    </button>
  );

  return (
    <div className="w-full flex flex-col">
      {isCollapsed ? (
        <Tooltip content={title} position="right" className="w-full">
          {groupButton}
        </Tooltip>
      ) : (
        groupButton
      )}

      {/* Sub items (Only visible when expanded in open sidebar) */}
      {!isCollapsed && isExpanded && (
        <div className="flex flex-col gap-0.5 mt-0.5 mb-1 animate-in fade-in-0 duration-150">
          {items.map((item) => (
            <SidebarItem
              key={item.id}
              id={item.id}
              title={item.title}
              icon={item.icon}
              href={item.href}
              isActive={activeId === item.id}
              isNested={true}
              onClick={() => onItemSelect(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
