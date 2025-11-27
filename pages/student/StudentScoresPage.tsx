
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from '../../components/ui/Card';
import FileChip from '../../components/ui/FileChip';
import { StudentData, Task } from '../../types';

type FilterType = 'all' | 'upcoming' | 'overdue';

const StudentScoresPage: React.FC = () => {
  const { tasks } = useOutletContext<StudentData>();
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      if (filter === 'upcoming') {
          return dueDate >= now;
      }
      if (filter === 'overdue') {
          return dueDate < now;
      }
      return true;
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
        <h1 className="text-3xl font-bold text-slate-800">ปฏิทินภาระงาน</h1>
        <p className="text-slate-500">ตารางสอบและกำหนดการส่งงาน</p>
      </header>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-white/50 backdrop-blur rounded-xl w-fit">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-purple-500'}`}
          >
              ทั้งหมด
          </button>
          <button 
             onClick={() => setFilter('upcoming')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'upcoming' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-green-600'}`}
          >
              กำลังจะถึง
          </button>
          <button 
             onClick={() => setFilter('overdue')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'overdue' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-500 hover:text-red-500'}`}
          >
              เลยกำหนด
          </button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedTasks).map(([date, dateTasks]) => (
            <div key={date}>
                <h3 className="text-purple-600 font-bold text-lg mb-3 sticky top-0 bg-slate-50/90 backdrop-blur py-2 px-4 rounded-lg shadow-sm z-10 border border-slate-100">{date}</h3>
                <div className="space-y-4 pl-4 border-l-2 border-purple-200 ml-2">
                    {dateTasks.map(task => {
                        const isOverdue = new Date(task.dueDate) < new Date();
                        return (
                            <Card key={task.id} className={`relative ${isOverdue ? 'border-l-4 border-l-red-400' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-lg">{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-1 mb-2">
                                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{task.category}</span>
                                            <span className="text-xs text-slate-500">{task.subject}</span>
                                        </div>
                                    </div>
                                    <div className={`text-xs px-2 py-1 rounded font-medium ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {new Date(task.dueDate).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                                
                                {task.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                        {task.attachments.map((file, i) => (
                                            <FileChip key={i} filename={file} className="bg-white border-slate-200" />
                                        ))}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>
        ))}
        {sortedTasks.length === 0 && (
            <div className="text-center py-12">
                <p className="text-slate-400 text-lg">ไม่พบรายการภาระงาน</p>
                {filter !== 'all' && <button onClick={() => setFilter('all')} className="text-purple-500 text-sm mt-2 hover:underline">ดูรายการทั้งหมด</button>}
            </div>
        )}
      </div>
    </div>
  );
};

export default StudentScoresPage;
