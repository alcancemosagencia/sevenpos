import { navigationItems } from "@/lib/navigation";
import type { Permission } from "@/types/auth";

export function permissionForPath(pathname: string): Permission | null {
  const match = navigationItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return match?.permission ?? null;
}
