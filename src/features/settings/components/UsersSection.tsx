import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, getUserDisplayName, formatUserRole } from '../../../domain/user/User';
import { repositoryFactory } from '../../../infrastructure/repositories/RepositoryFactory';
import { useAuth } from '../../../context/AuthContext';
import { useOperationalSession } from '../../../context/OperationalSessionContext';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Skeleton } from '../../../components/ui/Skeleton';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { ChangeUserRoleModal } from './ChangeUserRoleModal';
import { ResetUserPinModal } from './ResetUserPinModal';
import { DeactivateUserModal } from './DeactivateUserModal';
import { UpgradePromptModal } from '../../../components/subscription/UpgradePromptModal';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  ShieldAlert,
  KeyRound,
  UserCog,
  UserX,
  UserCheck,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const UsersSection: React.FC = () => {
  const { businessId, activeOwnerName, state, deviceEnrollment } = useAuth();
  const { currentOperator, reloadActiveOperator, can } = useOperationalSession();
  const currentBusinessId = businessId || 'primary-business';
  const currentDeviceId = deviceEnrollment?.deviceId || 'local-device';

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingRoleUser, setChangingRoleUser] = useState<User | null>(null);
  const [resettingPinUser, setResettingPinUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  const opUserService = repositoryFactory.getOperationalUserService();

  const loadUsers = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await opUserService.getUsers(currentBusinessId);
      setUsers(list || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setLoadError('No pudimos cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  }, [currentBusinessId, opUserService]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        setLoadError(null);
        const list = await opUserService.getUsers(currentBusinessId);
        if (isMounted) {
          setUsers(list || []);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
        if (isMounted) {
          setLoadError('No pudimos cargar los usuarios.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentBusinessId, opUserService]);

  const actorUser: User = currentOperator || {
    id: 'temp-actor',
    businessId: currentBusinessId,
    firstName: state?.owner?.firstName || activeOwnerName || 'Propietario',
    lastName: state?.owner?.lastName || undefined,
    email: state?.owner?.email || undefined,
    role: 'OWNER',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleCreateUser = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    pin: string;
  }) => {
    const res = await opUserService.createUser(
      {
        businessId: currentBusinessId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        pin: data.pin,
      },
      actorUser,
      currentDeviceId
    );

    if (res.success) {
      await loadUsers();
    }
    return res;
  };

  const handleUpdateUser = async (data: {
    userId: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  }) => {
    const res = await opUserService.updateUser(
      data,
      actorUser,
      currentDeviceId
    );
    if (res.success) {
      await loadUsers();
      if (currentOperator?.id === data.userId) {
        await reloadActiveOperator();
      }
    }
    return res;
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    const res = await opUserService.changeUserRole(
      userId,
      newRole,
      actorUser,
      currentDeviceId
    );
    if (res.success) {
      await loadUsers();
      if (currentOperator?.id === userId) {
        await reloadActiveOperator();
      }
    }
    return res;
  };

  const handleResetPin = async (userId: string, newPin: string) => {
    const res = await opUserService.resetUserPin(
      userId,
      newPin,
      actorUser,
      currentDeviceId
    );
    return res;
  };

  const handleToggleActive = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'Usuario no encontrado' };

    if (!target.active) {
      const entitlementService = repositoryFactory.getEntitlementService();
      const decision = await entitlementService.checkLimit(currentBusinessId, 'users.active_operators');
      if (!decision.allowed) {
        setIsUpgradeModalOpen(true);
        return { success: false, error: decision.message || 'Límite de usuarios alcanzado' };
      }
    }

    let res;
    if (target.active) {
      res = await opUserService.deactivateUser(userId, actorUser, currentDeviceId);
    } else {
      res = await opUserService.reactivateUser(userId, actorUser, undefined, currentDeviceId);
    }

    if (res.success) {
      await loadUsers();
      if (currentOperator?.id === userId) {
        await reloadActiveOperator();
      }
    } else if (res.error && res.error.includes('Límite')) {
      setIsUpgradeModalOpen(true);
    }
    return res;
  };

  const handleCreateUserClick = async () => {
    const entitlementService = repositoryFactory.getEntitlementService();
    const decision = await entitlementService.checkLimit(currentBusinessId, 'users.active_operators');
    if (!decision.allowed) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setIsCreateOpen(true);
  };

  const formatLastAccess = (isoString?: string | null) => {
    if (!isoString) return 'Sin ingresos aún';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!can('users.manage')) {
    return (
      <div className="text-center py-12 border border-dashed border-status-danger/30 rounded-3xl bg-status-danger/5 p-6 space-y-3 my-4">
        <div className="w-12 h-12 rounded-2xl bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto">
          <ShieldAlert size={24} />
        </div>
        <h4 className="text-sm font-bold text-text-primary">Acceso restringido</h4>
        <p className="text-xs text-text-secondary max-w-sm mx-auto">
          No tienes permiso para acceder a la gestión de usuarios.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">Usuarios y permisos</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Controla quién puede usar SevenPOS y qué acciones puede realizar.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="brand"
            size="md"
            leftIcon={<UserPlus size={15} />}
            onClick={handleCreateUserClick}
            className="w-full sm:w-auto"
          >
            Nuevo usuario
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-surface-secondary/40 border border-border-default rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'users'
              ? 'bg-surface text-text-primary shadow-xs border border-border-default'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <UsersIcon size={14} />
          <span>Operadores ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'roles'
              ? 'bg-surface text-text-primary shadow-xs border border-border-default'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Shield size={14} />
          <span>Roles y permisos</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : loadError ? (
            <div className="text-center py-12 border border-dashed border-status-danger/30 rounded-3xl bg-status-danger/5 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-bold text-text-primary">No pudimos cargar los usuarios</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Ocurrió un problema al leer la base de datos de usuarios. Puedes reintentar la operación.
              </p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => {
                  setIsLoading(true);
                  void loadUsers();
                }}
                className="mx-auto"
              >
                Reintentar
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-default rounded-3xl bg-surface/50 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-secondary text-text-tertiary flex items-center justify-center mx-auto">
                <UsersIcon size={24} />
              </div>
              <h4 className="text-sm font-bold text-text-primary">No hay usuarios registrados</h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Crea el primer operador para autorizar el cobro en caja o la administración del local.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-border-default bg-surface shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-secondary/50 border-b border-border-default text-text-secondary uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Rol</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Último acceso</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/60">
                    {users.map((user) => {
                      return (
                        <tr key={user.id} className="hover:bg-surface-secondary/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={getUserDisplayName(user)} size="md" />
                              <div className="min-w-0">
                                <p className="font-bold text-text-primary truncate">
                                  {getUserDisplayName(user)}
                                  {user.id === currentOperator?.id && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-[10px]">
                                      En sesión
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-text-tertiary truncate">
                                  {user.email || 'Sin correo asociado'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                user.role === 'OWNER'
                                  ? 'brand'
                                  : user.role === 'ADMIN'
                                  ? 'info'
                                  : 'neutral'
                              }
                              size="sm"
                              className="font-medium"
                            >
                              {formatUserRole(user.role)}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={user.active ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {user.active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary font-mono text-[11px]">
                            {formatLastAccess(user.lastLoginAt)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                title="Editar datos"
                                aria-label="Editar usuario"
                                className="text-text-secondary hover:text-text-primary px-2"
                              >
                                <UserCog size={14} />
                              </Button>

                              {actorUser.role === 'OWNER' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setChangingRoleUser(user)}
                                  title="Cambiar rol"
                                  aria-label="Cambiar rol"
                                  className="text-text-secondary hover:text-text-primary px-2"
                                >
                                  <Shield size={14} />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setResettingPinUser(user)}
                                title="Restablecer PIN"
                                aria-label="Restablecer PIN"
                                className="text-text-secondary hover:text-text-primary px-2"
                              >
                                <KeyRound size={14} />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeactivatingUser(user)}
                                title={user.active ? 'Desactivar usuario' : 'Reactivar usuario'}
                                aria-label={user.active ? 'Desactivar' : 'Reactivar'}
                                className={`px-2 ${
                                  user.active
                                    ? 'text-status-danger/70 hover:text-status-danger hover:bg-status-danger/10'
                                    : 'text-status-success/70 hover:text-status-success hover:bg-status-success/10'
                                }`}
                              >
                                {user.active ? <UserX size={14} /> : <UserCheck size={14} />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl border border-border-default bg-surface space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={getUserDisplayName(user)} size="md" />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-text-primary truncate">
                            {getUserDisplayName(user)}
                          </h4>
                          <p className="text-[11px] text-text-tertiary truncate">
                            {user.email || 'Sin correo asociado'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={user.active ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-tertiary">Rol:</span>
                        <Badge
                          variant={
                            user.role === 'OWNER'
                              ? 'brand'
                              : user.role === 'ADMIN'
                              ? 'info'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {formatUserRole(user.role)}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-text-tertiary flex items-center gap-1 font-mono">
                        <Clock size={12} />
                        <span>{user.lastLoginAt ? formatLastAccess(user.lastLoginAt) : 'Sin ingresos'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-border-subtle">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        className="w-full text-xs"
                        leftIcon={<UserCog size={13} />}
                      >
                        Editar
                      </Button>

                      {actorUser.role === 'OWNER' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setChangingRoleUser(user)}
                          className="w-full text-xs"
                          leftIcon={<Shield size={13} />}
                        >
                          Rol
                        </Button>
                      ) : (
                        <div />
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setResettingPinUser(user)}
                        className="w-full text-xs"
                        leftIcon={<KeyRound size={13} />}
                      >
                        PIN
                      </Button>

                      <Button
                        variant={user.active ? 'outline' : 'brand'}
                        size="sm"
                        onClick={() => setDeactivatingUser(user)}
                        className={`w-full text-xs ${user.active ? 'text-status-danger border-status-danger/30' : ''}`}
                      >
                        {user.active ? 'Desact.' : 'Activar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Roles and Permissions Tab */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl border border-brand-primary/20 bg-brand-primary/5 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">Dueño</h4>
                <p className="text-[11px] text-text-secondary">Control absoluto del negocio</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
                <span>Gestión de usuarios y asignación de roles</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
                <span>Configuración general y reglas del negocio</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
                <span>Auditoría completa y trazabilidad de eventos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
                <span>Acceso a costos de compra, márgenes y reportes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
                <span>Operaciones en caja, ventas y anulación</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-3xl border border-border-default bg-surface space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface-secondary text-text-primary flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">Administrador</h4>
                <p className="text-[11px] text-text-secondary">Gestión operativa y financiera</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-status-success shrink-0" />
                <span>Gestión de catálogo, precios e inventario</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-status-success shrink-0" />
                <span>Órdenes de compra y registro de gastos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-status-success shrink-0" />
                <span>Visualización de costos, márgenes y reportes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-status-success shrink-0" />
                <span>Exportación de datos de clientes y ventas</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock size={14} className="text-text-tertiary shrink-0" />
                <span className="text-text-tertiary">Sin acceso a usuarios ni auditoría</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-3xl border border-border-default bg-surface space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface-secondary text-text-primary flex items-center justify-center shrink-0">
                <UsersIcon size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">Cajero</h4>
                <p className="text-[11px] text-text-secondary">Atención en mostrador</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-status-success shrink-0" />
                <span>Venta y cobro en Punto de Venta (POS)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-status-success shrink-0" />
                <span>Apertura y cierre de su propio turno de caja</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-status-success shrink-0" />
                <span>Consulta de productos y stock disponible</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock size={14} className="text-text-tertiary shrink-0" />
                <span className="text-text-tertiary">Costos y márgenes comerciales ocultos</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock size={14} className="text-text-tertiary shrink-0" />
                <span className="text-text-tertiary">Sin acceso a configuración ni gastos</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUserRole={actorUser.role}
        onSave={handleCreateUser}
      />

      <EditUserModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSave={handleUpdateUser}
      />

      <ChangeUserRoleModal
        user={changingRoleUser}
        isOpen={Boolean(changingRoleUser)}
        onClose={() => setChangingRoleUser(null)}
        onSave={handleChangeRole}
      />

      <ResetUserPinModal
        user={resettingPinUser}
        isOpen={Boolean(resettingPinUser)}
        onClose={() => setResettingPinUser(null)}
        onSave={handleResetPin}
      />

      <DeactivateUserModal
        user={deactivatingUser}
        isOpen={Boolean(deactivatingUser)}
        onClose={() => setDeactivatingUser(null)}
        onConfirm={handleToggleActive}
      />

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Límite de operadores alcanzado"
        message="Has alcanzado el límite de 1 usuario incluido en SevenPOS Free. Actualiza a SevenPOS Pro para gestionar hasta 5 operadores con PIN independiente y control de roles."
      />
    </div>
  );
};
