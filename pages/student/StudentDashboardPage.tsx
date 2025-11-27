
import React from 'react';
import Card from '../../components/ui/Card';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { StudentData, TaskCategory } from '../../types';

const StudentDashboardPage: React.FC = () => {
  const { student, tasks } = useOutletContext<StudentData>();
  const navigate = useNavigate();

  // Filter tasks due in the future for notifications area
  const upcomingTasks = tasks
    .filter(t => new Date(t.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3); // Show only top 3

  const menus = [
    { label: TaskCategory.CLASS_SCHEDULE, icon: '📅', color: 'bg-blue-100 text-blue-600' },
    { label: TaskCategory.EXAM_SCHEDULE, icon: '📝', color: 'bg-red-100 text-red-600' },
    { label: TaskCategory.HOMEWORK, icon: '📚', color: 'bg-yellow-100 text-yellow-700' },
    { label: TaskCategory.ACTIVITY_INSIDE, icon: '🏫', color: 'bg-green-100 text-green-600' },
    { label: TaskCategory.ACTIVITY_OUTSIDE, icon: '🚌', color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Profile */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
            <img
            src={student.profileImageUrl}
            alt={student.student_name}
            className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover"
            />
            <div>
            <h2 className="text-xl font-bold text-slate-800">{student.student_name}</h2>
            <p className="text-xs text-slate-500">{student.grade}/{student.classroom} ID: {student.student_id}</p>
            </div>
        </div>
        <div className="relative p-2 bg-white rounded-full shadow-sm">
             <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
             </svg>
             {upcomingTasks.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
        </div>
      </div>

      {/* Main Menu Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-3">เมนูหลัก</h2>
        <div className="grid grid-cols-3 gap-3">
            {menus.map((menu) => (
                <button 
                    key={menu.label}
                    onClick={() => navigate(`categories`)} 
                    className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-slate-50 aspect-square"
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 ${menu.color}`}>
                        {menu.icon}
                    </div>
                    <span className="text-xs font-medium text-slate-600 text-center leading-tight">{menu.label}</span>
                </button>
            ))}
             <button 
                onClick={() => navigate(`schedule`)}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-slate-50 aspect-square"
            >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2 bg-slate-100 text-slate-600">
                    🗓️
                </div>
                <span className="text-xs font-medium text-slate-600 text-center">ปฏิทินรวม</span>
            </button>
        </div>
      </div>

      {/* Notification / Upcoming Feed */}
      <div>
        <div className="flex justify-between items-center mb-3">
             <h2 className="text-lg font-bold text-slate-700">การแจ้งเตือนล่าสุด</h2>
             <span className="text-xs text-purple-600 cursor-pointer" onClick={() => navigate('schedule')}>ดูทั้งหมด</span>
        </div>
      
        {upcomingTasks.length > 0 ? (
            <div className="space-y-3">
                {upcomingTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-purple-500 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">{task.category}</span>
                                {new Date(task.dueDate).getTime() - new Date().getTime() < 86400000 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">ด่วน</span>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm">{task.title}</h3>
                            <p className="text-xs text-slate-500">{task.subject}</p>
                        </div>
                         <div className="text-right">
                             <p className="text-xs font-bold text-slate-700">{new Date(task.dueDate).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
                             <p className="text-[10px] text-slate-400">{new Date(task.dueDate).toLocaleDateString('th-TH', {day: 'numeric', month:'short'})}</p>
                         </div>
                    </div>
                ))}
            </div>
        ) : (
            <Card className="text-center py-8 text-slate-500 text-sm">
                ไม่มีรายการแจ้งเตือนใหม่
            </Card>
        )}
      </div>
    </div>
  );
};

export default StudentDashboardPage;
