import { User, UserRole, getUserDisplayName, formatUserRole, normalizeUserRole } from '../../domain/user/User';
import { UserRepository } from '../../domain/user/UserRepository';
import { PinVault } from '../../domain/auth/PinVault';
import { pinLockoutManager } from '../../domain/auth/PinLockoutManager';
import { PermissionService } from '../../domain/auth/Permissions';
import { logAuditEventSafely } from '../audit/auditEventHelper';
import { IEntitlementService } from '../subscription/IEntitlementService';
import { repositoryFactory } from '../../infrastructure/repositories/RepositoryFactory';

export interface CreateUserInput {
  businessId: string;
  firstName?: string;
  lastName?: string | null;
  fullName?: string;
  name?: string;
  email?: string | null;
  role: UserRole;
  pin: string;
  cloudUserId?: string | null;
}

export interface UpdateUserInput {
  userId: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
}

export class OperationalUserService {
  private entitlementService: IEntitlementService;

  constructor(
    private userRepository: UserRepository,
    private pinVault: PinVault,
    entitlementService?: IEntitlementService
  ) {
    this.entitlementService = entitlementService || repositoryFactory.getEntitlementService();
  }

  async getUsers(businessId: string): Promise<User[]> {
    return this.userRepository.getUsersByBusinessId(businessId);
  }

  async getActiveUsers(businessId: string): Promise<User[]> {
    return this.userRepository.getActiveUsersByBusinessId(businessId);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.getUserById(userId);
  }

  private validatePinFormat(pin: string): { valid: boolean; error?: string } {
    if (!pin || typeof pin !== 'string') {
      return { valid: false, error: 'El PIN es obligatorio.' };
    }
    const trimmed = pin.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      return { valid: false, error: 'El PIN debe contener entre 4 y 6 dígitos numéricos (mínimo 4 dígitos).' };
    }
    return { valid: true };
  }

  private async isPinDuplicate(businessId: string, pin: string, excludeUserId?: string): Promise<boolean> {
    const activeUsers = await this.userRepository.getActiveUsersByBusinessId(businessId);
    for (const user of activeUsers) {
      if (excludeUserId && user.id === excludeUserId) continue;
      const matches = await this.pinVault.verifyPin(user.id, pin);
      if (matches) {
        return true;
      }
    }
    return false;
  }

  async createUser(
    input: CreateUserInput,
    actorUser?: User,
    deviceId?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const existingUsers = await this.userRepository.getUsersByBusinessId(input.businessId);
    const isBootstrap = existingUsers.length === 0;

    const validatedRole = normalizeUserRole(input.role);
    if (!validatedRole || validatedRole === 'INVALID') {
      return { success: false, error: 'El rol especificado no es válido.' };
    }

    if (!isBootstrap && actorUser && !PermissionService.can(actorUser.role, 'users.manage')) {
      return { success: false, error: 'No tienes permisos para administrar usuarios.' };
    }

    if (!isBootstrap) {
      const limitDecision = await this.entitlementService.checkLimit(input.businessId, 'users.active_operators');
      if (!limitDecision.allowed) {
        return {
          success: false,
          error: limitDecision.message || 'Límite de usuarios alcanzado en tu plan actual.',
        };
      }
    }

    const rawName = (input.firstName || input.fullName || input.name || '').trim();
    if (!rawName) {
      return { success: false, error: 'El nombre es obligatorio.' };
    }

    let firstName = input.firstName ? input.firstName.trim() : '';
    let lastName = input.lastName !== undefined ? (input.lastName?.trim() || null) : null;

    if (!firstName && (input.fullName || input.name)) {
      const full = (input.fullName || input.name)!.trim();
      const parts = full.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || null;
    }

    if (!isBootstrap && actorUser && validatedRole === 'OWNER' && actorUser.role !== 'OWNER') {
      return { success: false, error: 'Solo un Propietario puede asignar el rol de Propietario.' };
    }

    if (!isBootstrap && actorUser && validatedRole === 'ADMIN' && actorUser.role !== 'OWNER') {
      return { success: false, error: 'Solo un Propietario puede asignar el rol de Administrador.' };
    }

    const pinValidation = this.validatePinFormat(input.pin);
    if (!pinValidation.valid) {
      return { success: false, error: pinValidation.error };
    }

    const isDuplicate = await this.isPinDuplicate(input.businessId, input.pin.trim());
    if (isDuplicate) {
      return { success: false, error: 'Este PIN ya está siendo utilizado por otro usuario.' };
    }

    const nowIso = new Date().toISOString();
    const newUser: User = {
      id: crypto.randomUUID(),
      businessId: input.businessId,
      firstName,
      lastName,
      email: input.email?.trim() || null,
      role: validatedRole,
      active: true,
      cloudUserId: input.cloudUserId || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.userRepository.saveUser(newUser);
    await this.pinVault.savePinCredential(newUser.id, input.pin.trim());

    const actorId = actorUser?.id || 'system';
    const actorName = actorUser ? getUserDisplayName(actorUser) : 'Sistema';
    const actorRole = actorUser?.role || 'OWNER';

    await logAuditEventSafely({
      businessId: input.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'user.created',
      action: 'CREATE',
      severity: 'INFO',
      actorUserId: actorId,
      actorNameSnapshot: actorName,
      actorRoleSnapshot: actorRole,
      deviceId: deviceId || 'local-device',
      entityType: 'user',
      entityId: newUser.id,
      entityLabel: getUserDisplayName(newUser),
      summary: `Usuario ${getUserDisplayName(newUser)} (${formatUserRole(newUser.role)}) creado por ${actorName}`,
      metadata: {
        targetUserId: newUser.id,
        targetUserName: getUserDisplayName(newUser),
        userRole: formatUserRole(newUser.role),
      },
      occurredAt: nowIso,
    });

    return { success: true, user: newUser };
  }

  async updateUser(
    input: UpdateUserInput,
    actorUser: User,
    deviceId?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const targetUser = await this.userRepository.getUserById(input.userId);
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (targetUser.role === 'OWNER' && actorUser.role !== 'OWNER') {
      return { success: false, error: 'Solo un Propietario puede modificar a un Propietario.' };
    }

    if (!PermissionService.can(actorUser.role, 'users.manage')) {
      return { success: false, error: 'No tienes permisos para modificar usuarios.' };
    }

    if (!input.firstName || !input.firstName.trim()) {
      return { success: false, error: 'El nombre es obligatorio.' };
    }

    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...targetUser,
      firstName: input.firstName.trim(),
      lastName: input.lastName !== undefined ? (input.lastName?.trim() || null) : targetUser.lastName,
      email: input.email !== undefined ? (input.email?.trim() || null) : targetUser.email,
      updatedAt: nowIso,
    };

    await this.userRepository.updateUser(updatedUser);

    await logAuditEventSafely({
      businessId: targetUser.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'user.updated',
      action: 'UPDATE',
      severity: 'INFO',
      actorUserId: actorUser.id,
      actorNameSnapshot: getUserDisplayName(actorUser),
      actorRoleSnapshot: actorUser.role,
      deviceId: deviceId || 'local-device',
      entityType: 'user',
      entityId: targetUser.id,
      entityLabel: getUserDisplayName(updatedUser),
      summary: `Usuario ${getUserDisplayName(updatedUser)} actualizado por ${getUserDisplayName(actorUser)}`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserName: getUserDisplayName(updatedUser),
      },
      occurredAt: nowIso,
    });

    return { success: true, user: updatedUser };
  }

  async changeUserRole(
    userId: string,
    newRole: UserRole,
    actorUser: User,
    deviceId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const validatedRole = normalizeUserRole(newRole);
    if (!validatedRole || validatedRole === 'INVALID') {
      return { success: false, error: 'El rol especificado no es válido.' };
    }

    if (actorUser.role !== 'OWNER') {
      return { success: false, error: 'Solo un Propietario puede cambiar los roles de los usuarios.' };
    }

    const targetUser = await this.userRepository.getUserById(userId);
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (targetUser.role === validatedRole) {
      return { success: true };
    }

    // Owner protection invariant: cannot downgrade sole owner
    if (targetUser.role === 'OWNER' && validatedRole !== 'OWNER') {
      const activeOwners = await this.userRepository.getUsersByRole(targetUser.businessId, 'OWNER');
      if (activeOwners.length <= 1) {
        return { success: false, error: 'No puedes cambiar el rol del único Propietario activo del negocio.' };
      }
    }

    const oldRole = targetUser.role;
    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...targetUser,
      role: validatedRole,
      updatedAt: nowIso,
    };

    await this.userRepository.updateUser(updatedUser);

    await logAuditEventSafely({
      businessId: targetUser.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'user.role_changed',
      action: 'UPDATE',
      severity: 'INFO',
      actorUserId: actorUser.id,
      actorNameSnapshot: getUserDisplayName(actorUser),
      actorRoleSnapshot: actorUser.role,
      deviceId: deviceId || 'local-device',
      entityType: 'user',
      entityId: targetUser.id,
      entityLabel: getUserDisplayName(targetUser),
      summary: `Rol de ${getUserDisplayName(targetUser)} cambiado de ${formatUserRole(oldRole)} a ${formatUserRole(validatedRole)}`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserName: getUserDisplayName(targetUser),
        oldRole: formatUserRole(oldRole),
        newRole: formatUserRole(validatedRole),
      },
      occurredAt: nowIso,
    });

    return { success: true };
  }

  async resetUserPin(
    userId: string,
    newPin: string,
    actorUser: User,
    deviceId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!PermissionService.can(actorUser.role, 'users.manage')) {
      return { success: false, error: 'No tienes permisos para restablecer el PIN.' };
    }

    const targetUser = await this.userRepository.getUserById(userId);
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (targetUser.role === 'OWNER' && actorUser.role !== 'OWNER') {
      return { success: false, error: 'Solo un Propietario puede restablecer el PIN de un Propietario.' };
    }

    const pinValidation = this.validatePinFormat(newPin);
    if (!pinValidation.valid) {
      return { success: false, error: pinValidation.error };
    }

    const isDuplicate = await this.isPinDuplicate(targetUser.businessId, newPin.trim(), userId);
    if (isDuplicate) {
      return { success: false, error: 'Este PIN ya está siendo utilizado por otro usuario.' };
    }

    await this.pinVault.savePinCredential(userId, newPin.trim());
    pinLockoutManager.recordSuccess(userId);

    const nowIso = new Date().toISOString();
    await logAuditEventSafely({
      businessId: targetUser.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'user.pin_reset',
      action: 'UPDATE',
      severity: 'INFO',
      actorUserId: actorUser.id,
      actorNameSnapshot: getUserDisplayName(actorUser),
      actorRoleSnapshot: actorUser.role,
      deviceId: deviceId || 'local-device',
      entityType: 'user',
      entityId: targetUser.id,
      entityLabel: getUserDisplayName(targetUser),
      summary: `PIN de ${getUserDisplayName(targetUser)} restablecido por ${getUserDisplayName(actorUser)}`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserName: getUserDisplayName(targetUser),
      },
      occurredAt: nowIso,
    });

    return { success: true };
  }

  async deactivateUser(
    userId: string,
    actorUser: User,
    deviceId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!PermissionService.can(actorUser.role, 'users.manage')) {
      return { success: false, error: 'No tienes permisos para desactivar usuarios.' };
    }

    const targetUser = await this.userRepository.getUserById(userId);
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (!targetUser.active) {
      return { success: true };
    }

    // Owner protection invariant: cannot deactivate sole owner
    if (targetUser.role === 'OWNER') {
      const activeOwners = await this.userRepository.getUsersByRole(targetUser.businessId, 'OWNER');
      if (activeOwners.length <= 1) {
        return { success: false, error: 'No puedes desactivar al único Propietario activo del negocio.' };
      }
      if (actorUser.role !== 'OWNER') {
        return { success: false, error: 'Solo un Propietario puede desactivar a un Propietario.' };
      }
    }

    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...targetUser,
      active: false,
      updatedAt: nowIso,
    };

    await this.userRepository.updateUser(updatedUser);
    if (this.pinVault.removePinCredential) {
      await this.pinVault.removePinCredential(userId);
    }

    await logAuditEventSafely({
      businessId: targetUser.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'user.deactivated',
      action: 'UPDATE',
      severity: 'WARNING',
      actorUserId: actorUser.id,
      actorNameSnapshot: getUserDisplayName(actorUser),
      actorRoleSnapshot: actorUser.role,
      deviceId: deviceId || 'local-device',
      entityType: 'user',
      entityId: targetUser.id,
      entityLabel: getUserDisplayName(targetUser),
      summary: `Usuario ${getUserDisplayName(targetUser)} desactivado por ${getUserDisplayName(actorUser)}`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserName: getUserDisplayName(targetUser),
        userRole: formatUserRole(targetUser.role),
        activeStatus: 'Inactivo',
      },
      occurredAt: nowIso,
    });

    return { success: true };
  }

  async reactivateUser(
    userId: string,
    actorUser: User,
    newPin?: string,
    deviceId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!PermissionService.can(actorUser.role, 'users.manage')) {
      return { success: false, error: 'No tienes permisos para reactivar usuarios.' };
    }

    const limitDecision = await this.entitlementService.checkLimit(actorUser.businessId, 'users.active_operators');
    if (!limitDecision.allowed) {
      return {
        success: false,
        error: limitDecision.message || 'Límite de usuarios alcanzado en tu plan actual.',
      };
    }

    const targetUser = await this.userRepository.getUserById(userId);
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    if (newPin) {
      const pinValidation = this.validatePinFormat(newPin);
      if (!pinValidation.valid) {
        return { success: false, error: pinValidation.error };
      }
      const isDuplicate = await this.isPinDuplicate(targetUser.businessId, newPin.trim(), userId);
      if (isDuplicate) {
        return { success: false, error: 'Este PIN ya está en uso por otro operador en este negocio.' };
      }
      await this.pinVault.savePinCredential(userId, newPin.trim());
    } else {
      const hasPin = await this.pinVault.hasPinCredential(userId);
      if (!hasPin) {
        return { success: false, error: 'Debes ingresar un nuevo PIN para reactivar al usuario.' };
      }
    }

    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...targetUser,
      active: true,
      updatedAt: nowIso,
    };

    await this.userRepository.updateUser(updatedUser);

    await logAuditEventSafely({
      businessId: targetUser.businessId,
      eventCategory: 'SETTINGS',
      eventType: 'user.reactivated',
      action: 'UPDATE',
      severity: 'INFO',
      actorUserId: actorUser.id,
      actorNameSnapshot: getUserDisplayName(actorUser),
      actorRoleSnapshot: actorUser.role,
      deviceId: deviceId || 'local-device',
      entityType: 'user',
      entityId: targetUser.id,
      entityLabel: getUserDisplayName(targetUser),
      summary: `Usuario ${getUserDisplayName(targetUser)} reactivado por ${getUserDisplayName(actorUser)}`,
      metadata: {
        targetUserId: targetUser.id,
        targetUserName: getUserDisplayName(targetUser),
        userRole: formatUserRole(targetUser.role),
        activeStatus: 'Activo',
      },
      occurredAt: nowIso,
    });

    return { success: true };
  }

  async verifyUserPin(
    businessId: string,
    userId: string,
    pin: string,
    deviceId?: string
  ): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    isLockedOut?: boolean;
    remainingSeconds?: number;
  }> {
    const user = await this.userRepository.getUserById(userId);
    if (!user || user.businessId !== businessId || !user.active) {
      return { success: false, error: 'Usuario no disponible o inactivo.' };
    }

    const status = pinLockoutManager.getStatus(userId);
    if (status.isLocked) {
      return {
        success: false,
        error: `Acceso temporalmente bloqueado por demasiados intentos fallidos. Intenta en ${status.remainingSeconds}s.`,
        isLockedOut: true,
        remainingSeconds: status.remainingSeconds,
      };
    }

    const isValid = await this.pinVault.verifyPin(userId, pin);
    if (!isValid) {
      const nextStatus = pinLockoutManager.recordFailedAttempt(userId);

      await logAuditEventSafely({
        businessId,
        eventCategory: 'AUTH',
        eventType: 'user.pin_failed',
        action: 'VERIFY',
        severity: 'WARNING',
        actorUserId: userId,
        actorNameSnapshot: getUserDisplayName(user),
        actorRoleSnapshot: user.role,
        deviceId: deviceId || 'local-device',
        entityType: 'user',
        entityId: userId,
        entityLabel: getUserDisplayName(user),
        summary: `Intento de acceso con PIN fallido para el operador ${getUserDisplayName(user)}`,
        metadata: {
          targetUserId: userId,
          targetUserName: getUserDisplayName(user),
          attemptCount: 5 - nextStatus.attemptsLeft,
        },
        occurredAt: new Date().toISOString(),
      });

      if (nextStatus.isLocked) {
        return {
          success: false,
          error: `Has superado los intentos permitidos. Usuario bloqueado por ${nextStatus.remainingSeconds}s.`,
          isLockedOut: true,
          remainingSeconds: nextStatus.remainingSeconds,
        };
      }

      return {
        success: false,
        error: `PIN incorrecto. Te quedan ${nextStatus.attemptsLeft} intentos.`,
        isLockedOut: false,
      };
    }

    // Success
    pinLockoutManager.recordSuccess(userId);
    const nowIso = new Date().toISOString();
    await this.userRepository.updateLastLogin(userId, nowIso);
    user.lastLoginAt = nowIso;

    await logAuditEventSafely({
      businessId,
      eventCategory: 'AUTH',
      eventType: 'user.session_started',
      action: 'LOGIN',
      severity: 'INFO',
      actorUserId: userId,
      actorNameSnapshot: getUserDisplayName(user),
      actorRoleSnapshot: user.role,
      deviceId: deviceId || 'local-device',
      entityType: 'user',
      entityId: userId,
      entityLabel: getUserDisplayName(user),
      summary: `Sesión de operador iniciada por ${getUserDisplayName(user)} (${formatUserRole(user.role)})`,
      metadata: {
        targetUserId: userId,
        targetUserName: getUserDisplayName(user),
        userRole: formatUserRole(user.role),
      },
      occurredAt: nowIso,
    });

    return { success: true, user };
  }
}
