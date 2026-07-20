import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Calendar as CalendarIcon, ShieldAlert, Folder, Plus, Users, Loader2, X, Check, ChevronLeft, ChevronRight, LayoutDashboard, Menu } from 'lucide-react';
import { firebaseService } from './services/firebase';
import type { UserProfile, Project, PreApprovedUser } from '../specs/001-project-task-calendar/contracts/firebase-service';
import CalendarGrid from './components/CalendarGrid';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './components/Dashboard';
import logoIbermex2025 from './assets/logo_ibermex_2025.png';
import ibermexIso4 from './assets/Ibermex-Iso_4.png';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'calendar' | 'admin' | 'dashboard'>('calendar');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Project creation modal states
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [whitelist, setWhitelist] = useState<PreApprovedUser[]>([]);
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
  const [submittingProject, setSubmittingProject] = useState(false);

  // 1. Subscribe to Auth state changes
  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChanged((profile) => {
      setUser(profile);
      setLoading(false);
      if (profile) {
        setAuthError(null);
        loadProjects();
        loadAllRegisteredUsers();
        loadWhitelist();
      } else {
        setProjects([]);
        setSelectedProjectId('');
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch projects list
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const list = await firebaseService.getProjects();
      setProjects(list);
      if (list.length > 0) {
        // Keep selection if it exists and is still in list, else select first
        setSelectedProjectId((prev) => {
          const stillExists = list.some(p => p.id === prev);
          return stillExists ? prev : list[0].id;
        });
      } else {
        setSelectedProjectId('');
      }
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  // 3. Load all registered users (for project assignments in Admin panel)
  const loadAllRegisteredUsers = async () => {
    try {
      const list = await firebaseService.getAllUsers();
      setRegisteredUsers(list);
    } catch (err) {
      console.error("Error loading registered users:", err);
    }
  };

  // 3b. Load whitelist users (for project creation assignments)
  const loadWhitelist = async () => {
    try {
      const list = await firebaseService.getPreApprovedUsers();
      setWhitelist(list);
    } catch (err) {
      console.error("Error loading whitelist:", err);
    }
  };

  // 4. Handle Login with Google popup
  const handleLogin = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await firebaseService.loginWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      // Clean up firebase UI loading state
      setLoading(false);
      // Display clean error details to user
      if (err.message && err.message.includes("UNAUTHORIZED")) {
        setAuthError(err.message);
      } else {
        setAuthError(`Error de Firebase: ${err.message || err.code || JSON.stringify(err)}`);
      }
    }
  };

  // 5. Handle Sign Out
  const handleLogout = async () => {
    setLoading(true);
    try {
      await firebaseService.logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle project submission
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setSubmittingProject(true);
    try {
      await firebaseService.createProject(
        newProjectName.trim(),
        newProjectDesc.trim(),
        selectedUserUids
      );
      // Reset forms
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedUserUids([]);
      setShowCreateProjectModal(false);
      // Reload projects list
      await loadProjects();
    } catch (err) {
      console.error("Error creating project:", err);
      alert("Error al crear el proyecto. Asegúrate de tener permisos.");
    } finally {
      setSubmittingProject(false);
    }
  };

  const toggleUserAssignment = (uid: string) => {
    setSelectedUserUids((prev) =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Loading indicator screen
  if (loading) {
    return (
      <div className="auth-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="text-gradient" size={48} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Cargando Calendario Ibermex...</p>
      </div>
    );
  }

  // Login view
  if (!user) {
    return (
      <div className="auth-container">
        <div className="glass-panel auth-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <img src={logoIbermex2025} alt="Ibermex Logo" style={{ height: '64px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '2.5rem', margin: '0 0 0.25rem', fontWeight: 800, color: 'var(--text-h)', letterSpacing: '-0.02em' }}>Task Calendar</h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'hsl(var(--primary))', fontSize: '1.1rem', margin: '0 0 1.25rem', fontWeight: 600 }}>
            "Construyendo el Futuro con los Mejores Cimientos"
          </p>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Sistema de planificación de tareas
          </p>

          {authError && (
            <div className="glass-panel" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', marginBottom: '1.5rem', borderColor: 'rgba(255, 68, 68, 0.4)', background: 'rgba(255, 68, 68, 0.08)', color: 'var(--priority-high)', textAlign: 'left', borderRadius: 'var(--radius)' }}>
              <ShieldAlert size={24} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{authError}</span>
            </div>
          )}

          <button className="btn-primary" style={{ width: '100%', gap: '0.75rem', padding: '0.85rem' }} onClick={handleLogin}>
            <LogIn size={20} />
            Iniciar Sesión con Google
          </button>

          {/*<p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '2rem' }}>
            Acceso restringido únicamente a direcciones de correo pre-aprobadas.
          </p>*/}
        </div>
      </div>
    );
  }

  // Dashboard view
  const activeProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', marginBottom: '2rem', width: '100%', flexDirection: sidebarCollapsed ? 'column' : 'row', gap: sidebarCollapsed ? '0.5rem' : 'unset' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={ibermexIso4} alt="Ibermex Iso" style={{ width: '28px', height: '28px', flexShrink: 0, objectFit: 'contain' }} />
            {!sidebarCollapsed && (
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-h)', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                Ibermex Cal
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="btn-icon"
            style={{ padding: '0.25rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'hsl(var(--card))' }}
            title={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* User Card */}
        <div className="glass-panel" style={{ padding: sidebarCollapsed ? '0.5rem' : '1rem', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '0.75rem', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.displayName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                <span className={`badge ${user.role === 'admin' || user.role === 'master_admin' ? 'badge-admin' : ''}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                  {user.role === 'master_admin' ? 'Master Admin' : user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '2rem', width: '100%' }}>
          <button
            className={`project-item ${activeTab === 'calendar' && selectedProjectId === 'all' ? 'active' : ''}`}
            onClick={() => {
              setSelectedProjectId('all');
              setActiveTab('calendar');
            }}
            style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '0.6rem' : '0.75rem 1rem' }}
            title={sidebarCollapsed ? "Mi Calendario" : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CalendarIcon size={18} style={{ flexShrink: 0 }} />
              {!sidebarCollapsed && <span>Mi Calendario</span>}
            </div>
          </button>

          {(user.role === 'admin' || user.role === 'master_admin') && (
            <>
              <button
                className={`project-item ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
                style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '0.6rem' : '0.75rem 1rem' }}
                title={sidebarCollapsed ? "Administración" : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Users size={18} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && <span>Administración</span>}
                </div>
              </button>

              <button
                className={`project-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
                style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '0.6rem' : '0.75rem 1rem' }}
                title={sidebarCollapsed ? "Dashboard" : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <LayoutDashboard size={18} style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </div>
              </button>
            </>
          )}
        </nav>

        {/* Projects list */}
        {!sidebarCollapsed ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', width: '100%' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proyectos</span>
            {(user.role === 'admin' || user.role === 'master_admin') && (
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', padding: '0.25rem', borderRadius: '50%' }}
                onClick={() => setShowCreateProjectModal(true)}
                title="Crear Nuevo Proyecto"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', width: '100%' }}>
            {(user.role === 'admin' || user.role === 'master_admin') && (
              <button
                style={{ background: 'var(--primary)', border: 'none', color: 'var(--primary-foreground)', cursor: 'pointer', display: 'flex', padding: '0.4rem', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                onClick={() => setShowCreateProjectModal(true)}
                title="Crear Nuevo Proyecto"
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        )}

        {projectsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', width: '100%' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--muted-foreground)' }} />
          </div>
        ) : (
          <div className="project-list" style={{ width: '100%' }}>
            {projects.length === 0 ? (
              !sidebarCollapsed && (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', padding: '0.5rem', textAlign: 'center' }}>
                  Sin proyectos asignados.
                </p>
              )
            ) : (
              projects.map(p => (
                <button
                  key={p.id}
                  className={`project-item ${selectedProjectId === p.id && activeTab === 'calendar' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setActiveTab('calendar');
                  }}
                  style={{ padding: sidebarCollapsed ? '0.6rem' : '0.6rem 0.75rem', fontSize: '0.85rem', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                  title={sidebarCollapsed ? p.name : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <Folder size={16} style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Log Out button */}
        <button
          className="btn-secondary"
          style={{ width: '100%', marginTop: 'auto', gap: '0.5rem', padding: sidebarCollapsed ? '0.6rem' : '0.65rem', justifyContent: 'center' }}
          onClick={handleLogout}
          title={sidebarCollapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!sidebarCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <div className="mobile-header-bar" style={{ display: 'none' }}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'hsl(var(--card))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '1.2rem' }}>
            Ibermex Cal
          </span>
        </div>

        {activeTab === 'calendar' ? (
          selectedProjectId === 'all' ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800 }}>Mi Calendario</h1>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Todas mis tareas asignadas en mis proyectos</p>
              </div>
              <CalendarGrid projectId="all" userRole={user.role} currentUserProfile={user} projects={projects} />
            </div>
          ) : activeProject ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800 }}>{activeProject.name}</h1>
                {activeProject.description && (
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>{activeProject.description}</p>
                )}
              </div>
              <CalendarGrid projectId={activeProject.id} userRole={user.role} currentUserProfile={user} projects={projects} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.6 }}>
              <Folder size={64} style={{ marginBottom: '1.5rem', color: 'var(--muted-foreground)' }} />
              <h2 style={{ fontWeight: 700, margin: '0 0 0.5rem' }}>Ningún Proyecto Seleccionado</h2>
              {user.role === 'admin' || user.role === 'master_admin' ? (
                <p style={{ textAlign: 'center', maxWidth: '320px', fontSize: '0.9rem' }}>
                  Comienza creando un proyecto desde el botón '+' en la barra lateral o selecciona uno existente.
                </p>
              ) : (
                <p style={{ textAlign: 'center', maxWidth: '320px', fontSize: '0.9rem' }}>
                  No tienes ningún proyecto asignado. Solicita al administrador que te agregue a un proyecto.
                </p>
              )}
            </div>
          )
        ) : activeTab === 'admin' ? (
          (user.role === 'admin' || user.role === 'master_admin') && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800 }}>Administración</h1>
                {/*<p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
                  Gestiona la lista de correos aprobados y la asignación de usuarios a proyectos.
                </p> */}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <AdminDashboard
                  projects={projects}
                  onProjectsUpdated={loadProjects}
                />
              </div>
            </div>
          )
        ) : (
          (user.role === 'admin' || user.role === 'master_admin') && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800 }}>Dashboard</h1>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <Dashboard projects={projects} />
              </div>
            </div>
          )
        )}
      </main>

      {/* Create Project Modal Popup */}
      {showCreateProjectModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Nuevo Proyecto</h2>
              <button
                onClick={() => {
                  setShowCreateProjectModal(false);
                  setNewProjectName('');
                  setNewProjectDesc('');
                  setSelectedUserUids([]);
                }}
                style={{ padding: '0.25rem', borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="proj-name" className="form-label">Nombre del Proyecto</label>
                <input
                  id="proj-name"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ej. Operaciones Ibermex Q3"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="proj-desc" className="form-label">Descripción</label>
                <textarea
                  id="proj-desc"
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Describe brevemente el alcance de este calendario de proyecto..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Asignar Colaboradores</label>
                <div className="glass-panel" style={{ padding: '0.75rem', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {whitelist.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', textAlign: 'center', padding: '0.5rem' }}>
                      No hay colaboradores autorizados en la lista.
                    </span>
                  ) : (
                    whitelist.map(u => {
                      const regUser = registeredUsers.find(r => r.email.toLowerCase() === u.email.toLowerCase());
                      const displayName = regUser ? regUser.displayName : u.email.split('@')[0];
                      const isSelected = selectedUserUids.includes(u.email);
                      return (
                        <div
                          key={u.email}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', borderRadius: '6px', background: isSelected ? 'rgba(192, 132, 252, 0.08)' : 'transparent', border: '1px solid', borderColor: isSelected ? 'var(--primary)' : 'transparent', cursor: 'pointer' }}
                          onClick={() => toggleUserAssignment(u.email)}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-h)' }}>{displayName}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{u.email}</span>
                          </div>
                          {isSelected ? (
                            <div style={{ color: 'var(--primary)', display: 'flex' }}><Check size={16} /></div>
                          ) : (
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                  Los colaboradores asignados podrán ver este calendario y gestionar sus tareas.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateProjectModal(false);
                    setNewProjectName('');
                    setNewProjectDesc('');
                    setSelectedUserUids([]);
                  }}
                  disabled={submittingProject}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submittingProject}>
                  {submittingProject ? 'Creando...' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;