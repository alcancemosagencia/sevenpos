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
  effectivePlan: 'FREE' | 'PRO';
  lastActivityAt: string | null;
  businessId: string;
  businessName: string;
  country: string | null;
  createdAt: string | null;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  planCode: 'FREE' | 'PRO' | null;
  subscriptionStatus: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | null;
  billingSource: BillingSource | null;
  manualReason?: ManualReason | null;
  currentPeriodEnd?: string | null;
  deviceCount: number | null;
  cloudMembershipCount: number | null;
}

export interface PlatformBusinessListResponse {
  items: PlatformBusinessListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PlatformBusinessDetail {
  devicesCount: number | null;
  cloudMembershipCount: number | null;
  subscriptionEvents: Array<{id:string;event_type:string;created_at:string}>;

  business: {
    id: string;
    name: string;
    countryCode: string;
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    userId: string | null;
    email: string | null;
    name: string | null;
    createdAt: string | null;
  };
  subscription: {
    id?: string;
    planCode: 'FREE' | 'PRO' | null;
    status: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | null;
    billingInterval?: 'MONTHLY' | 'ANNUAL' | null;
    billingSource: BillingSource | null;
    manualReason?: ManualReason | null;
    manualNotes?: string | null;
    activatedByEmail?: string | null;
    activatedByAdminId?: string | null;
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
    diagnosticMismatch?: boolean;
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
  startAt: string;
  reason: Exclude<ManualReason, 'ASSISTED_SALE'>;
  reference?: string;
  internalNote?: string;
}

export interface PlatformUpdateRegionParams {
  businessId: string;
  countryCode: 'CL' | 'CO' | 'VE';
  currencyCode: 'CLP' | 'COP' | 'VES' | 'USD';
  reason: string;
  notes?: string;
}
