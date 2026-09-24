export interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface ModuleItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  badge?: string;
}

export interface UserIntentItem {
  id: string;
  title: string;
  subtitle: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface HowItWorksStep {
  stepNumber: string;
  title: string;
  description: string;
}

export interface BusinessVertical {
  id: string;
  title: string;
  category: string;
  description: string;
  benefits: string[];
  route: string;
}

export interface PricingFeature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

export interface PricingPlan {
  id: 'free' | 'pro';
  name: string;
  badge?: string;
  headline: string;
  priceFormatted: string;
  priceSubtext: string;
  taxNote: string;
  description: string;
  features: PricingFeature[];
  ctaLabel: string;
  ctaHref: string;
  isPopular?: boolean;
}
