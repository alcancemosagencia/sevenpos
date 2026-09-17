import React from 'react';
import {
  Sun,
  Moon,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';

export interface TopbarProps {
  pageTitle: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  canManageSettings?: boolean;
  onSearch?: (query: string) => void;
  searchValue?: string;
  userName?: string;
  userRole?: string;
  onSwitchUser?: () => void;
  className?: string;
  activeNavId?: string;
  planCode?: 'FREE' | 'PRO';
  onNavigateToSubscription?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleMobileSidebar,
  onOpenSettings,
  canManageSettings = true,
  onSearch,
  searchValue = '',
  userName,
  userRole,
  onSwitchUser,
  className = '',
  activeNavId,
  planCode = 'FREE',
  onNavigateToSubscription,
}) => {
  const { theme, toggleTheme } = useTheme();

  const isSubscriptionActive = activeNavId === 'subscription';
  const isPro = planCode === 'PRO';

  const handleSubscriptionClick = () => {
    if (isSubscriptionActive) return;
    onNavigateToSubscription?.();
  };

  return (
    <header
      className={`h-14 bg-sidebar/80 backdrop-blur-md border-b border-border-default px-3 sm:px-5 md:px-6 flex items-center justify-between gap-2.5 sm:gap-4 sticky top-0 z-20 shrink-0 select-none ${className}`}
    >
      {/* Left: Mobile Menu Trigger (<768px) & Desktop Sidebar Toggle (>=768px) + Title */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile Hamburger (<768px) */}
        <div className="flex md:hidden">
          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel="Abrir menú"
            onClick={onToggleMobileSidebar}
            className="text-text-secondary hover:text-text-primary"
          >
            <Menu size={18} />
          </IconButton>
        </div>

        {/* Desktop Sidebar Toggle (>=768px) */}
        <div className="hidden md:flex">
          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel={isSidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
            onClick={onToggleSidebar}
            className="text-text-secondary hover:text-text-primary"
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </IconButton>
        </div>

        <div className="flex items-center min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate">
            {pageTitle}
          </span>
        </div>
      </div>

      {/* Right: CTA Pro, Search, Theme, Settings, Notifications */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Subscription CTA: "Actualizar a Pro" (FREE) or "Plan Pro" (PRO) */}
        {isPro ? (
          <Button
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex rounded-full text-xs font-semibold px-3 py-1.5 border border-brand-primary/30 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 shadow-xs transition-colors cursor-pointer"
            leftIcon={<Sparkles size={13} className="text-brand-primary" />}
            onClick={handleSubscriptionClick}
            aria-label={isSubscriptionActive ? 'Plan Pro (Activo)' : 'Gestionar Plan Pro'}
            aria-current={isSubscriptionActive ? 'page' : undefined}
          >
            Plan Pro
          </Button>
        ) : (
          <Button
            variant="brand"
            size="sm"
            className="hidden sm:inline-flex rounded-full text-xs font-semibold px-3 py-1.5 shadow-xs transition-colors cursor-pointer"
            leftIcon={<Sparkles size={13} />}
            onClick={handleSubscriptionClick}
            aria-label={isSubscriptionActive ? 'Suscripción (Actual)' : 'Actualizar a Pro'}
            aria-current={isSubscriptionActive ? 'page' : undefined}
          >
            Actualizar a Pro
          </Button>
        )}

        {/* Global Search Input */}
        <div className="hidden md:block">
          <SearchInput
            value={searchValue}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Buscar..."
            className="w-36 md:w-44 lg:w-56"
          />
        </div>

        {/* Theme Toggle (Sun / Moon) */}
        <IconButton
          variant="ghost"
          size="sm"
          ariaLabel={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={toggleTheme}
          className="text-text-secondary hover:text-text-primary"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        {/* Quick Settings Icon */}
        {canManageSettings && onOpenSettings && (
          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel="Configuración"
            onClick={onOpenSettings}
            className="text-text-secondary hover:text-text-primary"
          >
            <Settings size={16} />
          </IconButton>
        )}

        {/* Operator Profile / Fast Switch Button */}
        {userName && (
          <button
            type="button"
            onClick={onSwitchUser}
            className="flex items-center gap-2 py-1 px-2 rounded-full border border-border-default hover:border-brand-primary/50 bg-surface-secondary/40 hover:bg-surface-secondary transition-all cursor-pointer text-left shrink-0"
            title="Cambiar operador (Fast Switch)"
          >
            <Avatar name={userName} size="sm" />
            <div className="hidden sm:block min-w-0 pr-1">
              <p className="text-[11px] font-bold text-text-primary leading-tight truncate max-w-[90px]">{userName}</p>
              <p className="text-[9px] text-text-tertiary leading-tight truncate">{userRole || 'Operador'}</p>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
