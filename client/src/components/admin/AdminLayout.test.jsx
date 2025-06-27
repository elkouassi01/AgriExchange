// tests/components/admin/AdminLayout.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import AdminLayout from '../../../src/components/admin/AdminLayout';
import { useAdminAuth } from '../../../src/contexts/AdminAuthContext';

// Mocks
vi.mock('../../../src/components/admin/AdminSidebar', () => ({
  default: () => <div data-testid="admin-sidebar" />
}));

vi.mock('../../../src/components/admin/AdminHeader', () => ({
  default: ({ admin, onLogout }) => (
    <div data-testid="admin-header">
      <div>{admin?.name}</div>
      <button onClick={onLogout}>Déconnexion</button>
    </div>
  )
}));

vi.mock('../../../src/contexts/AdminAuthContext', () => ({
  useAdminAuth: vi.fn()
}));

describe('Composant AdminLayout', () => {
  const mockAdmin = { name: 'Admin Test' };
  const mockLogout = vi.fn();

  beforeEach(() => {
    useAdminAuth.mockReturnValue({
      admin: mockAdmin,
      logout: mockLogout
    });
  });

  it('s\'affiche correctement sans erreur', () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );
    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
  });

  it('contient tous les composants principaux', () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('admin-header')).toBeInTheDocument();
    expect(screen.getByText('Admin Test')).toBeInTheDocument();
  });

  // Ajoutez d'autres tests ici...
});