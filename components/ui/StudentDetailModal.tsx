
import React, { useEffect, useState } from 'react';
import { StudentData, Task, TaskCategoryLabel } from '../../types';
import { getStudentDataById } from '../../services/api';
import FileChip from './FileChip';
import LoadingSpinner from './LoadingSpinner';

interface StudentDetailModalProps {
  studentId: string; // The "std001" ID
  onClose: () => void;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ studentId, onClose }) => {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const studentData = await getStudentDataById(studentId);
      setData(studentData);
      setLoading(false);
    };
    fetchData();
  }, [studentId]);

  if (!studentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shrink-0 relative">
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-1 bg-white/20 hover:bg-white/40 rounded-full transition"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            {loading ? (
                <div className="h-16 flex items-center"><span className="animate-pulse">กำลังโหลดข้อมูล...</span></div>
            ) : data ? (
                <div className="flex items-center gap-4">
                    <img 
                        src={data.student.profileImageUrl} 
                        alt={data.student.student_name} 
                        className="w-16 h-16 rounded-full border-2 border-white shadow-lg bg-white"
                    />
                    <div>
                        <h2 className="text-2xl font-bold">{data.student.student_name}</h2>
                        <p className="opacity-90">รหัส: {data.student.student_id} | ห้อง: {data.student.grade}/{data.student.classroom}</p>
                        <p className="text-xs opacity-75 mt-1">{data.student.email}</p>
                    </div>
                </div>
            ) : (
                 <div className="h-16 flex items-center text-red-200">ไม่พบข้อมูลนักเรียน</div>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {loading ? (
                <LoadingSpinner />
            ) : data ? (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                            <span className="block text-2xl font-bold text-purple-600">{data.tasks.length}</span>
                            <span className="text-xs text-slate-500">ภาระงานทั้งหมด</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                            <span className="block text-2xl font-bold text-red-500">
                                {data.tasks.filter(t => new Date(t.dueDate) < new Date()).length}
                            </span>
                            <span className="text-xs text-slate-500">เลยกำหนด</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
                            <span className="block text-2xl font-bold text-green-500">
                                {data.tasks.filter(t => new Date(t.dueDate) >= new Date()).length}
                            </span>
                            <span className="text-xs text-slate-500">กำลังจะถึง</span>
                        </div>
                    </div>

                    {/* Task List */}
                    <div>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            รายการภาระงานและกิจกรรม
                        </h3>
                        {data.tasks.length > 0 ? (
                            <div className="space-y-3">
                                {data.tasks.map(task => {
                                    const isOverdue = new Date(task.dueDate) < new Date();
                                    return (
                                        <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                                        {TaskCategoryLabel[task.category]}
                                                    </span>
                                                    {task.targetStudentId === data.student.student_id && (
                                                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-600">
                                                            งานส่วนตัว
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-green-600'}`}>
                                                    {new Date(task.dueDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-800">{task.title}</h4>
                                            <p className="text-sm text-slate-500 mb-2">{task.subject}</p>
                                            
                                            {task.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-50">
                                                    {task.attachments.map((f, i) => (
                                                        <FileChip key={i} filename={f} className="scale-90 origin-left" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">ไม่มีรายการภาระงาน</div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal;
