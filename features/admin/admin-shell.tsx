import Link from "next/link";
import { headers } from "next/headers";
import {
  BarChart3,
  Banknote,
  Building2,
  CreditCard,
  Gem,
  Globe2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminMobileNav } from "@/features/admin/admin-mobile-nav";
import { SevenPosLogo } from "@/components/brand/sevenpos-logo";
import { NetworkStatusInline } from "@/features/pwa/pwa-runtime";

const adminItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/businesses", label: "Negocios", icon: Building2 },
  { href: "/admin/plans", label: "Planes", icon: Gem },
  { href: "/admin/currencies", label: "Monedas", icon: Globe2 },
  { href: "/admin/accounting", label: "Contabilidad", icon: Banknote },
  { href: "/admin/billing", label: "Facturación", icon: CreditCard },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-sevenpos-pathname") ?? "/admin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/10 bg-sidebar text-sidebar-foreground shadow-[20px_0_70px_hsl(224_42%_8%/0.16)] lg:flex lg:flex-col">
        <div className="border-b border-sidebar-border p-5">
          <SevenPosLogo className="text-white" markClassName="size-10" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {adminItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_14px_30px_hsl(218_92%_35%/0.28)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground">Enterprise Admin</p>
          <p className="mt-1 text-xs text-sidebar-foreground">Billing, planes y operaciones SaaS.</p>
          <div className="mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/45 px-3 py-2">
            <NetworkStatusInline />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
        <AdminMobileNav pathname={pathname} />
      </div>
    </div>
  );
}
