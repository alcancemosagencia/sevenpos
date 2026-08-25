import React from 'react';
import { ExpenseKpiSummary } from '../../../domain/expenses/OperatingExpense';
import { useCountry } from '../../../context/CountryContext';
import { formatMoney } from '../../../domain/common/money/Money';
import { CurrencyCode } from '../../../types/country';
import { DollarSign, Calendar, Banknote, Receipt } from 'lucide-react';

interface ExpenseKpiCardsProps {
  kpis: ExpenseKpiSummary;
}

export const ExpenseKpiCards: React.FC<ExpenseKpiCardsProps> = ({ kpis }) => {
  const { country } = useCountry();
  const currency = country.primaryCurrency.code as CurrencyCode;

  const cards = [
    {
      title: 'GASTOS DE HOY',
      value: formatMoney(kpis.todayTotal, currency),
      icon: <DollarSign size={18} className="text-brand-primary" />,
      iconBg: 'bg-brand-primary/10 border-brand-primary/20',
    },
    {
      title: 'GASTOS ESTE MES',
      value: formatMoney(kpis.monthTotal, currency),
      icon: <Calendar size={18} className="text-status-warning" />,
      iconBg: 'bg-status-warning/10 border-status-warning/20',
    },
    {
      title: 'PAGADOS EN EFECTIVO',
      value: formatMoney(kpis.cashPaidTotal, currency),
      icon: <Banknote size={18} className="text-status-success" />,
      iconBg: 'bg-status-success/10 border-status-success/20',
    },
    {
      title: 'CANTIDAD DE GASTOS',
      value: kpis.expensesCount.toString(),
      icon: <Receipt size={18} className="text-text-secondary" />,
      iconBg: 'bg-surface-secondary border-border-default',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="p-4 rounded-2xl bg-surface border border-border-default shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
              {card.title}
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${card.iconBg}`}
            >
              {card.icon}
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {card.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
