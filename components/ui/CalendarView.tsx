
import React, { useState } from 'react';
import { Task } from '../../types';

interface CalendarViewProps {
  tasks: Task[];
  onDateClick?: (date: Date, tasks: Task[]) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const totalDays = daysInMonth(currentDate);
  const startDay = firstDayOfMonth(currentDate);

  const daysArray = Array.from({ length: 42 }, (_, i) => {
    const day = i - startDay + 1;
    return day > 0 && day <= totalDays ? day : null;
  });

  const getTasksForDay = (day: number) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === currentDate.getMonth() &&
        taskDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-purple-500 text-white">
        <button onClick={prevMonth} className="p-1 hover:bg-purple-600 rounded-full">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-lg font-bold">
          {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={nextMonth} className="p-1 hover:bg-purple-600 rounded-full">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 text-center border-b border-slate-100 bg-slate-50">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, i) => (
          <div key={i} className={`py-2 text-xs font-semibold ${i === 0 || i === 6 ? 'text-red-400' : 'text-slate-600'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {daysArray.map((day, index) => {
          if (!day) return <div key={index} className="h-20 bg-slate-50/30 border-b border-r border-slate-100"></div>;
          
          const dayTasks = getTasksForDay(day);
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div 
                key={index} 
                className={`h-24 p-1 border-b border-r border-slate-100 relative cursor-pointer hover:bg-purple-50 transition ${isToday ? 'bg-purple-50' : ''}`}
                onClick={() => onDateClick && onDateClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), dayTasks)}
            >
              <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-purple-600 text-white' : 'text-slate-700'}`}>
                {day}
              </span>
              
              <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                {dayTasks.slice(0, 3).map((task, i) => (
                    <div key={i} className={`text-[9px] px-1 py-0.5 rounded truncate ${task.category.includes('สอบ') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {task.title}
                    </div>
                ))}
                {dayTasks.length > 3 && (
                    <div className="text-[9px] text-slate-400 text-center">+{dayTasks.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
