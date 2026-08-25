/**
 * Runtime environment detection for SevenPOS.
 */
export function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
}

export function isBrowserDevelopment(): boolean {
  return !isTauriEnvironment() && import.meta.env?.DEV === true;
}
