import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskDetailModal from '../TaskDetailModal';
import { firebaseService } from '../../services/firebase';

// Mock Firebase service methods
vi.mock('../../services/firebase', () => ({
  firebaseService: {
    createTask: vi.fn(async () => 'new-task-id'),
    updateTask: vi.fn(async () => { }),
    deleteTask: vi.fn(async () => { }),
    getProject: vi.fn(async (projectId) => ({
      id: projectId,
      name: 'Project 1',
      assignedUsers: ['colab1@ibermex.com.mx'],
      createdBy: 'user-admin',
      createdAt: new Date()
    })),
    getAllUsers: vi.fn(async () => [
      { uid: 'user-1', email: 'colab1@ibermex.com.mx', displayName: 'Colaborador 1', role: 'user' },
      { uid: 'user-2', email: 'unassigned@ibermex.com.mx', displayName: 'Colaborador 2', role: 'user' },
      { uid: 'user-admin', email: 'admin@ibermex.com.mx', displayName: 'Admin', role: 'admin' }
    ])
  },
  getUserColor: vi.fn(() => '#FF6A52')
}));

describe('TaskDetailModal Component', () => {
  const mockTask = {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Definir Requerimientos',
    dueDate: new Date(2026, 5, 25, 9, 0),
    description: '<p>Redactar especificaciones del sistema</p>',
    assignedTo: ['user-1'],
    priority: 'high' as const,
    labels: [{ text: 'Docs', color: '#00ff00' }],
    checklist: [],
    createdBy: 'user-admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    attachments: [{ name: 'Plan Cimientos', url: 'http://example.com/plan.pdf' }]
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    task: null, // Creation mode
    initialDate: new Date(2026, 5, 23),
    projectId: 'project-1',
    userRole: 'admin' as const,
    onSaved: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el formulario de creación de tarea con campos vacíos', async () => {
    render(<TaskDetailModal {...defaultProps} />);

    expect(screen.getByText('Nueva Tarea')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la tarea')).toHaveValue('');
  });

  it('debe llamar a createTask al enviar un formulario de nueva tarea válido', async () => {
    render(<TaskDetailModal {...defaultProps} />);

    // Fill title
    const titleInput = screen.getByLabelText('Nombre de la tarea');
    fireEvent.change(titleInput, { target: { value: 'Nueva Tarea Test' } });

    // Submit
    const saveButton = screen.getByText('Guardar Tarea');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(firebaseService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nueva Tarea Test',
          projectId: 'project-1'
        })
      );
    });
    expect(defaultProps.onSaved).toHaveBeenCalled();
  });

  it('debe cargar los datos en modo edición de tarea', async () => {
    render(<TaskDetailModal {...defaultProps} task={mockTask} />);

    expect(screen.getByText('Detalle de Tarea')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre de la tarea')).toHaveValue('Definir Requerimientos');
    expect(screen.getByText(/Plan Cimientos/)).toBeInTheDocument();
  });

  it('debe enviar la tarea con recurrencia correcta cuando se habilita', async () => {
    render(<TaskDetailModal {...defaultProps} />);

    // Fill title
    fireEvent.change(screen.getByLabelText('Nombre de la tarea'), { target: { value: 'Tarea Recurrente Test' } });

    // Enable recurrence checkbox
    const recurrenceCheckbox = screen.getByLabelText('Hacer esta tarea recurrente (Repetir en días seleccionados)');
    fireEvent.click(recurrenceCheckbox);

    // Enter start and end dates
    const startInput = screen.getByLabelText('Fecha de Inicio');
    const endInput = screen.getByLabelText('Fecha de Fin');
    fireEvent.change(startInput, { target: { value: '2026-06-25' } });
    fireEvent.change(endInput, { target: { value: '2026-06-30' } });

    // Submit
    const saveButton = screen.getByText('Guardar Tarea');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(firebaseService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Tarea Recurrente Test',
          isRecurring: true,
          recurrenceStart: expect.any(Date),
          recurrenceEnd: expect.any(Date)
        })
      );
    });
  });

  it('debe filtrar la lista de usuarios asignables para mostrar solo aquellos asignados al proyecto o administradores', async () => {
    render(<TaskDetailModal {...defaultProps} />);

    // Click the toggle button to expand the dropdown list of users
    const elegirButton = screen.getByText('Elegir');
    fireEvent.click(elegirButton);

    await waitFor(() => {
      expect(screen.getByText('Admin (admin@ibermex.com.mx)')).toBeInTheDocument();
      expect(screen.getByText('Colaborador 1 (colab1@ibermex.com.mx)')).toBeInTheDocument();
      expect(screen.queryByText('Colaborador 2 (unassigned@ibermex.com.mx)')).not.toBeInTheDocument();
    });
  });
});
