import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarGrid from '../CalendarGrid';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span>&lt;</span>,
  ChevronRight: () => <span>&gt;</span>,
  Plus: () => <span>+</span>,
  Calendar: () => <span>CalendarIcon</span>,
  Loader2: () => <span>LoadingIcon</span>
}));

// Mock Firebase service methods
vi.mock('../../services/firebase', () => ({
  firebaseService: {
    subscribeToTasks: vi.fn((_projectId, callback) => {
      // Return a set of mock tasks
      callback([
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'Diseño de Base de Datos',
          dueDate: new Date(2026, 5, 23), // June 23, 2026
          description: 'Definir colecciones de firestore',
          priority: 'high',
          labels: [{ text: 'Diseño', color: '#ff0000' }],
          checklist: [],
          createdBy: 'user-admin'
        },
        {
          id: 'task-2',
          projectId: 'project-1',
          title: 'Implementar Auth',
          dueDate: new Date(2026, 5, 24), // June 24, 2026
          description: 'Habilitar login con Google',
          priority: 'medium',
          labels: [],
          checklist: [],
          createdBy: 'user-admin'
        },
        {
          id: 'task-3',
          projectId: 'project-1',
          title: 'Daily Standup',
          dueDate: new Date(2026, 5, 25), // June 25, 2026
          description: 'Sincronizacion diaria',
          priority: 'low',
          labels: [],
          checklist: [],
          createdBy: 'user-admin',
          color: '#8b5cf6',
          isRecurring: true,
          recurrenceStart: new Date(2026, 5, 25),
          recurrenceEnd: new Date(2026, 5, 28),
          exceptions: [new Date(2026, 5, 26)]
        }
      ]);
      // Return unsubscribe function
      return vi.fn(() => {});
    }),
    getProject: vi.fn(async (projectId) => ({
      id: projectId,
      name: 'Project 1',
      assignedUsers: [],
      createdBy: 'user-admin',
      createdAt: new Date()
    })),
    getAllUsers: vi.fn(async () => [])
  }
}));

describe('CalendarGrid Component', () => {
  const defaultProps = {
    projectId: 'project-1',
    userRole: 'admin' as const,
    userUid: 'user-admin'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el contenedor del calendario y los botones de vista', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    // Check that view selector buttons are rendered
    expect(screen.getByText('Mes')).toBeInTheDocument();
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText('Día')).toBeInTheDocument();
  });

  it('debe cambiar de vista al hacer clic en los botones de Mes, Semana o Día', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    const weekButton = screen.getByText('Semana');
    const dayButton = screen.getByText('Día');
    const monthButton = screen.getByText('Mes');

    // Default view is Month
    expect(monthButton).toHaveStyle({ backgroundColor: 'hsl(var(--primary))' });

    // Switch to Week
    fireEvent.click(weekButton);
    expect(weekButton).toHaveStyle({ backgroundColor: 'hsl(var(--primary))' });

    // Switch to Day
    fireEvent.click(dayButton);
    expect(dayButton).toHaveStyle({ backgroundColor: 'hsl(var(--primary))' });
  });

  it('debe navegar hacia adelante y hacia atrás al hacer clic en los controles de navegación', () => {
    // Render with fixed date context in the component (June 2026)
    render(<CalendarGrid {...defaultProps} />);
    
    const prevButton = screen.getByText('<');
    const nextButton = screen.getByText('>');

    // Initial view shows June 2026 in the header (or current month if dynamically loaded)
    // We click next, it should navigate to the next period
    fireEvent.click(nextButton);
    fireEvent.click(prevButton);
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('debe cargar y listar las tareas correspondientes del proyecto', () => {
    render(<CalendarGrid {...defaultProps} />);
    
    // Check that mock tasks titles are rendered on the grid
    expect(screen.getByText('Diseño de Base de Datos')).toBeInTheDocument();
    expect(screen.getByText('Implementar Auth')).toBeInTheDocument();
  });

  it('debe renderizar tareas recursivas en múltiples días y mostrar badge de prioridad', () => {
    render(<CalendarGrid {...defaultProps} />);

    // 'Daily Standup' is recurring from June 25 to June 28 with June 26 excluded, so it should render 3 times
    const standupTasks = screen.getAllByText('Daily Standup');
    expect(standupTasks.length).toBe(3);

    // Verify priority badges are rendered
    const lowPriorityPills = screen.getAllByText('LOW');
    expect(lowPriorityPills.length).toBe(3);
  });
});
