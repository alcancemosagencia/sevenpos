import {
  LayoutDashboard,
  Store,
  Receipt,
  FolderOpen,
  Boxes,
  ShoppingBag,
  Wallet,
  Users,
  BarChart3,
  ShieldAlert,
  Settings,
  HelpCircle,
  Sparkles,
  LogOut,
  Package,
  Tags,
  ClipboardList,
  Truck,
  ArrowDownUp,
  ReceiptText,
} from 'lucide-react';
import { NavGroup, NavItem } from '../types/navigation';

export const GENERAL_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Panel principal',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'pos',
    title: 'Punto de venta',
    href: '/pos',
    icon: Store,
    shortcut: 'F2',
  },
  {
    id: 'sales',
    title: 'Ventas',
    href: '/sales',
    icon: Receipt,
  },
];

export const COLLAPSIBLE_NAV_GROUPS: NavGroup[] = [
  {
    id: 'catalog',
    title: 'Catálogo',
    icon: FolderOpen,
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: 'products',
        title: 'Productos',
        href: '/catalog/products',
        icon: Package,
      },
      {
        id: 'categories',
        title: 'Categorías',
        href: '/catalog/categories',
        icon: Tags,
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventario',
    icon: Boxes,
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: 'stock',
        title: 'Existencias',
        href: '/inventory',
        icon: Package,
      },
      {
        id: 'stock-adjustments',
        title: 'Movimientos',
        href: '/inventory/movements',
        icon: ArrowDownUp,
      },
    ],
  },
  {
    id: 'purchases',
    title: 'Compras',
    icon: ShoppingBag,
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: 'purchase-orders',
        title: 'Órdenes de compra',
        href: '/purchases/orders',
        icon: ClipboardList,
      },
      {
        id: 'suppliers',
        title: 'Proveedores',
        href: '/purchases/suppliers',
        icon: Truck,
      },
    ],
  },
  {
    id: 'finances',
    title: 'Finanzas',
    icon: Wallet,
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: 'cash-register',
        title: 'Caja y turnos',
        href: '/cash',
        icon: Wallet,
      },
      {
        id: 'expenses',
        title: 'Gastos operativos',
        href: '/finances/expenses',
        icon: ReceiptText,
      },
    ],
  },
];

export const DIRECT_NAV_ITEMS: NavItem[] = [
  {
    id: 'customers',
    title: 'Clientes',
    href: '/customers',
    icon: Users,
  },
  {
    id: 'reports',
    title: 'Reportes',
    href: '/reports',
    icon: BarChart3,
  },
  {
    id: 'audit',
    title: 'Auditoría',
    icon: ShieldAlert,
    href: '/audit',
  },
  {
    id: 'settings',
    title: 'Configuración',
    href: '/settings',
    icon: Settings,
  },
];

export const FOOTER_NAV_ITEMS: NavItem[] = [
  {
    id: 'help',
    title: 'Ayuda',
    href: '/help',
    icon: HelpCircle,
  },
  {
    id: 'subscription',
    title: 'Suscripción',
    href: '/subscription',
    icon: Sparkles,
  },
  {
    id: 'logout',
    title: 'Cerrar sesión',
    href: '/logout',
    icon: LogOut,
  },
];
