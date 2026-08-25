import { DashboardData } from '../../types/dashboard';

export const EMPTY_DASHBOARD_DATA: DashboardData = {
  kpis: {
    todaySales: 0,
    todayTicketsCount: 0,
    todayProfit: 0,
    todayMarginPercent: 0,
    lowStockCount: 0,
    pendingCredits: 0,
    activeCreditsCount: 0,
  },
  hourlySales: [],
  topProducts: [],
};

export const MOCK_DASHBOARD_DATA: DashboardData = {
  kpis: {
    todaySales: 499000,
    todayTicketsCount: 14,
    todayProfit: 135000,
    todayMarginPercent: 27.1,
    lowStockCount: 3,
    pendingCredits: 85000,
    activeCreditsCount: 2,
  },
  hourlySales: [
    { hour: '08:00', sales: 25000, profit: 7000 },
    { hour: '09:00', sales: 45000, profit: 12000 },
    { hour: '10:00', sales: 78000, profit: 21000 },
    { hour: '11:00', sales: 110000, profit: 30000 },
    { hour: '12:00', sales: 95000, profit: 26000 },
    { hour: '13:00', sales: 86000, profit: 23000 },
    { hour: '14:00', sales: 60000, profit: 16000 },
  ],
  topProducts: [
    {
      id: 'p1',
      name: 'Aceite Vegetal 900ml',
      category: 'Abarrotes',
      unitsSold: 24,
      totalRevenue: 59760,
    },
    {
      id: 'p2',
      name: 'Arroz Miraflores 1kg',
      category: 'Granos',
      unitsSold: 18,
      totalRevenue: 23400,
    },
    {
      id: 'p3',
      name: 'Coca Cola 350ml',
      category: 'Bebidas',
      unitsSold: 35,
      totalRevenue: 42000,
    },
    {
      id: 'p4',
      name: 'Harina PAN 1kg',
      category: 'Abarrotes',
      unitsSold: 12,
      totalRevenue: 21600,
    },
  ],
};
