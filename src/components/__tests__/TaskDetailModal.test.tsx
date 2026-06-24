import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskDetailModal from '../TaskDetailModal';
import { firebaseService } from '../../services/firebase';

// Mock Firebase service methods
vi.mock('../../services/firebase', () => ({
  firebaseService: {
    createTask: vi.fn(async () => 'new-task-id'),
    updateTask: vi.fn(async () => {}),
    deleteTask: vi.fn(async () => {}),
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
  }
}));

describe('TaskDetailModal Component', () => {
  const mockTask = {
    id: 'task-1',
    projectId: 'project-1',
    title: 'Definir Requerimientos',
    dueDate: new Date(2026, 5, 25),
    description: '<p>Redactar especificaciones del sistema</p>',
    assignedTo: 'user-1',
    priority: 'high' as const,
    labels: [{ text: 'Docs', color: '#00ff00' }],
    checklist: [
      { id: 'sub-1', text: 'Escribir MVP', completed: false },
      { id: 'sub-2', text: 'Revisar con cliente', completed: true }
    ],
    createdBy: 'user-admin',
    createdAt: new Date(),
    updatedAt: new Date()
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
    expect(screen.getByLabelText('Título')).toHaveValue('');
    expect(screen.getByLabelText('Prioridad')).toHaveValue('medium');
  });

  it('debe llamar a createTask al enviar un formulario de nueva tarea válido', async () => {
    render(<TaskDetailModal {...defaultProps} />);
    
    // Fill title
    const titleInput = screen.getByLabelText('Título');
    fireEvent.change(titleInput, { target: { value: 'Nueva Tarea Test' } });
    
    // Submit
    const saveButton = screen.getByText('Guardar Tarea');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(firebaseService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nueva Tarea Test',
          projectId: 'project-1',
          priority: 'medium'
        })
      );
    });
    expect(defaultProps.onSaved).toHaveBeenCalled();
  });

  it('debe cargar los datos en modo edición de tarea', async () => {
    render(<TaskDetailModal {...defaultProps} task={mockTask} />);
    
    expect(screen.getByText('Editar Tarea')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Definir Requerimientos');
    expect(screen.getByLabelText('Prioridad')).toHaveValue('high');
    
    // Verify checklist items render
    expect(screen.getByText('Escribir MVP')).toBeInTheDocument();
    expect(screen.getByText('Revisar con cliente')).toBeInTheDocument();
  });

  it('debe llamar a deleteTask al hacer clic en eliminar tarea y confirmar', async () => {
    // Mock global window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    
    render(<TaskDetailModal {...defaultProps} task={mockTask} />);
    
    const deleteButton = screen.getByText('Eliminar Tarea');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(firebaseService.deleteTask).toHaveBeenCalledWith('task-1');
    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalled();
    });
  });

  it('debe enviar la tarea con color y recurrencia correctos cuando se habilitan', async () => {
    render(<TaskDetailModal {...defaultProps} />);
    
    // Fill title
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Tarea Recurrente Test' } });

    // Enable recurrence checkbox
    const recurrenceCheckbox = screen.getByLabelText('Hacer esta tarea recurrente (Repetir en rango de fechas)');
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
          color: expect.any(String),
          recurrenceStart: expect.any(Date),
          recurrenceEnd: expect.any(Date)
        })
      );
    });
  });

  it('debe filtrar la lista de usuarios asignables para mostrar solo aquellos asignados al proyecto o administradores', async () => {
    render(<TaskDetailModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Admin (admin@ibermex.com.mx)')).toBeInTheDocument();
      expect(screen.getByText('Colaborador 1 (colab1@ibermex.com.mx)')).toBeInTheDocument();
      expect(screen.queryByText('Colaborador 2 (unassigned@ibermex.com.mx)')).not.toBeInTheDocument();
    });
  });

  it('debe agregar la fecha a excepciones en lugar de eliminar la tarea si es recurrente y se especifica la fecha', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const recurringTask = {
      ...mockTask,
      isRecurring: true,
      recurrenceStart: new Date(2026, 5, 25),
      recurrenceEnd: new Date(2026, 5, 28),
      exceptions: []
    };

    render(<TaskDetailModal {...defaultProps} task={recurringTask} initialDate={new Date(2026, 5, 26)} />);
    
    const deleteButton = screen.getByText('Eliminar Tarea');
    fireEvent.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(firebaseService.updateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          exceptions: [expect.any(Date)]
        })
      );
    });
    expect(firebaseService.deleteTask).not.toHaveBeenCalled();
  });
});
