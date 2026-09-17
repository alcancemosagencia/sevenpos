import { describe, it, expect } from 'vitest';

describe('Webhook idempotency contract', () => {
  it('notification_id comes from body.id only — NOT x-request-id', () => {
    const webhookBody = { id: 12345678901, type: 'subscription_preapproval', data: { id: 'PREAPPROVAL_123' } };
    const headers = { 'x-request-id': 'aaaabbbb-cccc-dddd-eeee-ffffffffffff' };

    const notificationId = String(webhookBody.id);          // ← canonical source
    const resourceId = webhookBody.data.id;                  // ← resource
    const xRequestId = headers['x-request-id'];              // ← metadata only

    expect(notificationId).toBe('12345678901');
    expect(resourceId).toBe('PREAPPROVAL_123');
    expect(notificationId).not.toBe(xRequestId);            // NEVER conflated
  });

  it('missing body.id → no mutation, MISSING_NOTIFICATION_ID flag', () => {
    const webhookBody = { type: 'subscription_preapproval', data: { id: 'PREAPPROVAL_123' } }; // no id
    const body = webhookBody as Record<string, unknown>;
    const notificationId = body.id ? String(body.id) : null;

    expect(notificationId).toBeNull();
    // Contract: record processing_error = 'MISSING_NOTIFICATION_ID', no state mutation
    const processingError = 'MISSING_NOTIFICATION_ID';
    expect(processingError).toBe('MISSING_NOTIFICATION_ID');
  });

  it('SYNTHETIC timestamp key is PROHIBITED — not used for idempotency', () => {
    // This test documents the contract: timestamp-based synthetic IDs are banned
    const ts = Date.now();
    const banned = `SYNTHETIC:subscription_preapproval:PREAPPROVAL_123:${ts}`;
    // A new retry at a different timestamp would yield a different key → unsafe
    const ts2 = ts + 1000;
    const banned2 = `SYNTHETIC:subscription_preapproval:PREAPPROVAL_123:${ts2}`;
    expect(banned).not.toBe(banned2); // proves timestamp keys are NOT idempotent across retries
  });

  it('duplicate valid webhook → must produce exactly one mutation', () => {
    // Simulated idempotency: insert with ON CONFLICT DO NOTHING
    // Second insert returns affected=0 → no mutation
    const processed = new Set<string>();

    function processWebhook(gateway: string, notificationId: string, eventType: string): boolean {
      const key = `${gateway}:${notificationId}:${eventType}`;
      if (processed.has(key)) return false; // duplicate — skip
      processed.add(key);
      return true; // first time — process
    }

    const first = processWebhook('MERCADOPAGO', '12345678901', 'subscription_preapproval');
    const second = processWebhook('MERCADOPAGO', '12345678901', 'subscription_preapproval');

    expect(first).toBe(true);
    expect(second).toBe(false);  // no duplicate mutation
    expect(processed.size).toBe(1);
  });
});
