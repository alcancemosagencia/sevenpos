import { PlanCode, EntitlementKey, LimitKey, MetricKey } from './Plan';

export type LimitValue = number | 'UNLIMITED';

export type UpgradeReason =
  | 'PLAN_REQUIRED'
  | 'LIMIT_REACHED'
  | 'SAFETY_CEILING_REACHED'
  | 'FEATURE_IN_ROADMAP';

export interface EntitlementDecision {
  allowed: boolean;
  reason?: UpgradeReason;
  entitlementKey?: EntitlementKey;
  limitKey?: LimitKey;
  currentUsage?: number;
  maxLimit?: LimitValue;
  message?: string;
}

export type UsageState = 'NORMAL' | 'INFORMATIVE' | 'WARNING' | 'LIMIT_REACHED';

export interface MetricUsage {
  key: LimitKey | MetricKey;
  label: string;
  current: number;
  limit: LimitValue;
  isEnforced: boolean;
  percentage?: number;
  state: UsageState;
  displayValue: string;
}

export interface UsageOverview {
  plan: PlanCode;
  planName: string;
  products: MetricUsage;
  customers: MetricUsage;
  users: MetricUsage;
  salesMilestone: {
    currentMonthlySales: number;
    milestoneLevel: 'NORMAL' | 'GROWTH_MILESTONE' | 'SOFT_RECOMMENDATION' | 'STRONG_RECOMMENDATION';
    message?: string;
  };
  historyWindow: {
    reportsDays: number | 'FULL';
    auditDays: number | 'FULL';
    displayLabel: string;
  };
}

export interface DateRangeConstraintResult<T> {
  data: T;
  requestedRange: { startDate: string; endDate: string };
  effectiveRange: { startDate: string; endDate: string };
  wasConstrained: boolean;
  constraintReason?: string;
}
