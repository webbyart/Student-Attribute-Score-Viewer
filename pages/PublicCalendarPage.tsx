
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../components/ui/CalendarView';
import { Task } from '../types';
import { testDatabaseConnection, getAllTasks } from '../services/api';
import { supabase } from '../lib/supabaseClient';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TaskDetailModal from '../components/ui/TaskDetailModal';
import DayEventsModal from '../components/ui/DayEventsModal';

const PublicCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  useEffect(() => {
    fetchTasks();

    // Real-time Subscription to keep calendar up-to-date
    const channel = supabase.channel('public-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            fetchTasks();
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Update selected tasks when date or tasks change
  useEffect(() => {
    if (tasks.length > 0) {
        filterTasksByDate(selectedDate, tasks);
    }
  }, [tasks, selectedDate]);

  const fetchTasks = async () => {
      const data = await getAllTasks();
      setTasks(data);
      setLoading(false);
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header - Compact & Sticky */}
      <div className="bg-white px-4 py-3 shadow-sm flex justify-between items-center sticky top-0 z-20 shrink-0">
        <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                📅 ปฏิทินกิจกรรม
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
      <div className="flex-1 p-2 md:p-4 flex flex-col h-full w-full max-w-7xl mx-auto">
        <div className="flex-1 flex flex-col">
            <CalendarView tasks={tasks} onDateClick={handleDateClick} />
        </div>
        
        <div className="text-center text-xs text-slate-400 mt-2 pb-safe">
            แตะที่วันที่เพื่อดูรายการกิจกรรม
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
