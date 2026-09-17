import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface AppShellProps {
  children: React.ReactNode;
  activeNavId: string;
  onNavigate: (id: string) => void;
  pageTitle: string;
  businessName?: string;
  userName?: string;
  userRole?: string;
  canManageSettings?: boolean;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onSwitchUser?: () => void;
  planCode?: 'FREE' | 'PRO';
  onNavigateToSubscription?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNavId,
  onNavigate,
  pageTitle,
  businessName,
  userName,
  userRole,
  canManageSettings = true,
  onOpenSettings,
  onLogout,
  onSwitchUser,
  planCode = 'FREE',
  onNavigateToSubscription,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
      {/* 1. Sidebar (Responsive Desktop & Mobile Drawer) */}
      <Sidebar
        activeNavId={activeNavId}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onSwitchUser={onSwitchUser}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobileSidebar}
        businessName={businessName}
        userName={userName}
        userRole={userRole}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
        <Topbar
          pageTitle={pageTitle}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onToggleMobileSidebar={toggleMobileSidebar}
          onSwitchUser={onSwitchUser}
          userName={userName}
          userRole={userRole}
          canManageSettings={canManageSettings}
          onOpenSettings={onOpenSettings || (() => onNavigate('settings'))}
          searchValue={searchValue}
          onSearch={setSearchValue}
          activeNavId={activeNavId}
          planCode={planCode}
          onNavigateToSubscription={onNavigateToSubscription || (() => onNavigate('subscription'))}
        />

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
