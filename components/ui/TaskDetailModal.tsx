
import React from 'react';
import { Task, TaskCategoryLabel, getCategoryColor } from '../../types';
import FileChip from './FileChip';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose }) => {
  if (!task) return null;

  const colors = getCategoryColor(task.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`${colors.solid} p-6 text-white relative transition-colors duration-300`}>
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
                     <span className="text-xs font-bold bg-white text-orange-600 px-2 py-0.5 rounded border border-white/20 shadow-sm">
                        งานส่วนตัว
                    </span>
                )}
            </div>
            <h2 className="text-2xl font-bold leading-tight">{task.title}</h2>
            <div className="flex justify-between items-end mt-2">
                <div>
                     <p className="font-bold opacity-90 text-sm">วิชา</p>
                     <p className="text-lg font-bold">{task.subject}</p>
                </div>
                <div className="text-right">
                     <p className="opacity-80 text-xs">ผู้แจ้ง</p>
                     <p className="font-bold text-sm">{task.createdBy || 'Admin Master'}</p>
                </div>
            </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Created At / Due Date Row */}
            <div className="flex gap-4">
                 <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <p className="text-xs text-slate-400 font-bold uppercase mb-1">วันที่สร้าง</p>
                     <p className="text-sm font-medium text-slate-700">
                        {task.createdAt ? new Date(task.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric'}) : '-'}
                     </p>
                 </div>
                 <div className="flex-1 p-3 bg-red-50 rounded-xl border border-red-100">
                     <p className="text-xs text-red-400 font-bold uppercase mb-1">กำหนดส่ง</p>
                     <p className="text-lg font-bold text-red-600">
                        {new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric'})}
                     </p>
                     <p className="text-xs text-red-500 font-medium">
                        {new Date(task.dueDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit'})} น.
                     </p>
                 </div>
            </div>

            {/* Target Class Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">สำหรับ: ชั้น {task.targetGrade}/{task.targetClassroom}</p>
                 <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
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
            
            <button onClick={onClose} className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition">
                ดูรายละเอียด
            </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
