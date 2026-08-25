export interface PinVault {
  savePinCredential(userId: string, pin: string): Promise<void>;
  verifyPin(userId: string, pin: string): Promise<boolean>;
  hasPinCredential(userId: string): Promise<boolean>;
  resetVault(): Promise<void>;
}
