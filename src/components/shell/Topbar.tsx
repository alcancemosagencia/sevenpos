import React from 'react';
import {
  Sun,
  Moon,
  Settings,
  Bell,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';

export interface TopbarProps {
  pageTitle: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileSidebar?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onSearch?: (query: string) => void;
  searchValue?: string;
  className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  isSidebarCollapsed,
  onToggleSidebar,
  onToggleMobileSidebar,
  onOpenNotifications,
  onOpenSettings,
  onSearch,
  searchValue = '',
  className = '',
}) => {
  const { theme, toggleTheme } = useTheme();

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
        {/* Actualizar a Pro CTA (Brand button - Blue solid) */}
        <Button
          variant="brand"
          size="sm"
          className="hidden sm:inline-flex rounded-full text-xs font-semibold px-3 py-1.5 shadow-xs"
          leftIcon={<Sparkles size={13} />}
          onClick={() => {}}
        >
          Actualizar a Pro
        </Button>

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
        <IconButton
          variant="ghost"
          size="sm"
          ariaLabel="Configuración"
          onClick={onOpenSettings}
          className="text-text-secondary hover:text-text-primary"
        >
          <Settings size={16} />
        </IconButton>

        {/* Notifications Icon with dot */}
        <div className="relative">
          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel="Notificaciones"
            onClick={onOpenNotifications}
            className="text-text-secondary hover:text-text-primary"
          >
            <Bell size={16} />
          </IconButton>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-danger ring-2 ring-background" />
        </div>
      </div>
    </header>
  );
};
