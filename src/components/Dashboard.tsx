import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CheckCircle2, AlertTriangle, ListTodo, FolderKanban } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import type { Task, Project } from '../../specs/001-project-task-calendar/contracts/firebase-service';

interface ProjectStats {
  project: Project;
  totalTasks: number;
  assignedTasks: number;
  completedTasks: number;
  expiredTasks: number;
}

interface DashboardProps {
  projects: Project[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeTasks = firebaseService.subscribeToAllTasks((allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--muted-foreground)' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid hsl(var(--border))', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
        <p style={{ fontWeight: 600 }}>Cargando métricas...</p>
      </div>
    );
  }

  // Helper to expand all tasks (recurring and non-recurring) into virtual instances
  const getTaskInstances = (taskList: Task[], projectsList: Project[]) => {
    const instances: { task: Task; date: Date; completed: boolean; expired: boolean }[] = [];
    const nowTime = new Date().getTime();

    taskList.forEach(task => {
      if (!projectsList.some(p => p.id === task.projectId)) return;

      if (task.isRecurring && task.recurrenceStart && task.recurrenceEnd) {
        let curr = new Date(task.recurrenceStart);
        const end = new Date(task.recurrenceEnd);

        let iterations = 0;
        while (curr <= end && iterations < 366) {
          iterations++;
          const checkDate = new Date(curr);

          let matches = true;
          if (task.recurrenceDays && task.recurrenceDays.length > 0) {
            const dayNamesShort = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
            const dayName = dayNamesShort[checkDate.getDay()];
            matches = task.recurrenceDays.includes(dayName);
          }

          if (matches && task.exceptions && task.exceptions.some(exc => {
            const d1 = new Date(exc);
            return d1.getDate() === checkDate.getDate() &&
                   d1.getMonth() === checkDate.getMonth() &&
                   d1.getFullYear() === checkDate.getFullYear();
          })) {
            matches = false;
          }

          if (matches) {
            const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
            const completed = task.completedDates?.includes(dateStr) || false;
            
            const instanceTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate(), task.dueDate.getHours(), task.dueDate.getMinutes()).getTime();
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

    return instances;
  };

  // General calculations
  const totalProjects = projects.length;
  const allInstances = getTaskInstances(tasks, projects);
  const totalTasks = allInstances.length;
  const completedTasks = allInstances.filter(i => i.completed).length;
  const expiredTasks = allInstances.filter(i => i.expired).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Stats breakdown by project
  const projectStatsList: ProjectStats[] = projects.map(proj => {
    const projInstances = allInstances.filter(i => i.task.projectId === proj.id);
    const total = projInstances.length;
    const completed = projInstances.filter(i => i.completed).length;
    const assigned = projInstances.filter(i => i.task.assignedTo && i.task.assignedTo.length > 0).length;
    const expired = projInstances.filter(i => i.expired).length;

    return {
      project: proj,
      totalTasks: total,
      assignedTasks: assigned,
      completedTasks: completed,
      expiredTasks: expired
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      
      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Total Projects */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#ffffff', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(28, 28, 28, 0.05)', color: 'hsl(var(--text))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proyectos Activos</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-h)', display: 'block', marginTop: '0.15rem' }}>{totalProjects}</span>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#ffffff', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 106, 82, 0.08)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListTodo size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tareas Totales</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-h)', display: 'block', marginTop: '0.15rem' }}>{totalTasks}</span>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#ffffff', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completadas</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-h)' }}>{completedTasks}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>({completionRate}%)</span>
            </div>
          </div>
        </div>

        {/* Expired Tasks */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#ffffff', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 68, 68, 0.08)', color: 'var(--priority-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiradas sin Completar</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--priority-high)', display: 'block', marginTop: '0.15rem' }}>{expiredTasks}</span>
          </div>
        </div>

      </div>

      {/* Projects Stats Grid */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '1rem' }}>
          <LayoutDashboard size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-h)' }}>Desglose por Proyecto</h3>
        </div>

        {projectStatsList.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
            No hay proyectos registrados para mostrar.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid hsl(var(--border))', color: 'var(--muted-foreground)', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Nombre del Proyecto</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Total Tareas</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Asignadas</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Completadas</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Progreso</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--priority-high)' }}>Expiradas</th>
                </tr>
              </thead>
              <tbody>
                {projectStatsList.map((stat) => {
                  const pct = stat.totalTasks > 0 ? Math.round((stat.completedTasks / stat.totalTasks) * 100) : 0;
                  return (
                    <tr key={stat.project.id} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)', transition: 'background-color 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-h)' }}>
                        {stat.project.name}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                        {stat.totalTasks}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(28, 28, 28, 0.04)', fontSize: '0.8rem', fontWeight: 700 }}>
                          {stat.assignedTasks} / {stat.totalTasks}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                          {stat.completedTasks} / {stat.totalTasks}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'hsl(var(--secondary))', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '30px' }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {stat.expiredTasks > 0 ? (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 68, 68, 0.08)', color: 'var(--priority-high)', fontSize: '0.8rem', fontWeight: 700 }}>
                            {stat.expiredTasks}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default Dashboard;
