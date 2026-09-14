import { PlanCode } from './Plan';

export type SubscriptionStatus = 'ACTIVE';
export type SubscriptionSource = 'LOCAL_FALLBACK' | 'CLOUD';

export interface Subscription {
  businessId: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  updatedAt: string;
}
