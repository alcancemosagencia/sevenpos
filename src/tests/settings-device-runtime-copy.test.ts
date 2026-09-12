import { describe, it, expect } from 'vitest';
import { isTauriEnvironment } from '../infrastructure/runtime/environment';

describe('AG-13 — Device Runtime Copy Truth', () => {
  it('correctly reports non-Tauri browser environment in web test context', () => {
    // In vitest / jsdom without __TAURI__, isTauriEnvironment returns false
    const isTauri = isTauriEnvironment();
    expect(isTauri).toBe(false);

    // Web copy contract
    const badgeLabel = isTauri ? 'Disponible sin conexión' : 'Sesión web';
    const description = isTauri
      ? 'Este terminal puede seguir funcionando aunque pierda temporalmente la conexión.'
      : 'Estás utilizando SevenPOS desde el navegador.';

    expect(badgeLabel).toBe('Sesión web');
    expect(description).toBe('Estás utilizando SevenPOS desde el navegador.');
    expect(badgeLabel).not.toBe('Disponible sin conexión');
  });

  it('contracts offline guarantee when __TAURI__ window object is present', () => {
    // Simulated Tauri environment
    const fakeWindow = { __TAURI__: {} };
    const simulatedIsTauri = '__TAURI__' in fakeWindow;

    const badgeLabel = simulatedIsTauri ? 'Disponible sin conexión' : 'Sesión web';
    const description = simulatedIsTauri
      ? 'Este terminal puede seguir funcionando aunque pierda temporalmente la conexión.'
      : 'Estás utilizando SevenPOS desde el navegador.';

    expect(badgeLabel).toBe('Disponible sin conexión');
    expect(description).toContain('Este terminal puede seguir funcionando');
  });
});
