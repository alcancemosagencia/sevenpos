import { Subscription } from './Subscription';
import { PlanCode } from './Plan';

export interface ISubscriptionRepository {
  /**
   * Retrieves the current subscription for a business.
   * If not found, defaults safely to PlanCode 'FREE'.
   */
  getSubscription(businessId: string): Promise<Subscription>;

  /**
   * Updates or sets the plan for a business (for testing, cloud sync, or local fallback).
   */
  setPlan(businessId: string, plan: PlanCode): Promise<Subscription>;
}
