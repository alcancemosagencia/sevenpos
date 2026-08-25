/**
 * Web Crypto SHA-256 hasher for temporary local PIN verification.
 * Note: This provides client-side salted hashing for development/prototyping.
 * Production security will be handled natively by Tauri / SQLite / OS Keyring.
 */

export async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const pinSalt = salt || generateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${pinSalt}:${pin}`);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return { hash: hashHex, salt: pinSalt };
}

export async function verifyPinHash(pin: string, expectedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPin(pin, salt);
  return hash === expectedHash;
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
