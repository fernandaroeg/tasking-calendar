import React, { useState, useEffect } from 'react';
import { Trash2, Mail, Loader2, FolderOpen, Check } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import type { PreApprovedUser, Project, UserProfile } from '../../specs/001-project-task-calendar/contracts/firebase-service';

interface AdminDashboardProps {
  projects: Project[];
  onProjectsUpdated: () => Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ projects, onProjectsUpdated }) => {
  const [whitelist, setWhitelist] = useState<PreApprovedUser[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [loadingWhitelist, setLoadingWhitelist] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'master_admin' | 'admin' | 'user'>('user');
  const [submittingWhitelist, setSubmittingWhitelist] = useState(false);

  // Active Project Membership management
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    loadWhitelist();
    loadUsers();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      const exists = projects.some(p => p.id === selectedProjectId);
      if (!exists) {
        setSelectedProjectId(projects[0].id);
      }
    } else {
      setSelectedProjectId('');
    }
  }, [projects, selectedProjectId]);

  const loadWhitelist = async () => {
    setLoadingWhitelist(true);
    try {
      const list = await firebaseService.getPreApprovedUsers();
      setWhitelist(list);
    } catch (err) {
      console.error("Error loading whitelist:", err);
    } finally {
      setLoadingWhitelist(false);
    }
  };

  const loadUsers = async () => {
    setLoadingProjects(true);
    try {
      const usrs = await firebaseService.getAllUsers();
      setRegisteredUsers(usrs);
    } catch (err) {
      console.error("Error loading projects/users:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setSubmittingWhitelist(true);
    try {
      await firebaseService.addPreApprovedUser(newEmail, newRole);
      setNewEmail('');
      await loadWhitelist();
    } catch (err) {
      console.error("Error adding to whitelist:", err);
      alert("Error al agregar correo a la whitelist.");
    } finally {
      setSubmittingWhitelist(false);
    }
  };

  const handleRemoveWhitelist = async (email: string) => {
    const targetUser = whitelist.find(item => item.email.toLowerCase() === email.toLowerCase());
    const currentUser = firebaseService.getCurrentUser();
    if (targetUser?.role === 'master_admin' && currentUser?.role !== 'master_admin') {
      alert("No tienes permisos para revocar el acceso de un Master Admin.");
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas revocar el acceso para ${email}?`)) return;

    try {
      await firebaseService.removePreApprovedUser(email);
      await loadWhitelist();
    } catch (err) {
      console.error("Error removing from whitelist:", err);
      alert("Error al remover correo de la whitelist.");
    }
  };

  const handleToggleProjectMember = async (userId: string) => {
    if (!selectedProjectId) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    let updatedUsers = [...project.assignedUsers];
    if (updatedUsers.includes(userId)) {
      // Remove
      updatedUsers = updatedUsers.filter(uid => uid !== userId);
    } else {
      // Add
      updatedUsers.push(userId);
    }

    try {
      await firebaseService.updateProjectMembers(selectedProjectId, updatedUsers);
      await onProjectsUpdated();
    } catch (err) {
      console.error("Error updating project members:", err);
      alert("Error al actualizar los miembros del proyecto.");
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    const confirmName = prompt(
      `¡ADVERTENCIA! Esta acción no se puede deshacer.\n\n` +
      `Esto eliminará permanentemente el proyecto "${project.name}" y todas sus tareas asociadas.\n\n` +
      `Para confirmar, escribe el nombre del proyecto a continuación:`
    );

    if (confirmName === null) return; // User cancelled prompt

    if (confirmName !== project.name) {
      alert("El nombre ingresado no coincide. Operación cancelada.");
      return;
    }

    try {
      await firebaseService.deleteProject(selectedProjectId);
      await onProjectsUpdated();
      alert("Proyecto eliminado exitosamente.");
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Error al eliminar el proyecto.");
    }
  };

  const activeProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-h)' }}>Control de Accesos</h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Gestiona la lista de correos aprobados y la asignación de colaboradores a proyectos.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Whitelist / Pre-approved Users Column */}
        <section className="glass-panel admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-h)', paddingLeft: '1rem'}}>
            <Mail size={18} style={{ color: 'hsl(var(--primary))' }} />
            Usuarios Pre-aprobados
          </h3>

          {/* Add Whitelist Form */}
          <form onSubmit={handleAddWhitelist} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border) / 0.5)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="whitelist-email" className="form-label">Correo Electrónico Google</label>
              <input
                id="whitelist-email"
                type="email"
                required
                className="form-input"
                placeholder="correo@empresa.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label htmlFor="whitelist-role" className="form-label">Rol de Usuario</label>
                <select
                  id="whitelist-role"
                  className="form-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="user">Colaborador (User)</option>
                  <option value="admin">Administrador (Admin)</option>
                  {firebaseService.getCurrentUser()?.role === 'master_admin' && (
                    <option value="master_admin">Master Admin (master_admin)</option>
                  )}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.25rem' }} disabled={submittingWhitelist}>
                {submittingWhitelist ? 'Procesando...' : 'Autorizar Correo'}
              </button>
            </div>
          </form>

          {/* Whitelist Display */}
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem', paddingLeft: '1rem' }}>Correos Autorizados</h4>
            {loadingWhitelist ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 className="animate-spin" size={24} style={{ color: 'hsl(var(--muted-foreground))' }} />
              </div>
            ) : whitelist.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>No hay correos en la lista.</p>
            ) : (
              <div className="whitelist-list" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {whitelist.map((item) => (
                  <div key={item.email} className="whitelist-item">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.email}</span>
                      <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                        Agregado el {item.addedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${item.role === 'admin' || item.role === 'master_admin' ? 'badge-admin' : 'badge-user'}`}>
                        {item.role === 'master_admin' ? 'Master Admin' : item.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWhitelist(item.email)}
                        style={{ color: 'hsl(var(--priority-high))' }}
                        title="Eliminar de la whitelist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Project Membership Column */}
        <section className="glass-panel admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-h)', paddingLeft: '1rem' }}>
            <FolderOpen size={18} style={{ color: 'hsl(var(--primary))' }} />
            Asignación de Usuarios a Proyectos
          </h3>

          {loadingProjects ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', flex: 1 }}>
              <Loader2 className="animate-spin" size={32} style={{ color: 'hsl(var(--muted-foreground))' }} />
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
              <p>No existen proyectos en el sistema.</p>
              <p style={{ fontSize: '0.8rem' }}>Crea un proyecto desde el menú lateral.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, paddingLeft: '1rem' }}>
              {/* Select Project to Manage */}
              <div className="form-group">
                <label htmlFor="admin-project-select" className="form-label font-label">Seleccionar Proyecto</label>
                <select
                  id="admin-project-select"
                  className="form-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Members Checklist for Active Project */}
              {activeProject && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))' }}>
                      Asignar Miembros ({activeProject.assignedUsers.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto', flex: 1 }}>
                    {whitelist.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
                        No hay correos autorizados en la lista. Agrega uno a la whitelist primero.
                      </p>
                    ) : (
                      whitelist.map((u) => {
                        const isAssigned = activeProject.assignedUsers.includes(u.email);
                        // Find matching profile if they logged in
                        const regUser = registeredUsers.find(r => r.email.toLowerCase() === u.email.toLowerCase());
                        const displayName = regUser ? regUser.displayName : u.email.split('@')[0];
                        return (
                          <div
                            key={u.email}
                            onClick={() => handleToggleProjectMember(u.email)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.6rem 1rem',
                              backgroundColor: isAssigned ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--secondary) / 0.3)',
                              borderRadius: 'var(--radius)',
                              border: isAssigned ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid hsl(var(--border) / 0.4)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{displayName}</span>
                              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>{u.email}</span>
                            </div>
                            <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isAssigned ? 'hsl(var(--primary))' : 'transparent', color: 'white' }}>
                              {isAssigned && <Check size={14} />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Delete Project Section */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ color: 'hsl(var(--priority-high))', borderColor: 'hsl(var(--priority-high) / 0.3)', gap: '0.5rem' }}
                      onClick={handleDeleteProject}
                    >
                      <Trash2 size={16} />
                      Eliminar Proyecto
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
