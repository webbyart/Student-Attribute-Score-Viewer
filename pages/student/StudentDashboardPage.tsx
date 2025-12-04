
import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { StudentData, TaskCategory, TaskCategoryLabel, Task } from '../../types';
import { markNotificationRead, toggleTaskStatus, sendCompletionNotification } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const StudentDashboardPage: React.FC = () => {
  const contextData = useOutletContext<StudentData>();
  const [localTasks, setLocalTasks] = useState<Task[]>(contextData.tasks);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'All' | TaskCategory>('All');
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { student } = contextData;

  useEffect(() => {
    setLocalTasks(contextData.tasks);
  }, [contextData.tasks]);

  const { notifications } = contextData;

  const upcomingTasks = localTasks
    .filter(t => !t.isCompleted && new Date(t.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3); 

  const unreadCount = notifications.filter(n => !n.is_read && !readNotificationIds.has(n.id)).length;

  const filteredNotifications = notifications.filter(n => {
      if (notificationFilter === 'All') return true;
      const associatedTask = contextData.tasks.find(t => t.id === n.task_id);
      return associatedTask?.category === notificationFilter;
  });

  const totalTasks = localTasks.length;
  const completedTasksCount = localTasks.filter(t => t.isCompleted).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  const now = new Date();
  const overdueTasksCount = localTasks.filter(t => !t.isCompleted && new Date(t.dueDate) < now).length;
  const pendingTasksCount = localTasks.filter(t => !t.isCompleted && new Date(t.dueDate) >= now).length;

  const handleNotificationClick = async () => {
      setShowNotifications(!showNotifications);
  }
  
  const handleMarkAsRead = (nId: string) => {
      markNotificationRead(nId);
      setReadNotificationIds(prev => new Set(prev).add(nId));
  }

  const handleToggleTask = async (task: Task) => {
      const newStatus = !task.isCompleted;
      
      // Optimistic Update
      setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: newStatus } : t));

      try {
        await toggleTaskStatus(student.student_id, task.id, newStatus);
        
        // Send notification to teacher if completed
        if (newStatus === true) {
            await sendCompletionNotification(student.student_name, task.title);
        }
      } catch (error) {
        console.error("Failed to toggle task", error);
        // Revert optimistic update on error
        setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !newStatus } : t));
      }
  };

  const handleLogout = () => {
      if(window.confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
          logout();
          navigate('/login-select');
      }
  }

  const menus = [
    { label: TaskCategoryLabel[TaskCategory.CLASS_SCHEDULE], category: TaskCategory.CLASS_SCHEDULE, icon: '📅', color: 'bg-blue-100 text-blue-600' },
    { label: TaskCategoryLabel[TaskCategory.EXAM_SCHEDULE], category: TaskCategory.EXAM_SCHEDULE, icon: '📝', color: 'bg-red-100 text-red-600' },
    { label: TaskCategoryLabel[TaskCategory.HOMEWORK], category: TaskCategory.HOMEWORK, icon: '📚', color: 'bg-yellow-100 text-yellow-700' },
    { label: TaskCategoryLabel[TaskCategory.ACTIVITY_INSIDE], category: TaskCategory.ACTIVITY_INSIDE, icon: '🏫', color: 'bg-green-100 text-green-600' },
    { label: TaskCategoryLabel[TaskCategory.ACTIVITY_OUTSIDE], category: TaskCategory.ACTIVITY_OUTSIDE, icon: '🚌', color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
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
        
        <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative cursor-pointer">
                <div onClick={handleNotificationClick} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition relative">
                    <svg className={`w-6 h-6 ${unreadCount > 0 ? 'text-purple-600 animate-pulse' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                </div>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl z-50 border border-slate-100 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-purple-50 p-3 border-b border-purple-100 flex justify-between items-center">
                            <h3 className="font-bold text-purple-800 text-sm">การแจ้งเตือน</h3>
                            <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        
                        {/* Filter Dropdown */}
                        <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                            <select 
                                value={notificationFilter} 
                                onChange={(e) => setNotificationFilter(e.target.value as any)}
                                className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-400 text-slate-600 bg-white"
                            >
                                <option value="All">ทั้งหมด</option>
                                {Object.values(TaskCategory).map(cat => (
                                    <option key={cat} value={cat}>{TaskCategoryLabel[cat]}</option>
                                ))}
                            </select>
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            {filteredNotifications.length > 0 ? filteredNotifications.map(n => {
                                const isRead = n.is_read || readNotificationIds.has(n.id);
                                return (
                                    <div key={n.id} onClick={() => handleMarkAsRead(n.id)} className={`p-3 border-b border-slate-50 text-sm cursor-pointer hover:bg-slate-50 transition-colors ${isRead ? 'bg-white opacity-60' : 'bg-blue-50'}`}>
                                        <p className="text-slate-800 font-medium text-xs leading-snug">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                            <span>{new Date(n.created_at).toLocaleDateString('th-TH', { hour: '2-digit', minute:'2-digit' })}</span>
                                            {!isRead && <span className="text-blue-500 font-bold">• ใหม่</span>}
                                        </p>
                                    </div>
                                );
                            }) : (
                                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center">
                                    <span className="text-2xl mb-1">🔕</span>
                                    ไม่มีการแจ้งเตือนในหมวดนี้
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

             {/* Logout Button */}
            <button 
                onClick={handleLogout}
                className="p-2 bg-red-50 text-red-500 rounded-full shadow-sm hover:bg-red-100 transition"
                title="ออกจากระบบ"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-none shadow-lg shadow-indigo-200/50 relative overflow-hidden transform transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <h3 className="font-bold text-lg mb-1">ความคืบหน้า</h3>
                    <p className="text-xs text-indigo-100 opacity-90">เสร็จสิ้น {completedTasksCount} จาก {totalTasks} งาน</p>
                </div>
                <div className="text-4xl font-black tracking-tight">{progressPercentage}%</div>
            </div>
            <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm">
                <div className="bg-white h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
      </Card>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-green-500">{completedTasksCount}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">เสร็จแล้ว</span>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-yellow-500">{pendingTasksCount}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">รอทำ</span>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-red-500">{overdueTasksCount}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">เลยกำหนด</span>
          </div>
      </div>

      {/* Main Menu Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-3">เมนูหลัก</h2>
        <div className="grid grid-cols-3 gap-3">
            {menus.map((menu) => {
                // Calculate pending tasks count for this category
                const count = localTasks.filter(t => t.category === menu.category && !t.isCompleted).length;
                
                return (
                    <button 
                        key={menu.category}
                        onClick={() => navigate(`categories`)} 
                        className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-slate-50 aspect-square group active:scale-95 relative"
                    >
                        {count > 0 && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-sm">
                                {count}
                            </div>
                        )}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 transition-transform group-hover:scale-110 ${menu.color}`}>
                            {menu.icon}
                        </div>
                        <span className="text-xs font-bold text-slate-600 text-center leading-tight">{menu.label}</span>
                    </button>
                )
            })}
             <button 
                onClick={() => navigate(`schedule`)}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-slate-50 aspect-square group active:scale-95"
            >
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 bg-slate-100 text-slate-600 transition-transform group-hover:scale-110">
                    🗓️
                </div>
                <span className="text-xs font-bold text-slate-600 text-center">ปฏิทินรวม</span>
            </button>
        </div>
      </div>

      {/* Upcoming Tasks Feed */}
      <div>
        <div className="flex justify-between items-center mb-3">
             <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                ⏳ งานที่ต้องทำเร็วๆ นี้
             </h2>
             <span className="text-xs font-bold text-purple-600 cursor-pointer bg-purple-50 px-2 py-1 rounded-lg hover:bg-purple-100 transition" onClick={() => navigate('schedule')}>ดูทั้งหมด →</span>
        </div>
      
        {upcomingTasks.length > 0 ? (
            <div className="space-y-3">
                {upcomingTasks.map(task => {
                    let priorityBadge = null;
                    if(task.priority === 'High') priorityBadge = <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold border border-red-200">High</span>
                    
                    const isUrgent = new Date(task.dueDate).getTime() - new Date().getTime() < 86400000;
                    
                    const statusColor = isUrgent ? 'bg-red-500' : 'bg-slate-300';

                    return (
                        <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group hover:shadow-md transition-all hover:border-purple-200">
                            <div className="flex items-start gap-3 flex-1 min-w-0 mr-3">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusColor} mt-1.5 shrink-0 ${isUrgent ? 'animate-pulse' : ''}`} />
                                
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">{TaskCategoryLabel[task.category]}</span>
                                        {priorityBadge}
                                        {isUrgent && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-bold animate-pulse">ด่วน</span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{task.title}</h3>
                                    <p className="text-xs text-slate-500 truncate">{task.subject}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                 <div className="text-right">
                                     <p className={`text-xs font-bold ${isUrgent ? 'text-red-600' : 'text-slate-700'}`}>{new Date(task.dueDate).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
                                     <p className="text-[10px] text-slate-400 font-medium">{new Date(task.dueDate).toLocaleDateString('th-TH', {day: 'numeric', month:'short'})}</p>
                                 </div>
                                 <button 
                                    onClick={() => handleToggleTask(task)}
                                    className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center hover:bg-green-50 hover:border-green-500 hover:text-green-500 transition-all group-hover:border-slate-300"
                                 >
                                     <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-400 hover:!text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                 </button>
                             </div>
                        </div>
                    )
                })}
            </div>
        ) : (
            <Card className="text-center py-10 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                <span className="text-4xl mb-3">🎉</span>
                <p className="text-slate-500 text-sm font-medium">ไม่มีงานค้างที่ใกล้ถึงกำหนด!</p>
                <p className="text-slate-400 text-xs">พักผ่อนให้สบาย หรือทบทวนบทเรียนล่วงหน้าได้เลย</p>
            </Card>
        )}
      </div>
    </div>
  );
};

export default StudentDashboardPage;
