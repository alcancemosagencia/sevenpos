import { createHmac, timingSafeEqual } from 'crypto';
import type {
  IBillingProvider,
  CreateSubscriptionInput,
  ProviderSubscription,
  UpdateSubscriptionAmountInput,
  ProviderPayment,
  WebhookVerificationInput,
} from './IBillingProvider';

/**
 * MercadoPagoBillingProvider — Mercado Pago Subscriptions API integration.
 *
 * Uses preapproval WITHOUT shared preapproval_plan (Model A).
 * Individualized per-subscriber pricing for Founders + coupon support.
 *
 * SANDBOX/TEST ONLY. No production credentials.
 */

const MP_API_BASE = 'https://api.mercadopago.com';

function mapMpStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    pending: 'PENDING',
    authorized: 'ACTIVE',
    paused: 'PAST_DUE',
    cancelled: 'EXPIRED',
    expired: 'EXPIRED',
  };
  return map[mpStatus] ?? 'PENDING';
}

export class MercadoPagoBillingProvider implements IBillingProvider {
  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret: string
  ) {}

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    const payload = {
      auto_recurring: {
        frequency: input.frequency,
        frequency_type: input.frequencyType,
        transaction_amount: input.transactionAmount,
        currency_id: input.currency,
      },
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      status: 'pending',
    };

    const res = await fetch(`${MP_API_BASE}/preapproval`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MP createSubscription failed: ${res.status} ${body}`);
    }

    const data = await res.json();
    return this.mapSubscription(data);
  }

  async getSubscription(providerId: string): Promise<ProviderSubscription> {
    const res = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(providerId)}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`MP getSubscription failed: ${res.status}`);
    }
    const data = await res.json();
    return this.mapSubscription(data);
  }

  async updateSubscriptionAmount(input: UpdateSubscriptionAmountInput): Promise<ProviderSubscription> {
    const res = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(input.providerId)}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({
        auto_recurring: {
          transaction_amount: input.newTransactionAmount,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MP updateSubscriptionAmount failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    return this.mapSubscription(data);
  }

  async cancelSubscription(providerId: string): Promise<ProviderSubscription> {
    const res = await fetch(`${MP_API_BASE}/preapproval/${encodeURIComponent(providerId)}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MP cancelSubscription failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    return this.mapSubscription(data);
  }

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    const res = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`MP getPayment failed: ${res.status}`);
    }
    const data = await res.json();
    return {
      providerId: String(data.id),
      status: data.status ?? 'pending',
      transactionAmount: data.transaction_amount ?? 0,
      dateApproved: data.date_approved ?? null,
    };
  }

  /**
   * Verify Mercado Pago webhook signature.
   *
   * Official algorithm:
   * 1. Parse x-signature header: ts=<timestamp>,v1=<hmac_hex>
   * 2. Build manifest: "id:{data.id};request-id:{x-request-id};ts:{ts};"
   * 3. HMAC-SHA256(manifest, webhookSecret)
   * 4. Constant-time compare with v1
   */
  verifyWebhook(input: WebhookVerificationInput): boolean {
    try {
      const { xSignature, xRequestId, dataId } = input;

      // Parse x-signature header
      const parts = Object.fromEntries(
        xSignature.split(',').map((p) => {
          const [k, v] = p.split('=');
          return [k.trim(), v.trim()];
        })
      );
      const ts = parts['ts'];
      const v1 = parts['v1'];
      if (!ts || !v1) return false;

      // Canonical manifest string
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

      // HMAC-SHA256
      const computed = createHmac('sha256', this.webhookSecret)
        .update(manifest)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      const computedBuf = Buffer.from(computed);
      const receivedBuf = Buffer.from(v1);
      if (computedBuf.length !== receivedBuf.length) return false;
      return timingSafeEqual(computedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  private mapSubscription(data: Record<string, unknown>): ProviderSubscription {
    const autoRecurring = data.auto_recurring as Record<string, unknown> | undefined;
    return {
      providerId: String(data.id),
      status: mapMpStatus(String(data.status ?? '')),
      initPoint: String(data.init_point ?? ''),
      externalReference: String(data.external_reference ?? ''),
      transactionAmount: typeof autoRecurring?.transaction_amount === 'number'
        ? autoRecurring.transaction_amount
        : 0,
      nextPaymentDate: (data.next_payment_date as string) ?? null,
    };
  }
}
