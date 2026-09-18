import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderToString } from 'react-dom/server';
import { UpgradePromptModal } from '../components/subscription/UpgradePromptModal';

const store = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

describe('UX-HOTFIX-PRO-CTA-01: Pro Upgrade Navigation & Paywalls', () => {
  beforeAll(() => {
    store.clear();
  });

  it('1. UpgradePromptModal renders title, message, benefits, and "Conocer SevenPOS Pro" CTA button', () => {
    const html = renderToString(
      <UpgradePromptModal
        isOpen={true}
        onClose={() => {}}
        onNavigateToSubscription={() => {}}
        title="Historial de auditoría en Plan Pro"
        message="El Plan Pro desbloquea el historial completo de eventos."
      />
    );

    expect(html).toContain('Historial de auditoría en Plan Pro');
    expect(html).toContain('El Plan Pro desbloquea el historial completo de eventos.');
    expect(html).toContain('Conocer SevenPOS Pro');
    expect(html).toContain('Entendido');
    expect(html).toContain('data-testid="upgrade-prompt-modal"');
    expect(html).toContain('data-testid="upgrade-prompt-backdrop"');
  });

  it('2. UpgradePromptModal renders custom benefits when provided', () => {
    const customBenefits = [
      'Beneficio personalizado A',
      'Beneficio personalizado B',
    ];

    const html = renderToString(
      <UpgradePromptModal
        isOpen={true}
        onClose={() => {}}
        onNavigateToSubscription={() => {}}
        benefits={customBenefits}
      />
    );

    expect(html).toContain('Beneficio personalizado A');
    expect(html).toContain('Beneficio personalizado B');
  });

  it('3. UpgradePromptModal renders nothing when isOpen is false', () => {
    const html = renderToString(
      <UpgradePromptModal
        isOpen={false}
        onClose={() => {}}
        onNavigateToSubscription={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('4. UpgradePromptModal accepts onNavigateToSubscription callback and renders with it', () => {
    const onNavigateToSubscription = vi.fn();
    const onClose = vi.fn();

    const html = renderToString(
      <UpgradePromptModal
        isOpen={true}
        onClose={onClose}
        onNavigateToSubscription={onNavigateToSubscription}
        title="Prueba de Navegación"
      />
    );

    expect(html).toContain('Prueba de Navegación');
    expect(html).toContain('Conocer SevenPOS Pro');
  });
});

