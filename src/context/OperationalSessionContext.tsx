import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, getUserDisplayName } from '../domain/user/User';
import { Permission, PermissionService } from '../domain/auth/Permissions';
import { useAuth } from './AuthContext';
import { repositoryFactory } from '../infrastructure/repositories/RepositoryFactory';
import { logAuditEventSafely } from '../application/audit/auditEventHelper';

export interface OperationalSessionContextType {
  currentOperator: User | null;
  activeRole: UserRole;
  permissions: readonly Permission[];
  can: (permission: Permission) => boolean;
  hasAny: (permissions: Permission[]) => boolean;
  hasAll: (permissions: Permission[]) => boolean;
  isFastSwitchModalOpen: boolean;
  openFastSwitchModal: () => void;
  closeFastSwitchModal: () => void;
  verifyAndSwitchOperator: (
    userId: string,
    pin: string
  ) => Promise<{ success: boolean; error?: string; isLockedOut?: boolean; remainingSeconds?: number }>;
  reloadActiveOperator: () => Promise<void>;
}

const OperationalSessionContext = createContext<OperationalSessionContextType | undefined>(undefined);

export const OperationalSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { businessId, state, sessionStatus, deviceEnrollment, activeOwnerName } = useAuth();
  const [currentOperator, setCurrentOperator] = useState<User | null>(null);
  const [isFastSwitchModalOpen, setIsFastSwitchModalOpen] = useState(false);

  const userRepo = repositoryFactory.getUserRepository();
  const opUserService = repositoryFactory.getOperationalUserService();
  const currentDeviceId = deviceEnrollment?.deviceId || 'local-device';

  // Hydrate initial operator as OWNER on boot/unlock
  useEffect(() => {
    let isMounted = true;

    const hydrateInitialOperator = async () => {
      if (sessionStatus !== 'unlocked') {
        setCurrentOperator(null);
        return;
      }

      try {
        const owner = await userRepo.getOwnerUser();
        if (isMounted && owner) {
          setCurrentOperator((prev) => {
            // Keep existing switched operator if still valid and same business
            if (prev && prev.businessId === owner.businessId && prev.active) {
              return prev;
            }
            return owner;
          });
        } else if (isMounted && (state?.owner?.firstName || activeOwnerName)) {
          // Fallback user from state if DB owner not yet loaded
          setCurrentOperator({
            id: 'owner-session',
            businessId: businessId || 'primary-business',
            firstName: state?.owner?.firstName || activeOwnerName || 'Propietario',
            lastName: state?.owner?.lastName || undefined,
            email: state?.owner?.email || undefined,
            role: 'OWNER',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('[OperationalSession] Error hydrating operator:', err);
      }
    };

    hydrateInitialOperator();

    return () => {
      isMounted = false;
    };
  }, [
    sessionStatus,
    businessId,
    state?.owner?.firstName,
    state?.owner?.lastName,
    state?.owner?.email,
    activeOwnerName,
    userRepo,
  ]);

  const reloadActiveOperator = useCallback(async () => {
    if (!currentOperator) return;
    const fresh = await userRepo.getUserById(currentOperator.id);
    if (fresh && fresh.active) {
      setCurrentOperator(fresh);
    } else {
      const owner = await userRepo.getOwnerUser();
      setCurrentOperator(owner);
    }
  }, [currentOperator, userRepo]);

  const activeRole: UserRole = currentOperator
    ? (currentOperator.active ? currentOperator.role : 'INVALID')
    : 'OWNER';
  const permissions = PermissionService.getPermissionsForRole(activeRole);

  const can = useCallback(
    (permission: Permission): boolean => {
      if (currentOperator && !currentOperator.active) return false;
      return PermissionService.can(activeRole, permission);
    },
    [activeRole, currentOperator]
  );

  const hasAny = useCallback(
    (perms: Permission[]): boolean => {
      return PermissionService.hasAny(activeRole, perms);
    },
    [activeRole]
  );

  const hasAll = useCallback(
    (perms: Permission[]): boolean => {
      return PermissionService.hasAll(activeRole, perms);
    },
    [activeRole]
  );

  const openFastSwitchModal = () => setIsFastSwitchModalOpen(true);
  const closeFastSwitchModal = () => setIsFastSwitchModalOpen(false);

  const verifyAndSwitchOperator = async (
    userId: string,
    pin: string
  ): Promise<{ success: boolean; error?: string; isLockedOut?: boolean; remainingSeconds?: number }> => {
    const activeBizId = businessId || 'primary-business';
    const previousOperator = currentOperator;

    const res = await opUserService.verifyUserPin(activeBizId, userId, pin, currentDeviceId);
    if (!res.success || !res.user) {
      return res;
    }

    // Switch active operator
    setCurrentOperator(res.user);
    setIsFastSwitchModalOpen(false);

    if (previousOperator && previousOperator.id !== res.user.id) {
      await logAuditEventSafely({
        businessId: activeBizId,
        eventCategory: 'AUTH',
        eventType: 'user.session_ended',
        action: 'LOGOUT',
        severity: 'INFO',
        actorUserId: previousOperator.id,
        actorNameSnapshot: getUserDisplayName(previousOperator),
        actorRoleSnapshot: previousOperator.role,
        deviceId: currentDeviceId,
        entityType: 'user',
        entityId: previousOperator.id,
        entityLabel: getUserDisplayName(previousOperator),
        summary: `Sesión de ${getUserDisplayName(previousOperator)} finalizada por cambio de operador a ${getUserDisplayName(res.user)}`,
        metadata: {
          targetUserId: previousOperator.id,
          targetUserName: getUserDisplayName(previousOperator),
          newOperatorId: res.user.id,
          newOperatorName: getUserDisplayName(res.user),
        },
        occurredAt: new Date().toISOString(),
      });
    }

    return { success: true };
  };

  return (
    <OperationalSessionContext.Provider
      value={{
        currentOperator,
        activeRole,
        permissions,
        can,
        hasAny,
        hasAll,
        isFastSwitchModalOpen,
        openFastSwitchModal,
        closeFastSwitchModal,
        verifyAndSwitchOperator,
        reloadActiveOperator,
      }}
    >
      {children}
    </OperationalSessionContext.Provider>
  );
};

export const useOperationalSession = (): OperationalSessionContextType => {
  const context = useContext(OperationalSessionContext);
  if (!context) {
    throw new Error('useOperationalSession must be used within an OperationalSessionProvider');
  }
  return context;
};
