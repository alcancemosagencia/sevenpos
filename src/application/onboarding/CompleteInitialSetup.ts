import { BusinessRepository } from '../../domain/business/BusinessRepository';
import { UserRepository } from '../../domain/user/UserRepository';
import { PinVault } from '../../domain/auth/PinVault';
import { Business, validateBusiness } from '../../domain/business/Business';
import { BusinessSettings } from '../../domain/business/BusinessSettings';
import { User } from '../../domain/user/User';
import { generateUuid } from '../../domain/common/IdGenerator';
import { getCurrentUtcIsoString } from '../../domain/common/Timestamp';
import { SupportedCountryCode, CurrencyCode } from '../../types/country';
import { logger } from '../../infrastructure/logging/Logger';

export interface SetupBusinessDTO {
  name: string;
  countryCode: SupportedCountryCode;
  fiscalId?: string | null;
  phone?: string | null;
  phonePrefix?: string | null;
  address?: string | null;
}

export interface SetupSettingsDTO {
  primaryCurrency: CurrencyCode;
  secondaryCurrency?: CurrencyCode | null;
  secondaryCurrencyEnabled: boolean;
  exchangeRateProvider?: string | null;
}

export interface SetupOwnerDTO {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
}

export interface CompleteInitialSetupInput {
  business: SetupBusinessDTO;
  settings: SetupSettingsDTO;
  owner: SetupOwnerDTO;
  pin: string;
}

export interface CompleteInitialSetupResult {
  success: boolean;
  business?: Business;
  settings?: BusinessSettings;
  owner?: User;
  error?: string;
}

export class CompleteInitialSetup {
  constructor(
    private businessRepo: BusinessRepository,
    private userRepo: UserRepository,
    private pinVault: PinVault
  ) {}

  async execute(input: CompleteInitialSetupInput): Promise<CompleteInitialSetupResult> {
    const { business: bInput, settings: sInput, owner: oInput, pin } = input;

    // 1. Validation
    const businessValidation = validateBusiness({ name: bInput.name, countryCode: bInput.countryCode });
    if (!businessValidation.isValid) {
      return { success: false, error: businessValidation.error };
    }

    if (!oInput.firstName || !oInput.firstName.trim()) {
      return { success: false, error: 'El nombre del dueño es obligatorio.' };
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return { success: false, error: 'El PIN debe ser de exactamente 4 dígitos numéricos.' };
    }

    const now = getCurrentUtcIsoString();
    const businessId = generateUuid();
    const ownerId = generateUuid();

    const businessEntity: Business = {
      id: businessId,
      name: bInput.name.trim(),
      countryCode: bInput.countryCode,
      fiscalId: bInput.fiscalId?.trim() || null,
      phone: bInput.phone?.trim() || null,
      phonePrefix: bInput.phonePrefix?.trim() || null,
      address: bInput.address?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    const settingsEntity: BusinessSettings = {
      businessId,
      primaryCurrency: sInput.primaryCurrency,
      secondaryCurrency: sInput.secondaryCurrency || null,
      secondaryCurrencyEnabled: sInput.secondaryCurrencyEnabled,
      exchangeRateProvider: sInput.exchangeRateProvider || null,
      createdAt: now,
      updatedAt: now,
    };

    const ownerEntity: User = {
      id: ownerId,
      businessId,
      firstName: oInput.firstName.trim(),
      lastName: oInput.lastName?.trim() || null,
      email: oInput.email?.trim() || null,
      role: 'OWNER',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    logger.info('CompleteInitialSetup', `Executing initial setup for business: ${businessEntity.name}`);

    // 2. Coordinated Persistence (Database + Vault with Rollback Compensation)
    try {
      // Step A: Save Business & Settings in SQLite transaction
      await this.businessRepo.saveBusinessWithSettings(businessEntity, settingsEntity);

      // Step B: Save Owner User in SQLite
      await this.userRepo.saveUser(ownerEntity);

      // Step C: Save secure PIN credential in Stronghold vault
      try {
        await this.pinVault.savePinCredential(ownerId, pin);
      } catch (vaultErr) {
        // Compensation rollback: If vault fails, remove database records to avoid corrupt partial setup
        logger.error('CompleteInitialSetup', 'Vault write failed, executing rollback in SQLite', { error: String(vaultErr) });
        await this.userRepo.resetAll().catch(() => {});
        await this.businessRepo.resetAll().catch(() => {});
        throw new Error(`Fallo al guardar credencial de seguridad en Secure Vault: ${String(vaultErr)}`, { cause: vaultErr });
      }

      logger.info('CompleteInitialSetup', 'Initial setup successfully completed.');
      return {
        success: true,
        business: businessEntity,
        settings: settingsEntity,
        owner: ownerEntity,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('CompleteInitialSetup', 'Initial setup execution failed', { error: errorMsg });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
