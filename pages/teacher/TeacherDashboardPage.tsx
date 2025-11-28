import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import { 
    createTask,
    updateTask,
    deleteTask,
    getAllTasks,
    uploadFile,
    getProfiles,
    updateProfile
} from '../../services/api';
import { Task, TaskCategory, TaskCategoryLabel, getCategoryColor } from '../../types';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import TrashIcon from '../../assets/icons/TrashIcon';
import PencilIcon from '../../assets/icons/PencilIcon';
import FileChip from '../../components/ui/FileChip';
import CalendarView from '../../components/ui/CalendarView';
import { supabase } from '../../lib/supabaseClient';
import StudentDetailModal from '../../components/ui/StudentDetailModal';
import DayEventsModal from '../../components/ui/DayEventsModal';
import TaskDetailModal from '../../components/ui/TaskDetailModal';

const TeacherDashboardPage: React.FC = () => {
    const { teacher } = useTeacherAuth();
    const [activeTab, setActiveTab] = useState('calendar'); 
    const [tasks, setTasks] = useState<Task[]>([]);
    
    // Calendar Popups
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);

    // User Management State
    const [userType, setUserType] = useState<'student' | 'teacher'>('student');
    const [users, setUsers] = useState<any[]>([]);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState('');
    
    // Task Filter State
    const [taskSearch, setTaskSearch] = useState('');
    const [filterGrade, setFilterGrade] = useState('All');
    const [filterClassroom, setFilterClassroom] = useState('All');
    const [filterType, setFilterType] = useState('All');

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        description: '',
        dueDate: '',
        category: TaskCategory.CLASS_SCHEDULE,
        priority: 'Medium',
        targetGrade: 'ม.4',
        targetClassroom: '2',
        targetStudentId: ''
    });
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadTasks();
        const channel = supabase.channel('realtime-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            loadTasks();
        })
        .subscribe();
        return () => { supabase.removeChannel(channel); }
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
        }
    }, [activeTab, userType]);

    const loadTasks = async () => {
        const fetchedTasks = await getAllTasks();
        setTasks(fetchedTasks);
    }

    const loadUsers = async () => {
        const fetchedUsers = await getProfiles(userType);
        setUsers(fetchedUsers);
    }

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
            dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
            category: task.category,
            priority: task.priority || 'Medium',
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
            priority: 'Medium',
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

        const uploadedUrls: string[] = [];
        for (const file of files) {
            const url = await uploadFile(file);
            if (url) uploadedUrls.push(url);
        }

        const allAttachments = [...existingAttachments, ...uploadedUrls];

        const taskPayload = {
            ...formData,
            targetStudentId: formData.targetStudentId.trim() === '' ? undefined : formData.targetStudentId.trim(),
            dueDate: new Date(formData.dueDate).toISOString(),
            priority: formData.priority as 'High'|'Medium'|'Low',
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
                loadTasks();
            } else {
                setMessage('เกิดข้อผิดพลาดในการแก้ไข: ' + result.message);
            }
        } else {
            const result = await createTask(taskPayload);

            if (result.success) {
                setMessage('บันทึกข้อมูลและส่งแจ้งเตือนเรียบร้อยแล้ว');
                handleCancelEdit();
                loadTasks();
            } else {
                setMessage('เกิดข้อผิดพลาด: ' + result.message);
            }
        }
        setIsSubmitting(false);
    };

    const handleDeleteTask = async (id: string) => {
        if (window.confirm('ยืนยันการลบภาระงานนี้?')) {
            await deleteTask(id);
            loadTasks();
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        const updates = {
            full_name: editingUser.full_name,
            student_id: editingUser.student_id,
            grade: editingUser.grade,
            classroom: editingUser.classroom,
            login_code: editingUser.login_code,
        };
        const result = await updateProfile(editingUser.id, updates);
        if (result.success) {
            alert('อัพเดทข้อมูลสำเร็จ');
            setEditingUser(null);
            loadUsers();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    };

    const handleDateClick = (date: Date, dayTasks: Task[]) => {
        setSelectedDate(date);
        setSelectedDayTasks(dayTasks);
        setIsDayModalOpen(true);
    };

    const handleTaskClickFromModal = (task: Task) => {
        setSelectedTaskForModal(task);
    };

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = 
            t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
            t.subject.toLowerCase().includes(taskSearch.toLowerCase()) ||
            t.description.toLowerCase().includes(taskSearch.toLowerCase());

        const matchesGrade = filterGrade === 'All' || t.targetGrade === filterGrade;
        const matchesClass = filterClassroom === 'All' || t.targetClassroom === filterClassroom;
        
        const isIndividual = !!t.targetStudentId;
        const matchesType = filterType === 'All' || 
                            (filterType === 'Individual' && isIndividual) ||
                            (filterType === 'Group' && !isIndividual);

        return matchesSearch && matchesGrade && matchesClass && matchesType;
    });

    const filteredUsers = users.filter(u => 
        u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.student_id && u.student_id.toLowerCase().includes(userSearch.toLowerCase()))
    );

    const classScheduleTasks = tasks.filter(t => t.category === TaskCategory.CLASS_SCHEDULE);

    return (
        <div className="animate-fade-in pb-24 relative min-h-screen bg-slate-50">
            <div className="px-4 py-4">
                {activeTab === 'calendar' && (
                    <div className="animate-fade-in space-y-4">
                        <CalendarView tasks={tasks} onDateClick={handleDateClick} />
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {Object.values(TaskCategory).map((cat, i) => {
                                const colors = getCategoryColor(cat);
                                return (
                                    <span key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${colors.bg} ${colors.text} ${colors.border}`}>
                                        {TaskCategoryLabel[cat]}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">จัดการตารางเรียน</h2>
                                <p className="text-xs text-slate-500">คาบเรียนและตารางสอน</p>
                            </div>
                            <button 
                                onClick={() => { setActiveTab('post'); setFormData(prev => ({ ...prev, category: TaskCategory.CLASS_SCHEDULE })); }} 
                                className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-blue-700 shadow-md flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                เพิ่มคาบเรียน
                            </button>
                        </div>
                        
                        {/* Grade Filter for Schedule */}
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                             <button onClick={() => setFilterGrade('All')} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${filterGrade === 'All' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>ทั้งหมด</button>
                             <button onClick={() => setFilterGrade('ม.4')} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${filterGrade === 'ม.4' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>ม.4</button>
                             <button onClick={() => setFilterGrade('ม.5')} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${filterGrade === 'ม.5' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>ม.5</button>
                             <button onClick={() => setFilterGrade('ม.6')} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${filterGrade === 'ม.6' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>ม.6</button>
                        </div>

                        {classScheduleTasks.filter(t => filterGrade === 'All' || t.targetGrade === filterGrade).length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {classScheduleTasks.filter(t => filterGrade === 'All' || t.targetGrade === filterGrade).map(task => (
                                    <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-blue-500 flex justify-between items-center group hover:shadow-md transition">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-50 text-blue-700 p-2 rounded-lg font-bold text-center min-w-[3rem]">
                                                <div className="text-xs">ห้อง</div>
                                                <div className="text-lg leading-none">{task.targetGrade}/{task.targetClassroom}</div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{task.title}</h3>
                                                <div className="text-sm text-slate-600">{task.subject}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        🗓️ {new Date(task.dueDate).toLocaleDateString('th-TH', {weekday: 'short', day: 'numeric', month: 'short'})}
                                                     </span>
                                                     <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        ⏰ {new Date(task.dueDate).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                                                     </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                                            <button onClick={() => handleEditTask(task)} className="p-2 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                                <span className="text-4xl block mb-2">📅</span>
                                <p className="text-slate-400">ยังไม่มีตารางเรียนในระดับชั้นนี้</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'post' && (
                    <Card className="animate-fade-in mb-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-slate-800">{editingTaskId ? '📝 แก้ไขงาน' : '🚀 สร้างโพสต์ใหม่'}</h2>
                            {editingTaskId && <button onClick={handleCancelEdit} className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">ยกเลิก</button>}
                        </div>
                    
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่มภาระงาน/กิจกรรม</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2.5 border rounded-xl bg-purple-50 border-purple-100 text-purple-800 font-medium focus:ring-2 focus:ring-purple-200 focus:outline-none">
                                        {Object.values(TaskCategory).map(cat => <option key={cat} value={cat}>{TaskCategoryLabel[cat]}</option>)}
                                    </select>
                                </div>
                                {formData.category === TaskCategory.HOMEWORK && (
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">ความสำคัญ (Priority)</label>
                                        <select name="priority" value={formData.priority} onChange={handleChange} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none">
                                            <option value="Low">Low (ปกติ)</option>
                                            <option value="Medium">Medium (ปานกลาง)</option>
                                            <option value="High">High (ด่วน)</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ/ชื่องาน</label>
                                    <input name="title" value={formData.title} onChange={handleChange} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" required placeholder="เช่น การบ้านคณิตฯ บทที่ 1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">รายวิชา</label>
                                    <input name="subject" value={formData.subject} onChange={handleChange} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" required placeholder="เช่น คณิตศาสตร์พื้นฐาน" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">กำหนดส่ง / เวลากิจกรรม</label>
                                    <input type="datetime-local" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" required />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                        ผู้ได้รับมอบหมาย
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ระดับชั้น</label>
                                        <input name="targetGrade" value={formData.targetGrade} onChange={handleChange} className="w-full p-2 border rounded-lg text-sm" required placeholder="ม.4" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ห้อง</label>
                                        <input name="targetClassroom" value={formData.targetClassroom} onChange={handleChange} className="w-full p-2 border rounded-lg text-sm" required placeholder="2" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">รหัสบุคคล</label>
                                        <input name="targetStudentId" value={formData.targetStudentId} onChange={handleChange} placeholder="ว่างไว้ = ทั้งห้อง" className="w-full p-2 border rounded-lg text-sm border-purple-200 bg-white" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">แนบไฟล์</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {existingAttachments.map((file) => (
                                        <FileChip key={`old-${file}`} filename={file} onRemove={() => removeExistingAttachment(file)} />
                                    ))}
                                    {files.map((file, idx) => (
                                        <FileChip key={`new-${idx}`} filename={file.name} onRemove={() => removeNewFile(idx)} className="border-purple-200 bg-purple-50" />
                                    ))}
                                </div>
                                <label className="flex items-center gap-2 w-full justify-center p-4 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50 cursor-pointer hover:bg-purple-100 transition group">
                                    <div className="text-center">
                                        <svg className="w-6 h-6 mx-auto text-purple-400 mb-1 group-hover:scale-110 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        <span className="text-xs text-purple-600 font-bold uppercase">Upload File</span>
                                    </div>
                                    <input type="file" multiple onChange={handleFileChange} accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.jpg,.jpeg,.png" className="hidden" />
                                </label>
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg disabled:opacity-50 transition flex justify-center items-center gap-2">
                                    {isSubmitting ? 'กำลังบันทึก...' : (editingTaskId ? 'บันทึกการแก้ไข' : 'โพสต์งานทันที')}
                                </button>
                                {message && <p className={`text-center mt-3 text-sm font-medium ${message.includes('ผิดพลาด') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}
                            </div>
                        </form>
                    </Card>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3 sticky top-0 z-10">
                            <div className="relative">
                                <input 
                                    type="text" placeholder="ค้นหางาน..." value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                                />
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-full bg-white focus:outline-none text-slate-600"><option value="All">ทุกชั้น</option><option value="ม.4">ม.4</option><option value="ม.5">ม.5</option><option value="ม.6">ม.6</option></select>
                                <select value={filterClassroom} onChange={(e) => setFilterClassroom(e.target.value)} className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-full bg-white focus:outline-none text-slate-600"><option value="All">ทุกห้อง</option><option value="1">ห้อง 1</option><option value="2">ห้อง 2</option></select>
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-full bg-white focus:outline-none text-slate-600"><option value="All">ทุกประเภท</option><option value="Group">รายห้อง</option><option value="Individual">รายบุคคล</option></select>
                            </div>
                        </div>

                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-12 opacity-50"><p>ไม่พบรายการที่ค้นหา</p></div>
                        ) : (
                            filteredTasks.map(task => {
                                const colors = getCategoryColor(task.category);
                                let priorityColor = 'bg-slate-100 text-slate-500';
                                if (task.priority === 'High') priorityColor = 'bg-red-100 text-red-600';
                                if (task.priority === 'Medium') priorityColor = 'bg-orange-100 text-orange-600';
                                if (task.priority === 'Low') priorityColor = 'bg-blue-100 text-blue-600';

                                return (
                                <Card key={task.id} className="relative hover:shadow-md transition">
                                    <div className="flex justify-between items-start">
                                        <div className="mb-2 w-full">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-wrap gap-2 mb-2 items-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                                                        {TaskCategoryLabel[task.category]}
                                                    </span>
                                                    {task.category === TaskCategory.HOMEWORK && (
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${priorityColor}`}>
                                                            {task.priority || 'Medium'}
                                                        </span>
                                                    )}
                                                    {task.targetStudentId ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-orange-400">👤 {task.targetStudentId}</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 bg-slate-200">🏫 {task.targetGrade}/{task.targetClassroom}</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditTask(task)} className="p-1.5 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100"><PencilIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            
                                            <h3 className="font-bold text-lg text-slate-800 leading-tight">{task.title}</h3>
                                            <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                                                <span>{task.subject}</span>
                                                <span className={`px-2 py-1 rounded-md font-medium ${new Date(task.dueDate) < new Date() ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                                    {new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {task.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 mt-2">
                                            {task.attachments.map((file, i) => (
                                                <FileChip key={i} filename={file} className="bg-slate-50 scale-90 origin-left border-transparent" />
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            )})
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                            <button onClick={() => setUserType('student')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${userType === 'student' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>นักเรียน</button>
                            <button onClick={() => setUserType('teacher')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${userType === 'teacher' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>ครู/บุคลากร</button>
                        </div>
                        <div className="relative mb-4">
                            <input type="text" placeholder="ค้นหาชื่อ, รหัสนักเรียน..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-400 focus:outline-none bg-white shadow-sm"/>
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                                    <tr><th className="p-4">ชื่อ-นามสกุล</th>{userType === 'student' && <th className="p-4">ข้อมูล</th>}<th className="p-4 text-right">จัดการ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-purple-50/30 transition">
                                            <td className="p-4"><div className="font-bold text-slate-800">{user.full_name}</div><div className="text-xs text-slate-400 font-mono mt-0.5">{user.login_code ? `Code: ${user.login_code}` : 'No Code'}</div></td>
                                            {userType === 'student' && <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold mr-1">{user.student_id}</span><span className="text-xs text-slate-500">{user.grade}/{user.classroom}</span></td>}
                                            <td className="p-4 text-right"><div className="flex justify-end gap-2">{userType === 'student' && <button onClick={() => setViewingStudentId(user.student_id)} className="text-xs font-bold text-white bg-indigo-500 px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition shadow-sm">ดูข้อมูล</button>}<button onClick={() => setEditingUser(user)} className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition border border-purple-100">แก้ไข</button></div></td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">ไม่พบข้อมูลผู้ใช้งาน</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-2 pb-safe z-40 flex justify-between items-end">
                <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-1/5 ${activeTab === 'calendar' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-bold">ปฏิทิน</span>
                </button>
                <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-1/5 ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-[10px] font-bold">ตารางเรียน</span>
                </button>
                <button onClick={() => setActiveTab('post')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-1/5 ${activeTab === 'post' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full mb-1 shadow-lg ${activeTab === 'post' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                </button>
                <button onClick={() => { setActiveTab('history'); handleCancelEdit(); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-1/5 ${activeTab === 'history' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="text-[10px] font-bold">ประวัติ</span>
                </button>
                <button onClick={() => setActiveTab('users')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-1/5 ${activeTab === 'users' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-[10px] font-bold">ผู้ใช้</span>
                </button>
            </div>

            {isDayModalOpen && selectedDate && (
                <DayEventsModal date={selectedDate} tasks={selectedDayTasks} onClose={() => setIsDayModalOpen(false)} onTaskClick={handleTaskClickFromModal} />
            )}
            {selectedTaskForModal && (
                <TaskDetailModal task={selectedTaskForModal} onClose={() => setSelectedTaskForModal(null)} />
            )}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                        <div className="p-4 bg-purple-600 text-white flex justify-between items-center"><h3 className="font-bold text-lg">✏️ แก้ไขข้อมูลผู้ใช้งาน</h3><button onClick={() => setEditingUser(null)} className="p-1 hover:bg-white/20 rounded-full transition">✕</button></div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อ-นามสกุล</label><input value={editingUser.full_name || ''} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" required /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Login Code</label><input value={editingUser.login_code || ''} onChange={e => setEditingUser({...editingUser, login_code: e.target.value})} placeholder="1234" className="w-full p-2.5 border border-yellow-200 bg-yellow-50 rounded-xl font-mono text-center tracking-widest text-lg font-bold text-yellow-700" /></div>
                            {editingUser.role === 'student' && (<>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student ID</label><input value={editingUser.student_id || ''} onChange={e => setEditingUser({...editingUser, student_id: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50" required /></div>
                                <div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชั้น</label><input value={editingUser.grade || ''} onChange={e => setEditingUser({...editingUser, grade: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ห้อง</label><input value={editingUser.classroom || ''} onChange={e => setEditingUser({...editingUser, classroom: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div></div>
                            </>)}
                            <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-xl font-bold hover:bg-slate-200 transition">ยกเลิก</button><button type="submit" className="flex-1 py-3 text-white bg-purple-600 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition">บันทึก</button></div>
                        </form>
                    </div>
                </div>
            )}
            {viewingStudentId && <StudentDetailModal studentId={viewingStudentId} onClose={() => setViewingStudentId(null)} />}
        </div>
    );
};

export default TeacherDashboardPage;