"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileMoreItem, navigationItems } from "@/lib/navigation";
import { can } from "@/lib/rbac";
import { featureListHas } from "@/lib/feature-gating";
import { cn } from "@/lib/utils";
import type { CurrentBusiness, SessionUser } from "@/types/auth";

function MobileBottomNavComponent({ user, business }: { user: SessionUser; business: CurrentBusiness | null }) {
  const pathname = usePathname();
  const finalItems = useMemo(() => {
    const items = navigationItems
      .filter((item) => item.mobile && can(user.role, item.permission) && (!item.feature || featureListHas(business?.features, item.feature)))
      .slice(0, 4);
    return [...items, mobileMoreItem];
  }, [business?.features, user.role]);

  return (
    <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden">
      <div className="mx-auto grid h-[62px] max-w-md grid-cols-5 items-center rounded-lg border bg-card/92 px-1 shadow-[0_-8px_32px_hsl(220_20%_10%/0.12)] backdrop-blur-xl">
        {finalItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative mx-0.5 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("relative size-5", isActive ? "stroke-[2.5]" : "stroke-2")} />
              <span className="relative max-w-full truncate">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export const MobileBottomNav = memo(MobileBottomNavComponent);
