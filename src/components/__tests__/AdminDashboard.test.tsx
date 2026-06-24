import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from '../AdminDashboard';
import { firebaseService } from '../../services/firebase';

// Mock Firebase service methods
vi.mock('../../services/firebase', () => ({
  firebaseService: {
    addPreApprovedUser: vi.fn(async () => {}),
    removePreApprovedUser: vi.fn(async () => {}),
    getPreApprovedUsers: vi.fn(async () => [
      { email: 'admin@ibermex.com.mx', addedAt: new Date(), role: 'admin' },
      { email: 'colab1@ibermex.com.mx', addedAt: new Date(), role: 'user' }
    ]),
    getAllUsers: vi.fn(async () => []),
    getProjects: vi.fn(async () => []),
    updateProjectMembers: vi.fn(async () => {}),
    deleteProject: vi.fn(async () => {}),
    getCurrentUser: vi.fn(() => ({ uid: 'user-admin', email: 'admin@ibermex.com.mx', displayName: 'Admin', role: 'admin' }))
  }
}));

describe('AdminDashboard Component', () => {
  const mockProjects = [
    {
      id: 'project-1',
      name: 'Proyecto Test',
      description: 'Descripción Test',
      assignedUsers: ['admin@ibermex.com.mx'],
      createdBy: 'user-admin',
      createdAt: new Date()
    }
  ];

  const defaultProps = {
    projects: mockProjects,
    onProjectsUpdated: vi.fn(async () => {})
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el panel de administración con la lista de usuarios pre-aprobados', async () => {
    render(<AdminDashboard {...defaultProps} />);
    
    // Verify header title
    expect(screen.getByText('Control de Accesos')).toBeInTheDocument();
    
    // Wait for the mock pre-approved users list to render
    await waitFor(() => {
      expect(screen.getAllByText('admin@ibermex.com.mx')[0]).toBeInTheDocument();
      expect(screen.getAllByText('colab1@ibermex.com.mx')[0]).toBeInTheDocument();
    });
  });

  it('debe permitir agregar un nuevo usuario pre-aprobado', async () => {
    render(<AdminDashboard {...defaultProps} />);
    
    // Fill new email input
    const emailInput = await screen.findByPlaceholderText('correo@empresa.com');
    fireEvent.change(emailInput, { target: { value: 'nuevo@ibermex.com.mx' } });
    
    // Select role
    const roleSelect = screen.getByLabelText('Rol de Usuario');
    fireEvent.change(roleSelect, { target: { value: 'user' } });
    
    // Click Add
    const addButton = screen.getByText('Autorizar Correo');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(firebaseService.addPreApprovedUser).toHaveBeenCalledWith(
        'nuevo@ibermex.com.mx',
        'user'
      );
    });
  });

  it('debe permitir eliminar un usuario pre-aprobado de la lista con confirmación', async () => {
    // Mock global confirm popup
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    
    render(<AdminDashboard {...defaultProps} />);
    
    // Find delete button for first user (colab1@ibermex.com.mx)
    await waitFor(() => {
      expect(screen.getAllByText('colab1@ibermex.com.mx')[0]).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Eliminar de la whitelist');
    fireEvent.click(deleteButtons[0]); // Click first delete button

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(firebaseService.removePreApprovedUser).toHaveBeenCalled();
    });
  });

  it('debe permitir eliminar un proyecto si el nombre de confirmación coincide', async () => {
    // GIVEN: Mock de prompt que coincide
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => 'Proyecto Test');
    const deleteProjectMock = vi.spyOn(firebaseService, 'deleteProject').mockImplementation(async () => {});

    render(<AdminDashboard {...defaultProps} />);

    // WHEN: Damos clic en el botón de eliminar proyecto
    const deleteButton = await screen.findByText('Eliminar Proyecto');
    fireEvent.click(deleteButton);

    // THEN: Se solicita confirmación por prompt y se borra el proyecto
    expect(promptSpy).toHaveBeenCalled();
    expect(deleteProjectMock).toHaveBeenCalledWith('project-1');
  });

  it('no debe eliminar el proyecto si el nombre de confirmación no coincide', async () => {
    // GIVEN: Prompt que no coincide
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => 'Nombre Equivocado');
    const deleteProjectMock = vi.spyOn(firebaseService, 'deleteProject').mockImplementation(async () => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdminDashboard {...defaultProps} />);

    // WHEN: Damos clic en el botón de eliminar proyecto
    const deleteButton = await screen.findByText('Eliminar Proyecto');
    fireEvent.click(deleteButton);

    // THEN: Se cancela la operación y no se invoca deleteProject
    expect(promptSpy).toHaveBeenCalled();
    expect(deleteProjectMock).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('El nombre ingresado no coincide. Operación cancelada.');
  });
});
