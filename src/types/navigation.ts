import { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  shortcut?: string;
  isNew?: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  items: NavItem[];
}

export interface SidebarConfig {
  generalItems: NavItem[];
  groupedNav: NavGroup[];
  singleItems: NavItem[];
  footerItems: NavItem[];
}
