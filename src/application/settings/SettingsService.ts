import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { Business, validateBusiness } from '../../domain/business/Business';
import { BusinessSettings } from '../../domain/business/BusinessSettings';
import { PinVault } from '../../domain/auth/PinVault';
import { pinVaultFactory } from '../../infrastructure/security/PinVaultFactory';
import { DeviceEnrollmentStorage } from '../../infrastructure/auth/DeviceEnrollmentStorage';
import { logAuditEventSafely } from '../audit/auditEventHelper';
import {
  GeneralSettingsForm,
  CurrencySettingsForm,
  PosSettingsForm,
  PrintingSettingsForm,
  InventorySettingsForm,
  DeviceSettingsData,
  ChangePinInput,
} from '../../features/settings/types';
import { logger } from '../../infrastructure/logging/Logger';

export class SettingsService {
  constructor(
    private businessRepo: BusinessRepository,
    private pinVault?: PinVault
  ) {}

  private getVault(): PinVault {
    return this.pinVault || pinVaultFactory.getPinVault();
  }

  // 1. General Settings (Mi Negocio)
  async getGeneralSettings(_businessId: string): Promise<GeneralSettingsForm | null> {
    const business = await this.businessRepo.getPrimaryBusiness();
    if (!business) return null;

    return {
      name: business.name,
      fiscalId: business.fiscalId || '',
      phone: business.phone || '',
      phonePrefix: business.phonePrefix || '+56',
      address: business.address || '',
      countryCode: business.countryCode,
    };
  }

  async saveGeneralSettings(
    businessId: string,
    form: GeneralSettingsForm,
    actor: { userId: string; userName: string; deviceId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const current = await this.businessRepo.getPrimaryBusiness();
    if (!current) {
      return { success: false, error: 'No se encontró el negocio principal.' };
    }

    const validation = validateBusiness({ ...current, name: form.name });
    if (!validation.isValid) {
      return { success: false, error: validation.error || 'El nombre del negocio es obligatorio.' };
    }

    const updated: Business = {
      ...current,
      name: form.name.trim(),
      fiscalId: form.fiscalId.trim() || null,
      phone: form.phone.trim() || null,
      phonePrefix: form.phonePrefix.trim() || null,
      address: form.address.trim() || null,
      updatedAt: new Date().toISOString(),
    };

    await this.businessRepo.updateBusiness(updated);

    // Append Audit Event
    await logAuditEventSafely({
      businessId,
      eventCategory: 'SETTINGS',
      eventType: 'settings.business_updated',
      action: 'SETTINGS_UPDATE',
      severity: 'INFO',
      actorUserId: actor.userId,
      actorNameSnapshot: actor.userName,
      actorRoleSnapshot: 'Dueño',
      deviceId: actor.deviceId || 'local-device',
      deviceNameSnapshot: 'Terminal Principal',
      entityType: 'SETTINGS',
      entityId: businessId,
      entityLabel: 'Configuración General',
      summary: `Datos del negocio actualizados: "${updated.name}"`,
      metadata: {
        businessName: updated.name,
        fiscalId: updated.fiscalId || null,
        phone: updated.phone || null,
        phonePrefix: updated.phonePrefix || null,
        address: updated.address || null,
      },
    });

    return { success: true };
  }

  // 2. Currency & Region Settings
  async getCurrencySettings(businessId: string): Promise<CurrencySettingsForm | null> {
    const business = await this.businessRepo.getPrimaryBusiness();
    if (!business) return null;

    const settings = await this.businessRepo.getBusinessSettings(businessId);
    const rawRate = await this.businessRepo.getMeta(`biz_${businessId}_exchange_rate`);
    const manualExchangeRate = rawRate ? parseFloat(rawRate) : 965.5;

    return {
      countryCode: business.countryCode,
      primaryCurrency: settings?.primaryCurrency || (business.countryCode === 'VE' ? 'VES' : 'CLP'),
      secondaryCurrencyEnabled: settings?.secondaryCurrencyEnabled || false,
      secondaryCurrency: settings?.secondaryCurrency || (business.countryCode === 'VE' ? 'USD' : null),
      exchangeRateProvider: settings?.exchangeRateProvider || 'MANUAL',
      manualExchangeRate: isNaN(manualExchangeRate) || manualExchangeRate <= 0 ? 1 : manualExchangeRate,
    };
  }

  async saveCurrencySettings(
    businessId: string,
    form: CurrencySettingsForm,
    actor: { userId: string; userName: string; deviceId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (form.manualExchangeRate <= 0 || isNaN(form.manualExchangeRate)) {
      return { success: false, error: 'La tasa de cambio debe ser un número mayor a 0.' };
    }

    const currentSettings = await this.businessRepo.getBusinessSettings(businessId);
    const previousRateRaw = await this.businessRepo.getMeta(`biz_${businessId}_exchange_rate`);
    const previousRate = previousRateRaw ? parseFloat(previousRateRaw) : 1;

    const updatedSettings: BusinessSettings = {
      businessId,
      primaryCurrency: form.primaryCurrency,
      secondaryCurrency: form.secondaryCurrencyEnabled ? (form.secondaryCurrency || 'USD') : null,
      secondaryCurrencyEnabled: form.secondaryCurrencyEnabled,
      exchangeRateProvider: form.exchangeRateProvider || 'MANUAL',
      createdAt: currentSettings?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.businessRepo.updateSettings(updatedSettings);
    await this.businessRepo.setMeta(`biz_${businessId}_exchange_rate`, String(form.manualExchangeRate));

    // Append Audit Event
    await logAuditEventSafely({
      businessId,
      eventCategory: 'SETTINGS',
      eventType: 'settings.currency_updated',
      action: 'SETTINGS_UPDATE',
      severity: 'INFO',
      actorUserId: actor.userId,
      actorNameSnapshot: actor.userName,
      actorRoleSnapshot: 'Dueño',
      deviceId: actor.deviceId || 'local-device',
      deviceNameSnapshot: 'Terminal Principal',
      entityType: 'SETTINGS',
      entityId: businessId,
      entityLabel: 'Configuración Moneda',
      summary: `Tasa de cambio manual actualizada: USD a ${form.primaryCurrency} ${form.manualExchangeRate}`,
      metadata: {
        previousRate,
        newRate: form.manualExchangeRate,
        provider: form.exchangeRateProvider || 'MANUAL',
        secondaryCurrencyEnabled: form.secondaryCurrencyEnabled,
      },
    });

    return { success: true };
  }

  // 3. POS Settings (Device / POS Scope)
  getPosSettings(): PosSettingsForm {
    if (typeof localStorage === 'undefined') {
      return {
        confirmBeforeFinalizingSale: true,
        showStockInGrid: true,
        autoPrintReceipt: false,
      };
    }

    const confirmRaw = localStorage.getItem('sevenpos_pos_confirm_checkout');
    const showStockRaw = localStorage.getItem('sevenpos_pos_show_stock');
    const autoPrintRaw = localStorage.getItem('sevenpos_pos_autoprint');

    return {
      confirmBeforeFinalizingSale: confirmRaw !== null ? confirmRaw === 'true' : true,
      showStockInGrid: showStockRaw !== null ? showStockRaw === 'true' : true,
      autoPrintReceipt: autoPrintRaw !== null ? autoPrintRaw === 'true' : false,
    };
  }

  async savePosSettings(
    form: PosSettingsForm,
    actor: { userId: string; userName: string; businessId: string; deviceId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sevenpos_pos_confirm_checkout', String(form.confirmBeforeFinalizingSale));
      localStorage.setItem('sevenpos_pos_show_stock', String(form.showStockInGrid));
      localStorage.setItem('sevenpos_pos_autoprint', String(form.autoPrintReceipt));
    }

    await logAuditEventSafely({
      businessId: actor.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'settings.pos_updated',
      action: 'SETTINGS_UPDATE',
      severity: 'INFO',
      actorUserId: actor.userId,
      actorNameSnapshot: actor.userName,
      actorRoleSnapshot: 'Dueño',
      deviceId: actor.deviceId || 'local-device',
      deviceNameSnapshot: 'Terminal Principal',
      entityType: 'SETTINGS',
      entityId: actor.businessId,
      entityLabel: 'Punto de Venta',
      summary: 'Preferencias de punto de venta actualizadas',
      metadata: {
        confirmCheckout: form.confirmBeforeFinalizingSale,
        showStockInGrid: form.showStockInGrid,
        autoPrintReceipt: form.autoPrintReceipt,
      },
    });

    return { success: true };
  }

  // 4. Printing Settings (Device Scope)
  getPrintingSettings(): PrintingSettingsForm {
    if (typeof localStorage === 'undefined') {
      return { paperFormat: '80mm' };
    }
    const formatRaw = localStorage.getItem('sevenpos_printer_format');
    return {
      paperFormat: formatRaw === '58mm' ? '58mm' : '80mm',
    };
  }

  async savePrintingSettings(
    form: PrintingSettingsForm,
    actor: { userId: string; userName: string; businessId: string; deviceId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sevenpos_printer_format', form.paperFormat);
    }

    await logAuditEventSafely({
      businessId: actor.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'settings.printing_updated',
      action: 'SETTINGS_UPDATE',
      severity: 'INFO',
      actorUserId: actor.userId,
      actorNameSnapshot: actor.userName,
      actorRoleSnapshot: 'Dueño',
      deviceId: actor.deviceId || 'local-device',
      deviceNameSnapshot: 'Terminal Principal',
      entityType: 'SETTINGS',
      entityId: actor.businessId,
      entityLabel: 'Tickets e Impresión',
      summary: `Configuración de impresión actualizada: Formato ${form.paperFormat}`,
      metadata: {
        paperFormat: form.paperFormat,
      },
    });

    return { success: true };
  }

  // 5. Inventory Settings (Local Business Scope in SQLite app_meta)
  async getInventorySettings(businessId: string): Promise<InventorySettingsForm> {
    const raw = await this.businessRepo.getMeta(`biz_${businessId}_allow_negative_stock`);
    return {
      allowNegativeStock: raw === 'true',
    };
  }

  async saveInventorySettings(
    businessId: string,
    form: InventorySettingsForm,
    actor: { userId: string; userName: string; deviceId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    await this.businessRepo.setMeta(
      `biz_${businessId}_allow_negative_stock`,
      form.allowNegativeStock ? 'true' : 'false'
    );

    await logAuditEventSafely({
      businessId,
      eventCategory: 'SETTINGS',
      eventType: 'settings.inventory_updated',
      action: 'SETTINGS_UPDATE',
      severity: 'INFO',
      actorUserId: actor.userId,
      actorNameSnapshot: actor.userName,
      actorRoleSnapshot: 'Dueño',
      deviceId: actor.deviceId || 'local-device',
      deviceNameSnapshot: 'Terminal Principal',
      entityType: 'SETTINGS',
      entityId: businessId,
      entityLabel: 'Inventario',
      summary: `Políticas de inventario actualizadas: Venta sin existencias ${form.allowNegativeStock ? 'habilitada' : 'deshabilitada'}`,
      metadata: {
        allowNegativeStock: form.allowNegativeStock,
      },
    });

    return { success: true };
  }

  // 6. Security PIN Change (AUTH Scope)
  async changePin(
    userId: string,
    input: ChangePinInput,
    actor: { userId: string; userName: string; businessId: string; deviceId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const vault = this.getVault();

    if (!input.currentPin || input.currentPin.trim().length === 0) {
      return { success: false, error: 'Ingresa tu PIN actual.' };
    }

    const isCurrentValid = await vault.verifyPin(userId, input.currentPin);
    if (!isCurrentValid) {
      return { success: false, error: 'El PIN actual es incorrecto.' };
    }

    if (!/^\d{4}$/.test(input.newPin)) {
      return { success: false, error: 'El nuevo PIN debe tener exactamente 4 dígitos numéricos.' };
    }

    if (input.newPin !== input.confirmPin) {
      return { success: false, error: 'La confirmación del PIN no coincide con el nuevo PIN.' };
    }

    await vault.savePinCredential(userId, input.newPin);
    logger.info('SettingsService', `PIN credential updated for user ${userId}`);

    // Append Audit Event (AUTH Category, NO PIN / HASH / SALT IN METADATA!)
    await logAuditEventSafely({
      businessId: actor.businessId,
      eventCategory: 'AUTH',
      eventType: 'auth.pin.changed',
      action: 'PIN_UPDATE',
      severity: 'WARNING',
      actorUserId: actor.userId,
      actorNameSnapshot: actor.userName,
      actorRoleSnapshot: 'Dueño',
      deviceId: actor.deviceId || 'local-device',
      deviceNameSnapshot: 'Terminal Principal',
      entityType: 'USER',
      entityId: userId,
      entityLabel: 'Seguridad y Acceso',
      summary: `PIN de acceso modificado para usuario "${actor.userName}"`,
      metadata: {
        actor: actor.userName,
        device: actor.deviceId || 'local-device',
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true };
  }

  // 7. Device Information (Read-Only)
  getDeviceSettings(): DeviceSettingsData {
    const enrollment = DeviceEnrollmentStorage.getEnrollment();
    if (enrollment) {
      return {
        deviceId: enrollment.deviceId,
        displayName: enrollment.displayName || 'Terminal Principal',
        platform: enrollment.platform || 'Local',
        deviceType: enrollment.deviceType || 'DESKTOP',
        enrolledAt: enrollment.enrolledAt || new Date().toISOString(),
        status: 'active',
      };
    }

    return {
      deviceId: 'local-terminal',
      displayName: 'Terminal Local',
      platform: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Windows') ? 'Windows' : 'Web Browser') : 'Local',
      deviceType: 'DESKTOP',
      enrolledAt: new Date().toISOString(),
      status: 'local_only',
    };
  }
}
