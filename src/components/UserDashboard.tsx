import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CheckCircle2, AlertTriangle, ListTodo, Folder } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import type { Task, Project, UserProfile } from '../../specs/001-project-task-calendar/contracts/firebase-service';
import TaskDetailModal from './TaskDetailModal';

interface UserDashboardProps {
  currentUserProfile: UserProfile;
  projects: Project[];
}

interface TaskInstance {
  task: Task;
  date: Date;
  completed: boolean;
  expired: boolean;
}

const formatDateStr = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDisplayTime = (d: Date): string => {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

const UserDashboard: React.FC<UserDashboardProps> = ({ currentUserProfile, projects }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListTab, setActiveListTab] = useState<'pending' | 'overdue' | 'completed'>('pending');

  // Modal states for task details
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to all tasks and filter in memory
    const unsubscribe = firebaseService.subscribeToAllTasks((allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--muted-foreground)' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid hsl(var(--border))', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
        <p style={{ fontWeight: 600 }}>Cargando métricas...</p>
      </div>
    );
  }

  // Get task instances assigned to the active user in projects they belong to
  const getMyTaskInstances = (): TaskInstance[] => {
    const instances: TaskInstance[] = [];
    const nowTime = new Date().getTime();

    tasks.forEach(task => {
      // Must be a project the user belongs to
      if (!projects.some(p => p.id === task.projectId)) return;

      // Must be assigned to the current user
      const isAssigned = task.assignedTo?.some(uidOrEmail => 
        uidOrEmail === currentUserProfile.uid || 
        uidOrEmail.toLowerCase() === currentUserProfile.email.toLowerCase()
      );
      if (!isAssigned) return;

      if (task.isRecurring && task.recurrenceStart && task.recurrenceEnd) {
        let curr = new Date(task.recurrenceStart);
        const end = new Date(task.recurrenceEnd);

        let iterations = 0;
        while (curr <= end && iterations < 366) {
          iterations++;
          const checkDate = new Date(curr);

          // Check if day of week matches
          let matches = true;
          if (task.recurrenceDays && task.recurrenceDays.length > 0) {
            const dayNamesShort = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
            const dayName = dayNamesShort[checkDate.getDay()];
            matches = task.recurrenceDays.includes(dayName);
          }

          // Check if day is an exception
          if (matches && task.exceptions && task.exceptions.some(exc => {
            const d1 = new Date(exc);
            return d1.getDate() === checkDate.getDate() &&
                   d1.getMonth() === checkDate.getMonth() &&
                   d1.getFullYear() === checkDate.getFullYear();
          })) {
            matches = false;
          }

          if (matches) {
            const dateStr = formatDateStr(checkDate);
            const completed = task.completedDates?.includes(dateStr) || false;
            
            const instanceTime = new Date(
              checkDate.getFullYear(), 
              checkDate.getMonth(), 
              checkDate.getDate(), 
              task.dueDate.getHours(), 
              task.dueDate.getMinutes()
            ).getTime();
            const expired = !completed && instanceTime < nowTime;

            instances.push({
              task,
              date: checkDate,
              completed,
              expired
            });
          }

          curr.setDate(curr.getDate() + 1);
        }
      } else {
        const completed = task.completed || false;
        const expired = !completed && task.dueDate.getTime() < nowTime;

        instances.push({
          task,
          date: task.dueDate,
          completed,
          expired
        });
      }
    });

    // Sort instances by date ascending
    return instances.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const myInstances = getMyTaskInstances();

  // Metrics
  const totalAssigned = myInstances.length;
  const completedTasks = myInstances.filter(i => i.completed).length;
  const pendingTasks = myInstances.filter(i => !i.completed).length;
  const overdueTasks = myInstances.filter(i => i.expired).length;

  // Filtered task lists
  const pendingList = myInstances.filter(i => !i.completed && !i.expired);
  const overdueList = myInstances.filter(i => i.expired);
  const completedList = myInstances.filter(i => i.completed);

  const activeList = 
    activeListTab === 'pending' ? pendingList :
    activeListTab === 'overdue' ? overdueList :
    completedList;

  const toggleTaskCompletion = async (task: Task, date: Date) => {
    try {
      if (task.isRecurring) {
        const dateStr = formatDateStr(date);
        const completedDates = task.completedDates || [];
        let newCompletedDates: string[];
        if (completedDates.includes(dateStr)) {
          newCompletedDates = completedDates.filter(d => d !== dateStr);
        } else {
          newCompletedDates = [...completedDates, dateStr];
        }
        await firebaseService.updateTask(task.id, { completedDates: newCompletedDates });
      } else {
        await firebaseService.updateTask(task.id, { completed: !task.completed });
      }
    } catch (err) {
      console.error("Error toggling completion:", err);
    }
  };

  const handleOpenDetail = (task: Task, date: Date) => {
    setSelectedTask(task);
    setModalInitialDate(date);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Metrics Row */}
      <div className="metrics-summary-grid">
        <div className="metric-card glass-panel">
          <div className="metric-card-header">
            <span className="metric-card-title">Tareas Asignadas</span>
            <ListTodo className="metric-card-icon text-muted" size={20} />
          </div>
          <div className="metric-card-value">{totalAssigned}</div>
          <div className="metric-card-desc">Total de instancias de tareas</div>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '4px solid #0d9668' }}>
          <div className="metric-card-header">
            <span className="metric-card-title">Completadas</span>
            <CheckCircle2 className="metric-card-icon" size={20} style={{ color: '#0d9668' }} />
          </div>
          <div className="metric-card-value" style={{ color: '#0d9668' }}>{completedTasks}</div>
          <div className="metric-card-desc">
            {totalAssigned > 0 ? `${Math.round((completedTasks / totalAssigned) * 100)}% de avance` : 'Sin tareas'}
          </div>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '4px solid hsl(var(--primary))' }}>
          <div className="metric-card-header">
            <span className="metric-card-title">Pendientes</span>
            <AlertTriangle className="metric-card-icon" size={20} style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <div className="metric-card-value" style={{ color: 'hsl(var(--primary))' }}>{pendingTasks}</div>
          <div className="metric-card-desc">Instancias por completar</div>
        </div>

        <div className="metric-card glass-panel" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="metric-card-header">
            <span className="metric-card-title">Vencidas</span>
            <AlertTriangle className="metric-card-icon" size={20} style={{ color: '#ef4444' }} />
          </div>
          <div className="metric-card-value" style={{ color: '#ef4444' }}>{overdueTasks}</div>
          <div className="metric-card-desc" style={{ color: overdueTasks > 0 ? '#ef4444' : 'inherit' }}>
            {overdueTasks > 0 ? 'Requiere atención inmediata' : 'Al corriente'}
          </div>
        </div>
      </div>

      {/* Task List Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={20} />
            Mi Listado de Actividades
          </h3>
          
          {/* List Tabs */}
          <div className="dashboard-list-tabs" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(28, 28, 28, 0.04)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveListTab('pending')}
              className={`dashboard-tab-btn ${activeListTab === 'pending' ? 'active' : ''}`}
            >
              Pendientes ({pendingList.length})
            </button>
            <button
              onClick={() => setActiveListTab('overdue')}
              className={`dashboard-tab-btn ${activeListTab === 'overdue' ? 'active' : ''}`}
              style={{ color: overdueList.length > 0 ? '#ef4444' : 'inherit' }}
            >
              Vencidas ({overdueList.length})
            </button>
            <button
              onClick={() => setActiveListTab('completed')}
              className={`dashboard-tab-btn ${activeListTab === 'completed' ? 'active' : ''}`}
            >
              Completadas ({completedList.length})
            </button>
          </div>
        </div>

        {/* List Content */}
        <div style={{ overflowX: 'auto' }}>
          {activeList.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', opacity: 0.6 }}>
              <ListTodo size={48} style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }} />
              <p style={{ fontWeight: 600, margin: 0 }}>No hay tareas en esta categoría</p>
            </div>
          ) : (
            <table className="user-dashboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '40px' }}></th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tarea</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Proyecto</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fecha de Vence</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Hora</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {activeList.map(({ task, date, completed, expired }) => {
                  const proj = projects.find(p => p.id === task.projectId);
                  return (
                    <tr 
                      key={`${task.id}-${formatDateStr(date)}`} 
                      className="user-dashboard-row" 
                      style={{ 
                        borderBottom: '1px solid hsl(var(--border) / 0.5)',
                        opacity: completed ? 0.7 : 1
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          className={`task-checkmark-btn ${completed ? 'completed' : ''}`}
                          onClick={() => toggleTaskCompletion(task, date)}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </button>
                      </td>
                      <td 
                        onClick={() => handleOpenDetail(task, date)}
                        style={{ padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer', textDecoration: completed ? 'line-through' : 'none' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{task.title}</span>
                          {task.isRecurring && (
                            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', fontWeight: 500 }}>Recurrente</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Folder size={14} />
                          {proj ? proj.name : 'Proyecto Desconocido'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: expired ? '#ef4444' : 'var(--text)', fontSize: '0.85rem', fontWeight: expired ? 600 : 500 }}>
                        {formatDisplayDate(date)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                        {formatDisplayTime(task.dueDate)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <span className={`priority-badge priority-${task.priority}`} style={{ display: 'inline-block' }}>
                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {isModalOpen && selectedTask && (
        <TaskDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTask(null);
            setModalInitialDate(null);
          }}
          task={selectedTask}
          initialDate={modalInitialDate}
          projectId={selectedTask.projectId}
          userRole={currentUserProfile.role}
          onSaved={() => {
            setIsModalOpen(false);
            setSelectedTask(null);
            setModalInitialDate(null);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;
