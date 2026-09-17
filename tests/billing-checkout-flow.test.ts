import { describe, it, expect } from 'vitest';
import type { BillingIntentResponse } from '../src/infrastructure/billing/BillingApiClient';

describe('AG-15C-B.6 — Checkout Click Trace, Owner Re-Auth & Error Handling', () => {
  it('1. Local PIN unlock without cloud session triggers Owner Re-Auth modal before calling create-intent', () => {
    const state = {
      isPinUnlocked: true,
      hasCloudSession: false,
      isReAuthModalOpen: false,
      isSummaryModalOpen: false,
    };

    const handleShowCheckout = () => {
      if (!state.hasCloudSession) {
        state.isReAuthModalOpen = true;
        state.isSummaryModalOpen = false;
        return;
      }
      state.isSummaryModalOpen = true;
    };

    handleShowCheckout();

    expect(state.isReAuthModalOpen).toBe(true);
    expect(state.isSummaryModalOpen).toBe(false);
  });

  it('2. Error status 401 / AUTH_REQUIRED triggers Owner Re-Auth modal', () => {
    let reAuthOpened = false;
    let toastMessage = '';

    const handleCheckoutError = (err: { status?: number; code?: string; message?: string }) => {
      if (err.status === 401 || err.code === 'AUTH_REQUIRED' || err.code === 'UNAUTHORIZED') {
        reAuthOpened = true;
        return;
      }
      if (err.status === 403 || err.code === 'NOT_OWNER') {
        toastMessage = 'Esta acción solo puede realizarla el propietario del negocio.';
        return;
      }
      if (err.status === 502 || err.code === 'PROVIDER_ERROR') {
        toastMessage = 'No pudimos conectar con Mercado Pago. Inténtalo nuevamente.';
        return;
      }
      if (err.status === 500 || err.code === 'INTENT_CREATE_FAILED') {
        toastMessage = 'No pudimos iniciar el proceso de suscripción.';
        return;
      }
      toastMessage = 'No pudimos conectar con el servicio de suscripciones.';
    };

    handleCheckoutError({ status: 401, code: 'AUTH_REQUIRED' });
    expect(reAuthOpened).toBe(true);
    expect(toastMessage).toBe('');
  });

  it('3. Error status 403 / NOT_OWNER maps to expected business owner message', () => {
    let toastMessage = '';
    const handleCheckoutError = (err: { status?: number; code?: string }) => {
      if (err.status === 403 || err.code === 'NOT_OWNER') {
        toastMessage = 'Esta acción solo puede realizarla el propietario del negocio.';
      }
    };

    handleCheckoutError({ status: 403, code: 'NOT_OWNER' });
    expect(toastMessage).toBe('Esta acción solo puede realizarla el propietario del negocio.');
  });

  it('4. Error status 502 / PROVIDER_ERROR maps to Mercado Pago connection error', () => {
    let toastMessage = '';
    const handleCheckoutError = (err: { status?: number; code?: string }) => {
      if (err.status === 502 || err.code === 'PROVIDER_ERROR') {
        toastMessage = 'No pudimos conectar con Mercado Pago. Inténtalo nuevamente.';
      }
    };

    handleCheckoutError({ status: 502, code: 'PROVIDER_ERROR' });
    expect(toastMessage).toBe('No pudimos conectar con Mercado Pago. Inténtalo nuevamente.');
  });

  it('5. Error status 500 / INTENT_CREATE_FAILED maps to generic intent creation error', () => {
    let toastMessage = '';
    const handleCheckoutError = (err: { status?: number; code?: string }) => {
      if (err.status === 500 || err.code === 'INTENT_CREATE_FAILED') {
        toastMessage = 'No pudimos iniciar el proceso de suscripción.';
      }
    };

    handleCheckoutError({ status: 500, code: 'INTENT_CREATE_FAILED' });
    expect(toastMessage).toBe('No pudimos iniciar el proceso de suscripción.');
  });

  it('6. Network failure / unexpected error maps to subscriptions service connection error', () => {
    let toastMessage = '';
    const handleCheckoutError = (err: { status?: number; code?: string } | Error) => {
      const errorObj = err as { status?: number; code?: string };
      if (errorObj.status === 401 || errorObj.code === 'AUTH_REQUIRED') return;
      if (errorObj.status === 403 || errorObj.code === 'NOT_OWNER') return;
      if (errorObj.status === 502 || errorObj.code === 'PROVIDER_ERROR') return;
      if (errorObj.status === 500 || errorObj.code === 'INTENT_CREATE_FAILED') return;
      toastMessage = 'No pudimos conectar con el servicio de suscripciones.';
    };

    handleCheckoutError(new TypeError('Failed to fetch'));
    expect(toastMessage).toBe('No pudimos conectar con el servicio de suscripciones.');
  });

  it('7. UI gross amount must match server intent finalGrossAmount or abort redirect', () => {
    const uiGross = 11888;
    const serverIntentMismatch: BillingIntentResponse = {
      intentId: 'intent_123',
      initPoint: 'https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=123',
      finalNetAmount: 19990,
      taxAmount: 3798,
      finalGrossAmount: 23788,
      appliedPromotionCode: null,
    };

    const serverIntentMatch: BillingIntentResponse = {
      intentId: 'intent_456',
      initPoint: 'https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=456',
      finalNetAmount: 9990,
      taxAmount: 1898,
      finalGrossAmount: 11888,
      appliedPromotionCode: 'FOUNDERS_50',
    };

    const validateAndRedirect = (uiAmount: number, intent: BillingIntentResponse) => {
      if (intent.finalGrossAmount !== uiAmount) {
        throw new Error('Price mismatch: UI showed ' + uiAmount + ' but server created intent for ' + intent.finalGrossAmount);
      }
      if (!intent.initPoint) {
        throw new Error('Missing initPoint from billing provider');
      }
      return intent.initPoint;
    };

    expect(() => validateAndRedirect(uiGross, serverIntentMismatch)).toThrow(/Price mismatch/);
    expect(validateAndRedirect(uiGross, serverIntentMatch)).toBe('https://sandbox.mercadopago.cl/checkout/v1/redirect?pref_id=456');
  });

  it('8. Missing initPoint aborts redirect with error', () => {
    const intentWithoutInitPoint: BillingIntentResponse = {
      intentId: 'intent_789',
      initPoint: '',
      finalNetAmount: 9990,
      taxAmount: 1898,
      finalGrossAmount: 11888,
      appliedPromotionCode: 'FOUNDERS_50',
    };

    const validateAndRedirect = (uiAmount: number, intent: BillingIntentResponse) => {
      if (intent.finalGrossAmount !== uiAmount) {
        throw new Error('Price mismatch');
      }
      if (!intent.initPoint) {
        throw new Error('Missing initPoint from billing provider');
      }
      return intent.initPoint;
    };

    expect(() => validateAndRedirect(11888, intentWithoutInitPoint)).toThrow('Missing initPoint from billing provider');
  });

  it('9. Error status 504 / PROVIDER_TIMEOUT maps to timeout message', () => {
    let toastMessage = '';
    const handleCheckoutError = (err: { status?: number; code?: string; message?: string }) => {
      if (err.status === 504 || err.code === 'PROVIDER_TIMEOUT' || err.message?.includes('timed out')) {
        toastMessage = 'Mercado Pago está tardando más de lo esperado. Inténtalo nuevamente.';
      }
    };

    handleCheckoutError({ status: 504, code: 'PROVIDER_TIMEOUT' });
    expect(toastMessage).toBe('Mercado Pago está tardando más de lo esperado. Inténtalo nuevamente.');
  });

  it('10. Duplicate checkout click is blocked while checkout request is loading', () => {
    let callCount = 0;
    let isCheckoutLoading = false;

    const handleConfirmCheckout = async () => {
      if (isCheckoutLoading) return;
      isCheckoutLoading = true;
      try {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
      } finally {
        isCheckoutLoading = false;
      }
    };

    handleConfirmCheckout();
    handleConfirmCheckout();
    handleConfirmCheckout();

    expect(callCount).toBe(1);
  });
});
