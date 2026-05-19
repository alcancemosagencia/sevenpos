export type BillingEmailWorkflow =
  | "WELCOME"
  | "TRIAL_STARTED"
  | "TRIAL_EXPIRING"
  | "SUBSCRIPTION_SUSPENDED";

export type BillingEmailPayload = {
  to: string;
  businessName: string;
  trialEnd?: Date;
  nextPaymentAt?: Date;
};

export async function enqueueBillingEmail(workflow: BillingEmailWorkflow, payload: BillingEmailPayload) {
  void workflow;
  void payload;

  return {
    queued: false,
    provider: "pending",
  };
}
