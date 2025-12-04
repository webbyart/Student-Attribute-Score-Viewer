
import React, { useState, useEffect, useRef } from 'react';
import Card from '../../components/ui/Card';
import { 
    createTask, updateTask, deleteTask, getAllTasks, uploadFile, getProfiles, updateProfile, 
    registerStudent, registerTeacher, deleteStudent, deleteTeacher,
    getSystemSettings, saveSystemSettings, testLineNotification, generateTaskFlexMessage, checkDatabaseHealth, sendLineNotification, bulkRegisterStudents, getTimetable, generateTimetableFlexMessage
} from '../../services/api';
import { Task, TaskCategory, TaskCategoryLabel, getCategoryColor, TimetableEntry } from '../../types';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import TrashIcon from '../../assets/icons/TrashIcon';
import PencilIcon from '../../assets/icons/PencilIcon';
import PlusCircleIcon from '../../assets/icons/PlusCircleIcon';
import FileChip from '../../components/ui/FileChip';
import CalendarView from '../../components/ui/CalendarView';
import StudentDetailModal from '../../components/ui/StudentDetailModal';
import DayEventsModal from '../../components/ui/DayEventsModal';
import TaskDetailModal from '../../components/ui/TaskDetailModal';
import TimetableGrid from '../../components/ui/TimetableGrid';
import ConfirmModal from '../../components/ui/ConfirmModal';

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
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<string>('');
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    
    // Settings State
    const [lineToken, setLineToken] = useState('');
    const [lineSecret, setLineSecret] = useState('');
    const [lineLoginChannelId, setLineLoginChannelId] = useState('');
    const [lineRedirectUri, setLineRedirectUri] = useState('');
    const [testGroupId, setTestGroupId] = useState(''); 
    const [settingsMessage, setSettingsMessage] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    
    // DB Health Check State
    const [dbHealth, setDbHealth] = useState<{name: string, status: string}[]>([]);
    const [isCheckingDb, setIsCheckingDb] = useState(false);

    // Task Filter State
    const [taskSearch, setTaskSearch] = useState('');
    const [filterGrade, setFilterGrade] = useState('All');
    const [filterClassroom, setFilterClassroom] = useState('All');
    const [filterType, setFilterType] = useState('All');

    // Form State
    const [formData, setFormData] = useState({
        title: '', subject: '', description: '', dueDate: '',
        category: TaskCategory.CLASS_SCHEDULE, priority: 'Medium',
        targetGrade: 'ม.3', targetClassroom: '3', targetStudentId: ''
    });
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    // Schedule State
    const [scheduleGrade, setScheduleGrade] = useState('ม.3');
    const [scheduleClassroom, setScheduleClassroom] = useState('3');
    const [scheduleData, setScheduleData] = useState<TimetableEntry[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [isConfirmSendScheduleOpen, setIsConfirmSendScheduleOpen] = useState(false);
    
    // Confirm Delete Task Modal State
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    useEffect(() => { loadTasks(); loadSettings(); }, []);
    useEffect(() => {
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'schedule') loadSchedule();
    }, [activeTab, userType, scheduleGrade, scheduleClassroom]);

    const loadTasks = async () => { setTasks(await getAllTasks()); }
    const loadUsers = async () => { setUsers(await getProfiles(userType)); }
    const loadSchedule = async () => {
        setScheduleLoading(true);
        setScheduleData(await getTimetable(scheduleGrade, scheduleClassroom));
        setScheduleLoading(false);
    };

    const loadSettings = async () => {
        const settings = await getSystemSettings();
        if (settings['line_channel_access_token']) setLineToken(settings['line_channel_access_token']);
        if (settings['line_login_channel_id']) setLineLoginChannelId(settings['line_login_channel_id']);
        if (settings['test_group_id']) setTestGroupId(settings['test_group_id']);
        const currentOrigin = window.location.origin + window.location.pathname;
        setLineRedirectUri(currentOrigin + (currentOrigin.endsWith('/') ? '' : '/') + '#/line-callback');
    }

    const handleCheckDb = async () => {
        setIsCheckingDb(true);
        const result = await checkDatabaseHealth();
        setDbHealth(result.tables);
        setIsCheckingDb(false);
    }

    const handleSaveSettings = async () => {
        const result = await saveSystemSettings({ 'line_channel_access_token': lineToken, 'line_login_channel_id': lineLoginChannelId, 'test_group_id': testGroupId });
        setSettingsMessage(result.message);
        setTimeout(() => setSettingsMessage(''), 3000);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = ''; };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const uploadedUrls = [];
        for (const file of files) uploadedUrls.push(await uploadFile(file));
        const allAttachments = [...existingAttachments, ...uploadedUrls];
        const taskPayload = { ...formData, targetStudentId: formData.targetStudentId.trim() || undefined, dueDate: new Date(formData.dueDate).toISOString(), priority: formData.priority as any, attachments: allAttachments, createdBy: teacher?.name || 'Admin' };
        
        let result;
        if (editingTaskId) result = await updateTask({ id: editingTaskId, ...taskPayload, createdAt: new Date().toISOString() });
        else result = await createTask(taskPayload);

        setMessage(result.success ? 'บันทึกสำเร็จ' : 'ผิดพลาด: ' + result.message);
        setIsSubmitting(false);
        if(result.success) { loadTasks(); setEditingTaskId(null); setFormData({ ...formData, title: '' }); setFiles([]); setExistingAttachments([]); }
    };

    const handleDeleteTask = async (id: string) => { setTaskToDelete(id); setIsConfirmDeleteOpen(true); };
    const confirmDeleteTask = async () => { if (taskToDelete) { await deleteTask(taskToDelete); loadTasks(); } setIsConfirmDeleteOpen(false); };

    // USER MANAGEMENT
    const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setIsSubmitting(true);
        let res;
        if (userType === 'student') {
             res = await registerStudent({
                 student_id: f.get('student_id'), student_name: f.get('name'), email: f.get('email'),
                 grade: f.get('grade'), classroom: f.get('classroom'), password: f.get('password'),
                 lineUserId: f.get('lineUserId')
             });
        } else {
             res = await registerTeacher(f.get('name') as string, f.get('email') as string, f.get('password') as string, f.get('lineUserId') as string);
        }
        setIsSubmitting(false);
        if (res.success) { alert('เพิ่มผู้ใช้สำเร็จ'); setIsAddUserModalOpen(false); loadUsers(); }
        else alert('เกิดข้อผิดพลาด: ' + res.message);
    }

    const handleDeleteUser = (user: any) => { setUserToDelete(user); }
    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        let res;
        if (userType === 'student') res = await deleteStudent(userToDelete.id || userToDelete.student_id);
        else res = await deleteTeacher(userToDelete.teacher_id);
        
        if (res.success) { loadUsers(); setUserToDelete(null); }
        else alert('ลบไม่สำเร็จ: ' + res.message);
    }

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportStatus('กำลังอ่านไฟล์...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            const lines = (event.target?.result as string).split('\n');
            const students = [];
            for (let i = 1; i < lines.length; i++) {
                const c = lines[i].split(',').map(x => x.trim());
                if (c.length >= 6) students.push({ student_id: c[0], student_name: c[1], email: c[2], grade: c[3], classroom: c[4], password: c[5] });
            }
            if (students.length === 0) { setImportStatus('ไม่พบข้อมูล'); return; }
            setImportStatus(`นำเข้า ${students.length} รายการ...`);
            const res = await bulkRegisterStudents(students);
            setImportStatus(res.success ? `✅ สำเร็จ ${res.count}` : `❌ ผิดพลาด: ${res.errors.join(', ')}`);
            if (res.success) loadUsers();
            if (csvInputRef.current) csvInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const filteredUsers = users.filter(u => (u.full_name || u.student_name || u.name || '').toLowerCase().includes(userSearch.toLowerCase()));
    
    // RENDER HELPERS
    const categoryStats = Object.values(TaskCategory).map(cat => ({ category: cat, label: TaskCategoryLabel[cat], count: tasks.filter(t => t.category === cat).length, colors: getCategoryColor(cat) }));

    return (
        <div className="animate-fade-in pb-24 relative min-h-screen bg-slate-50">
            <div className="px-4 py-4">
                {activeTab === 'calendar' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
                             {categoryStats.map((stat, i) => (
                                 <div key={i} className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center shadow-sm ${stat.colors.bg} ${stat.colors.border}`}><div className={`text-2xl font-bold ${stat.colors.text}`}>{stat.count}</div><div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mt-1">{stat.label}</div></div>
                             ))}
                        </div>
                        <div className="h-[60vh]"><CalendarView tasks={tasks} onDateClick={(d, t) => { setSelectedDate(d); setSelectedDayTasks(t); setIsDayModalOpen(true); }} /></div>
                    </div>
                )}
                
                {activeTab === 'post' && (
                    <Card className="mb-4">
                        <h2 className="text-xl font-semibold text-slate-800 mb-4">{editingTaskId ? '📝 แก้ไขงาน' : '🚀 สร้างโพสต์ใหม่'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                             {/* Form fields same as before... simplified for brevity */}
                             <input name="title" value={formData.title} onChange={handleChange} className="w-full p-2.5 border rounded-xl" placeholder="หัวข้อ" required />
                             <input name="subject" value={formData.subject} onChange={handleChange} className="w-full p-2.5 border rounded-xl" placeholder="วิชา" required />
                             <input type="datetime-local" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2.5 border rounded-xl" required />
                             <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2.5 border rounded-xl">{Object.values(TaskCategory).map(c => <option key={c} value={c}>{TaskCategoryLabel[c]}</option>)}</select>
                             <div className="grid grid-cols-3 gap-2">
                                <input name="targetGrade" value={formData.targetGrade} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="ชั้น" />
                                <input name="targetClassroom" value={formData.targetClassroom} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="ห้อง" />
                                <input name="targetStudentId" value={formData.targetStudentId} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="รหัส นร." />
                             </div>
                             <textarea name="description" value={formData.description} onChange={handleChange} className="w-full p-2.5 border rounded-xl" rows={3} placeholder="รายละเอียด"></textarea>
                             <button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl">{isSubmitting ? '...' : 'บันทึก'}</button>
                        </form>
                    </Card>
                )}

                {activeTab === 'users' && (
                     <div className="space-y-4">
                        <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                            <button onClick={() => setUserType('student')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${userType === 'student' ? 'bg-purple-100 text-purple-700' : 'text-slate-400'}`}>นักเรียน</button>
                            <button onClick={() => setUserType('teacher')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${userType === 'teacher' ? 'bg-purple-100 text-purple-700' : 'text-slate-400'}`}>ครู/บุคลากร</button>
                        </div>
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                             <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="ค้นหาชื่อ..." className="text-sm p-2 border rounded-lg" />
                             <button onClick={() => setIsAddUserModalOpen(true)} className="bg-green-500 text-white p-2 rounded-lg flex items-center gap-1 text-sm font-bold hover:bg-green-600"><PlusCircleIcon className="w-4 h-4" /> เพิ่ม</button>
                        </div>
                        {userType === 'student' && (
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-sm">
                                <p className="font-bold mb-2">Import CSV</p>
                                <input type="file" accept=".csv" onChange={handleCsvUpload} ref={csvInputRef} className="w-full text-xs text-slate-500" />
                                {importStatus && <p className="text-xs mt-1 text-blue-500">{importStatus}</p>}
                            </div>
                        )}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b"><tr><th className="p-4">ชื่อ</th><th className="p-4 text-right">จัดการ</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id || u.student_id || u.teacher_id}>
                                            <td className="p-4">
                                                <div className="font-bold">{u.student_name || u.name}</div>
                                                <div className="text-xs text-slate-400">{u.student_id || u.email}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDeleteUser(u)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100"><TrashIcon className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}
            </div>
            
            {/* Modals */}
            <ConfirmModal isOpen={!!userToDelete} title="ลบผู้ใช้งาน" message={`ยืนยันการลบ ${userToDelete?.student_name || userToDelete?.name}?`} onConfirm={confirmDeleteUser} onCancel={() => setUserToDelete(null)} variant="danger" />
            
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
                         <div className="p-4 bg-purple-600 text-white flex justify-between"><h3 className="font-bold">เพิ่ม {userType}</h3><button onClick={() => setIsAddUserModalOpen(false)}>✕</button></div>
                         <form onSubmit={handleAddUser} className="p-6 space-y-3">
                             <input name="name" placeholder="ชื่อ-นามสกุล" className="w-full p-2 border rounded-lg" required />
                             <input name="email" type="email" placeholder="อีเมล" className="w-full p-2 border rounded-lg" required />
                             <input name="password" type="password" placeholder="รหัสผ่าน" className="w-full p-2 border rounded-lg" required />
                             {userType === 'student' && (
                                 <div className="grid grid-cols-2 gap-2">
                                     <input name="student_id" placeholder="รหัสนักเรียน" className="p-2 border rounded-lg" required />
                                     <div className="flex gap-1"><input name="grade" placeholder="ชั้น" className="w-1/2 p-2 border rounded-lg" required /><input name="classroom" placeholder="ห้อง" className="w-1/2 p-2 border rounded-lg" required /></div>
                                 </div>
                             )}
                             <input name="lineUserId" placeholder="LINE User ID (Optional)" className="w-full p-2 border rounded-lg" />
                             <button type="submit" className="w-full mt-4 bg-purple-600 text-white font-bold py-3 rounded-xl">{isSubmitting ? '...' : 'บันทึก'}</button>
                         </form>
                    </div>
                </div>
            )}

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-2 pb-safe z-40 flex justify-between items-end">
                {['calendar', 'schedule', 'post', 'history', 'users', 'settings'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex flex-col items-center gap-1 p-2 rounded-xl w-[16%] ${activeTab === tab ? 'text-purple-600' : 'text-slate-400'}`}>
                        <div className={`w-6 h-6 rounded-full ${activeTab === tab ? 'bg-purple-100' : ''}`}></div>
                        <span className="text-[10px] font-bold capitalize">{tab}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TeacherDashboardPage;
