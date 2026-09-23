import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { repositoryFactory } from '../../infrastructure/repositories/RepositoryFactory';
import {
  HYDRATING_ENTITLEMENT,
  ResolvedEntitlement,
  entitlementIdentityKey,
  resolveEntitlement,
  visibleEntitlement,
} from '../../domain/subscription/SubscriptionResolution';

/** One runtime resolution contract for subscription, feature gates and plan badges. */
export function useResolvedEntitlement(businessId: string | null, reloadKey = ''): ResolvedEntitlement {
  const { cloudUser } = useAuth();
  const identityKey = entitlementIdentityKey(cloudUser?.id ?? null, businessId, reloadKey);
  const [loaded, setLoaded] = useState<{ key: string; value: ResolvedEntitlement } | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    repositoryFactory.getSubscriptionRepository().getSubscription(businessId)
      .then((subscription) => {
        if (active) setLoaded({ key: identityKey, value: resolveEntitlement(subscription) });
      })
      .catch(() => {
        if (active) setLoaded({
          key: identityKey,
          value: { ...HYDRATING_ENTITLEMENT, state: 'LOAD_ERROR', businessId, resolutionReason: 'LOAD_ERROR' },
        });
      });
    return () => { active = false; };
  }, [businessId, identityKey]);

  // Never expose a previous business/user's entitlement while the new one hydrates.
  return visibleEntitlement(loaded, identityKey);
}
