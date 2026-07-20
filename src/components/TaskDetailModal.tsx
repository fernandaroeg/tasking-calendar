import React, { useState, useEffect } from 'react';
import { X, Plus, Folder, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import { firebaseService, getUserColor } from '../services/firebase';
import type { Task, TaskLabel, UserProfile, Project } from '../../specs/001-project-task-calendar/contracts/firebase-service';
import RichTextEditor from './RichTextEditor';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  initialDate: Date | null;
  projectId: string;
  userRole: 'master_admin' | 'admin' | 'user';
  onSaved: () => void;
}

const TIME_SLOTS = [
  { value: '06:00', label: '06:00 AM' },
  { value: '06:30', label: '06:30 AM' },
  { value: '07:00', label: '07:00 AM' },
  { value: '07:30', label: '07:30 AM' },
  { value: '08:00', label: '08:00 AM' },
  { value: '08:30', label: '08:30 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '18:30', label: '06:30 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '20:30', label: '08:30 PM' },
  { value: '21:00', label: '09:00 PM' }
];

const getClosestTimeSlot = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMins = hours * 60 + minutes;

  let bestSlot = '09:00';
  let minDiff = Infinity;

  for (const slot of TIME_SLOTS) {
    const [sHours, sMinutes] = slot.value.split(':').map(Number);
    const slotMins = sHours * 60 + sMinutes;
    const diff = Math.abs(totalMins - slotMins);
    if (diff < minDiff) {
      minDiff = diff;
      bestSlot = slot.value;
    }
  }
  return bestSlot;
};

const formatDateStr = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  initialDate,
  projectId,
  onSaved
}) => {
  const getIsTaskCompleted = (): boolean => {
    if (!task) return false;
    if (task.isRecurring && initialDate) {
      const dateStr = formatDateStr(initialDate);
      return task.completedDates?.includes(dateStr) || false;
    }
    return task.completed === true;
  };

  const isTaskCompleted = getIsTaskCompleted();

  const [title, setTitle] = useState('');
  const [dueDateDateStr, setDueDateDateStr] = useState('');
  const [dueDateTimeStr, setDueDateTimeStr] = useState('09:00');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projectName, setProjectName] = useState('');
  const [modalProjects, setModalProjects] = useState<Project[]>([]);
  const [selectedModalProjectId, setSelectedModalProjectId] = useState('');

  // Dropdown collapse state for assignees selector
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceStartStr, setRecurrenceStartStr] = useState('');
  const [recurrenceEndStr, setRecurrenceEndStr] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);

  // Attachments states
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [driveLink, setDriveLink] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch projects list if in global view
  useEffect(() => {
    if (!task && (projectId === 'all' || projectId === '')) {
      const loadModalProjects = async () => {
        try {
          const projs = await firebaseService.getProjects();
          setModalProjects(projs);
          if (projs.length > 0 && !selectedModalProjectId) {
            setSelectedModalProjectId(projs[0].id);
          }
        } catch (err) {
          console.error("Error loading projects for modal:", err);
        }
      };
      loadModalProjects();
    }
  }, [task, projectId]);

  // Set default selected project ID when task changes
  useEffect(() => {
    if (task) {
      setSelectedModalProjectId(task.projectId);
    } else if (projectId !== 'all' && projectId !== '') {
      setSelectedModalProjectId(projectId);
    }
  }, [task, projectId]);

  // Load users whenever selectedModalProjectId changes
  useEffect(() => {
    const loadUsersForProject = async () => {
      if (!selectedModalProjectId || selectedModalProjectId === 'all') {
        return;
      }
      try {
        const [list, project] = await Promise.all([
          firebaseService.getAllUsers(),
          firebaseService.getProject(selectedModalProjectId)
        ]);

        if (project) {
          setProjectName(project.name);
          const assignedEmails = (project.assignedUsers || []).map(e => e.trim().toLowerCase());
          
          // 1. Get registered users who are in the project or are admins/master admins
          const projectUsers = list.filter(u =>
            assignedEmails.includes(u.email.trim().toLowerCase()) ||
            u.role === 'admin' ||
            u.role === 'master_admin'
          );

          // 2. For any email in project's assignedUsers that is NOT in projectUsers, create a mock profile
          const finalUsers = [...projectUsers];
          assignedEmails.forEach(email => {
            const hasRegisteredUser = projectUsers.some(u => u.email.trim().toLowerCase() === email);
            if (!hasRegisteredUser) {
              finalUsers.push({
                uid: email, // Use email as the temporary uid
                email: email,
                displayName: email.split('@')[0],
                role: 'user',
                createdAt: new Date(),
                lastLogin: new Date()
              });
            }
          });
          
          setUsers(finalUsers);
        } else {
          setUsers(list);
        }
      } catch (err) {
        console.error("Error loading users for selected project:", err);
      }
    };
    loadUsersForProject();
  }, [selectedModalProjectId]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');

      // Load assignedTo as an array
      const taskAssigned = task.assignedTo;
      if (Array.isArray(taskAssigned)) {
        setAssignedTo(taskAssigned);
      } else if (typeof taskAssigned === 'string' && taskAssigned) {
        setAssignedTo([taskAssigned]);
      } else {
        setAssignedTo([]);
      }

      setLabels(task.labels || []);
      setAttachments(task.attachments || []);
      setDriveLink('');
      setIsRecurring(task.isRecurring || false);
      setRecurrenceDays(task.recurrenceDays || []);

      // Format date to YYYY-MM-DD
      const year = task.dueDate.getFullYear();
      const month = String(task.dueDate.getMonth() + 1).padStart(2, '0');
      const day = String(task.dueDate.getDate()).padStart(2, '0');
      setDueDateDateStr(`${year}-${month}-${day}`);
      setDueDateTimeStr(getClosestTimeSlot(task.dueDate));

      const rStart = task.recurrenceStart || task.dueDate;
      setRecurrenceStartStr(`${rStart.getFullYear()}-${String(rStart.getMonth() + 1).padStart(2, '0')}-${String(rStart.getDate()).padStart(2, '0')}`);

      const rEnd = task.recurrenceEnd || new Date(rStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      setRecurrenceEndStr(`${rEnd.getFullYear()}-${String(rEnd.getMonth() + 1).padStart(2, '0')}-${String(rEnd.getDate()).padStart(2, '0')}`);
    } else {
      setTitle('');
      setDescription('');
      setAssignedTo([]);
      setLabels([]);
      setAttachments([]);
      setDriveLink('');
      setIsRecurring(false);
      setRecurrenceDays([]);

      const date = initialDate || new Date();
      // Default to 9:00 AM
      date.setHours(9, 0, 0, 0);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setDueDateDateStr(`${year}-${month}-${day}`);
      setDueDateTimeStr('09:00');

      setRecurrenceStartStr(`${year}-${month}-${day}`);

      const nextWeek = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nwYear = nextWeek.getFullYear();
      const nwMonth = String(nextWeek.getMonth() + 1).padStart(2, '0');
      const nwDay = String(nextWeek.getDate()).padStart(2, '0');
      setRecurrenceEndStr(`${nwYear}-${nwMonth}-${nwDay}`);
    }
  }, [task, initialDate]);

  const handleAddLink = () => {
    const trimmed = driveLink.trim();
    if (!trimmed) return;

    let name = 'Enlace del Documento';
    try {
      const urlObj = new URL(trimmed);
      name = urlObj.hostname;
    } catch (e) {
      alert("Por favor introduce una dirección URL válida.");
      return;
    }

    if (attachments.some(att => att.url === trimmed)) {
      alert("Este enlace ya ha sido agregado.");
      return;
    }

    setAttachments(prev => [...prev, { name, url: trimmed }]);
    setDriveLink('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const dateParts = dueDateDateStr.split('-');
      const [timeHours, timeMinutes] = dueDateTimeStr.split(':').map(Number);
      const dateVal = new Date(
        Number(dateParts[0]),
        Number(dateParts[1]) - 1,
        Number(dateParts[2]),
        timeHours,
        timeMinutes,
        0
      );

      let recurrenceStartVal: Date | undefined = undefined;
      let recurrenceEndVal: Date | undefined = undefined;

      if (isRecurring) {
        if (recurrenceStartStr) {
          const rStartParts = recurrenceStartStr.split('-');
          recurrenceStartVal = new Date(Number(rStartParts[0]), Number(rStartParts[1]) - 1, Number(rStartParts[2]), 12, 0, 0);
        }
        if (recurrenceEndStr) {
          const rEndParts = recurrenceEndStr.split('-');
          recurrenceEndVal = new Date(Number(rEndParts[0]), Number(rEndParts[1]) - 1, Number(rEndParts[2]), 12, 0, 0);
        }

        if (recurrenceStartVal && recurrenceEndVal && recurrenceStartVal > recurrenceEndVal) {
          alert("La fecha de fin de la recurrencia no puede ser anterior a la fecha de inicio.");
          setSaving(false);
          return;
        }
      }

      // Automatically include the current input value if not empty
      let finalAttachments = [...attachments];
      const trimmedLink = driveLink.trim();
      if (trimmedLink) {
        let name = 'Enlace del Documento';
        try {
          const urlObj = new URL(trimmedLink);
          name = urlObj.hostname;
        } catch (e) { }

        if (!finalAttachments.some(att => att.url === trimmedLink)) {
          finalAttachments.push({ name, url: trimmedLink });
        }
      }

      const taskData: any = {
        projectId: selectedModalProjectId || projectId,
        title: title.trim(),
        dueDate: dateVal,
        description,
        priority: 'medium', // Default fallback
        labels,
        checklist: [], // Removed checklist
        color: null, // Removed color picker
        isRecurring,
        recurrenceStart: recurrenceStartVal,
        recurrenceEnd: recurrenceEndVal,
        recurrenceDays,
        assignedTo,
        attachments: finalAttachments
      };

      if (task) {
        await firebaseService.updateTask(task.id, taskData);
      } else {
        await firebaseService.createTask(taskData);
      }
      onSaved();
    } catch (err) {
      console.error("Error saving task details:", err);
      alert("Error al guardar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  const toggleUserAssignment = (uid: string) => {
    setAssignedTo(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleRecurrenceDay = (day: string) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };


  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'hsl(var(--bg))', color: 'hsl(var(--text))', border: '1px solid hsl(var(--border))', maxWidth: '600px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              {task ? 'Detalle de Tarea' : 'Nueva Tarea'}
            </h2>
            {isTaskCompleted && (
              <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                Completada
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ padding: '0.25rem', borderRadius: '50%', color: 'hsl(var(--text))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Project selector dropdown (only when creating a new task from the global calendar) */}
          {!task && (projectId === 'all' || projectId === '') && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
              <label htmlFor="task-project" className="form-label" style={{ margin: 0, minWidth: '180px', flexShrink: 0 }}>
                Proyecto
              </label>
              <select
                id="task-project"
                className="form-input"
                value={selectedModalProjectId}
                onChange={(e) => setSelectedModalProjectId(e.target.value)}
                disabled={saving}
                style={{ flex: 1, padding: '0.45rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'transparent' }}
              >
                {modalProjects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1. Nombre de la tarea (Side-by-side layout) */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
            <label htmlFor="task-title" className="form-label" style={{ margin: 0, minWidth: '180px', flexShrink: 0 }}>
              Nombre de la tarea
            </label>
            <input
              id="task-title"
              type="text"
              required
              className="form-input"
              placeholder="Ej. Diseñar plano de cimientos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving || isTaskCompleted}
              style={{ fontSize: '1rem', fontWeight: 600, flex: 1, padding: '0.45rem 0.75rem' }}
            />
          </div>

          {/* 2. Responsables (Multi-Asignación - Side-by-side) */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="form-label" style={{ margin: 0, minWidth: '180px', flexShrink: 0 }}>
                Responsables
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {assignedTo.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                      Sin asignar
                    </span>
                  ) : (
                    assignedTo.map(uid => {
                      const u = users.find(usr => usr.uid === uid || usr.email.toLowerCase() === uid.toLowerCase());
                      const email = u ? u.email : (uid.includes('@') ? uid : '');
                      if (!email) return null;
                      const uColor = getUserColor(email);
                      const displayName = u ? u.displayName : email.split('@')[0];
                      return (
                        <div
                          key={uid}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            backgroundColor: `${uColor}15`,
                            border: `1px solid ${uColor}35`,
                            color: uColor,
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: uColor,
                              color: '#ffffff',
                              fontSize: '0.5rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <span>{displayName}</span>
                          {!isTaskCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserAssignment(uid);
                              }}
                              style={{ display: 'flex', color: uColor, cursor: 'pointer', padding: 0 }}
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Collapsible toggle button */}
                {!isTaskCompleted && (
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      background: 'hsl(var(--secondary))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--text))',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginLeft: 'auto'
                    }}
                  >
                    {showUserDropdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showUserDropdown ? 'Cerrar' : 'Elegir'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* List of selectables (collapsible) */}
            {showUserDropdown && (
              <div className="glass-panel" style={{ padding: '0.5rem', maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: '#ffffff', border: '1px solid hsl(var(--border))', borderRadius: '8px', marginTop: '0.25rem' }}>
                {users.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '0.5rem' }}>
                    No hay colaboradores disponibles.
                  </span>
                ) : (
                  users.map(u => {
                    const isSelected = assignedTo.includes(u.uid);
                    const uColor = getUserColor(u.email);
                    return (
                      <div
                        key={u.uid}
                        onClick={() => toggleUserAssignment(u.uid)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          background: isSelected ? `${uColor}10` : 'transparent',
                          border: '1px solid',
                          borderColor: isSelected ? uColor : 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: uColor,
                              color: '#ffffff',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'hsl(var(--text))' }}>{u.displayName} ({u.email})</span>
                        </div>
                        {isSelected && <span style={{ color: uColor, fontWeight: 800, fontSize: '0.75rem' }}>✓ Asignado</span>}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 3. Fecha de Vencimiento (Fecha y Hora - Side-by-side) */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
            <label htmlFor="task-date" className="form-label" style={{ margin: 0, minWidth: '180px', flexShrink: 0 }}>
              Fecha de vencimiento
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
              <input
                id="task-date"
                type="date"
                required
                className="form-input"
                value={dueDateDateStr}
                onChange={(e) => setDueDateDateStr(e.target.value)}
                disabled={saving || isTaskCompleted}
                style={{ flex: 2, padding: '0.45rem 0.75rem' }}
              />
              <select
                className="form-select"
                value={dueDateTimeStr}
                onChange={(e) => setDueDateTimeStr(e.target.value)}
                disabled={saving || isTaskCompleted}
                style={{ flex: 1.5, padding: '0.45rem 0.75rem' }}
              >
                {TIME_SLOTS.map(slot => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Proyecto al que pertenece (Debajo de Fecha, Side-by-side) */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
            <label className="form-label" style={{ margin: 0, minWidth: '180px', flexShrink: 0 }}>
              Proyecto
            </label>
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
              <span
                style={{
                  backgroundColor: 'rgba(255, 106, 82, 0.08)',
                  color: 'hsl(var(--primary))',
                  border: '1px solid rgba(255, 106, 82, 0.3)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Folder size={16} />
                {projectName || 'Cargando...'}
              </span>
            </div>
          </div>

          {/* 5. Tareas Recurrentes (Checklist de días) */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="task-recurring" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              <input
                id="task-recurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                disabled={saving || isTaskCompleted}
                style={{ width: '16px', height: '16px', cursor: isTaskCompleted ? 'default' : 'pointer' }}
              />
              Hacer esta tarea recurrente (Repetir en días seleccionados)
            </label>

            {isRecurring && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', borderRadius: '8px', background: 'rgba(28, 28, 28, 0.03)', border: '1px solid hsl(var(--border) / 0.5)', marginTop: '0.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="recurrence-start" className="form-label" style={{ fontSize: '0.75rem' }}>Fecha de Inicio</label>
                    <input
                      id="recurrence-start"
                      type="date"
                      required={isRecurring}
                      className="form-input"
                      value={recurrenceStartStr}
                      onChange={(e) => setRecurrenceStartStr(e.target.value)}
                      disabled={saving || isTaskCompleted}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="recurrence-end" className="form-label" style={{ fontSize: '0.75rem' }}>Fecha de Fin</label>
                    <input
                      id="recurrence-end"
                      type="date"
                      required={isRecurring}
                      className="form-input"
                      value={recurrenceEndStr}
                      onChange={(e) => setRecurrenceEndStr(e.target.value)}
                      disabled={saving || isTaskCompleted}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Días de Repetición</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { key: 'lun', label: 'L' },
                      { key: 'mar', label: 'M' },
                      { key: 'mie', label: 'M' },
                      { key: 'jue', label: 'J' },
                      { key: 'vie', label: 'V' },
                      { key: 'sab', label: 'S' },
                      { key: 'dom', label: 'D' }
                    ].map(day => {
                      const isSelected = recurrenceDays.includes(day.key);
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => !isTaskCompleted && toggleRecurrenceDay(day.key)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? 'hsl(var(--primary))' : '#ffffff',
                            color: isSelected ? 'hsl(var(--primary-foreground))' : 'hsl(var(--text))',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid',
                            borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                            cursor: isTaskCompleted ? 'default' : 'pointer',
                            transition: 'all 0.15s'
                          }}
                          title={day.key.toUpperCase()}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Descripción de la tarea (Rich Text Editor) */}
          <div className="form-group">
            <label htmlFor="task-description" className="form-label">Descripción</label>
            <RichTextEditor
              id="task-description"
              value={description}
              onChange={setDescription}
              disabled={isTaskCompleted}
            />
          </div>

          {/* 7. Documentos / Adjuntos (Attachments - Google Drive link) */}
          <div className="form-group" style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <label htmlFor="drive-link" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Paperclip size={14} />
              Adjutnos
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <input
                id="drive-link"
                type="url"
                className="form-input"
                placeholder="https://drive.google.com/..."
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                disabled={isTaskCompleted}
                style={{ flex: 1 }}
              />
              {!isTaskCompleted && (
                <button
                  type="button"
                  onClick={handleAddLink}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'hsl(var(--primary))',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    cursor: 'pointer',
                    padding: '0 0.5rem',
                    height: '42px'
                  }}
                >
                  <Plus size={14} /> Agregar
                </button>
              )}
            </div>

            {/* List of attachments */}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(28, 28, 28, 0.03)',
                      border: '1px solid hsl(var(--border) / 0.5)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: 'hsl(var(--primary))',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '85%'
                      }}
                    >
                      {att.name} ({att.url})
                    </a>
                    {!isTaskCompleted && (
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        style={{ color: 'hsl(var(--primary))', cursor: 'pointer', padding: 0, background: 'transparent', border: 'none', display: 'flex' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: '1.5rem',
            borderTop: '1px solid hsl(var(--border))',
            paddingTop: '1.25rem'
          }}>
            {isTaskCompleted ? (
              <button
                type="button"
                className="btn-primary"
                style={{ height: '42px', minWidth: '100px' }}
                onClick={onClose}
              >
                Cerrar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ height: '42px', minWidth: '100px' }}
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ height: '42px', minWidth: '120px' }}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar Tarea'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskDetailModal;
