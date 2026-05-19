import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import type { TenantContextValue } from "@/types/auth";

export function AppShell({ children, tenant }: { children: React.ReactNode; tenant: TenantContextValue }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 lg:flex">
        <DesktopSidebar user={tenant.currentUser} business={tenant.currentBusiness} />
      </aside>
      <div className="min-h-screen pb-20 lg:pl-56 lg:pb-0">
        <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <MobileBottomNav user={tenant.currentUser} business={tenant.currentBusiness} />
      </nav>
    </div>
  );
}
