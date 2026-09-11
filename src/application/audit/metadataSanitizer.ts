const BLACKLISTED_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /hash/i,
  /pin/i,
  /cvv/i,
  /pan/i,
  /card_?number/i,
  /authorization/i,
  /private_?key/i,
  /refresh_?token/i,
  /access_?token/i,
  /seed/i,
  /credential/i,
  /bearer/i,
];

const MAX_PAYLOAD_BYTES = 8192; // 8 KB UTF-8 limit

export function isBlacklistedKey(key: string): boolean {
  const normalized = key.replace(/[-_]/g, '').toLowerCase();
  return BLACKLISTED_KEY_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized));
}

export function sanitizeMetadataObject(obj: unknown, depth = 0): unknown {
  if (depth > 6) return '[MAX_DEPTH_EXCEEDED]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMetadataObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (isBlacklistedKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeMetadataObject(value, depth + 1);
      }
    }

    return sanitized;
  }

  return String(obj);
}

export function sanitizeAndSerializeMetadata(metadata?: Record<string, unknown> | null): string | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const cleaned = sanitizeMetadataObject(metadata) as Record<string, unknown>;
  const jsonString = JSON.stringify(cleaned);

  const encoder = new TextEncoder();
  if (encoder.encode(jsonString).length <= MAX_PAYLOAD_BYTES) {
    return jsonString;
  }

  // If size exceeds 8 KB, truncate properties while preserving valid JSON and flag
  const truncatedObj: Record<string, unknown> = {
    _metadataTruncated: true,
  };

  for (const [key, value] of Object.entries(cleaned)) {
    truncatedObj[key] = value;
    const testJson = JSON.stringify(truncatedObj);
    if (encoder.encode(testJson).length > MAX_PAYLOAD_BYTES - 100) {
      delete truncatedObj[key];
      truncatedObj._truncatedKeysCount = (Number(truncatedObj._truncatedKeysCount) || 0) + 1;
    }
  }

  return JSON.stringify(truncatedObj);
}
