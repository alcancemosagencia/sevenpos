import {
  Archive,
  ArrowLeftRight,
  BarChart3,
  Building2,
  Globe2,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  PackagePlus,
  Settings,
  Shield,
  ShoppingCart,
  UserCog,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/types/auth";

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  permission: Permission;
  group?: "main" | "pos" | "operation" | "channels" | "configuration" | "reports" | "admin";
  mobile?: boolean;
  feature?: string;
};

export const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Inicio",
    icon: LayoutDashboard,
    permission: "dashboard:view",
    group: "main",
    mobile: true,
  },
  {
    href: "/pos",
    label: "Caja POS",
    shortLabel: "Vender",
    icon: ShoppingCart,
    permission: "pos:access",
    group: "pos",
    mobile: true,
    feature: "POS",
  },
  {
    href: "/pre-sales",
    label: "Preventa",
    icon: PackagePlus,
    permission: "pre-sales:access",
    group: "pos",
    mobile: true,
    feature: "preventa móvil",
  },
  {
    href: "/products",
    label: "Productos",
    icon: Package,
    permission: "products:manage",
    group: "operation",
    mobile: true,
    feature: "inventario",
  },
  {
    href: "/inventory",
    label: "Inventario",
    icon: Archive,
    permission: "inventory:view",
    group: "operation",
    feature: "inventario",
  },
  {
    href: "/transfers",
    label: "Transferencias",
    icon: ArrowLeftRight,
    permission: "inventory:view",
    group: "operation",
    feature: "transferencias",
  },
  {
    href: "/customers",
    label: "Clientes",
    icon: Users,
    permission: "customers:view",
    group: "operation",
    mobile: true,
    feature: "CRM",
  },
  {
    href: "/expenses",
    label: "Gastos",
    icon: Wallet,
    permission: "expenses:view",
    group: "operation",
  },
  {
    href: "/public-menu/settings",
    label: "Menú público",
    icon: Globe2,
    permission: "settings:access",
    group: "channels",
    feature: "menú público",
  },
  {
    href: "/dashboard/branches",
    label: "Sucursales",
    icon: Building2,
    permission: "dashboard:view",
    group: "configuration",
    feature: "multi-sucursal",
  },
  {
    href: "/staff",
    label: "Personal",
    icon: UserCog,
    permission: "staff:manage",
    group: "configuration",
    feature: "usuarios",
  },
  {
    href: "/staff/users",
    label: "Usuarios",
    icon: UserRound,
    permission: "staff:manage",
    group: "configuration",
    feature: "usuarios",
  },
  {
    href: "/staff/roles",
    label: "Roles",
    icon: Shield,
    permission: "staff:manage",
    group: "configuration",
    feature: "roles",
  },
  {
    href: "/staff/activity",
    label: "Actividad",
    icon: BarChart3,
    permission: "staff:manage",
    group: "configuration",
    feature: "usuarios",
  },
  {
    href: "/settings",
    label: "Ajustes",
    icon: Settings,
    permission: "settings:access",
    group: "configuration",
  },
  {
    href: "/reports",
    label: "Reportes",
    icon: BarChart3,
    permission: "reports:view",
    group: "reports",
    feature: "reportes",
  },
  {
    href: "/admin",
    label: "Super Admin",
    icon: Shield,
    permission: "admin:access",
    group: "admin",
  },
];

export const mobileMoreItem = {
  href: "/more",
  label: "Más",
  shortLabel: "Más",
  icon: MoreHorizontal,
};
