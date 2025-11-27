
import React from 'react';
import { Task, TaskCategoryLabel, getCategoryColor } from '../../types';

interface DayEventsModalProps {
  date: Date;
  tasks: Task[];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({ date, tasks, onClose, onTaskClick }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
         {/* Header */}
         <div className="bg-slate-800 p-4 text-white flex justify-between items-center shrink-0">
             <h2 className="text-lg font-bold">
                {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric'})}
             </h2>
             <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
         </div>
         
         {/* List */}
         <div className="p-4 overflow-y-auto space-y-3 bg-slate-50 flex-1">
            {tasks.length > 0 ? (
                tasks.map(task => {
                    const colors = getCategoryColor(task.category);
                    return (
                        <div key={task.id} onClick={() => onTaskClick(task)} className={`bg-white p-3 rounded-xl shadow-sm border-l-4 ${colors.border.replace('border', 'border-l')} active:scale-95 transition cursor-pointer hover:shadow-md`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded mb-1 inline-block ${colors.bg} ${colors.text}`}>
                                        {TaskCategoryLabel[task.category] || task.category}
                                    </span>
                                    <h3 className="font-bold text-slate-800 text-sm truncate">{task.title}</h3>
                                    <p className="text-xs text-slate-500 truncate">{task.subject}</p>
                                </div>
                                <span className="text-xs font-bold text-slate-400 whitespace-nowrap">
                                    {new Date(task.dueDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center py-8 text-slate-400 flex flex-col items-center">
                    <span className="text-4xl mb-2">🏖️</span>
                    <span>ไม่มีกิจกรรม</span>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default DayEventsModal;
