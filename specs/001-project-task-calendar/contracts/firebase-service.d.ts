/**
 * TypeScript contracts for Firebase Integration in the Project Task Calendar application.
 */

export interface PreApprovedUser {
  email: string;
  addedAt: Date;
  role: 'master_admin' | 'admin' | 'user';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'master_admin' | 'admin' | 'user';
  createdAt: Date;
  lastLogin: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  assignedUsers: string[]; // Array of User UIDs
  createdBy: string;       // User UID of admin
  createdAt: Date;
}

export interface TaskLabel {
  text: string;
  color: string; // Hex color code
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  dueDate: Date;
  description: string; // HTML/Rich text
  assignedTo?: string; // User UID
  priority: 'high' | 'medium' | 'low';
  labels: TaskLabel[];
  checklist: ChecklistItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  isRecurring?: boolean;
  recurrenceStart?: Date;
  recurrenceEnd?: Date;
  exceptions?: Date[];
}

/**
 * Service wrapper interface for database and auth interactions.
 */
export interface IFirebaseService {
  // Authentication
  loginWithGoogle(): Promise<UserProfile>;
  logout(): Promise<void>;
  getCurrentUser(): UserProfile | null;
  onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void;

  // Pre-approved list (Admin only)
  addPreApprovedUser(email: string, role: 'master_admin' | 'admin' | 'user'): Promise<void>;
  removePreApprovedUser(email: string): Promise<void>;
  getPreApprovedUsers(): Promise<PreApprovedUser[]>;

  // Projects
  createProject(name: string, description?: string, assignedUsers?: string[]): Promise<string>;
  getProjects(): Promise<Project[]>; // Returns all for admin, or filtered list for collaborators
  getProject(projectId: string): Promise<Project | null>;
  updateProjectMembers(projectId: string, assignedUsers: string[]): Promise<void>;
  deleteProject(projectId: string): Promise<void>;

  // Tasks
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<string>;
  updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  subscribeToTasks(projectId: string, callback: (tasks: Task[]) => void): () => void; // Real-time sync listener
}
