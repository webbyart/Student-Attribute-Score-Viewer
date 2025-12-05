
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
                    const isCompleted = task.isCompleted;
                    return (
                        <div key={task.id} onClick={() => onTaskClick(task)} className={`bg-white p-3 rounded-xl shadow-sm border-l-[6px] ${colors.border.replace('border', 'border-l')} active:scale-95 transition cursor-pointer hover:shadow-md relative overflow-hidden`}>
                            {/* Tint background slightly with category color */}
                            <div className={`absolute inset-0 ${colors.bg} opacity-20 pointer-events-none`}></div>
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 mb-1">
                                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                                            {TaskCategoryLabel[task.category] || task.category}
                                        </span>
                                        {isCompleted && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">✓ เสร็จแล้ว</span>}
                                    </div>
                                    <h3 className={`font-bold text-sm truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h3>
                                    <p className="text-xs text-slate-500 truncate">{task.subject}</p>
                                </div>
                                <span className={`text-xs font-bold whitespace-nowrap ${isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
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
