import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { firebaseService } from '../services/firebase';
import type { Task } from '../../specs/001-project-task-calendar/contracts/firebase-service';
import TaskDetailModal from './TaskDetailModal';

interface CalendarGridProps {
  projectId: string;
  userRole: 'master_admin' | 'admin' | 'user';
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
    return checkTime >= startTime && checkTime <= endTime;
  }
  return isSameDay(dateToCheck, task.dueDate);
};

const CalendarGrid: React.FC<CalendarGridProps> = ({ projectId, userRole }) => {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Subscribe to tasks in real time when projectId changes
  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToTasks(projectId, (list) => {
      setTasks(list);
    });
    return () => unsubscribe();
  }, [projectId]);

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
          style={{ 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: 'var(--radius)', 
                  background: isSelected ? 'rgba(128, 129, 133, 0.29)' : '#ffffff',
                  boxShadow: isSelected ? 'inset 0 0 0 2px rgba(128, 129, 133, 0.29)' : 'none'
                }}
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
      <div className="calendar-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '1px' }}>
          {dayNames.map(name => (
            <div key={name} className="calendar-day-header">{name}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {gridCells}
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
      <div className="calendar-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', flex: 1, minHeight: '400px' }}>
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
    const dayTasks = tasks.filter(task => isDateInRange(currentDate, task));

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '4px' }}>
              {dayTasks.map(task => (
                <div 
                  key={task.id} 
                  className={`calendar-task-item priority-${task.priority}`} 
                  onClick={() => handleOpenDetailModal(task, currentDate)}
                  style={{ 
                    fontSize: '0.9rem', 
                    padding: '1rem', 
                    borderRadius: 'var(--radius)', 
                    borderLeftWidth: '5px',
                    backgroundColor: task.color ? `${task.color}15` : undefined,
                    borderLeftColor: task.color || undefined,
                    color: task.color || undefined
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700 }}>{task.title}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`priority-pill priority-${task.priority}`}>
                        {task.priority === 'high' ? 'HIGH' : task.priority === 'medium' ? 'MED' : 'LOW'}
                      </span>
                    </div>
                  </div>
                  {task.description && (
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                  {task.labels && task.labels.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {task.labels.map((lbl, idx) => (
                        <span key={idx} style={{ padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.65rem', background: `${lbl.color}25`, color: lbl.color, border: `1px solid ${lbl.color}40` }}>
                          {lbl.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper to filter and render tasks on a cell
  const renderTasksForDate = (date: Date) => {
    const dayTasks = tasks.filter(task => isDateInRange(date, task));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '2px' }}>
        {dayTasks.map(task => (
          <div
            key={task.id}
            className={`calendar-task-item priority-${task.priority}`}
            style={{
              backgroundColor: task.color ? `${task.color}15` : undefined,
              borderLeft: task.color ? `4px solid ${task.color}` : undefined,
              color: task.color || undefined
            }}
            onClick={(e) => {
              e.stopPropagation(); // Avoid triggering cell double-click
              handleOpenDetailModal(task, date);
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.25rem' }}>
              <span className="calendar-task-title" style={{ flex: 1 }}>{task.title}</span>
              <span className={`priority-pill priority-${task.priority}`}>
                {task.priority === 'high' ? 'HIGH' : task.priority === 'medium' ? 'MED' : 'LOW'}
              </span>
            </div>
          </div>
        ))}
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
      <div className="calendar-header-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={handlePrev}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleToday}>
            Hoy
          </button>
          <button className="btn-secondary" style={{ padding: '0.5rem' }} onClick={handleNext}>
            <ChevronRight size={16} />
          </button>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, marginLeft: '1rem', color: 'var(--text-h)' }}>
            {getHeaderTitle()}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          <button className="btn-primary" style={{ gap: '0.5rem' }} onClick={() => handleOpenCreateModal(selectedDate)}>
            <Plus size={16} />
            Nueva Tarea
          </button>
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
    </div>
  );
};

export default CalendarGrid;
