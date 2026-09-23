import { DateRangeSelectorPreset } from '../../components/ui/DateRangeSelector';
import { ResolvedEntitlement } from '../../domain/subscription/SubscriptionResolution';

/** Reports and Audit use the same confirmed plan, with different FREE windows. */
export function entitlementDatePresets(
  scope: 'reports' | 'audit',
  entitlement: ResolvedEntitlement
): DateRangeSelectorPreset[] {
  const badge = entitlement.plan === 'FREE' ? 'PRO' : entitlement.plan === null ? 'Verificando' : undefined;
  const extended = (key: DateRangeSelectorPreset['key'], label: string): DateRangeSelectorPreset => ({
    key,
    label,
    locked: entitlement.plan !== 'PRO',
    badge,
  });
  return [
    { key: 'TODAY', label: 'Hoy' },
    { key: 'YESTERDAY', label: 'Ayer' },
    scope === 'reports' ? { key: 'LAST_7_DAYS', label: 'Últimos 7 días' } : extended('LAST_7_DAYS', 'Últimos 7 días'),
    extended('LAST_30_DAYS', 'Últimos 30 días'),
    extended('THIS_MONTH', 'Este mes'),
    extended('LAST_MONTH', 'Mes anterior'),
    extended('CUSTOM', 'Personalizado'),
  ];
}
