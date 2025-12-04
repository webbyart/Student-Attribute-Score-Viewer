
import React, { useState, useEffect, useRef } from 'react';
import Card from '../../components/ui/Card';
import { 
    createTask,
    updateTask,
    deleteTask,
    getAllTasks,
    uploadFile,
    getProfiles,
    updateProfile,
    getSystemSettings,
    saveSystemSettings,
    testLineNotification,
    generateTaskFlexMessage,
    checkDatabaseHealth,
    sendLineNotification,
    bulkRegisterStudents,
    registerTeacher,
    getTimetable,
    generateTimetableFlexMessage
} from '../../services/api';
import { Task, TaskCategory, TaskCategoryLabel, getCategoryColor, TimetableEntry } from '../../types';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import TrashIcon from '../../assets/icons/TrashIcon';
import PencilIcon from '../../assets/icons/PencilIcon';
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
        title: '',
        subject: '',
        description: '',
        dueDate: '',
        category: TaskCategory.CLASS_SCHEDULE,
        priority: 'Medium',
        targetGrade: 'ม.3',
        targetClassroom: '3',
        targetStudentId: ''
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
    
    // Confirm Delete Modal State
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
        loadSettings(); 
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            loadUsers();
        }
        if (activeTab === 'schedule') {
            loadSchedule();
        }
    }, [activeTab, userType, scheduleGrade, scheduleClassroom]);

    const loadTasks = async () => {
        const fetchedTasks = await getAllTasks();
        setTasks(fetchedTasks);
    }

    const loadUsers = async () => {
        const fetchedUsers = await getProfiles(userType);
        setUsers(fetchedUsers);
    }

    const loadSchedule = async () => {
        setScheduleLoading(true);
        const data = await getTimetable(scheduleGrade, scheduleClassroom);
        setScheduleData(data);
        setScheduleLoading(false);
    };

    const loadSettings = async () => {
        const settings = await getSystemSettings();
        if (settings['line_channel_access_token']) setLineToken(settings['line_channel_access_token']);
        if (settings['line_channel_secret']) setLineSecret(settings['line_channel_secret']);
        if (settings['line_login_channel_id']) setLineLoginChannelId(settings['line_login_channel_id']);
        if (settings['test_group_id']) setTestGroupId(settings['test_group_id']);
        
        const currentOrigin = window.location.origin + window.location.pathname;
        const suggestedRedirect = currentOrigin + (currentOrigin.endsWith('/') ? '' : '/') + '#/line-callback';
        setLineRedirectUri(suggestedRedirect);
    }

    const handleCheckDb = async () => {
        setIsCheckingDb(true);
        const result = await checkDatabaseHealth();
        setDbHealth(result.tables);
        setIsCheckingDb(false);
    }

    const handleSaveSettings = async () => {
        const result = await saveSystemSettings({ 
            'line_channel_access_token': lineToken,
            'line_channel_secret': lineSecret,
            'line_login_channel_id': lineLoginChannelId,
            'test_group_id': testGroupId 
        });
        setSettingsMessage(result.message);
        setTimeout(() => setSettingsMessage(''), 3000);
    }

    const handleTestLine = async (targetId: string, type: 'User' | 'Group', useDefaultToken = false) => {
        if (!targetId) {
            setSettingsMessage(`กรุณาระบุ ${type} ID ก่อนทดสอบ`);
            return;
        }

        setIsSendingTest(true);
        const dummyTask: any = {
            title: `ทดสอบส่งเข้า ${type === 'Group' ? 'กลุ่ม' : 'ส่วนตัว'}`,
            subject: 'วิชาวิทยาการคำนวณ',
            description: `นี่คือตัวอย่างการแสดงผลแบบ Flex Message บน LINE (${useDefaultToken ? 'ใช้ Default Token' : 'ใช้ Configured Token'})`,
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            category: TaskCategory.HOMEWORK,
            priority: 'High',
            targetGrade: 'ม.3',
            targetClassroom: '3',
            createdBy: teacher?.name || 'Admin',
            createdAt: new Date().toISOString()
        };
        
        const flexMessage = generateTaskFlexMessage(dummyTask);
        // Pass empty token string to force backend default if useDefaultToken is true
        const tokenToUse = useDefaultToken ? "" : lineToken;
        const result = await testLineNotification(tokenToUse, targetId, flexMessage);
        
        setSettingsMessage(result.message);
        setIsSendingTest(false);
        setTimeout(() => setSettingsMessage(''), 5000);
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
            targetGrade: 'ม.3',
            targetClassroom: '3',
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

        try {
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
                    setMessage('บันทึกข้อมูลสำเร็จ');
                    if (testGroupId) {
                        const fullTask: Task = {
                            id: result.data?.id || 'temp',
                            ...taskPayload,
                            createdAt: new Date().toISOString(),
                            createdBy: teacher.name,
                            isCompleted: false
                        };
                        // Send Notification to Line Group
                        sendLineNotification(testGroupId, fullTask)
                            .then(() => setMessage('บันทึกข้อมูลและส่งแจ้งเตือนไปยังกลุ่ม LINE แล้ว ✅'))
                            .catch(err => console.error("Auto LINE notification failed:", err));
                    }
                    handleCancelEdit();
                    loadTasks();
                } else {
                    setMessage('เกิดข้อผิดพลาด: ' + result.message);
                }
            }
        } catch (error: any) {
             setMessage('เกิดข้อผิดพลาด: ' + (error.message || 'Unknown error'));
        }
        setIsSubmitting(false);
    };

    const handleDeleteTask = async (id: string) => {
        setTaskToDelete(id);
        setIsConfirmDeleteOpen(true);
    };

    const confirmDeleteTask = async () => {
        if (taskToDelete) {
            await deleteTask(taskToDelete);
            loadTasks();
            setTaskToDelete(null);
        }
        setIsConfirmDeleteOpen(false);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        const result = await updateProfile(editingUser.id, editingUser);
        if (result.success) {
            alert('อัพเดทข้อมูลสำเร็จ');
            setEditingUser(null);
            loadUsers();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    };

    const handleAddTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const lineUserId = formData.get('lineUserId') as string;
        
        setIsSubmitting(true);
        const result = await registerTeacher(name, email, password, lineUserId);
        setIsSubmitting(false);
        
        if (result.success) {
            alert('เพิ่มครู/บุคลากรสำเร็จ');
            setIsAddUserModalOpen(false);
            loadUsers();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    }
    
    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('กำลังอ่านไฟล์...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const studentsToImport: any[] = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(',').map(c => c.trim());
                if (i === 0 && cols[0].toLowerCase().includes('student_id')) continue;
                if (cols.length >= 6) {
                    studentsToImport.push({
                        student_id: cols[0],
                        student_name: cols[1],
                        email: cols[2],
                        grade: cols[3],
                        classroom: cols[4],
                        password: cols[5]
                    });
                }
            }
            if (studentsToImport.length === 0) {
                setImportStatus('ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV');
                return;
            }
            setImportStatus(`กำลังนำเข้าข้อมูล ${studentsToImport.length} รายการ...`);
            const result = await bulkRegisterStudents(studentsToImport);
            if (result.success) {
                setImportStatus(`✅ นำเข้าสำเร็จ ${result.count} รายการ`);
                loadUsers();
            } else {
                setImportStatus(`❌ เกิดข้อผิดพลาด: ${result.errors.join(', ')}`);
            }
            if (csvInputRef.current) csvInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleExportUsers = () => {
        const filteredToExport = filteredUsers;
        if (filteredToExport.length === 0) {
            alert('ไม่มีข้อมูลให้ส่งออก');
            return;
        }
        const headers = ['ID', 'Name', 'Email', 'Grade', 'Classroom', 'Role'];
        const csvContent = [
            headers.join(','),
            ...filteredToExport.map(u => [
                u.student_id || u.teacher_id || u.id,
                `"${u.student_name || u.full_name || u.name || ''}"`,
                u.email || '',
                u.grade || '',
                u.classroom || '',
                userType
            ].join(','))
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${userType}_list.csv`;
        link.click();
    };

    const confirmSendSchedule = async () => {
        setIsConfirmSendScheduleOpen(false);
        if (!testGroupId) {
            alert('กรุณาตั้งค่า Group ID ในเมนูตั้งค่าก่อน');
            return;
        }
        const scheduleFlexMessage = generateTimetableFlexMessage(scheduleGrade, scheduleClassroom, scheduleData);
        setIsSendingTest(true);
        const result = await testLineNotification(lineToken, testGroupId, scheduleFlexMessage);
        setIsSendingTest(false);
        if(result.success) alert(`ส่งตารางเรียนเรียบร้อยแล้ว`);
        else alert('เกิดข้อผิดพลาด: ' + result.message);
    };

    // ... Event handlers
    const handleDateClick = (date: Date, dayTasks: Task[]) => {
        setSelectedDate(date);
        setSelectedDayTasks(dayTasks);
        setIsDayModalOpen(true);
    };

    const handleTaskClickFromModal = (task: Task) => {
        setSelectedTaskForModal(task);
    };

    // Filters
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
        u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.student_id && u.student_id.toLowerCase().includes(userSearch.toLowerCase()))
    );

    // Stats for Main Menu
    const categoryStats = Object.values(TaskCategory).map(cat => ({
        category: cat,
        label: TaskCategoryLabel[cat],
        count: tasks.filter(t => t.category === cat).length,
        colors: getCategoryColor(cat)
    }));

    return (
        <div className="animate-fade-in pb-24 relative min-h-screen bg-slate-50">
            <div className="px-4 py-4">
                {activeTab === 'calendar' && (
                    <div className="animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">เมนูหลัก (Main Menu)</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-2">
                             {categoryStats.map((stat, i) => (
                                 <div key={i} className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center shadow-sm ${stat.colors.bg} ${stat.colors.border}`}>
                                     <div className={`text-2xl font-bold ${stat.colors.text}`}>{stat.count}</div>
                                     <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mt-1">{stat.label}</div>
                                 </div>
                             ))}
                        </div>
                        <div className="h-[60vh]">
                            <CalendarView tasks={tasks} onDateClick={handleDateClick} />
                        </div>
                    </div>
                )}
                
                {/* ... (rest of the component, including 'users' and 'settings' tabs, kept as is) */}
                {activeTab === 'schedule' && (
                    <div className="animate-fade-in space-y-4">
                         <TimetableGrid 
                            grade={scheduleGrade}
                            classroom={scheduleClassroom}
                            onGradeChange={setScheduleGrade}
                            onClassroomChange={setScheduleClassroom}
                            scheduleData={scheduleData}
                            loading={scheduleLoading}
                         />
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setIsConfirmSendScheduleOpen(true)}
                                disabled={isSendingTest || scheduleLoading}
                                className="bg-green-600 text-white font-bold py-2 px-4 rounded-xl shadow-md hover:bg-green-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                {isSendingTest ? 'กำลังส่ง...' : 'ส่งตารางเรียนเข้าไลน์'}
                            </button>
                        </div>
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
                                <div className="grid grid-cols-3 gap-3 mb-2">
                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ระดับชั้น</label><input name="targetGrade" value={formData.targetGrade} onChange={handleChange} className="w-full p-2 border rounded-lg text-sm bg-slate-100 text-slate-500" required placeholder="ม.3" readOnly /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">ห้อง</label><input name="targetClassroom" value={formData.targetClassroom} onChange={handleChange} className="w-full p-2 border rounded-lg text-sm bg-slate-100 text-slate-500" required placeholder="3" readOnly /></div>
                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">รหัสบุคคล</label><input name="targetStudentId" value={formData.targetStudentId} onChange={handleChange} placeholder="ว่างไว้ = ทั้งห้อง" className="w-full p-2 border rounded-lg text-sm border-purple-200 bg-white" /></div>
                                </div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label><textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" placeholder="รายละเอียดเพิ่มเติม..."></textarea></div>
                            <div className="pt-4"><button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg disabled:opacity-50 transition flex justify-center items-center gap-2">{isSubmitting ? 'กำลังบันทึก...' : (editingTaskId ? 'บันทึกการแก้ไข' : 'โพสต์งานทันที')}</button>{message && <p className={`text-center mt-3 text-sm font-medium ${message.includes('ผิดพลาด') ? 'text-red-500' : 'text-green-600'}`}>{message}</p>}</div>
                        </form>
                    </Card>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4 animate-fade-in">
                         {filteredTasks.map(task => (
                            <Card key={task.id} className="relative hover:shadow-md transition">
                                <div className="flex justify-between items-start">
                                    <div className="mb-2 w-full">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-wrap gap-2 mb-2 items-center">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600`}>{TaskCategoryLabel[task.category]}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleEditTask(task)} className="p-1.5 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100"><PencilIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-800 leading-tight">{task.title}</h3>
                                        <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                                            <span>{task.subject}</span>
                                            <span className={`px-2 py-1 rounded-md font-medium ${new Date(task.dueDate) < new Date() ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>{new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                         ))}
                    </div>
                )}
                
                {/* ... (rest of the component, including 'users' and 'settings' tabs, kept as is) */}
                {activeTab === 'users' && (
                     <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                            <button onClick={() => setUserType('student')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${userType === 'student' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>นักเรียน</button>
                            <button onClick={() => setUserType('teacher')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${userType === 'teacher' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>ครู/บุคลากร</button>
                        </div>
                        {userType === 'student' && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        นำเข้าข้อมูลนักเรียน (CSV)
                                    </h3>
                                    <input type="file" accept=".csv" onChange={handleCsvUpload} ref={csvInputRef} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                                </div>
                                <div>
                                    <button 
                                        onClick={handleExportUsers} 
                                        className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl shadow-md hover:bg-emerald-700 transition flex items-center gap-2 text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Export CSV
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                                    <tr><th className="p-4">ชื่อ-นามสกุล</th><th className="p-4 text-right">จัดการ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-purple-50/30 transition">
                                            <td className="p-4"><div className="font-bold text-slate-800">{user.student_name || user.full_name || user.name}</div><div className="text-xs text-slate-400 font-mono mt-0.5">{user.student_id ? `ID: ${user.student_id}` : (userType === 'teacher' ? user.email : '')}</div></td>
                                            <td className="p-4 text-right"><div className="flex justify-end gap-2">{userType === 'student' && <button onClick={() => setViewingStudentId(user.student_id)} className="text-xs font-bold text-white bg-indigo-500 px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition shadow-sm">ดูข้อมูล</button>}<button onClick={() => setEditingUser(user)} className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition border border-purple-100">แก้ไข</button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}
                
                {activeTab === 'settings' && (
                     <div className="space-y-4 animate-fade-in pb-12">
                        <Card>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 10.5C22 5.25 17.07 1 11 1S0 5.25 0 10.5c0 4.69 3.75 8.59 9 9.35.35.83.25.96.11.27.07.69.04.99-.08 1.1-.96 3.93-1.07 4.31-.17.61-.09.84.34.84.45 0 1.2-.23 4.96-3.38 3.58.98 7.77-.52 7.77-5.67z"/></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">ตั้งค่า LINE Messaging & Login</h2>
                                    <p className="text-sm text-slate-500">จัดการการเชื่อมต่อ LINE OA และ LINE Login</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                    <h3 className="font-bold text-green-800 mb-3 text-sm">LINE Messaging API (สำหรับส่งแจ้งเตือน)</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Channel Access Token</label>
                                            <textarea rows={2} value={lineToken} onChange={(e) => setLineToken(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-xs" placeholder="วาง Long-lived access token..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Channel Secret</label>
                                            <input type="password" value={lineSecret} onChange={(e) => setLineSecret(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-xs" placeholder="วาง Channel Secret..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Group ID (สำหรับการแจ้งเตือนอัตโนมัติ)</label>
                                            <div className="flex gap-2">
                                                <input type="text" value={testGroupId} onChange={(e) => setTestGroupId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-xs" placeholder="Cxxxxxxxx..." />
                                                <button onClick={() => handleTestLine(testGroupId, 'Group')} disabled={isSendingTest} className="px-3 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 border border-blue-200 whitespace-nowrap">ทดสอบ</button>
                                            </div>
                                            {/* Explicit button to test using default token */}
                                            <div className="mt-2">
                                                <button onClick={() => handleTestLine(testGroupId, 'Group', true)} disabled={isSendingTest} className="w-full py-2 bg-slate-600 text-white rounded-lg font-bold text-xs hover:bg-slate-700 transition shadow-sm">
                                                    📢 ทดสอบส่งเข้ากลุ่ม (Default Token)
                                                </button>
                                                <p className="text-[10px] text-slate-400 mt-1 text-center">ใช้ Token ที่ฝังมากับระบบหากไม่ได้ตั้งค่าในฟอร์ม</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <h3 className="font-bold text-indigo-800 mb-3 text-sm">LINE Login (สำหรับเข้าสู่ระบบ)</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Login Channel ID</label>
                                            <input type="text" value={lineLoginChannelId} onChange={(e) => setLineLoginChannelId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-xs" placeholder="165xxxxxxx" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Redirect URI (ต้องตรงกับใน LINE Developer Console)</label>
                                            <div className="flex gap-2">
                                                <input type="text" value={lineRedirectUri} readOnly className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono text-xs" />
                                                <button onClick={() => navigator.clipboard.writeText(lineRedirectUri)} className="px-3 bg-white border border-slate-200 rounded-lg text-slate-500 text-xs hover:bg-slate-50">Copy</button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">นำ URL นี้ไปใส่ใน LINE Developers > LINE Login > Callback URL</p>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleSaveSettings} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-green-600 transition">บันทึกการตั้งค่า</button>
                                {settingsMessage && <p className={`text-center text-sm font-medium animate-fade-in p-2 rounded ${settingsMessage.includes('ล้มเหลว') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{settingsMessage}</p>}
                            </div>
                        </Card>
                        <Card>
                             <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                </div>
                                <div><h2 className="text-lg font-bold text-slate-800">ตรวจสอบฐานข้อมูล</h2><p className="text-sm text-slate-500">ตรวจสอบสถานะตารางต่างๆ</p></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCheckDb} disabled={isCheckingDb} className="flex-1 bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-600 transition flex items-center justify-center gap-2">{isCheckingDb ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}</button>
                            </div>
                            {dbHealth.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {dbHealth.map((table, i) => (
                                        <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${table.status === 'ok' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                            <span className="font-mono text-sm font-bold text-slate-700">{table.name}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${table.status === 'ok' ? 'text-green-600 bg-green-200' : 'text-red-600 bg-red-200'}`}>{table.status === 'ok' ? 'OK' : 'Missing'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                     </div>
                )}
            </div>

            {/* Bottom Nav (kept as is) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-2 pb-safe z-40 flex justify-between items-end">
                <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'calendar' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-[10px] font-bold">ปฏิทิน</span></button>
                <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] font-bold">ตาราง</span></button>
                <button onClick={() => setActiveTab('post')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'post' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><div className={`w-10 h-10 flex items-center justify-center rounded-full mb-1 shadow-lg ${activeTab === 'post' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div></button>
                <button onClick={() => { setActiveTab('history'); handleCancelEdit(); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'history' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="text-[10px] font-bold">ประวัติ</span></button>
                <button onClick={() => setActiveTab('users')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'users' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg><span className="text-[10px] font-bold">ผู้ใช้</span></button>
                 <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'settings' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[10px] font-bold">ตั้งค่า</span></button>
            </div>

            {/* Modals ... */}
            <ConfirmModal isOpen={isConfirmSendScheduleOpen} title="ยืนยันการส่งตารางเรียน" message={`คุณต้องการส่งตารางเรียนของชั้น ${scheduleGrade}/${scheduleClassroom} ไปยังกลุ่มไลน์ใช่หรือไม่?`} onConfirm={confirmSendSchedule} onCancel={() => setIsConfirmSendScheduleOpen(false)} confirmText="ส่งตารางเรียน" variant="success" />
            <ConfirmModal isOpen={isConfirmDeleteOpen} title="ยืนยันการลบ" message="คุณแน่ใจหรือไม่ว่าต้องการลบภาระงานนี้?" onConfirm={confirmDeleteTask} onCancel={() => setIsConfirmDeleteOpen(false)} confirmText="ลบข้อมูล" variant="danger" />
            {isDayModalOpen && selectedDate && <DayEventsModal date={selectedDate} tasks={selectedDayTasks} onClose={() => setIsDayModalOpen(false)} onTaskClick={handleTaskClickFromModal} />}
            {selectedTaskForModal && <TaskDetailModal task={selectedTaskForModal} onClose={() => setSelectedTaskForModal(null)} />}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                        <div className="p-4 bg-purple-600 text-white flex justify-between items-center"><h3 className="font-bold text-lg">✏️ แก้ไขข้อมูลผู้ใช้งาน</h3><button onClick={() => setEditingUser(null)} className="p-1 hover:bg-white/20 rounded-full transition">✕</button></div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อ-นามสกุล</label><input value={editingUser.full_name || editingUser.student_name || ''} onChange={e => setEditingUser({...editingUser, full_name: e.target.value, student_name: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" required /></div>
                            {userType === 'student' && (<>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Student ID</label><input value={editingUser.student_id || ''} onChange={e => setEditingUser({...editingUser, student_id: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50" required /></div>
                                <div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชั้น</label><input value={editingUser.grade || ''} onChange={e => setEditingUser({...editingUser, grade: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ห้อง</label><input value={editingUser.classroom || ''} onChange={e => setEditingUser({...editingUser, classroom: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl" /></div></div>
                            </>)}
                            <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-xl font-bold hover:bg-slate-200 transition">ยกเลิก</button><button type="submit" className="flex-1 py-3 text-white bg-purple-600 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition">บันทึก</button></div>
                        </form>
                    </div>
                </div>
            )}
            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                         <div className="p-4 bg-purple-600 text-white flex justify-between items-center"><h3 className="font-bold text-lg">➕ เพิ่มครู/บุคลากร</h3><button onClick={() => setIsAddUserModalOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition">✕</button></div>
                         <form onSubmit={handleAddTeacher} className="p-6 space-y-3">
                             <div><label className="block text-xs font-bold text-slate-500 mb-1">ชื่อ-นามสกุล</label><input name="name" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                             <div><label className="block text-xs font-bold text-slate-500 mb-1">อีเมล</label><input name="email" type="email" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                             <div><label className="block text-xs font-bold text-slate-500 mb-1">รหัสผ่าน</label><input name="password" type="password" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                             <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition">{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                         </form>
                    </div>
                </div>
            )}
            {viewingStudentId && <StudentDetailModal studentId={viewingStudentId} onClose={() => setViewingStudentId(null)} />}
        </div>
    );
};

export default TeacherDashboardPage;
