import { UserRepository } from '../../domain/user/UserRepository';
import { PinVault } from '../../domain/auth/PinVault';
import { logger } from '../../infrastructure/logging/Logger';

export interface VerifyPinResult {
  isValid: boolean;
  userId?: string;
  isLockedOut?: boolean;
  remainingAttempts?: number;
  error?: string;
}

export class VerifyPin {
  private failedAttempts = 0;
  private readonly maxAttempts = 5;
  private lockoutUntil: number | null = null;

  constructor(
    private userRepo: UserRepository,
    private pinVault: PinVault
  ) {}

  async execute(pin: string): Promise<VerifyPinResult> {
    // 1. Check if temporarily locked out
    if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
      const waitSeconds = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
      return {
        isValid: false,
        isLockedOut: true,
        error: `Demasiados intentos fallidos. Espere ${waitSeconds} segundos.`,
      };
    }

    // 2. Retrieve owner user
    const owner = await this.userRepo.getOwnerUser();
    if (!owner) {
      return { isValid: false, error: 'No existe usuario propietario configurado en este terminal.' };
    }

    // 3. Verify PIN against Vault
    const isValid = await this.pinVault.verifyPin(owner.id, pin);

    if (isValid) {
      this.failedAttempts = 0;
      this.lockoutUntil = null;
      logger.info('VerifyPin', `Successful PIN verification for owner: ${owner.firstName}`);
      return { isValid: true, userId: owner.id };
    }

    // 4. Handle failed attempt
    this.failedAttempts += 1;
    logger.warn('VerifyPin', `Failed PIN verification attempt (${this.failedAttempts}/${this.maxAttempts})`);

    if (this.failedAttempts >= this.maxAttempts) {
      this.lockoutUntil = Date.now() + 30 * 1000; // 30s lockout
      return {
        isValid: false,
        isLockedOut: true,
        remainingAttempts: 0,
        error: 'Terminal bloqueado temporalmente por 30 segundos tras 5 intentos fallidos.',
      };
    }

    return {
      isValid: false,
      remainingAttempts: this.maxAttempts - this.failedAttempts,
      error: 'PIN incorrecto. Intente nuevamente.',
    };
  }
}
