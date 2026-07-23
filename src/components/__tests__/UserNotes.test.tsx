import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserNotes from '../UserNotes';
import type { UserProfile } from '../../../specs/001-project-task-calendar/contracts/firebase-service';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  PenTool: () => <span>PenToolIcon</span>,
  Plus: () => <span>PlusIcon</span>,
  Search: () => <span>SearchIcon</span>,
  Trash2: () => <span>TrashIcon</span>,
  Save: () => <span>SaveIcon</span>,
  FileText: () => <span>FileTextIcon</span>,
  Check: () => <span>CheckIcon</span>
}));

// Mock Firebase service notes subscription
vi.mock('../../services/firebase', () => ({
  firebaseService: {
    subscribeToUserNotes: vi.fn((_userId, callback) => {
      callback([
        {
          id: 'note-1',
          userId: 'user-1',
          title: 'First Note Title',
          content: 'First note content text body',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'note-2',
          userId: 'user-1',
          title: 'Second Note Title',
          content: 'Second note content here',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      return () => {};
    }),
    saveUserNote: vi.fn(() => Promise.resolve('new-note-id')),
    deleteUserNote: vi.fn(() => Promise.resolve())
  }
}));

describe('UserNotes Component', () => {
  const mockUser: UserProfile = {
    uid: 'user-1',
    email: 'user1@ibermex.com.mx',
    displayName: 'User One',
    role: 'user',
    createdAt: new Date(),
    lastLogin: new Date()
  };

  it('renders search field, notes list, and header buttons', () => {
    render(<UserNotes currentUserProfile={mockUser} />);
    
    expect(screen.getByPlaceholderText('Buscar notas...')).toBeDefined();
    expect(screen.getByText('First Note Title')).toBeDefined();
    expect(screen.getByText('Second Note Title')).toBeDefined();
    expect(screen.getByText('Nueva Nota')).toBeDefined();
  });
});
