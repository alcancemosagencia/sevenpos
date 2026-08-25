export interface KPICardData {
  id: string;
  label: string;
  value: number;
  badgeText?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  badgeIcon?: string;
  iconName: 'wallet' | 'trending' | 'box' | 'credit-card';
  iconColor: 'emerald' | 'amber' | 'rose' | 'yellow';
}

export interface TopProductItem {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  totalRevenue: number;
}

export interface HourlySalesPoint {
  hour: string;
  sales: number;
  profit: number;
}

export interface DashboardData {
  kpis: {
    todaySales: number;
    todayTicketsCount: number;
    todayProfit: number;
    todayMarginPercent: number;
    lowStockCount: number;
    pendingCredits: number;
    activeCreditsCount: number;
  };
  hourlySales: HourlySalesPoint[];
  topProducts: TopProductItem[];
}
