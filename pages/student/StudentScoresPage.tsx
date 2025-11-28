
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from '../../components/ui/Card';
import FileChip from '../../components/ui/FileChip';
import { StudentData, Task, TaskCategoryLabel, getCategoryColor } from '../../types';
import { toggleTaskStatus } from '../../services/api';

type FilterType = 'all' | 'pending' | 'completed' | 'overdue';

const StudentScoresPage: React.FC = () => {
  const contextData = useOutletContext<StudentData>();
  const [localTasks, setLocalTasks] = useState<Task[]>(contextData.tasks);
  const [filter, setFilter] = useState<FilterType>('pending');

  useEffect(() => {
    setLocalTasks(contextData.tasks);
  }, [contextData.tasks]);

  const handleToggleTask = async (task: Task) => {
      const newStatus = !task.isCompleted;
      setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: newStatus } : t));
      await toggleTaskStatus(contextData.student.student_id, task.id, newStatus);
  };

  // Filter tasks
  const filteredTasks = localTasks.filter(task => {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      
      if (filter === 'completed') return task.isCompleted;
      if (filter === 'pending') return !task.isCompleted;
      if (filter === 'overdue') return !task.isCompleted && dueDate < now;
      
      return true; // 'all'
  });

  // Sort tasks by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // Group by Date
  const groupedTasks: { [key: string]: Task[] } = {};
  sortedTasks.forEach(task => {
      const dateKey = new Date(task.dueDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groupedTasks[dateKey]) {
          groupedTasks[dateKey] = [];
      }
      groupedTasks[dateKey].push(task);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">จัดการภาระงาน</h1>
        <p className="text-slate-500">เช็ครายการที่ต้องทำและติดตามความคืบหน้า</p>
      </header>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-white/50 backdrop-blur rounded-xl no-scrollbar">
          <button 
            onClick={() => setFilter('pending')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'pending' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-purple-500'}`}
          >
              ⏳ รอทำ
          </button>
          <button 
             onClick={() => setFilter('overdue')}
             className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'overdue' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
          >
              🔥 เลยกำหนด
          </button>
          <button 
             onClick={() => setFilter('completed')}
             className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'completed' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-green-600'}`}
          >
              ✅ เสร็จแล้ว
          </button>
           <button 
            onClick={() => setFilter('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              ทั้งหมด
          </button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedTasks).map(([date, dateTasks]) => (
            <div key={date}>
                <h3 className="text-purple-600 font-bold text-lg mb-3 sticky top-0 bg-slate-50/90 backdrop-blur py-2 px-4 rounded-lg shadow-sm z-10 border border-slate-100">{date}</h3>
                <div className="space-y-4 pl-4 border-l-2 border-purple-200 ml-2">
                    {dateTasks.map(task => {
                        const isOverdue = !task.isCompleted && new Date(task.dueDate) < new Date();
                        const colors = getCategoryColor(task.category);
                        
                        let priorityColor = 'bg-slate-100 text-slate-500';
                        if (task.priority === 'High') priorityColor = 'bg-red-100 text-red-600';
                        if (task.priority === 'Medium') priorityColor = 'bg-orange-100 text-orange-600';

                        return (
                            <Card key={task.id} className={`relative transition-all ${isOverdue ? 'border-l-4 border-l-red-400' : ''} ${task.isCompleted ? 'opacity-70 bg-slate-50' : 'bg-white'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className={`flex items-center gap-2 mt-1 mb-2 ${task.isCompleted ? 'opacity-50' : ''}`}>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                                                {TaskCategoryLabel[task.category]}
                                            </span>
                                            {task.category === 'HOMEWORK' && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${priorityColor}`}>
                                                    {task.priority || 'Medium'}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className={`font-bold text-lg ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                            {task.title}
                                        </h4>
                                        <div className="text-xs text-slate-500 mb-2">{task.subject}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`text-xs px-2 py-1 rounded font-medium ${isOverdue ? 'bg-red-50 text-red-600' : (task.isCompleted ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-600')}`}>
                                            {new Date(task.dueDate).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                        <button 
                                            onClick={() => handleToggleTask(task)}
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'}`}
                                        >
                                            {task.isCompleted && (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {!task.isCompleted && (
                                    <>
                                        <p className="text-sm text-slate-600 mb-3 mt-2">{task.description}</p>
                                        {task.attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                                {task.attachments.map((file, i) => (
                                                    <FileChip key={i} filename={file} className="bg-white border-slate-200" />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>
        ))}
        {sortedTasks.length === 0 && (
            <div className="text-center py-16">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-slate-500 text-lg font-bold">ไม่มีรายการในหน้านี้</p>
                <p className="text-slate-400 text-sm">เปลี่ยนตัวกรองเพื่อดูรายการอื่น</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default StudentScoresPage;
