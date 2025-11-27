
import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { 
    createTask,
    updateTask,
    deleteTask,
} from '../../services/api';
import { Task, TaskCategory } from '../../types';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import { MOCK_TASKS } from '../../data/mockData';
import TrashIcon from '../../assets/icons/TrashIcon';
import PencilIcon from '../../assets/icons/PencilIcon';
import FileChip from '../../components/ui/FileChip';
import CalendarView from '../../components/ui/CalendarView';

const TeacherDashboardPage: React.FC = () => {
    const { teacher } = useTeacherAuth();
    const [activeTab, setActiveTab] = useState('calendar'); // Default to calendar
    const [tasks, setTasks] = useState(MOCK_TASKS);
    
    // Form State
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        description: '',
        dueDate: '',
        category: TaskCategory.CLASS_SCHEDULE,
        targetGrade: 'ม.4',
        targetClassroom: '2',
        targetStudentId: ''
    });
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
        e.target.value = '';
    };

    const removeNewFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = (filename: string) => {
        setExistingAttachments(prev => prev.filter(f => f !== filename));
    };

    const handleEditTask = (task: Task) => {
        setFormData({
            title: task.title,
            subject: task.subject,
            description: task.description,
            dueDate: task.dueDate.slice(0, 16),
            category: task.category,
            targetGrade: task.targetGrade,
            targetClassroom: task.targetClassroom,
            targetStudentId: task.targetStudentId || ''
        });
        setExistingAttachments(task.attachments);
        setFiles([]);
        setEditingTaskId(task.id);
        setActiveTab('post');
        setMessage('');
    };

    const handleCancelEdit = () => {
        setFormData({
            title: '',
            subject: '',
            description: '',
            dueDate: '',
            category: TaskCategory.CLASS_SCHEDULE,
            targetGrade: 'ม.4',
            targetClassroom: '2',
            targetStudentId: ''
        });
        setExistingAttachments([]);
        setFiles([]);
        setEditingTaskId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacher) return;
        setIsSubmitting(true);
        setMessage('');

        const newAttachments = files.map(f => f.name);
        const allAttachments = [...existingAttachments, ...newAttachments];

        const taskPayload = {
            ...formData,
            // If student ID is provided, it's specific. Otherwise it's for the whole class.
            targetStudentId: formData.targetStudentId.trim() === '' ? undefined : formData.targetStudentId.trim(),
            dueDate: new Date(formData.dueDate).toISOString(),
            attachments: allAttachments,
            createdBy: teacher.name,
        };

        if (editingTaskId) {
             const result = await updateTask({
                id: editingTaskId,
                ...taskPayload,
                createdAt: new Date().toISOString() 
            });

            if (result.success) {
                setMessage('แก้ไขข้อมูลสำเร็จ');
                handleCancelEdit();
            } else {
                setMessage('เกิดข้อผิดพลาดในการแก้ไข');
            }
        } else {
            const result = await createTask(taskPayload);

            if (result.success) {
                setMessage('บันทึกข้อมูลและส่งแจ้งเตือนเรียบร้อยแล้ว');
                handleCancelEdit();
            } else {
                setMessage('เกิดข้อผิดพลาด');
            }
        }

        setTasks([...MOCK_TASKS]);
        setIsSubmitting(false);
    };

    const handleDeleteTask = async (id: string) => {
        if (window.confirm('ยืนยันการลบภาระงานนี้?')) {
            await deleteTask(id);
            setTasks([...MOCK_TASKS]);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <header>
                <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
                <p className="text-slate-500">จัดการภาระงานและกิจกรรม</p>
            </header>

            <div className="border-b border-gray-200 sticky top-0 bg-slate-100 z-10 pt-2 overflow-x-auto">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('calendar')} className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${activeTab === 'calendar' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'}`}>
                        📅 ปฏิทินงาน
                    </button>
                    <button onClick={() => setActiveTab('post')} className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${activeTab === 'post' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'}`}>
                        {editingTaskId ? '📝 แก้ไขข้อมูล' : '➕ โพสต์ใหม่'}
                    </button>
                    <button onClick={() => { setActiveTab('history'); handleCancelEdit(); }} className={`py-4 px-1 border-b-2 font-medium whitespace-nowrap ${activeTab === 'history' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'}`}>
                        📂 รายการที่โพสต์
                    </button>
                </nav>
            </div>

            {activeTab === 'calendar' && (
                <div className="animate-fade-in">
                    <CalendarView tasks={tasks} onDateClick={(date, dayTasks) => {
                        if (dayTasks.length > 0) {
                             // Switch to history or show details (simplified here)
                             alert(`งานวันที่ ${date.getDate()}: ${dayTasks.length} รายการ`);
                        }
                    }} />
                    <div className="mt-4 p-4 bg-white rounded-xl shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-2">สรุปภาพรวมเดือนนี้</h3>
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-red-100 rounded-full"></span>
                                <span className="text-slate-600">ตารางสอบ: {tasks.filter(t => t.category.includes('สอบ')).length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-100 rounded-full"></span>
                                <span className="text-slate-600">การบ้าน: {tasks.filter(t => t.category.includes('การบ้าน')).length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'post' && (
                <Card className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                         <h2 className="text-xl font-semibold">{editingTaskId ? 'แก้ไขข้อมูล' : 'สร้างรายการใหม่'}</h2>
                         {editingTaskId && (
                             <button onClick={handleCancelEdit} className="text-sm text-red-500 underline">ยกเลิกการแก้ไข</button>
                         )}
                    </div>
                   
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่มภาระงาน/กิจกรรม</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded-lg bg-purple-50 border-purple-200">
                                    {Object.values(TaskCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ/ชื่องาน</label>
                                <input name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">รายวิชาที่เกี่ยวข้อง</label>
                            <input name="subject" value={formData.subject} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">กำหนดส่ง/เวลากิจกรรม</label>
                            <input type="datetime-local" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2 border rounded-lg" required />
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-sm font-bold text-slate-700 mb-2">เป้าหมาย (ผู้รับ)</p>
                            <div className="grid grid-cols-3 gap-4 mb-2">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">ระดับชั้น</label>
                                    <input name="targetGrade" value={formData.targetGrade} onChange={handleChange} className="w-full p-2 border rounded-lg text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">ห้อง</label>
                                    <input name="targetClassroom" value={formData.targetClassroom} onChange={handleChange} className="w-full p-2 border rounded-lg text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">รหัสนักเรียน (ไม่บังคับ)</label>
                                    <input name="targetStudentId" value={formData.targetStudentId} onChange={handleChange} placeholder="ระบุรายบุคคล" className="w-full p-2 border rounded-lg text-sm" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">*หากระบุรหัสนักเรียน ระบบจะส่งให้เฉพาะนักเรียนคนนั้น</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-2 border rounded-lg"></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">อัพโหลดเอกสาร/ใบงาน</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {existingAttachments.map((file) => (
                                    <FileChip key={`old-${file}`} filename={file} onRemove={() => removeExistingAttachment(file)} />
                                ))}
                                {files.map((file, idx) => (
                                    <FileChip key={`new-${idx}`} filename={file.name} onRemove={() => removeNewFile(idx)} className="border-purple-200 bg-purple-50" />
                                ))}
                            </div>
                            <label className="flex items-center gap-2 w-full justify-center p-4 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50 cursor-pointer hover:bg-purple-100 transition">
                                <span className="text-purple-600 font-medium">คลิกเพื่อเลือกไฟล์ (Word, Excel, PDF, รูปภาพ)</span>
                                <input type="file" multiple onChange={handleFileChange} accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png" className="hidden" />
                            </label>
                        </div>

                        <div className="pt-4">
                            <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:bg-purple-300 transition shadow-lg">
                                {isSubmitting ? 'กำลังบันทึก...' : (editingTaskId ? 'บันทึกการแก้ไข' : 'โพสต์และส่งแจ้งเตือน')}
                            </button>
                            {message && <p className={`text-center mt-3 ${message.includes('ผิดพลาด') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
                        </div>
                    </form>
                </Card>
            )}

            {activeTab === 'history' && (
                <div className="space-y-4 animate-fade-in">
                    {tasks.length === 0 ? (
                         <p className="text-center text-slate-500 py-8">ยังไม่มีประวัติการโพสต์</p>
                    ) : (
                        tasks.slice().reverse().map(task => (
                            <Card key={task.id} className="relative">
                                <div className="flex justify-between items-start">
                                    <div className="mb-2">
                                         <span className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white bg-purple-500 mb-1">
                                            {task.category}
                                         </span>
                                         {task.targetStudentId && (
                                             <span className="inline-block ml-2 px-2 py-0.5 rounded text-xs font-bold text-white bg-orange-400 mb-1">
                                                เฉพาะ: {task.targetStudentId}
                                             </span>
                                         )}
                                        <h3 className="font-bold text-lg text-slate-800">{task.title}</h3>
                                        <p className="text-sm text-slate-500">{task.subject}</p>
                                    </div>
                                    <div className="flex gap-1">
                                         <button onClick={() => handleEditTask(task)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full">
                                            <PencilIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                               
                                <div className="text-sm text-slate-600 mb-2">
                                    <p>เป้าหมาย: {task.targetGrade}/{task.targetClassroom}</p>
                                    <p>กำหนด: {new Date(task.dueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                                </div>
                                
                                {task.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-2">
                                        {task.attachments.map((file, i) => (
                                            <FileChip key={i} filename={file} className="bg-slate-50 scale-90 origin-left" />
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherDashboardPage;
