import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  History,
  LogOut,
  Sun,
  Moon,
  Shield,
  Menu,
  X,
  ExternalLink,
  Settings,
  ChevronDown,
} from 'lucide-react';
import sevenposLogo from '../../assets/branding/sevenpos-logo-horizontal.png';
import { usePlatformAuth } from '../context/PlatformAuthContext';
import { useTheme } from '../../context/ThemeContext';

export type PlatformTab = 'dashboard' | 'businesses' | 'activity' | 'settings';

interface PlatformShellProps {
  currentTab: PlatformTab;
  onSelectTab: (tab: PlatformTab) => void;
  children: React.ReactNode;
}

export const PlatformShell: React.FC<PlatformShellProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const { admin, signOut } = usePlatformAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems: Array<{ id: PlatformTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'businesses', label: 'Negocios', icon: <Building2 size={18} /> },
    { id: 'activity', label: 'Actividad', icon: <History size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans antialiased selection:bg-brand-primary/20">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-border-default h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Brand & Badges */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 focus:outline-none cursor-pointer"
          >
            <img src={sevenposLogo} alt="SevenPOS" className="h-6 w-auto object-contain" />
            <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase tracking-wider">
              Platform
            </span>
          </button>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Customer App Link */}
          <a
            href="https://sevenpos.pro"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-brand-primary hover:bg-surface-hover rounded-xl border border-border-subtle transition-colors"
          >
            <span>sevenpos.pro</span>
            <ExternalLink size={13} />
          </a>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-border-subtle transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Admin Profile Dropdown */}
          {admin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-secondary hover:bg-surface border rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  currentTab === 'settings' ? 'border-brand-primary/40 ring-1 ring-brand-primary/20' : 'border-border-default'
                }`}
              >
                <Shield size={14} className="text-brand-primary shrink-0" />
                <span className="font-semibold text-text-primary truncate max-w-[150px]">
                  {admin.email}
                </span>
                <span className="text-[10px] uppercase font-bold text-text-tertiary bg-surface px-1.5 py-0.5 rounded border border-border-subtle">
                  {admin.role}
                </span>
                <ChevronDown size={14} className="text-text-tertiary ml-0.5" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 bg-surface border border-border-default rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2.5 border-b border-border-subtle space-y-1">
                      <div className="text-[11px] font-medium text-text-tertiary">Conectado como</div>
                      <div className="text-xs font-bold text-text-primary truncate">{admin.email}</div>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase tracking-wider">
                        <Shield size={10} />
                        <span>{admin.role}</span>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('settings');
                          setProfileDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                          currentTab === 'settings'
                            ? 'bg-brand-primary/10 text-brand-primary'
                            : 'text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        <Settings size={15} />
                        <span>Configuración de cuenta</span>
                      </button>
                    </div>

                    <div className="border-t border-border-subtle pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-error hover:bg-error/10 text-left transition-colors cursor-pointer"
                      >
                        <LogOut size={15} />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick Settings Icon Button (Direct shortcut) */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              currentTab === 'settings'
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border-border-subtle'
            }`}
            title="Configuración de la cuenta"
          >
            <Settings size={17} />
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 md:hidden text-text-secondary hover:text-text-primary rounded-xl border border-border-subtle cursor-pointer"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-border-default p-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
          {admin && (
            <div className="p-3 bg-surface-secondary rounded-xl border border-border-subtle mb-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-brand-primary" />
                <span className="font-medium text-text-primary truncate max-w-[200px]">{admin.email}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-text-tertiary">
                {admin.role}
              </span>
            </div>
          )}
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="border-t border-border-subtle pt-2 mt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                onSelectTab('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-brand-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              <Settings size={18} />
              <span>Configuración</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <LogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Page Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-4 px-6 text-center text-xs text-text-tertiary">
        SevenPOS Platform &bull; Operaciones y Administración &bull; v1.0
      </footer>

    </div>
  );
};
