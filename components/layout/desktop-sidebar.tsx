"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { SevenPosLogo } from "@/components/brand/sevenpos-logo";
import { Button } from "@/components/ui/button";
import { NetworkStatusInline } from "@/features/pwa/pwa-runtime";
import { navigationItems } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { featureListHas } from "@/lib/feature-gating";
import { cn } from "@/lib/utils";
import type { CurrentBusiness, SessionUser } from "@/types/auth";

const sidebarGroups = [
  { key: "main", label: "" },
  { key: "pos", label: "POS" },
  { key: "operation", label: "Operacion" },
  { key: "channels", label: "Canales" },
  { key: "configuration", label: "Configuración" },
  { key: "reports", label: "" },
  { key: "admin", label: "" },
] as const;

function roleLabel(role: SessionUser["role"]) {
  if (role === "OWNER") return "Dueño";
  return role.toLowerCase().replace("_", " ");
}

function DesktopSidebarComponent({
  user,
  business,
}: {
  user: SessionUser;
  business: CurrentBusiness | null;
}) {
  const pathname = usePathname();
  const visibleItems = useMemo(
    () => navigationItems.filter((item) => can(user.role, item.permission) && (!item.feature || featureListHas(business?.features, item.feature))),
    [business?.features, user.role],
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground shadow-[20px_0_70px_hsl(224_42%_8%/0.16)]">
      <div className="border-b border-sidebar-border px-3 py-3">
        <SevenPosLogo className="text-sidebar-accent-foreground" />
        {business ? (
          <p className="mt-1 truncate pl-10 text-[10.5px] font-semibold text-sidebar-foreground/72">
            {business.name}
          </p>
        ) : null}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-2.5">
        {sidebarGroups.map((group) => {
          const groupItems = visibleItems.filter((item) => (item.group ?? "main") === group.key);
          if (groupItems.length === 0) return null;

          return (
            <div key={group.key} className="space-y-0.5">
              {group.label ? (
                <p className="px-2.5 pb-1 pt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/38">
                  {group.label}
                </p>
              ) : null}
              {groupItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/staff" && pathname.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex h-8 items-center gap-2 rounded-lg px-2.5 text-[11.5px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/95 text-primary-foreground shadow-[0_10px_24px_hsl(218_92%_35%/0.24)]"
                        : "text-sidebar-foreground/88 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {isActive ? <span className="absolute left-1 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-white/85" /> : null}
                    <Icon className={cn("size-3.5 transition-transform group-hover:scale-105", isActive ? "stroke-[2.5]" : "stroke-2")} />
                    <span className="tracking-normal">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <div className="mb-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-1.5">
          <NetworkStatusInline />
        </div>
        <div className="mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-7 rounded-lg",
              },
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-sidebar-accent-foreground">
              {user.fullName ?? user.email}
            </p>
            <p className="text-[10px] font-semibold capitalize text-sidebar-foreground/72">
              {roleLabel(user.role)}
            </p>
          </div>
        </div>
        <SignOutButton>
          <Button
            variant="ghost"
            className="h-8 w-full justify-start px-2.5 text-[11.5px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-3.5" />
            Cerrar sesion
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}

export const DesktopSidebar = memo(DesktopSidebarComponent);
