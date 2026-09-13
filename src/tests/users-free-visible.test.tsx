import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CreateUserModal } from '../features/settings/components/CreateUserModal';
import { EditUserModal } from '../features/settings/components/EditUserModal';
import { ChangeUserRoleModal } from '../features/settings/components/ChangeUserRoleModal';
import { ResetUserPinModal } from '../features/settings/components/ResetUserPinModal';
import { DeactivateUserModal } from '../features/settings/components/DeactivateUserModal';
import { User } from '../domain/user/User';

describe('AG-13B: Users Modals & Free Plan Accessibility Contract', () => {
  const dummyUser: User = {
    id: 'usr-1',
    businessId: 'biz-01',
    role: 'CASHIER',
    firstName: 'Carlos',
    lastName: 'Cajero',
    email: 'carlos@tienda.com',
    active: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  it('renders CreateUserModal with role selection and PIN fields', () => {
    const html = renderToString(
      <CreateUserModal
        isOpen={true}
        currentUserRole="OWNER"
        onClose={() => {}}
        onSave={async () => ({ success: true })}
      />
    );
    expect(html).toContain('Nuevo usuario');
    expect(html).toContain('Cajero');
    expect(html).toContain('Administrador');
    expect(html).toContain('PIN de operador (4–6 dígitos)');
  });

  it('renders EditUserModal with name and email fields', () => {
    const html = renderToString(
      <EditUserModal
        isOpen={true}
        user={dummyUser}
        onClose={() => {}}
        onSave={async () => ({ success: true })}
      />
    );
    expect(html).toContain('Editar usuario');
    expect(html).toContain('Carlos');
    expect(html).toContain('Cajero');
  });

  it('renders ChangeUserRoleModal with role selection options', () => {
    const html = renderToString(
      <ChangeUserRoleModal
        isOpen={true}
        user={dummyUser}
        onClose={() => {}}
        onSave={async () => ({ success: true })}
      />
    );
    expect(html).toContain('Cambiar rol de usuario');
    expect(html).toContain('Dueño');
    expect(html).toContain('Administrador');
    expect(html).toContain('Cajero');
  });

  it('renders ResetUserPinModal with PIN keypad/input fields', () => {
    const html = renderToString(
      <ResetUserPinModal
        isOpen={true}
        user={dummyUser}
        onClose={() => {}}
        onSave={async () => ({ success: true })}
      />
    );
    expect(html).toContain('Restablecer PIN');
    expect(html).toContain('Nuevo PIN (4–6 dígitos)');
  });

  it('renders DeactivateUserModal with confirmation message', () => {
    const html = renderToString(
      <DeactivateUserModal
        isOpen={true}
        user={dummyUser}
        onClose={() => {}}
        onConfirm={async () => ({ success: true })}
      />
    );
    expect(html).toContain('Desactivar usuario');
    expect(html).toContain('Carlos Cajero');
  });
});
