import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import type { UserProfile, Project, Task, PreApprovedUser, Note } from '../../specs/001-project-task-calendar/contracts/firebase-service';

import { getStorage } from 'firebase/storage';

// Firebase client configuration from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Current cached user profile to avoid repeated Firestore lookups
let currentUserProfile: UserProfile | null = null;

const parseFirestoreDate = (field: any): Date => {
  if (!field) return new Date();
  if (typeof field.toDate === 'function') {
    return field.toDate();
  }
  if (field instanceof Date) {
    return field;
  }
  if (typeof field === 'string' || typeof field === 'number') {
    return new Date(field);
  }
  if (field.seconds !== undefined) {
    return new Date(field.seconds * 1000);
  }
  return new Date();
};

export const firebaseService = {
  // Authentication
  async loginWithGoogle(): Promise<UserProfile> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email) {
        throw new Error("No email returned from Google account");
      }

      // Check if user is pre-approved
      const emailLower = user.email.toLowerCase();
      const approvalDocRef = doc(db, 'pre_approved_users', emailLower);
      const approvalDocSnap = await getDoc(approvalDocRef);

      if (!approvalDocSnap.exists()) {
        await signOut(auth);
        throw new Error(`UNAUTHORIZED: El correo ${user.email} no está en la lista de pre-aprobados.`);
      }

      const approvalData = approvalDocSnap.data() as Omit<PreApprovedUser, 'email'>;
      const role = approvalData.role || 'user';

      // Get or create user profile
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const now = new Date();
      let profile: UserProfile;

      if (!userDocSnap.exists()) {
        profile = {
          uid: user.uid,
          email: emailLower,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || undefined,
          role: role,
          createdAt: now,
          lastLogin: now
        };
        await setDoc(userDocRef, {
          ...profile,
          createdAt: Timestamp.fromDate(profile.createdAt),
          lastLogin: Timestamp.fromDate(profile.lastLogin)
        });
      } else {
        const existingData = userDocSnap.data();
        profile = {
          uid: user.uid,
          email: emailLower,
          displayName: user.displayName || existingData.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || existingData.photoURL || undefined,
          role: role, // Sync role from approval list
          createdAt: (existingData.createdAt as Timestamp).toDate(),
          lastLogin: now
        };
        await updateDoc(userDocRef, {
          role: role,
          lastLogin: Timestamp.fromDate(profile.lastLogin),
          displayName: profile.displayName,
          photoURL: profile.photoURL || null
        });
      }

      currentUserProfile = profile;
      return profile;
    } catch (error) {
      console.error("Error in loginWithGoogle:", error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
    currentUserProfile = null;
  },

  getCurrentUser(): UserProfile | null {
    return currentUserProfile;
  },

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    if (currentUserProfile) return currentUserProfile;
    const fbUser = auth.currentUser;
    if (!fbUser) return null;

    try {
      const emailLower = fbUser.email?.toLowerCase();
      if (!emailLower) return null;

      const approvalDocRef = doc(db, 'pre_approved_users', emailLower);
      const approvalDocSnap = await getDoc(approvalDocRef);
      if (!approvalDocSnap.exists()) return null;

      const role = approvalDocSnap.data()?.role || 'user';
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const udata = userDocSnap.data();
        currentUserProfile = {
          uid: fbUser.uid,
          email: emailLower,
          displayName: udata.displayName || fbUser.displayName || emailLower.split('@')[0],
          photoURL: fbUser.photoURL || udata.photoURL || undefined,
          role: role,
          createdAt: parseFirestoreDate(udata.createdAt),
          lastLogin: parseFirestoreDate(udata.lastLogin)
        };
        return currentUserProfile;
      }
    } catch (err) {
      console.error("Error retrieving profile in getCurrentUserProfile:", err);
    }
    return null;
  },

  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    return fbOnAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        currentUserProfile = null;
        callback(null);
        return;
      }

      try {
        const emailLower = fbUser.email?.toLowerCase();
        if (!emailLower) {
          await signOut(auth);
          callback(null);
          return;
        }

        // Fetch approval status
        const approvalDocRef = doc(db, 'pre_approved_users', emailLower);
        const approvalDocSnap = await getDoc(approvalDocRef);

        if (!approvalDocSnap.exists()) {
          await signOut(auth);
          callback(null);
          return;
        }

        const approvalData = approvalDocSnap.data();
        const role = approvalData?.role || 'user';

        // Fetch user profile
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const udata = userDocSnap.data();
          if (udata.role !== role) {
            await updateDoc(userDocRef, { role });
            udata.role = role;
          }
          currentUserProfile = {
            uid: fbUser.uid,
            email: emailLower,
            displayName: udata.displayName || fbUser.displayName || emailLower.split('@')[0],
            photoURL: fbUser.photoURL || udata.photoURL || undefined,
            role: role,
            createdAt: (udata.createdAt as Timestamp).toDate(),
            lastLogin: (udata.lastLogin as Timestamp).toDate()
          };
          callback(currentUserProfile);
        } else {
          // Profile doesn't exist yet but user is logged in (e.g. refresh after auth popup before setDoc completes)
          // We trigger profile creation
          const now = new Date();
          const profile: UserProfile = {
            uid: fbUser.uid,
            email: emailLower,
            displayName: fbUser.displayName || emailLower.split('@')[0],
            photoURL: fbUser.photoURL || undefined,
            role: role,
            createdAt: now,
            lastLogin: now
          };
          await setDoc(userDocRef, {
            ...profile,
            createdAt: Timestamp.fromDate(profile.createdAt),
            lastLogin: Timestamp.fromDate(profile.lastLogin)
          });
          currentUserProfile = profile;
          callback(profile);
        }
      } catch (err) {
        console.error("Error in onAuthStateChanged wrapper:", err);
        callback(null);
      }
    });
  },

  // Pre-approved list (Admin only)
  async addPreApprovedUser(email: string, role: 'master_admin' | 'admin' | 'user'): Promise<void> {
    const emailLower = email.trim().toLowerCase();
    const docRef = doc(db, 'pre_approved_users', emailLower);
    await setDoc(docRef, {
      addedAt: Timestamp.now(),
      role
    });
  },

  async removePreApprovedUser(email: string): Promise<void> {
    const emailLower = email.trim().toLowerCase();
    const docRef = doc(db, 'pre_approved_users', emailLower);
    await deleteDoc(docRef);
  },

  async getPreApprovedUsers(): Promise<PreApprovedUser[]> {
    const colRef = collection(db, 'pre_approved_users');
    const snap = await getDocs(colRef);
    const users: PreApprovedUser[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      users.push({
        email: doc.id,
        addedAt: (data.addedAt as Timestamp).toDate(),
        role: data.role || 'user'
      });
    });
    return users.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  },

  // Users profile list (to assign users to tasks)
  async getAllUsers(): Promise<UserProfile[]> {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    const list: UserProfile[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      list.push({
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL || undefined,
        role: data.role,
        createdAt: (data.createdAt as Timestamp).toDate(),
        lastLogin: (data.lastLogin as Timestamp).toDate()
      });
    });
    return list;
  },

  // Projects
  async createProject(name: string, description?: string, assignedUsers: string[] = []): Promise<string> {
    if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'master_admin')) {
      throw new Error("Only admins can create projects");
    }

    const projectCol = collection(db, 'projects');
    const now = Timestamp.now();
    const docRef = await addDoc(projectCol, {
      name,
      description: description || "",
      assignedUsers,
      createdBy: currentUserProfile.uid,
      createdAt: now
    });
    return docRef.id;
  },

  async getProjects(): Promise<Project[]> {
    if (!currentUserProfile) return [];

    const projectsCol = collection(db, 'projects');
    let q;

    if (currentUserProfile.role === 'admin' || currentUserProfile.role === 'master_admin') {
      // Admin sees all projects
      q = query(projectsCol);
    } else {
      // Collaborator sees only projects where they are assigned (by email)
      q = query(
        projectsCol,
        where('assignedUsers', 'array-contains', currentUserProfile.email)
      );
    }

    const snap = await getDocs(q);
    const projects: Project[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        assignedUsers: data.assignedUsers || [],
        createdBy: data.createdBy,
        createdAt: (data.createdAt as Timestamp).toDate()
      });
    });
    // Sort projects in memory by createdAt descending
    return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getProject(projectId: string): Promise<Project | null> {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      assignedUsers: data.assignedUsers || [],
      createdBy: data.createdBy,
      createdAt: parseFirestoreDate(data.createdAt)
    };
  },

  async updateProjectMembers(projectId: string, assignedUsers: string[]): Promise<void> {
    if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'master_admin')) {
      throw new Error("Only admins can update project members");
    }
    const docRef = doc(db, 'projects', projectId);
    await updateDoc(docRef, { assignedUsers });
  },

  async updateProject(projectId: string, name: string, description?: string): Promise<void> {
    if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'master_admin')) {
      throw new Error("Only admins can update projects");
    }
    const docRef = doc(db, 'projects', projectId);
    await updateDoc(docRef, {
      name,
      description: description || ""
    });
  },

  async deleteProject(projectId: string): Promise<void> {
    if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'master_admin')) {
      throw new Error("Only admins can delete projects");
    }

    // 1. Delete all tasks associated with this project
    const tasksCol = collection(db, 'tasks');
    const q = query(tasksCol, where('projectId', '==', projectId));
    const querySnapshot = await getDocs(q);

    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    await Promise.all(deletePromises);

    // 2. Delete the project document itself
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  },

  // Tasks
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string> {
    const profile = currentUserProfile || await this.getCurrentUserProfile();
    if (!profile) throw new Error("Not authenticated");

    const tasksCol = collection(db, 'tasks');
    const now = Timestamp.now();
    const docRef = await addDoc(tasksCol, {
      projectId: task.projectId,
      title: task.title,
      dueDate: Timestamp.fromDate(task.dueDate),
      description: task.description,
      assignedTo: task.assignedTo || [],
      priority: task.priority,
      labels: task.labels,
      checklist: task.checklist,
      color: task.color || null,
      isRecurring: task.isRecurring || false,
      recurrenceStart: task.recurrenceStart ? Timestamp.fromDate(task.recurrenceStart) : null,
      recurrenceEnd: task.recurrenceEnd ? Timestamp.fromDate(task.recurrenceEnd) : null,
      recurrenceDays: task.recurrenceDays || [],
      exceptions: task.exceptions ? task.exceptions.map(d => Timestamp.fromDate(d)) : [],
      createdBy: profile.uid,
      createdAt: now,
      updatedAt: now,
      completed: false,
      attachments: task.attachments || []
    });
    return docRef.id;
  },

  async updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<void> {
    const profile = currentUserProfile || await this.getCurrentUserProfile();
    if (!profile) throw new Error("Not authenticated");

    const docRef = doc(db, 'tasks', taskId);
    const firestoreUpdates: any = {
      updatedAt: Timestamp.now()
    };

    if (updates.title !== undefined) firestoreUpdates.title = updates.title;
    if (updates.dueDate !== undefined) firestoreUpdates.dueDate = Timestamp.fromDate(updates.dueDate);
    if (updates.description !== undefined) firestoreUpdates.description = updates.description;
    if (updates.priority !== undefined) firestoreUpdates.priority = updates.priority;
    if (updates.labels !== undefined) firestoreUpdates.labels = updates.labels;
    if (updates.checklist !== undefined) firestoreUpdates.checklist = updates.checklist;
    if (updates.color !== undefined) firestoreUpdates.color = updates.color || null;
    if (updates.isRecurring !== undefined) firestoreUpdates.isRecurring = updates.isRecurring;
    if (updates.recurrenceStart !== undefined) firestoreUpdates.recurrenceStart = updates.recurrenceStart ? Timestamp.fromDate(updates.recurrenceStart) : null;
    if (updates.recurrenceEnd !== undefined) firestoreUpdates.recurrenceEnd = updates.recurrenceEnd ? Timestamp.fromDate(updates.recurrenceEnd) : null;
    if (updates.recurrenceDays !== undefined) firestoreUpdates.recurrenceDays = updates.recurrenceDays || [];
    if (updates.exceptions !== undefined) firestoreUpdates.exceptions = updates.exceptions ? updates.exceptions.map(d => Timestamp.fromDate(d)) : [];
    if (updates.completed !== undefined) firestoreUpdates.completed = updates.completed;
    if (updates.completedDates !== undefined) firestoreUpdates.completedDates = updates.completedDates || [];
    if (updates.attachments !== undefined) firestoreUpdates.attachments = updates.attachments || [];

    if (updates.assignedTo !== undefined) {
      firestoreUpdates.assignedTo = updates.assignedTo || [];
    }

    await updateDoc(docRef, firestoreUpdates);
  },

  async deleteTask(taskId: string): Promise<void> {
    if (!currentUserProfile) throw new Error("Not authenticated");
    const docRef = doc(db, 'tasks', taskId);
    await deleteDoc(docRef);
  },

  subscribeToTasks(projectId: string, callback: (tasks: Task[]) => void): () => void {
    const tasksCol = collection(db, 'tasks');
    const q = query(
      tasksCol,
      where('projectId', '==', projectId)
    );

    return onSnapshot(q, (snap) => {
      const tasks: Task[] = [];
      snap.forEach(doc => {
        const data = doc.data();

        // Robust backward-compatibility check for assignedTo (string vs string[])
        let assignedTo: string[] = [];
        if (Array.isArray(data.assignedTo)) {
          assignedTo = data.assignedTo;
        } else if (typeof data.assignedTo === 'string' && data.assignedTo) {
          assignedTo = [data.assignedTo];
        }

        tasks.push({
          id: doc.id,
          projectId: data.projectId,
          title: data.title,
          dueDate: parseFirestoreDate(data.dueDate),
          description: data.description || "",
          assignedTo: assignedTo,
          priority: data.priority || 'medium',
          labels: data.labels || [],
          checklist: data.checklist || [],
          color: data.color || undefined,
          isRecurring: data.isRecurring || false,
          recurrenceStart: data.recurrenceStart ? parseFirestoreDate(data.recurrenceStart) : undefined,
          recurrenceEnd: data.recurrenceEnd ? parseFirestoreDate(data.recurrenceEnd) : undefined,
          recurrenceDays: data.recurrenceDays || [],
          exceptions: data.exceptions ? data.exceptions.map((ts: any) => parseFirestoreDate(ts)) : [],
          createdBy: data.createdBy,
          createdAt: parseFirestoreDate(data.createdAt || data.updatedAt || data.dueDate),
          updatedAt: parseFirestoreDate(data.updatedAt),
          completed: data.completed || false,
          completedDates: data.completedDates || [],
          attachments: data.attachments || []
        });
      });
      // Sort in memory by createdAt to show them in the order they were created
      tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      callback(tasks);
    }, (error) => {
      console.error(`Error subscribing to tasks for project ${projectId}:`, error);
    });
  },

  subscribeToAllTasks(callback: (tasks: Task[]) => void): () => void {
    const tasksCol = collection(db, 'tasks');

    return onSnapshot(tasksCol, (snap) => {
      const tasks: Task[] = [];
      snap.forEach(doc => {
        const data = doc.data();

        // Robust backward-compatibility check for assignedTo (string vs string[])
        let assignedTo: string[] = [];
        if (Array.isArray(data.assignedTo)) {
          assignedTo = data.assignedTo;
        } else if (typeof data.assignedTo === 'string' && data.assignedTo) {
          assignedTo = [data.assignedTo];
        }

        tasks.push({
          id: doc.id,
          projectId: data.projectId,
          title: data.title,
          dueDate: parseFirestoreDate(data.dueDate),
          description: data.description || "",
          assignedTo: assignedTo,
          priority: data.priority || 'medium',
          labels: data.labels || [],
          checklist: data.checklist || [],
          color: data.color || undefined,
          isRecurring: data.isRecurring || false,
          recurrenceStart: data.recurrenceStart ? parseFirestoreDate(data.recurrenceStart) : undefined,
          recurrenceEnd: data.recurrenceEnd ? parseFirestoreDate(data.recurrenceEnd) : undefined,
          recurrenceDays: data.recurrenceDays || [],
          exceptions: data.exceptions ? data.exceptions.map((ts: any) => parseFirestoreDate(ts)) : [],
          createdBy: data.createdBy,
          createdAt: parseFirestoreDate(data.createdAt || data.updatedAt || data.dueDate),
          updatedAt: parseFirestoreDate(data.updatedAt),
          completed: data.completed || false,
          completedDates: data.completedDates || [],
          attachments: data.attachments || []
        });
      });
      // Sort in memory by createdAt to show them in the order they were created
      tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      callback(tasks);
    }, (error) => {
      console.error("Error subscribing to all tasks:", error);
    });
  },

  // Notes CRUD
  subscribeToUserNotes(userId: string, callback: (notes: Note[]) => void): () => void {
    const q = query(
      collection(db, 'user_notes'),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const notes: Note[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        notes.push({
          id: docSnap.id,
          userId: data.userId,
          title: data.title || '',
          content: data.content || '',
          createdAt: parseFirestoreDate(data.createdAt || data.updatedAt),
          updatedAt: parseFirestoreDate(data.updatedAt)
        });
      });
      // Sort notes by updatedAt descending in memory
      notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      callback(notes);
    }, (error) => {
      console.error("Error subscribing to user notes:", error);
      callback([]);
    });
  },

  async saveUserNote(note: { id?: string; userId: string; title: string; content: string }): Promise<string> {
    const { id, userId, title, content } = note;
    const now = new Date();
    
    if (id) {
      // Update existing note
      const docRef = doc(db, 'user_notes', id);
      await updateDoc(docRef, {
        title,
        content,
        updatedAt: now
      });
      return id;
    } else {
      // Create new note
      const colRef = collection(db, 'user_notes');
      const docRef = await addDoc(colRef, {
        userId,
        title,
        content,
        createdAt: now,
        updatedAt: now
      });
      return docRef.id;
    }
  },

  async deleteUserNote(noteId: string): Promise<void> {
    const docRef = doc(db, 'user_notes', noteId);
    await deleteDoc(docRef);
  }
};

export const getUserColor = (email: string): string => {
  const emailLower = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < emailLower.length; i++) {
    hash = ((hash << 5) - hash) + emailLower.charCodeAt(i);
  }
  const colors = [
    '#FF6A52', // Ibermex Brand Coral Red
    '#D97706', // Amber
    '#F59E0B', // Yellow
    '#6B7280'  // Gray
  ];
  return colors[Math.abs(hash) % colors.length];
};
