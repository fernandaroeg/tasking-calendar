import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MoreVertical } from 'lucide-react';
import { firebaseService, getUserColor } from '../services/firebase';
import type { Task, UserProfile, Project } from '../../specs/001-project-task-calendar/contracts/firebase-service';
import TaskDetailModal from './TaskDetailModal';

interface CalendarGridProps {
  projectId: string;
  userRole: 'master_admin' | 'admin' | 'user';
  currentUserProfile: UserProfile;
  projects: Project[];
}

type CalendarView = 'month' | 'week' | 'day';

const isSameDay = (d1: Date | null, d2: Date | null): boolean => {
  if (!d1 || !d2) return false;
  return d1.getDate() === d2.getDate() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
};

const isDateInRange = (dateToCheck: Date, task: Task): boolean => {
  if (task.exceptions && task.exceptions.some(exc => isSameDay(exc, dateToCheck))) {
    return false;
  }

  if (task.isRecurring && task.recurrenceStart && task.recurrenceEnd) {
    const checkTime = new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate()).getTime();
    const startTime = new Date(task.recurrenceStart.getFullYear(), task.recurrenceStart.getMonth(), task.recurrenceStart.getDate()).getTime();
    const endTime = new Date(task.recurrenceEnd.getFullYear(), task.recurrenceEnd.getMonth(), task.recurrenceEnd.getDate()).getTime();
    
    if (checkTime >= startTime && checkTime <= endTime) {
      if (task.recurrenceDays && task.recurrenceDays.length > 0) {
        const dayNamesShort = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
        const dayName = dayNamesShort[dateToCheck.getDay()];
        return task.recurrenceDays.includes(dayName);
      }
      return true;
    }
    return false;
  }
  return isSameDay(dateToCheck, task.dueDate);
};
const formatTaskTime = (date: Date): string => {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

const formatDateStr = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isTaskCompletedOnDate = (task: Task, date: Date): boolean => {
  if (task.isRecurring) {
    const dateStr = formatDateStr(date);
    return task.completedDates?.includes(dateStr) || false;
  }
  return task.completed || false;
};

const toggleTaskCompletionOnDate = async (task: Task, date: Date) => {
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
};

const CalendarGrid: React.FC<CalendarGridProps> = ({ projectId, userRole, currentUserProfile, projects }) => {
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [activeKebabTaskId, setActiveKebabTaskId] = useState<string | null>(null);
  const [activeKebabDate, setActiveKebabDate] = useState<Date | null>(null);
  const [kebabPosition, setKebabPosition] = useState<{ top: number; left: number } | null>(null);

  const handleDeleteTaskOption = async (task: Task, date: Date, option: 'single' | 'all' | 'forward') => {
    try {
      if (option === 'single') {
        const exceptions = task.exceptions || [];
        const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (!exceptions.some(d => isSameDay(d, dateNorm))) {
          const newExceptions = [...exceptions, dateNorm];
          await firebaseService.updateTask(task.id, { exceptions: newExceptions });
        }
      } else if (option === 'forward') {
        const rStart = task.recurrenceStart || task.dueDate;
        const newEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        newEnd.setDate(newEnd.getDate() - 1);
        const rStartMidnight = new Date(rStart.getFullYear(), rStart.getMonth(), rStart.getDate());
        if (newEnd < rStartMidnight) {
          await firebaseService.deleteTask(task.id);
        } else {
          await firebaseService.updateTask(task.id, { recurrenceEnd: newEnd });
        }
      } else {
        await firebaseService.deleteTask(task.id);
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Error al eliminar la tarea.");
    }
  };

  // Close kebab menu on any global click
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveKebabTaskId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Load all users to display initials and colors
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const usrs = await firebaseService.getAllUsers();
        setRegisteredUsers(usrs);
      } catch (err) {
        console.error("Error loading users for calendar grid:", err);
      }
    };
    loadAllUsers();
  }, []);

  // Subscribe to tasks in real time when projectId changes
  useEffect(() => {
    if (projectId === 'all' || projectId === '') {
      const unsubscribe = firebaseService.subscribeToAllTasks((list) => {
        const userProjectsIds = projects.map(p => p.id);
        const myTasks = list.filter(t => 
          t.assignedTo && 
          t.assignedTo.includes(currentUserProfile.uid) &&
          userProjectsIds.includes(t.projectId)
        );
        setTasks(myTasks);
      });
      return () => unsubscribe();
    } else {
      const unsubscribe = firebaseService.subscribeToTasks(projectId, (list) => {
        setTasks(list);
      });
      return () => unsubscribe();
    }
  }, [projectId, currentUserProfile.uid, projects]);

  // Date Navigation Helpers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getHeaderTitle = (): string => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const year = currentDate.getFullYear();
    const month = months[currentDate.getMonth()];

    if (view === 'month') {
      return `${month} ${year}`;
    } else if (view === 'week') {
      // Get start and end of week
      const startOfWeek = new Date(currentDate);
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${months[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
      } else if (startOfWeek.getFullYear() === endOfWeek.getFullYear()) {
        return `${months[startOfWeek.getMonth()]} - ${months[endOfWeek.getMonth()]} ${startOfWeek.getFullYear()}`;
      } else {
        return `${months[startOfWeek.getMonth()]} ${startOfWeek.getFullYear()} - ${months[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
      }
    } else {
      // Day view
      return `${currentDate.getDate()} de ${month}, ${year}`;
    }
  };

  // ---------------------------------------------------------
  // Month Grid Calculator
  // ---------------------------------------------------------
  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of current month
    const firstDayOfMonth = new Date(year, month, 1);
    // Day of the week (0-6) of the first day
    let startDayOfWeek = firstDayOfMonth.getDay();
    // Adjust so week starts on Monday (Monday = 0, Sunday = 6)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Total days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const gridCells: React.ReactNode[] = [];

    // 1. Render days of previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cellDate = new Date(year, month - 1, dayNum);
      const isSelected = isSameDay(selectedDate, cellDate);
      gridCells.push(
        <div 
          key={`prev-${dayNum}`} 
          className={`calendar-cell outside ${isSelected ? 'selected-day' : ''}`}
          onClick={() => setSelectedDate(cellDate)}
        >
          <span className="day-number">{dayNum}</span>
          {renderTasksForDate(cellDate)}
        </div>
      );
    }

    // 2. Render days of current month
    const today = new Date();
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const cellDate = new Date(year, month, dayNum);
      const isToday = 
        today.getDate() === dayNum && 
        today.getMonth() === month && 
        today.getFullYear() === year;
      const isSelected = isSameDay(selectedDate, cellDate);

      gridCells.push(
        <div 
          key={`curr-${dayNum}`} 
          className={`calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected-day' : ''}`}
          onClick={() => setSelectedDate(cellDate)}
          onDoubleClick={() => handleOpenCreateModal(cellDate)}
        >
          <span className="day-number">{dayNum}</span>
          {renderTasksForDate(cellDate)}
        </div>
      );
    }

    // 3. Render days of next month to fill grid (assuming 42 cells total)
    const totalCells = gridCells.length;
    const remainingCells = 42 - totalCells;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const cellDate = new Date(year, month + 1, dayNum);
      const isSelected = isSameDay(selectedDate, cellDate);
      gridCells.push(
        <div 
          key={`next-${dayNum}`} 
          className={`calendar-cell outside ${isSelected ? 'selected-day' : ''}`}
          onClick={() => setSelectedDate(cellDate)}
        >
          <span className="day-number">{dayNum}</span>
          {renderTasksForDate(cellDate)}
        </div>
      );
    }

    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return (
      <div className="calendar-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: '750px', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '1px', flexShrink: 0 }}>
            {dayNames.map(name => (
              <div key={name} className="calendar-day-header">{name}</div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="calendar-grid-scroll-wrapper">
            <div className="calendar-grid" style={{ gridTemplateRows: 'repeat(6, minmax(135px, 1fr))', height: 'auto', minHeight: '100%' }}>
              {gridCells}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // Week Grid Calculator
  // ---------------------------------------------------------
  const renderWeekGrid = () => {
    // Get start of week (Monday)
    const startOfWeek = new Date(currentDate);
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const cellDate = new Date(startOfWeek);
      cellDate.setDate(startOfWeek.getDate() + i);
      weekDays.push(cellDate);
    }

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const today = new Date();

    return (
      <div className="calendar-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', flex: 1, minHeight: '400px', minWidth: '750px' }}>
          {weekDays.map((date, idx) => {
            const isToday = 
              today.getDate() === date.getDate() && 
              today.getMonth() === date.getMonth() && 
              today.getFullYear() === date.getFullYear();
            const isSelected = isSameDay(selectedDate, date);

            return (
              <div 
                key={idx} 
                className={`calendar-cell ${isToday ? 'today' : ''}`}
                style={{ 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: 'var(--radius)', 
                  background: isSelected ? 'rgba(128, 129, 133, 0.29)' : '#ffffff',
                  boxShadow: isSelected ? 'inset 0 0 0 2px rgba(128, 129, 133, 0.29)' : 'none'
                }}
                onClick={() => setSelectedDate(date)}
                onDoubleClick={() => handleOpenCreateModal(date)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>{dayNames[idx]}</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: isToday ? 'hsl(var(--primary))' : 'inherit' }}>{date.getDate()}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '2px 4px' }}>
                  {renderTasksForDate(date)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------
  // Day View Layout
  // ---------------------------------------------------------
  const renderDayView = () => {
    const dayTasks = tasks
      .filter(task => isDateInRange(currentDate, task))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return (
      <div className="calendar-container" style={{ gap: '1rem', height: '100%' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.75rem' }}>
            <h4 style={{ fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Tareas del Día</h4>
            <span className="badge badge-admin" style={{ padding: '0.25rem 0.6rem' }}>{dayTasks.length} Tareas</span>
          </div>

          {dayTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
              <Clock size={36} style={{ margin: '0 auto 1rem', display: 'block' }} />
              <p>No hay tareas programadas para este día.</p>
              <button 
                className="btn-primary" 
                onClick={() => handleOpenCreateModal(currentDate)} 
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Crear Tarea
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '4px' }}>
                {dayTasks.map(task => {
                  const borderLeftColor = '#FF6A52';
                  const isCompleted = isTaskCompletedOnDate(task, currentDate);

                  return (
                    <div 
                      key={task.id} 
                      className={`calendar-task-item ${isCompleted ? 'completed' : ''}`} 
                      onClick={() => handleOpenDetailModal(task, currentDate)}
                      style={{ 
                        fontSize: '0.9rem', 
                        padding: '1rem', 
                        borderRadius: 'var(--radius)', 
                        border: '1px solid hsl(var(--border))',
                        borderLeft: `5px solid ${borderLeftColor}`,
                        backgroundColor: '#ffffff',
                        color: 'hsl(var(--text))',
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                      }}
                    >
                      {/* Checkmark Button */}
                      <button
                        type="button"
                        className="task-checkmark-btn"
                        style={{ marginTop: '4px' }}
                        title={isCompleted ? "Marcar como no completada" : "Marcar como completada"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await toggleTaskCompletionOnDate(task, currentDate);
                          } catch (err) {
                            console.error("Error updating task completion:", err);
                          }
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </button>

                      {/* Content Container */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                            {/* Render Assignees Colored Initials Avatars */}
                            {task.assignedTo && task.assignedTo.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                {task.assignedTo.map(uid => {
                                  const u = registeredUsers.find(usr => usr.uid === uid || usr.email.toLowerCase() === uid.toLowerCase());
                                  const email = u ? u.email : (uid.includes('@') ? uid : '');
                                  if (!email) return null;
                                  const uColor = getUserColor(email);
                                  const initial = u ? u.displayName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
                                  return (
                                    <div
                                      key={uid}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: uColor,
                                        color: '#ffffff',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid #ffffff',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        flexShrink: 0
                                      }}
                                      title={u ? u.displayName : email.split('@')[0]}
                                    >
                                      {initial}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            <span style={{ fontWeight: 700, textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, position: 'relative' }}>
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                            {formatTaskTime(task.dueDate)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeKebabTaskId === task.id) {
                                setActiveKebabTaskId(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setKebabPosition({
                                  top: rect.bottom,
                                  left: Math.max(10, rect.right - 160)
                                });
                                setActiveKebabTaskId(task.id);
                                setActiveKebabDate(currentDate);
                              }
                            }}
                            style={{
                              padding: '4px',
                              borderRadius: '4px',
                              color: 'hsl(var(--muted-foreground))',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            className="btn-icon"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        </div>

                        {task.description && (
                          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                            {task.description.replace(/<[^>]*>/g, '')}
                          </p>
                        )}
                        {task.labels && task.labels.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                            {task.labels.map((lbl, idx) => (
                              <span key={idx} style={{ padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.65rem', background: `${lbl.color}25`, color: lbl.color, border: `1px solid ${lbl.color}40` }}>
                                {lbl.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => handleOpenCreateModal(currentDate)}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  color: 'hsl(var(--muted-foreground))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s'
                }}
                className="create-task-link"
              >
                <span>+ Nueva tarea</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Helper to filter and render tasks on a cell
  const renderTasksForDate = (date: Date) => {
    const dayTasks = tasks
      .filter(task => isDateInRange(date, task))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '2px', flex: 1 }}>
        {dayTasks.map(task => {
          // Find first assignee to set left border color
          const borderLeftColor = '#FF6A52';
          const isCompleted = isTaskCompletedOnDate(task, date);

          return (
            <div
              key={task.id}
              className={`calendar-task-item ${isCompleted ? 'completed' : ''}`}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid hsl(var(--border))',
                borderLeft: `4px solid ${borderLeftColor}`,
                color: 'hsl(var(--text))',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'row',
                gap: '0.35rem',
                alignItems: 'flex-start'
              }}
              onClick={(e) => {
                e.stopPropagation(); // Avoid triggering cell double-click
                handleOpenDetailModal(task, date);
              }}
            >
              {/* Checkmark Button */}
              <button
                type="button"
                className="task-checkmark-btn"
                title={isCompleted ? "Marcar como no completada" : "Marcar como completada"}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await toggleTaskCompletionOnDate(task, date);
                  } catch (err) {
                    console.error("Error updating task completion:", err);
                  }
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>

              {/* Content Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                {/* Row 1: Title (left) & Kebab (right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.35rem' }}>
                  <span className="calendar-task-title" style={{ flex: 1, fontWeight: 600, fontSize: '0.8rem', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.title}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeKebabTaskId === task.id) {
                          setActiveKebabTaskId(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setKebabPosition({
                            top: rect.bottom,
                            left: Math.max(10, rect.right - 160)
                          });
                          setActiveKebabTaskId(task.id);
                          setActiveKebabDate(date);
                        }
                      }}
                      style={{
                        padding: '2px',
                        borderRadius: '4px',
                        color: 'hsl(var(--muted-foreground))',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      className="btn-icon"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>

                {/* Row 2: Time & Avatars */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.35rem', marginTop: '0.1rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 500, flexShrink: 0 }}>
                    {formatTaskTime(task.dueDate)}
                  </span>

                  {task.assignedTo && task.assignedTo.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.15rem', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                      {task.assignedTo.map(uid => {
                        const u = registeredUsers.find(usr => usr.uid === uid || usr.email.toLowerCase() === uid.toLowerCase());
                        const email = u ? u.email : (uid.includes('@') ? uid : '');
                        if (!email) return null;
                        const uColor = getUserColor(email);
                        const initial = u ? u.displayName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();
                        return (
                          <div
                            key={uid}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              backgroundColor: uColor,
                              color: '#ffffff',
                              fontSize: '0.55rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #ffffff',
                              flexShrink: 0
                            }}
                            title={u ? u.displayName : email.split('@')[0]}
                          >
                            {initial}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenCreateModal(date);
          }}
          style={{
            marginTop: 'auto',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            color: 'hsl(var(--muted-foreground))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s'
          }}
          className="create-task-link"
        >
          <span>+ Nueva tarea</span>
        </button>
      </div>
    );
  };

  // Modal Open Handlers
  const handleOpenDetailModal = (task: Task, date: Date) => {
    setSelectedTask(task);
    setModalInitialDate(date);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = (date: Date) => {
    setSelectedTask(null);
    setModalInitialDate(date);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Calendar Navigation Toolbar */}
      <div className="calendar-header-toolbar" style={{ gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-primary" style={{ gap: '0.5rem' }} onClick={() => handleOpenCreateModal(selectedDate)}>
            <Plus size={16} />
            Nueva Tarea
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={handlePrev}>
              <ChevronLeft size={16} />
            </button>
            <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleToday}>
              Hoy
            </button>
            <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={handleNext}>
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-h)', letterSpacing: '-0.02em', margin: 0 }}>
            {getHeaderTitle()}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: 'hsl(var(--secondary))', padding: '0.25rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))' }}>
            <button
              className="btn-secondary"
              style={{ 
                padding: '0.4rem 1rem', 
                fontSize: '0.85rem', 
                border: 'none', 
                borderRadius: 'calc(var(--radius) - 2px)',
                backgroundColor: view === 'month' ? 'hsl(var(--primary))' : 'transparent',
                color: view === 'month' ? 'hsl(var(--primary-foreground))' : 'inherit'
              }}
              onClick={() => setView('month')}
            >
              Mes
            </button>
            <button
              className="btn-secondary"
              style={{ 
                padding: '0.4rem 1rem', 
                fontSize: '0.85rem', 
                border: 'none', 
                borderRadius: 'calc(var(--radius) - 2px)',
                backgroundColor: view === 'week' ? 'hsl(var(--primary))' : 'transparent',
                color: view === 'week' ? 'hsl(var(--primary-foreground))' : 'inherit'
              }}
              onClick={() => setView('week')}
            >
              Semana
            </button>
            <button
              className="btn-secondary"
              style={{ 
                padding: '0.4rem 1rem', 
                fontSize: '0.85rem', 
                border: 'none', 
                borderRadius: 'calc(var(--radius) - 2px)',
                backgroundColor: view === 'day' ? 'hsl(var(--primary))' : 'transparent',
                color: view === 'day' ? 'hsl(var(--primary-foreground))' : 'inherit'
              }}
              onClick={() => setView('day')}
            >
              Día
            </button>
          </div>
        </div>
      </div>

      {/* Render Dynamic Calendar View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {view === 'month' && renderMonthGrid()}
        {view === 'week' && renderWeekGrid()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Task Creation & Detail Modal popup */}
      {isModalOpen && (
        <TaskDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          task={selectedTask}
          initialDate={modalInitialDate}
          projectId={projectId}
          userRole={userRole}
          onSaved={() => setIsModalOpen(false)}
        />
      )}

      {/* Global Kebab Dropdown Menu */}
      {activeKebabTaskId && kebabPosition && activeKebabDate && (
        <div
          style={{
            position: 'fixed',
            top: `${kebabPosition.top}px`,
            left: `${kebabPosition.left}px`,
            backgroundColor: '#ffffff',
            border: '1px solid hsl(var(--border))',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 9999,
            minWidth: '160px',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking menu itself
        >
          {(() => {
            const task = tasks.find(t => t.id === activeKebabTaskId);
            if (!task) return null;
            return task.isRecurring ? (
              <>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setActiveKebabTaskId(null);
                    if (window.confirm('¿Estás seguro de que deseas eliminar solo esta tarea?')) {
                      await handleDeleteTaskOption(task, activeKebabDate, 'single');
                    }
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    color: 'hsl(var(--primary))',
                    fontWeight: 600,
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    justifyContent: 'flex-start',
                    background: 'transparent',
                    border: 'none'
                  }}
                  className="rich-text-btn"
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setActiveKebabTaskId(null);
                    if (window.confirm('¿Estás seguro de que deseas eliminar todas las tareas de la serie recursiva?')) {
                      await handleDeleteTaskOption(task, activeKebabDate, 'all');
                    }
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    color: 'hsl(var(--primary))',
                    fontWeight: 600,
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    justifyContent: 'flex-start',
                    borderTop: '1px solid hsl(var(--border))',
                    background: 'transparent',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: 'none'
                  }}
                  className="rich-text-btn"
                >
                  Eliminar todas
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setActiveKebabTaskId(null);
                    if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea y todas las posteriores de la serie?')) {
                      await handleDeleteTaskOption(task, activeKebabDate, 'forward');
                    }
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    color: 'hsl(var(--primary))',
                    fontWeight: 600,
                    textAlign: 'left',
                    width: '100%',
                    cursor: 'pointer',
                    justifyContent: 'flex-start',
                    borderTop: '1px solid hsl(var(--border))',
                    background: 'transparent',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: 'none'
                  }}
                  className="rich-text-btn"
                >
                  Eliminar hacia delante
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  setActiveKebabTaskId(null);
                  if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                    await handleDeleteTaskOption(task, activeKebabDate, 'all');
                  }
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  color: 'hsl(var(--primary))',
                  fontWeight: 600,
                  textAlign: 'left',
                  width: '100%',
                  cursor: 'pointer',
                  justifyContent: 'flex-start',
                  background: 'transparent',
                  border: 'none'
                }}
                className="rich-text-btn"
              >
                Eliminar
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default CalendarGrid;
