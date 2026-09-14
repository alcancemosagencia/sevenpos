import { ISubscriptionRepository } from '../../domain/subscription/SubscriptionRepository';
import { Subscription } from '../../domain/subscription/Subscription';
import { PlanCode } from '../../domain/subscription/Plan';

export class InMemorySubscriptionRepository implements ISubscriptionRepository {
  private subscriptions: Map<string, Subscription> = new Map();

  async getSubscription(businessId: string): Promise<Subscription> {
    const existing = this.subscriptions.get(businessId);
    if (existing) {
      return existing;
    }

    // Default safely to FREE for existing and new businesses
    const defaultSub: Subscription = {
      businessId,
      plan: 'FREE',
      status: 'ACTIVE',
      source: 'LOCAL_FALLBACK',
      updatedAt: new Date().toISOString(),
    };
    this.subscriptions.set(businessId, defaultSub);
    return defaultSub;
  }

  async setPlan(businessId: string, plan: PlanCode): Promise<Subscription> {
    const current = await this.getSubscription(businessId);
    const updated: Subscription = {
      ...current,
      plan,
      updatedAt: new Date().toISOString(),
    };
    this.subscriptions.set(businessId, updated);
    return updated;
  }

  clear(): void {
    this.subscriptions.clear();
  }
}

export const inMemorySubscriptionRepository = new InMemorySubscriptionRepository();
