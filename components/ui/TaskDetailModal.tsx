
import React from 'react';
import { Task, TaskCategoryLabel } from '../../types';
import FileChip from './FileChip';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-purple-600 p-6 text-white relative">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1 bg-white/20 hover:bg-white/40 rounded-full transition"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded text-white border border-white/20">
                    {TaskCategoryLabel[task.category]}
                </span>
                {task.targetStudentId && (
                     <span className="text-xs font-bold bg-orange-400 px-2 py-0.5 rounded text-white border border-white/20">
                        ส่วนตัว
                    </span>
                )}
            </div>
            <h2 className="text-2xl font-bold leading-tight">{task.title}</h2>
            <p className="opacity-90 mt-1">{task.subject}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <div>
                     <p className="text-xs text-slate-500 font-medium">กำหนดส่ง / เวลา</p>
                     <p className="text-sm font-bold text-slate-800">
                        {new Date(task.dueDate).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                     </p>
                 </div>
                 <div className="text-right">
                     <p className="text-xs text-slate-500 font-medium">เวลา</p>
                     <p className="text-lg font-bold text-purple-600">
                        {new Date(task.dueDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit'})} น.
                     </p>
                 </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2">รายละเอียด</h3>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {task.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </p>
            </div>

            {task.attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        เอกสารแนบ ({task.attachments.length})
                    </h3>
                    <div className="flex flex-col gap-2">
                        {task.attachments.map((file, i) => (
                            <FileChip key={i} filename={file} className="bg-slate-50 w-full" />
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
