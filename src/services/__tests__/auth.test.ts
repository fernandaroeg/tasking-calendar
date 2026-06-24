import { vi, describe, it, expect, beforeEach } from 'vitest';

// Declare hoisted mock functions and objects
const { mockSignOut, mockGetDoc, mockSetDoc, mockUpdateDoc, mockUser } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockUser: {
    uid: 'user123',
    email: 'aprobado@ibermex.com.mx',
    displayName: 'Usuario Aprobado',
    photoURL: 'http://example.com/avatar.jpg'
  }
}));

// Mock Firebase Modules using the hoisted variables
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(async () => ({ user: mockUser })),
  signOut: mockSignOut,
  onAuthStateChanged: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((_db, collection, id) => ({ collection, id })),
  getDoc: mockGetDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  collection: vi.fn((_db, path) => ({ path })),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((d) => ({ toDate: () => d })),
    now: vi.fn(() => ({ toDate: () => new Date() }))
  },
  orderBy: vi.fn()
}));

// Import the service under test after mocks are defined
import { firebaseService } from '../firebase';

describe('Firebase Auth Service - Pre-approved Whitelist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe permitir iniciar sesión con un correo pre-aprobado y crear un perfil', async () => {
    // GIVEN: El documento de pre-aprobación existe y el perfil de usuario no existe
    mockGetDoc.mockImplementation(async (docRef) => {
      if (docRef.collection === 'pre_approved_users' && docRef.id === 'aprobado@ibermex.com.mx') {
        return {
          exists: () => true,
          data: () => ({ role: 'user' })
        };
      }
      if (docRef.collection === 'users' && docRef.id === 'user123') {
        return {
          exists: () => false
        };
      }
      return { exists: () => false };
    });

    // WHEN: Iniciamos sesión
    const profile = await firebaseService.loginWithGoogle();

    // THEN: Se crea el perfil con rol 'user' y se retorna la información correcta
    expect(profile.uid).toBe('user123');
    expect(profile.email).toBe('aprobado@ibermex.com.mx');
    expect(profile.role).toBe('user');
    expect(mockSetDoc).toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('debe denegar el acceso e iniciar logout si el correo no está pre-aprobado', async () => {
    // GIVEN: El documento de pre-aprobación NO existe
    mockGetDoc.mockImplementation(async (docRef) => {
      if (docRef.collection === 'pre_approved_users' && docRef.id === 'aprobado@ibermex.com.mx') {
        return { exists: () => false };
      }
      return { exists: () => false };
    });

    // WHEN & THEN: Se intenta iniciar sesión y debe lanzar un error y cerrar sesión en Firebase Auth
    await expect(firebaseService.loginWithGoogle()).rejects.toThrowError(
      'UNAUTHORIZED: El correo aprobado@ibermex.com.mx no está en la lista de pre-aprobados.'
    );

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
