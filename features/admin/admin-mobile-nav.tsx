"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { BarChart3, Banknote, Building2, CreditCard, Gem, Globe2, MoreHorizontal, Settings } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const bottomItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/businesses", label: "Negocios", icon: Building2 },
  { href: "/admin/plans", label: "Planes", icon: Gem },
  { href: "/admin/accounting", label: "Finanzas", icon: Banknote },
];

const moreItems = [
  { href: "/admin/currencies", label: "Monedas", icon: Globe2 },
  { href: "/admin/billing", label: "Facturación", icon: CreditCard },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export function AdminMobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.65rem)] z-40 grid grid-cols-5 rounded-lg border bg-background/86 p-1 shadow-[0_18px_55px_hsl(220_20%_10%/0.18)] backdrop-blur-xl lg:hidden">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold transition active:scale-[0.98]",
                active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold text-muted-foreground transition active:scale-[0.98]"
        >
          <MoreHorizontal className="size-4" />
          Más
        </button>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Cerrar más opciones" className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] overflow-hidden rounded-lg border bg-card shadow-[0_28px_90px_hsl(220_20%_10%/0.28)] animate-in slide-in-from-bottom-3 duration-150">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25" />
            <div className="p-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition hover:bg-muted"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                );
              })}
              <SignOutButton>
                <button className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10">
                  Cerrar sesión
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
