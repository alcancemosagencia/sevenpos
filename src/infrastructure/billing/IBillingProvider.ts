/**
 * IBillingProvider — provider boundary for billing operations.
 * Domain/application layer never depends on raw Mercado Pago types.
 */

export interface CreateSubscriptionInput {
  externalReference: string;    // billing_intent UUID
  transactionAmount: number;    // final gross CLP integer
  currency: 'CLP';
  frequency: number;
  frequencyType: 'months';
  reason: string;
  payerEmail: string;
  backUrl: string;
}

export interface ProviderSubscription {
  providerId: string;           // mp preapproval_id
  status: string;               // provider-native status
  initPoint: string;
  externalReference: string;
  transactionAmount: number;
  nextPaymentDate: string | null;
}

export interface UpdateSubscriptionAmountInput {
  providerId: string;
  newTransactionAmount: number; // CLP integer
}

export interface ProviderPayment {
  providerId: string;
  status: string;
  transactionAmount: number;
  dateApproved: string | null;
}

export interface WebhookVerificationInput {
  xSignature: string;           // header x-signature
  xRequestId: string;           // header x-request-id
  dataId: string;               // body.data.id
}

export interface IBillingProvider {
  createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription>;
  getSubscription(providerId: string): Promise<ProviderSubscription>;
  updateSubscriptionAmount(input: UpdateSubscriptionAmountInput): Promise<ProviderSubscription>;
  cancelSubscription(providerId: string): Promise<ProviderSubscription>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  verifyWebhook(input: WebhookVerificationInput): boolean;
}
