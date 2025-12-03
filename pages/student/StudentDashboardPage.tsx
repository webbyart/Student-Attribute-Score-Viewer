
import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { StudentData, TaskCategory, TaskCategoryLabel, Task } from '../../types';
import { markNotificationRead, toggleTaskStatus } from '../../services/api';

const StudentDashboardPage: React.FC = () => {
  // We need local state for tasks to update UI instantly when checked
  const contextData = useOutletContext<StudentData>();
  const [localTasks, setLocalTasks] = useState<Task[]>(contextData.tasks);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'All' | TaskCategory>('All');
  
  // Local state for read notifications to update UI instantly without full refresh
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const navigate = useNavigate();

  useEffect(() => {
    setLocalTasks(contextData.tasks);
  }, [contextData.tasks]);

  const { student, notifications } = contextData;

  // Filter tasks due in the future for notifications area
  const upcomingTasks = localTasks
    .filter(t => !t.isCompleted && new Date(t.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3); // Show only top 3

  // Calculate unread count filtering out locally read IDs
  const unreadCount = notifications.filter(n => !n.is_read && !readNotificationIds.has(n.id)).length;

  // Notification Filter Logic
  const filteredNotifications = notifications.filter(n => {
      if (notificationFilter === 'All') return true;
      const associatedTask = contextData.tasks.find(t => t.id === n.task_id);
      return associatedTask?.category === notificationFilter;
  });

  // Progress Calculation
  const totalTasks = localTasks.length;
  const completedTasks = localTasks.filter(t => t.isCompleted).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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

      // API Call
      await toggleTaskStatus(student.student_id, task.id, newStatus);
  };

  const handleShare = () => {
      if (navigator.share) {
          navigator.share({
              title: `Dashboard ของ ${student.student_name}`,
              text: `ดูผลการเรียนและภาระงานของ ${student.student_name}`,
              url: window.location.href
          }).catch(console.error);
      } else {
          navigator.clipboard.writeText(window.location.href);
          alert('คัดลอกลิงก์แล้ว! ส่งให้เพื่อนหรือผู้ปกครองได้เลย');
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
        
        <div className="flex items-center gap-3">
            {/* Share Button */}
            <button 
                onClick={handleShare}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition text-slate-500"
                title="แชร์โปรไฟล์"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>

            {/* Notification Bell */}
            <div className="relative cursor-pointer">
                <div onClick={handleNotificationClick} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition">
                    <svg className={`w-6 h-6 ${unreadCount > 0 ? 'text-purple-600 animate-pulse' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
                {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                
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
        </div>
      </div>

      {/* Progress Card - Enhanced UI */}
      <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-none shadow-lg shadow-indigo-200/50 relative overflow-hidden transform transition-all hover:scale-[1.01]">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <h3 className="font-bold text-lg mb-1">ความคืบหน้าของฉัน</h3>
                    <p className="text-xs text-indigo-100 opacity-90">งานที่เสร็จสิ้น {completedTasks} จาก {totalTasks} งาน</p>
                </div>
                <div className="text-4xl font-black tracking-tight">{progressPercentage}%</div>
            </div>
            <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm">
                <div className="bg-white h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
      </Card>

      {/* Main Menu Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-3">เมนูหลัก</h2>
        <div className="grid grid-cols-3 gap-3">
            {menus.map((menu) => (
                <button 
                    key={menu.category}
                    onClick={() => navigate(`categories`)} 
                    className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-slate-50 aspect-square group active:scale-95"
                >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 transition-transform group-hover:scale-110 ${menu.color}`}>
                        {menu.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-600 text-center leading-tight">{menu.label}</span>
                </button>
            ))}
             <button 
                onClick={() => navigate(`schedule`)}
                className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition border border-slate-50 aspect-square group active:scale-95"
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 bg-slate-100 text-slate-600 transition-transform group-hover:scale-110">
                    🗓️
                </div>
                <span className="text-xs font-bold text-slate-600 text-center">ปฏิทินรวม</span>
            </button>
        </div>
      </div>

      {/* Upcoming Tasks Feed - Enhanced UI */}
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
                    
                    // Visual Indicator: Red for Urgent, Green for done (though this list is usually pending), Gray for normal
                    const statusColor = isUrgent ? 'bg-red-500' : 'bg-slate-300';

                    return (
                        <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center group hover:shadow-md transition-all hover:border-purple-200">
                            <div className="flex items-start gap-3 flex-1 min-w-0 mr-3">
                                {/* Indicator Dot */}
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
