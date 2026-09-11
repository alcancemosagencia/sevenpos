import { describe, it, expect } from 'vitest';
import {
  isBlacklistedKey,
  sanitizeMetadataObject,
  sanitizeAndSerializeMetadata,
} from '../application/audit/metadataSanitizer';

describe('AG-12 Audit Metadata Sanitizer & Blacklist Tests', () => {
  describe('1. Blacklist Key Detection (Case-insensitive & variations)', () => {
    it('detects sensitive password and token keys', () => {
      expect(isBlacklistedKey('password')).toBe(true);
      expect(isBlacklistedKey('Password')).toBe(true);
      expect(isBlacklistedKey('PASSWORD')).toBe(true);
      expect(isBlacklistedKey('user_password')).toBe(true);
      expect(isBlacklistedKey('userPassword')).toBe(true);
      expect(isBlacklistedKey('token')).toBe(true);
      expect(isBlacklistedKey('accessToken')).toBe(true);
      expect(isBlacklistedKey('access_token')).toBe(true);
      expect(isBlacklistedKey('refreshToken')).toBe(true);
      expect(isBlacklistedKey('bearer_token')).toBe(true);
    });

    it('detects secret, pin, cvv, and card PAN keys', () => {
      expect(isBlacklistedKey('pin')).toBe(true);
      expect(isBlacklistedKey('userPin')).toBe(true);
      expect(isBlacklistedKey('secret')).toBe(true);
      expect(isBlacklistedKey('clientSecret')).toBe(true);
      expect(isBlacklistedKey('client_secret')).toBe(true);
      expect(isBlacklistedKey('cvv')).toBe(true);
      expect(isBlacklistedKey('pan')).toBe(true);
      expect(isBlacklistedKey('cardNumber')).toBe(true);
      expect(isBlacklistedKey('card_number')).toBe(true);
    });

    it('allows safe non-sensitive business keys', () => {
      expect(isBlacklistedKey('saleNumber')).toBe(false);
      expect(isBlacklistedKey('total')).toBe(false);
      expect(isBlacklistedKey('customerNameSnapshot')).toBe(false);
      expect(isBlacklistedKey('productSku')).toBe(false);
      expect(isBlacklistedKey('quantityDelta')).toBe(false);
      expect(isBlacklistedKey('reasonCode')).toBe(false);
    });
  });

  describe('2. Recursive Sanitization', () => {
    it('redacts sensitive fields in nested objects', () => {
      const input = {
        saleNumber: 'VTA-000001',
        total: 15000,
        security: {
          pin: '1234',
          authToken: 'jwt-xyz-secret',
          safeField: 'permitted',
        },
        items: [
          { sku: 'PROD-1', price: 5000 },
          { sku: 'PROD-2', card_number: '4111222233334444' },
        ],
      };

      const sanitized = sanitizeMetadataObject(input) as Record<string, unknown>;
      const sec = sanitized.security as Record<string, unknown>;
      const items = sanitized.items as Record<string, unknown>[];

      expect(sanitized.saleNumber).toBe('VTA-000001');
      expect(sanitized.total).toBe(15000);
      expect(sec.pin).toBe('[REDACTED]');
      expect(sec.authToken).toBe('[REDACTED]');
      expect(sec.safeField).toBe('permitted');
      expect(items[0].sku).toBe('PROD-1');
      expect(items[1].card_number).toBe('[REDACTED]');
    });
  });

  describe('3. 8 KB UTF-8 Payload Ceiling Enforcement', () => {
    it('preserves small payloads without truncation', () => {
      const metadata = { saleId: '123', total: 5000, currency: 'CLP' };
      const serialized = sanitizeAndSerializeMetadata(metadata);
      expect(serialized).not.toBeNull();
      expect(JSON.parse(serialized!)).toEqual(metadata);
    });

    it('truncates excessively large payloads and sets _metadataTruncated flag', () => {
      // Create a massive payload > 15 KB
      const largeArray = Array.from({ length: 500 }, (_, i) => ({
        index: i,
        description: `This is a long description designed to bloat the metadata object beyond 8KB UTF-8 limit ${i}`,
      }));

      const largeMetadata = {
        title: 'Massive Audit Event',
        items: largeArray,
      };

      const serialized = sanitizeAndSerializeMetadata(largeMetadata);
      expect(serialized).not.toBeNull();

      const encoder = new TextEncoder();
      const bytes = encoder.encode(serialized!).length;
      expect(bytes).toBeLessThanOrEqual(8192);

      const parsed = JSON.parse(serialized!);
      expect(parsed._metadataTruncated).toBe(true);
    });
  });
});
