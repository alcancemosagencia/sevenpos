export type BillingSource = 'NONE' | 'MERCADO_PAGO' | 'MANUAL' | 'PROMOTIONAL' | 'INTERNAL';

export type ManualReason = 
  | 'FRIEND_FAMILY' 
  | 'TESTER' 
  | 'ASSISTED_SALE' 
  | 'COMPENSATION' 
  | 'INTERNAL' 
  | 'OTHER';

export type PlatformAdminRole = 'SUPER_ADMIN' | 'SUPPORT_ADMIN' | 'BILLING_ADMIN' | 'READ_ONLY';

export interface PlatformAdmin {
  id: string;
  userId: string;
  email: string;
  role: PlatformAdminRole;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface PlatformDashboardMetrics {
  totalBusinesses: number;
  proActive: number;
  freeActive: number;
  manualActive: number;
  mercadopagoActive: number;
  promotionalActive: number;
  internalActive: number;
  countryDistribution: Array<{ country_code: string; count: number }>;
  growthTrend: Array<{ month: string; count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    reason?: string | null;
    createdAt: string;
    businessName?: string | null;
    businessId?: string | null;
    adminEmail?: string | null;
  }>;
}

export interface PlatformBusinessListItem {
  businessId: string;
  businessName: string;
  countryCode: string;
  createdAt: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  planCode: 'FREE' | 'PRO';
  subscriptionStatus: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';
  billingSource: BillingSource;
  manualReason?: ManualReason | null;
  currentPeriodEnd?: string | null;
  activeDevicesCount: number;
  activeMembersCount: number;
}

export interface PlatformBusinessListResponse {
  items: PlatformBusinessListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PlatformBusinessDetail {
  business: {
    id: string;
    name: string;
    countryCode: string;
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    userId: string;
    email: string;
    name: string;
    createdAt: string;
  };
  subscription: {
    id?: string;
    planCode: 'FREE' | 'PRO';
    status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';
    billingInterval?: 'MONTHLY' | 'ANNUAL' | null;
    billingSource: BillingSource;
    manualReason?: ManualReason | null;
    manualNotes?: string | null;
    activatedByEmail?: string | null;
    manualActivatedAt?: string | null;
    mpPreapprovalId?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    activeContractId?: string | null;
    updatedAt?: string;
  };
  activeContract?: {
    id: string;
    pricingVersion: string;
    billingInterval: string;
    finalGrossAmount: number;
    currency: string;
    startsAt: string;
    endsAt?: string | null;
    createdAt: string;
    paymentMethod?: string | null;
    externalReference?: string | null;
  } | null;
  devices: Array<{
    id: string;
    deviceName: string;
    platform: string;
    deviceType: string;
    createdAt: string;
    lastSeenAt: string;
    revokedAt?: string | null;
  }>;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    status: string;
    createdAt: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }>;
  adminEvents: Array<{
    id: string;
    action: string;
    reason?: string | null;
    createdAt: string;
    adminEmail?: string | null;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }>;
  diagnostic: {
    cloudBusinessId: string;
    ownerUserId: string;
    subscriptionRowExists: boolean;
    canonicalPlan: 'FREE' | 'PRO';
    canonicalStatus: string;
    canonicalSource: BillingSource;
    hasActiveContract: boolean;
    resolvedEntitlementPlan?: 'FREE' | 'PRO' | 'No disponible';
    canonicalCountry?: string;
    resolvedLocalCountry?: string;
    canonicalCurrency?: string;
    resolvedLocalCurrency?: string;
    repositorySource?: string;
    lastHydrationStatus?: string;
  };
}

export interface ManualProActivationParams {
  businessId: string;
  interval: 'MONTHLY' | 'ANNUAL';
  startsAt: string;
  periodEnd: string;
  reason: ManualReason;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface PlatformUpdateRegionParams {
  businessId: string;
  countryCode: 'CL' | 'CO' | 'VE';
  currencyCode: 'CLP' | 'COP' | 'VES' | 'USD';
  reason: string;
  notes?: string;
}
