import React, { useState, useEffect } from 'react';
import { Trash2, Plus, X, CheckSquare, Square, Tag } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import type { Task, TaskLabel, ChecklistItem, UserProfile } from '../../specs/001-project-task-calendar/contracts/firebase-service';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  initialDate: Date | null;
  projectId: string;
  userRole: 'master_admin' | 'admin' | 'user';
  onSaved: () => void;
}

const PRESET_COLORS = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8c4ff'];
const TASK_PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#64748b'];

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  initialDate,
  projectId,
  onSaved
}) => {
  const [title, setTitle] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // New States
  const [taskColor, setTaskColor] = useState('#3b82f6');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceStartStr, setRecurrenceStartStr] = useState('');
  const [recurrenceEndStr, setRecurrenceEndStr] = useState('');
  
  // Subtask & Label additions state
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
    
    // Set initial values depending on Edit or Create mode
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssignedTo(task.assignedTo || '');
      setPriority(task.priority || 'medium');
      setLabels(task.labels || []);
      setChecklist(task.checklist || []);
      setTaskColor(task.color || '#3b82f6');
      setIsRecurring(task.isRecurring || false);
      
      // Format date to YYYY-MM-DD
      const date = task.dueDate;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setDueDateStr(`${year}-${month}-${day}`);

      if (task.recurrenceStart) {
        const rStart = task.recurrenceStart;
        setRecurrenceStartStr(`${rStart.getFullYear()}-${String(rStart.getMonth() + 1).padStart(2, '0')}-${String(rStart.getDate()).padStart(2, '0')}`);
      } else {
        setRecurrenceStartStr(`${year}-${month}-${day}`);
      }

      if (task.recurrenceEnd) {
        const rEnd = task.recurrenceEnd;
        setRecurrenceEndStr(`${rEnd.getFullYear()}-${String(rEnd.getMonth() + 1).padStart(2, '0')}-${String(rEnd.getDate()).padStart(2, '0')}`);
      } else {
        // default to 1 week later
        const nextWeek = new Date(date);
        nextWeek.setDate(date.getDate() + 7);
        setRecurrenceEndStr(`${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`);
      }
    } else {
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setPriority('medium');
      setLabels([]);
      setChecklist([]);
      setTaskColor('#3b82f6');
      setIsRecurring(false);
      
      const date = initialDate || new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setDueDateStr(`${year}-${month}-${day}`);
      setRecurrenceStartStr(`${year}-${month}-${day}`);

      const nextWeek = new Date(date);
      nextWeek.setDate(date.getDate() + 7);
      setRecurrenceEndStr(`${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`);
    }
  }, [task, initialDate]);

  const loadUsers = async () => {
    try {
      const [list, project] = await Promise.all([
        firebaseService.getAllUsers(),
        firebaseService.getProject(projectId)
      ]);

      if (project) {
        const assignedEmails = (project.assignedUsers || []).map(e => e.toLowerCase());
        const filtered = list.filter(u => 
          assignedEmails.includes(u.email.toLowerCase()) || 
          u.role === 'admin'
        );
        setUsers(filtered);
      } else {
        setUsers(list);
      }
    } catch (err) {
      console.error("Error loading users for assignments:", err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const dateParts = dueDateStr.split('-');
      // Set to noon to avoid timezone shift errors
      const dateVal = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12, 0, 0);

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

      const taskData: any = {
        projectId,
        title: title.trim(),
        dueDate: dateVal,
        description,
        priority,
        labels,
        checklist,
        color: taskColor,
        isRecurring,
        recurrenceStart: recurrenceStartVal,
        recurrenceEnd: recurrenceEndVal,
        assignedTo
      };

      if (task) {
        // Edit mode
        await firebaseService.updateTask(task.id, taskData);
      } else {
        // Create mode
        await firebaseService.createTask(taskData);
      }
      onSaved();
    } catch (err) {
      console.error("Error saving task:", err);
      alert("Error al guardar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    setSaving(true);
    try {
      if (task.isRecurring && initialDate) {
        if (!window.confirm("¿Estás seguro de que deseas eliminar solo esta ocurrencia de la tarea recurrente?")) {
          setSaving(false);
          return;
        }
        const currentExceptions = task.exceptions || [];
        const alreadyExc = currentExceptions.some(exc => 
          exc.getDate() === initialDate.getDate() &&
          exc.getMonth() === initialDate.getMonth() &&
          exc.getFullYear() === initialDate.getFullYear()
        );
        const updatedExceptions = alreadyExc ? currentExceptions : [...currentExceptions, initialDate];
        await firebaseService.updateTask(task.id, {
          exceptions: updatedExceptions
        });
      } else {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta tarea permanentemente?")) {
          setSaving(false);
          return;
        }
        await firebaseService.deleteTask(task.id);
      }
      onSaved();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Error al eliminar la tarea.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // Checklist Item Helpers
  // ---------------------------------------------------------
  const handleAddChecklistItem = () => {
    if (!newSubtaskText.trim()) return;
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newSubtaskText.trim(),
      completed: false
    };
    setChecklist([...checklist, newItem]);
    setNewSubtaskText('');
  };

  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map(item => {
      if (item.id === id) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });
    setChecklist(updated);
  };

  const handleRemoveChecklist = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  // ---------------------------------------------------------
  // Labels Helpers
  // ---------------------------------------------------------
  const handleAddLabel = () => {
    if (!newLabelText.trim()) return;
    // Prevent duplicate tag text
    if (labels.some(l => l.text.toLowerCase() === newLabelText.trim().toLowerCase())) return;

    const newLabel: TaskLabel = {
      text: newLabelText.trim(),
      color: newLabelColor
    };
    setLabels([...labels, newLabel]);
    setNewLabelText('');
    setShowLabelForm(false);
  };

  const handleRemoveLabel = (text: string) => {
    setLabels(labels.filter(l => l.text !== text));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {task ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <button onClick={onClose} style={{ padding: '0.25rem', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title */}
          <div className="form-group">
            <label htmlFor="task-title" className="form-label">Título</label>
            <input
              id="task-title"
              type="text"
              required
              className="form-input"
              placeholder="Ej. Diseñar maqueta de login"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Task Color Picker */}
          <div className="form-group">
            <label className="form-label">Color de la Tarea</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {TASK_PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: taskColor === color ? '2px solid white' : '2px solid transparent',
                    boxShadow: taskColor === color ? '0 0 0 2px hsl(var(--primary)), 0 0 4px rgba(0,0,0,0.3)' : '0 0 4px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    transform: taskColor === color ? 'scale(1.1)' : 'none'
                  }}
                  onClick={() => setTaskColor(color)}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Due Date */}
            <div className="form-group">
              <label htmlFor="task-date" className="form-label">Fecha de Vencimiento</label>
              <input
                id="task-date"
                type="date"
                required
                className="form-input"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
              />
            </div>

            {/* Priority */}
            
            <div className="form-group">
              <label htmlFor="task-priority" className="form-label">Prioridad</label>
              <select
                id="task-priority"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          {/* Recurrence Control */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="task-recurring" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              <input
                id="task-recurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Hacer esta tarea recurrente (Repetir en rango de fechas)
            </label>
          </div>

          {/* Conditional Recurrence Date Range */}
          {isRecurring && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', borderRadius: '8px', background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border) / 0.5)' }}>
              <div className="form-group">
                <label htmlFor="recurrence-start" className="form-label" style={{ fontSize: '0.8rem' }}>Fecha de Inicio</label>
                <input
                  id="recurrence-start"
                  type="date"
                  required={isRecurring}
                  className="form-input"
                  value={recurrenceStartStr}
                  onChange={(e) => setRecurrenceStartStr(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="recurrence-end" className="form-label" style={{ fontSize: '0.8rem' }}>Fecha de Fin</label>
                <input
                  id="recurrence-end"
                  type="date"
                  required={isRecurring}
                  className="form-input"
                  value={recurrenceEndStr}
                  onChange={(e) => setRecurrenceEndStr(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Assignee Selection */}
          <div className="form-group">
            <label htmlFor="task-assignee" className="form-label">Asignado a</label>
            <select
              id="task-assignee"
              className="form-select"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Sin Asignar</option>
              {users.map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
              ))}
            </select>
          </div>

          {/* Color Labels / Tags Section */}
          <div className="form-group">
            <label className="form-label">Etiquetas</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', minHeight: '32px' }}>
              {labels.map((lbl, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    background: `${lbl.color}20`,
                    color: lbl.color,
                    border: `1px solid ${lbl.color}40`,
                    fontWeight: 600
                  }}
                >
                  {lbl.text}
                  <button type="button" onClick={() => handleRemoveLabel(lbl.text)} style={{ color: lbl.color, opacity: 0.8, display: 'inline-flex' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}

              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', gap: '0.25rem' }}
                onClick={() => setShowLabelForm(!showLabelForm)}
              >
                <Tag size={12} />
                + Agregar
              </button>
            </div>

            {showLabelForm && (
              <div className="glass-panel" style={{ padding: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, padding: '0.4rem' }}
                    placeholder="Nombre de la etiqueta"
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                  />
                  <button type="button" className="btn-primary" style={{ padding: '0.4rem 1rem' }} onClick={handleAddLabel}>
                    OK
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: newLabelColor === color ? '2px solid white' : 'none',
                        boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                      }}
                      onClick={() => setNewLabelColor(color)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="task-description" className="form-label">Descripción</label>
            <textarea
              id="task-description"
              className="form-input"
              style={{ minHeight: '120px', resize: 'vertical' }}
              placeholder="Escribe la descripción de la tarea aquí..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Subtask Checklist */}
          <div className="checklist-container">
            <label className="form-label">Subtareas / Checklist</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Ej. Revisar contrato"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
              />
              <button type="button" className="btn-secondary" style={{ padding: '0.6rem 1rem' }} onClick={handleAddChecklistItem}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {checklist.map((item) => (
                <div key={item.id} className="checklist-item" style={{ justifyContent: 'space-between', padding: '0.4rem', borderBottom: '1px solid hsl(var(--border) / 0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" onClick={() => handleToggleChecklist(item.id)} style={{ color: 'hsl(var(--primary))', display: 'flex' }}>
                      {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <span className={`checklist-item-text ${item.completed ? 'completed' : ''}`}>
                      {item.text}
                    </span>
                  </div>
                  <button type="button" onClick={() => handleRemoveChecklist(item.id)} style={{ color: 'hsl(var(--priority-high))', opacity: 0.8 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.25rem' }}>
            {task ? (
              <button type="button" className="btn-secondary" style={{ color: 'hsl(var(--priority-high))', borderColor: 'hsl(var(--priority-high) / 0.3)', gap: '0.5rem' }} onClick={handleDelete} disabled={saving}>
                <Trash2 size={18} />
                Eliminar Tarea
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskDetailModal;
