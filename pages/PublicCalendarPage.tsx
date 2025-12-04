
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../components/ui/CalendarView';
import { Task } from '../types';
import { getAllTasks } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TaskDetailModal from '../components/ui/TaskDetailModal';
import DayEventsModal from '../components/ui/DayEventsModal';

const PublicCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
        filterTasksByDate(selectedDate, tasks);
    }
  }, [tasks, selectedDate]);

  const fetchTasks = async () => {
      try {
        const data = await getAllTasks();
        setTasks(data);
      } catch (e) {
        console.error("Failed to load calendar tasks", e);
      } finally {
        setLoading(false);
      }
  };

  const filterTasksByDate = (date: Date, allTasks: Task[]) => {
      const filtered = allTasks.filter(task => {
          const tDate = new Date(task.dueDate);
          return tDate.getDate() === date.getDate() && 
                 tDate.getMonth() === date.getMonth() &&
                 tDate.getFullYear() === date.getFullYear();
      });
      setSelectedTasks(filtered);
  };

  const handleDateClick = (date: Date, _dayTasks: Task[]) => {
      setSelectedDate(date);
      filterTasksByDate(date, tasks);
      setIsDayModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
      setSelectedTaskForModal(task);
  }

  if (loading) {
      return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header - Compact & Sticky */}
      <div className="bg-white px-4 py-3 shadow-sm flex justify-between items-center z-20 shrink-0 border-b border-slate-200">
        <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                📅 ปฏิทินกิจกรรมโรงเรียน
            </h1>
        </div>
        <button 
            onClick={() => navigate('/login-select')}
            className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md hover:bg-purple-700 transition"
        >
            เข้าสู่ระบบ
        </button>
      </div>

      {/* Main Content - Full Height / Responsive */}
      <div className="flex-1 p-0 md:p-4 flex flex-col h-full w-full overflow-hidden">
        <div className="flex-1 flex flex-col h-full bg-white md:rounded-xl md:shadow-sm md:border md:border-slate-200 overflow-hidden">
            <CalendarView tasks={tasks} onDateClick={handleDateClick} />
        </div>
      </div>

      {/* Day Events Modal */}
      {isDayModalOpen && (
          <DayEventsModal 
            date={selectedDate}
            tasks={selectedTasks}
            onClose={() => setIsDayModalOpen(false)}
            onTaskClick={handleTaskClick}
          />
      )}

      {/* Task Detail Modal */}
      {selectedTaskForModal && (
          <TaskDetailModal 
            task={selectedTaskForModal} 
            onClose={() => setSelectedTaskForModal(null)} 
          />
      )}
    </div>
  );
};

export default PublicCalendarPage;
