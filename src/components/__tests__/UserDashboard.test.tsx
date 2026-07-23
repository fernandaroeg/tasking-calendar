import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserDashboard from '../UserDashboard';
import type { UserProfile, Project } from '../../../specs/001-project-task-calendar/contracts/firebase-service';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: () => <span>LayoutDashboardIcon</span>,
  CheckCircle2: () => <span>CheckCircleIcon</span>,
  AlertTriangle: () => <span>AlertIcon</span>,
  ListTodo: () => <span>ListTodoIcon</span>,
  Folder: () => <span>FolderIcon</span>,
  Plus: () => <span>PlusIcon</span>,
  X: () => <span>XIcon</span>,
  FolderOpen: () => <span>FolderOpenIcon</span>,
  MoreVertical: () => <span>MoreIcon</span>
}));

// Mock Firebase service
vi.mock('../../services/firebase', () => ({
  firebaseService: {
    subscribeToAllTasks: vi.fn((callback) => {
      const nextYear = new Date().getFullYear() + 1;
      callback([
        {
          id: 'task-1',
          projectId: 'project-1',
          title: 'My Task 1',
          dueDate: new Date(nextYear, 6, 23, 9, 0),
          description: 'A task description',
          priority: 'high',
          assignedTo: ['user-1'],
          completed: false,
          createdBy: 'user-admin',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'task-2',
          projectId: 'project-1',
          title: 'My Task 2',
          dueDate: new Date(nextYear, 6, 24, 10, 0),
          description: 'Another task',
          priority: 'medium',
          assignedTo: ['user-1'],
          completed: true,
          createdBy: 'user-admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      return () => {};
    }),
    updateTask: vi.fn(() => Promise.resolve())
  }
}));

describe('UserDashboard Component', () => {
  const mockUser: UserProfile = {
    uid: 'user-1',
    email: 'user1@ibermex.com.mx',
    displayName: 'User One',
    role: 'user',
    createdAt: new Date(),
    lastLogin: new Date()
  };

  const mockProjects: Project[] = [
    {
      id: 'project-1',
      name: 'Project One',
      assignedUsers: ['user-1'],
      createdBy: 'user-admin',
      createdAt: new Date()
    }
  ];

  it('renders stats card totals correctly', () => {
    render(<UserDashboard currentUserProfile={mockUser} projects={mockProjects} />);
    
    expect(screen.getByText('Tareas Asignadas')).toBeDefined();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('lists pending tasks correctly', () => {
    render(<UserDashboard currentUserProfile={mockUser} projects={mockProjects} />);
    
    expect(screen.getByText('My Task 1')).toBeDefined();
    expect(screen.getByText('Project One')).toBeDefined();
  });
});
