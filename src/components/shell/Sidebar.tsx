import React from 'react';
import { X } from 'lucide-react';
import {
  GENERAL_NAV_ITEMS,
  COLLAPSIBLE_NAV_GROUPS,
  DIRECT_NAV_ITEMS,
  FOOTER_NAV_ITEMS,
} from '../../config/navigation';
import { SidebarItem } from './SidebarItem';
import { SidebarGroup } from './SidebarGroup';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/IconButton';
import horizontalLogo from '../../assets/branding/sevenpos-logo-horizontal.png';
import isotypeLogo from '../../assets/branding/sevenpos-isotype.png';

export interface SidebarProps {
  activeNavId: string;
  onNavigate: (id: string) => void;
  onLogout?: () => void;
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
  businessName?: string;
  userName?: string;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNavId,
  onNavigate,
  onLogout,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
  className = '',
  businessName = 'Mi Negocio',
  userName = 'Usuario principal',
  userRole = 'Dueño',
}) => {
  const handleItemClick = (id: string) => {
    if (id === 'logout' && onLogout) {
      onLogout();
    } else {
      onNavigate(id);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // 1. Mobile Full Screen Navigation Drawer (when isMobileOpen on <768px)
  if (isMobileOpen) {
    return (
      <div className="fixed inset-0 w-screen h-[100dvh] z-50 bg-sidebar flex flex-col select-none md:hidden overflow-hidden animate-in fade-in-0 duration-150">
        {/* Mobile Drawer Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border-subtle shrink-0 bg-sidebar">
          <div className="bg-[#090a0f] px-2.5 py-1 rounded-xl border border-white/10 shadow-xs flex items-center">
            <img
              src={horizontalLogo}
              alt="SevenPOS"
              className="h-5 object-contain"
            />
          </div>

          <IconButton
            variant="ghost"
            size="md"
            ariaLabel="Cerrar menú"
            onClick={onCloseMobile}
            className="text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </IconButton>
        </div>

        {/* User Identity Card on Mobile */}
        <div className="px-4 py-3 border-b border-border-subtle shrink-0 bg-surface-secondary/30">
          <div className="flex items-center gap-3">
            <Avatar name={userName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary truncate">
                {userName}
              </p>
              <p className="text-xs text-text-tertiary truncate">
                {userRole} • {businessName}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation List (Scrollable, ~44px touch targets) */}
        <nav className="flex-1 px-4 py-3 overflow-y-auto space-y-1.5">
          <div className="space-y-1">
            {GENERAL_NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.id}
                id={item.id}
                title={item.title}
                icon={item.icon}
                href={item.href}
                isActive={activeNavId === item.id}
                isCollapsed={false}
                shortcut={item.shortcut}
                badge={item.badge}
                onClick={() => handleItemClick(item.id)}
              />
            ))}
          </div>

          <div className="space-y-1 pt-2">
            {COLLAPSIBLE_NAV_GROUPS.map((group) => (
              <SidebarGroup
                key={group.id}
                id={group.id}
                title={group.title}
                icon={group.icon}
                items={group.items}
                activeId={activeNavId}
                isCollapsed={false}
                onItemSelect={handleItemClick}
                defaultExpanded={group.defaultExpanded}
              />
            ))}
          </div>

          <div className="space-y-1 pt-2">
            {DIRECT_NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.id}
                id={item.id}
                title={item.title}
                icon={item.icon}
                href={item.href}
                isActive={activeNavId === item.id}
                isCollapsed={false}
                badge={item.badge}
                onClick={() => handleItemClick(item.id)}
              />
            ))}
          </div>
        </nav>

        {/* Mobile Drawer Footer */}
        <div className="p-4 border-t border-border-subtle bg-sidebar space-y-1 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {FOOTER_NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.id}
              id={item.id}
              title={item.title}
              icon={item.icon}
              href={item.href}
              isActive={activeNavId === item.id}
              isCollapsed={false}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  // 2. Desktop / Tablet Persistent Sidebar (Hidden on mobile <768px)
  return (
    <aside
      className={`hidden md:flex h-screen bg-sidebar flex-col border-r border-border-default select-none transition-all duration-200 shrink-0 z-30 ${
        isCollapsed ? 'w-16' : 'w-[230px] sm:w-[240px]'
      } ${className}`}
    >
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border-subtle shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center">
            <div className="bg-[#090a0f] px-2.5 py-1 rounded-xl border border-white/10 shadow-xs flex items-center">
              <img
                src={horizontalLogo}
                alt="SevenPOS"
                className="h-5 object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <img
              src={isotypeLogo}
              alt="SevenPOS"
              className="w-8 h-8 rounded-xl object-contain shadow-xs"
            />
          </div>
        )}
      </div>

      {/* User Section */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-[var(--radius-button)] bg-surface-secondary/50 border border-border-subtle">
            <Avatar name={userName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                {userName}
              </p>
              <p className="text-[11px] font-medium text-text-tertiary truncate leading-tight">
                {userRole} • {businessName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
        <div className="space-y-0.5">
          {GENERAL_NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.id}
              id={item.id}
              title={item.title}
              icon={item.icon}
              href={item.href}
              isActive={activeNavId === item.id}
              isCollapsed={isCollapsed}
              shortcut={item.shortcut}
              badge={item.badge}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </div>

        <div className="space-y-0.5 pt-1">
          {COLLAPSIBLE_NAV_GROUPS.map((group) => (
            <SidebarGroup
              key={group.id}
              id={group.id}
              title={group.title}
              icon={group.icon}
              items={group.items}
              activeId={activeNavId}
              isCollapsed={isCollapsed}
              onItemSelect={handleItemClick}
              defaultExpanded={group.defaultExpanded}
            />
          ))}
        </div>

        <div className="space-y-0.5 pt-1">
          {DIRECT_NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.id}
              id={item.id}
              title={item.title}
              icon={item.icon}
              href={item.href}
              isActive={activeNavId === item.id}
              isCollapsed={isCollapsed}
              badge={item.badge}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </div>
      </nav>

      {/* Footer Section */}
      <div className="p-3 border-t border-border-subtle bg-sidebar space-y-0.5 shrink-0">
        {FOOTER_NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.id}
            id={item.id}
            title={item.title}
            icon={item.icon}
            href={item.href}
            isActive={activeNavId === item.id}
            isCollapsed={isCollapsed}
            onClick={() => handleItemClick(item.id)}
          />
        ))}
      </div>
    </aside>
  );
};
