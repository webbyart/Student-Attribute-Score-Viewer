
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../components/ui/CalendarView';
import { MOCK_TASKS } from '../data/mockData';
import Card from '../components/ui/Card';
import { Task } from '../types';

const PublicCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);

  // Initialize with today's tasks
  React.useEffect(() => {
    const today = new Date();
    const todaysTasks = MOCK_TASKS.filter(task => {
        const tDate = new Date(task.dueDate);
        return tDate.getDate() === today.getDate() && 
               tDate.getMonth() === today.getMonth() &&
               tDate.getFullYear() === today.getFullYear();
    });
    setSelectedTasks(todaysTasks);
  }, []);

  const handleDateClick = (date: Date, tasks: Task[]) => {
      setSelectedDate(date);
      setSelectedTasks(tasks);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
        <div>
            <h1 className="text-xl font-bold text-slate-800">ตารางกิจกรรม</h1>
            <p className="text-xs text-slate-500">โรงเรียนของเรา</p>
        </div>
        <button 
            onClick={() => navigate('/login-select')}
            className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md hover:bg-slate-700 transition"
        >
            เข้าสู่ระบบ
        </button>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Calendar */}
        <CalendarView tasks={MOCK_TASKS} onDateClick={handleDateClick} />

        {/* Selected Date Details */}
        <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                {selectedDate ? selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric'}) : 'วันนี้'}
            </h2>
            
            {selectedTasks.length > 0 ? (
                selectedTasks.map(task => (
                    <Card key={task.id} className="border-l-4 border-l-purple-500">
                         <div className="flex justify-between items-start">
                             <div>
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded mb-1 inline-block">{task.category}</span>
                                <h3 className="font-bold text-slate-800">{task.title}</h3>
                                <p className="text-xs text-slate-500">{task.subject}</p>
                             </div>
                             <span className="text-xs font-bold text-slate-400">
                                 {new Date(task.dueDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit'})}
                             </span>
                         </div>
                    </Card>
                ))
            ) : (
                <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-100">
                    ไม่มีกิจกรรมในวันนี้
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PublicCalendarPage;
