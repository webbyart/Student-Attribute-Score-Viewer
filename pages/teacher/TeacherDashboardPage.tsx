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
import { supabase } from '../../lib/supabaseClient';
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
    
    // Settings State - Pre-filled with provided credentials
    const [lineToken, setLineToken] = useState('vlDItyJKpyGjw6V7TJvo14KcedwDLc+M3or5zXnx5zu4W6izTtA6W4igJP9sc6CParnR+9hXIZEUkjs6l0QjpN6zdb2fNZ06W29X7Mw7YtXdG2/A04TrcDT6SuZq2oFJLE9Ah66iyWAAKQe2aWpCYQdB04t89/1O/w1cDnyilFU=');
    const [lineSecret, setLineSecret] = useState('b7cd5cc937837ad847aba3bf851576d9');
    const [testUserId, setTestUserId] = useState('Ua276c047d87982958a524c1f5ac30f08');
    const [testGroupId, setTestGroupId] = useState(''); 
    const [settingsMessage, setSettingsMessage] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    
    // DB Health Check State
    const [dbHealth, setDbHealth] = useState<{name: string, status: string}[]>([]);
    const [missingSql, setMissingSql] = useState('');
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
        targetGrade: 'ม.4',
        targetClassroom: '2',
        targetStudentId: ''
    });
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    // Schedule State
    const [scheduleGrade, setScheduleGrade] = useState('ม.4');
    const [scheduleClassroom, setScheduleClassroom] = useState('1');
    const [scheduleData, setScheduleData] = useState<TimetableEntry[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [isConfirmSendScheduleOpen, setIsConfirmSendScheduleOpen] = useState(false);
    
    // Confirm Delete Modal State
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
        loadSettings(); // Load settings on mount to ensure Group ID is ready

        // Real-time Subscription for Tasks
        const taskChannel = supabase.channel('realtime-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            loadTasks();
        })
        .subscribe();

        // Real-time Subscription for Users (Profiles)
        const profileChannel = supabase.channel('realtime-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadUsers(); 
        })
        .subscribe();

        return () => { 
            supabase.removeChannel(taskChannel);
            supabase.removeChannel(profileChannel);
        }
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
        if (settings['line_channel_access_token']) {
            setLineToken(settings['line_channel_access_token']);
        }
        if (settings['line_channel_secret']) {
            setLineSecret(settings['line_channel_secret']);
        }
        if (settings['test_group_id']) {
            setTestGroupId(settings['test_group_id']);
        }
    }

    const handleCheckDb = async () => {
        setIsCheckingDb(true);
        const result = await checkDatabaseHealth();
        setDbHealth(result.tables);
        setMissingSql(result.missingSql);
        setIsCheckingDb(false);
    }

    const handleSaveSettings = async () => {
        const result = await saveSystemSettings({ 
            'line_channel_access_token': lineToken,
            'line_channel_secret': lineSecret,
            'test_group_id': testGroupId // Save the group ID too for convenience
        });
        setSettingsMessage(result.message);
        setTimeout(() => setSettingsMessage(''), 3000);
    }

    const handleTestLine = async (targetId: string, type: 'User' | 'Group') => {
        if (!targetId) {
            setSettingsMessage(`กรุณาระบุ ${type} ID ก่อนทดสอบ`);
            return;
        }

        setIsSendingTest(true);
        // Create a dummy task to test the Flex Message generator
        const dummyTask: any = {
            title: `ทดสอบส่งเข้า ${type === 'Group' ? 'กลุ่ม' : 'ส่วนตัว'}`,
            subject: 'วิชาวิทยาการคำนวณ',
            description: 'นี่คือตัวอย่างการแสดงผลแบบ Flex Message บน LINE',
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            category: TaskCategory.HOMEWORK,
            priority: 'High',
            targetGrade: 'ม.4',
            targetClassroom: '2',
            createdBy: teacher?.name || 'Admin',
            createdAt: new Date().toISOString()
        };
        
        // Pass the object to generate Flex
        const flexMessage = generateTaskFlexMessage(dummyTask);
        const result = await testLineNotification(lineToken, targetId, flexMessage);
        
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
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
            window.location.reload();
            return;
        }

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
                    
                    // --- Auto Send LINE Notification ---
                    if (testGroupId) {
                        const fullTask: Task = {
                            id: result.data?.id || 'temp',
                            ...taskPayload,
                            createdAt: new Date().toISOString(),
                            createdBy: teacher.name,
                            isCompleted: false
                        };
                        
                        sendLineNotification(testGroupId, fullTask)
                            .then(() => setMessage('บันทึกข้อมูลและส่งแจ้งเตือน LINE แล้ว ✅'))
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
        const updates = {
            full_name: editingUser.full_name,
            student_id: editingUser.student_id,
            grade: editingUser.grade,
            classroom: editingUser.classroom,
            login_code: editingUser.login_code,
            line_user_id: editingUser.line_user_id
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
    
    // --- Bulk Import ---
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
                setImportStatus('ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV (รูปแบบ: student_id, name, email, grade, class, password)');
                return;
            }

            setImportStatus(`กำลังนำเข้าข้อมูล ${studentsToImport.length} รายการ...`);
            const result = await bulkRegisterStudents(studentsToImport);
            
            if (result.success) {
                setImportStatus(`✅ นำเข้าสำเร็จ ${result.count} รายการ ${result.errors.length > 0 ? `(มีข้อผิดพลาด ${result.errors.length} รายการ - ดู Console)` : ''}`);
                loadUsers();
            } else {
                setImportStatus(`❌ เกิดข้อผิดพลาด: ${result.errors.join(', ')}`);
            }
            if (csvInputRef.current) csvInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const confirmSendSchedule = async () => {
        setIsConfirmSendScheduleOpen(false);
        
        if (!testGroupId) {
            alert('กรุณาตั้งค่า Group ID ในเมนูตั้งค่าก่อน หรือตรวจสอบว่าได้บันทึกการตั้งค่าแล้ว');
            return;
        }

        // Generate the Table-like Flex Message
        const scheduleFlexMessage = generateTimetableFlexMessage(scheduleGrade, scheduleClassroom, scheduleData);
        
        setIsSendingTest(true);
        const result = await testLineNotification(lineToken, testGroupId, scheduleFlexMessage);
        setIsSendingTest(false);
        
        if(result.success) alert(`ส่งตารางเรียนชั้น ${scheduleGrade}/${scheduleClassroom} เรียบร้อยแล้ว`);
        else alert('เกิดข้อผิดพลาด: ' + result.message);
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
                        <div className="h-[60vh]">
                            <CalendarView tasks={tasks} onDateClick={handleDateClick} />
                        </div>
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
                        <Card className="mt-4">
                             <div className="text-center py-2 text-slate-500 text-sm">
                                ปฏิทินรวมงานทั้งหมด (แตะที่วันที่เพื่อดูรายละเอียด)
                             </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div className="animate-fade-in space-y-4">
                         {/* Dedicated Timetable Grid */}
                         <TimetableGrid 
                            grade={scheduleGrade}
                            classroom={scheduleClassroom}
                            onGradeChange={setScheduleGrade}
                            onClassroomChange={setScheduleClassroom}
                            scheduleData={scheduleData}
                            loading={scheduleLoading}
                         />
                         
                        {/* Send Schedule Button */}
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

                        <div className="mt-8 pt-4 border-t border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-700">รายการเปลี่ยนแปลง/ชดเชย</h2>
                                    <p className="text-xs text-slate-500">คาบเรียนพิเศษที่เพิ่มเป็นรายวัน</p>
                                </div>
                                <button 
                                    onClick={() => { setActiveTab('post'); setFormData(prev => ({ ...prev, category: TaskCategory.CLASS_SCHEDULE })); }} 
                                    className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-blue-700 shadow-md flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    เพิ่มคาบพิเศษ
                                </button>
                            </div>
                            
                             {classScheduleTasks.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                    {classScheduleTasks.map(task => (
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
                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                                    <p className="text-slate-400">ไม่มีรายการคาบเรียนพิเศษ/ชดเชย</p>
                                </div>
                            )}
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
                                {!editingTaskId && testGroupId && (
                                    <p className="text-[10px] text-center text-slate-400 mt-1">
                                        * ระบบจะส่งแจ้งเตือนไปที่ LINE Group ID: {testGroupId} โดยอัตโนมัติ
                                    </p>
                                )}
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

                        {/* CSV Import Section for Students */}
                        {userType === 'student' && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    นำเข้าข้อมูลนักเรียน (CSV)
                                </h3>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        onChange={handleCsvUpload}
                                        ref={csvInputRef}
                                        className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Format: student_id, full_name, email, grade, classroom, password
                                </p>
                                {importStatus && (
                                    <div className="mt-2 text-xs font-medium p-2 bg-slate-50 rounded text-slate-700">
                                        {importStatus}
                                    </div>
                                )}
                            </div>
                        )}

                        {userType === 'teacher' && (
                             <div className="flex justify-end mb-4">
                                <button onClick={() => setIsAddUserModalOpen(true)} className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-purple-700 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    เพิ่มครู/บุคลากร
                                </button>
                             </div>
                        )}

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
                                            <td className="p-4"><div className="font-bold text-slate-800">{user.full_name}</div><div className="text-xs text-slate-400 font-mono mt-0.5">{user.login_code ? `Code: ${user.login_code}` : (userType === 'teacher' ? user.email : 'No Code')}</div></td>
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

                {activeTab === 'settings' && (
                     <div className="space-y-4 animate-fade-in pb-12">
                        <Card>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 10.5C22 5.25 17.07 1 11 1S0 5.25 0 10.5c0 4.69 3.75 8.59 9 9.35.35.08.83.25.96.56.11.27.07.69.04.99-.08 1.1-.96 3.93-1.07 4.31-.17.61-.09.84.34.84.45 0 1.2-.23 4.96-3.38 3.58.98 7.77-.52 7.77-5.67z"/></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">ตั้งค่า LINE Official Account</h2>
                                    <p className="text-sm text-slate-500">เชื่อมต่อเพื่อส่งการแจ้งเตือนให้นักเรียน</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Channel Access Token</label>
                                    <textarea 
                                        rows={3}
                                        value={lineToken}
                                        onChange={(e) => setLineToken(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition break-all"
                                        placeholder="วาง Token ของคุณที่นี่..."
                                    />
                                    <p className="text-xs text-slate-400 mt-2">
                                        * คัดลอก Long-lived access token จาก LINE Developers Console
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Channel Secret</label>
                                    <input 
                                        type="password"
                                        value={lineSecret}
                                        onChange={(e) => setLineSecret(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition"
                                        placeholder="วาง Channel Secret ของคุณที่นี่..."
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">LINE Group ID (สำหรับการแจ้งเตือนอัตโนมัติ)</label>
                                    <input 
                                        type="text"
                                        value={testGroupId}
                                        onChange={(e) => setTestGroupId(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-green-200 focus:border-green-400 focus:outline-none transition"
                                        placeholder="Cxxxxxxxx..."
                                    />
                                    <p className="text-xs text-slate-400 mt-2">
                                        * หากระบุ ID นี้ ระบบจะส่งแจ้งเตือนเข้ากลุ่มอัตโนมัติเมื่อโพสต์งานใหม่
                                    </p>
                                </div>

                                <button 
                                    onClick={handleSaveSettings}
                                    className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-green-600 transition"
                                >
                                    บันทึกการตั้งค่า
                                </button>
                                
                                <div className="pt-6 border-t border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">ทดสอบการแจ้งเตือน</h3>
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">User ID (รายบุคคล)</label>
                                                <input 
                                                    type="text" 
                                                    value={testUserId} 
                                                    onChange={(e) => setTestUserId(e.target.value)}
                                                    className="w-full p-2 text-sm border border-slate-200 rounded-lg font-mono"
                                                    placeholder="Uxxxxxxxx..."
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleTestLine(testUserId, 'User')}
                                                disabled={isSendingTest}
                                                className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 transition text-sm flex justify-center items-center gap-2"
                                            >
                                                {isSendingTest ? 'กำลังส่ง...' : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                        ส่งหาบุคคล
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {settingsMessage && (
                                    <p className={`text-center text-sm font-medium animate-fade-in p-3 rounded-lg ${settingsMessage.includes('ล้มเหลว') || settingsMessage.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{settingsMessage}</p>
                                )}
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">ตรวจสอบฐานข้อมูล</h2>
                                    <p className="text-sm text-slate-500">ตรวจสอบสถานะตารางต่างๆ</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCheckDb}
                                    disabled={isCheckingDb}
                                    className="flex-1 bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-indigo-600 transition flex items-center justify-center gap-2"
                                >
                                    {isCheckingDb ? 'กำลังตรวจสอบ...' : '1. ตรวจสอบ'}
                                </button>
                                <a 
                                    href="https://supabase.com/dashboard/project/fuiutzmkcwtuzjtbgfsg/sql/new" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex-1 bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-slate-700 transition flex items-center justify-center gap-2"
                                >
                                    2. แก้ไข (เปิด SQL Editor)
                                </a>
                            </div>

                            {dbHealth.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {dbHealth.map((table, i) => (
                                        <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${table.status === 'ok' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                            <div>
                                                 <span className="font-mono text-sm font-bold text-slate-700 block">{table.name}</span>
                                                 {table.message && <span className="text-[10px] text-slate-500">{table.message}</span>}
                                            </div>
                                            {table.status === 'ok' ? (
                                                <span className="text-xs font-bold text-green-600 bg-green-200 px-2 py-0.5 rounded-full">OK</span>
                                            ) : (
                                                <span className="text-xs font-bold text-red-600 bg-red-200 px-2 py-0.5 rounded-full">Missing</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {missingSql && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h3 className="text-sm font-bold text-red-600 mb-2">⚠️ พบปัญหาโครงสร้างฐานข้อมูล</h3>
                                    <p className="text-xs text-slate-500 mb-2">ระบบได้สร้างคำสั่ง SQL สำหรับซ่อมแซมตารางที่ขาดหายไป กรุณาคัดลอกและนำไปรันใน Supabase SQL Editor</p>
                                    <div className="relative">
                                        <textarea 
                                            readOnly 
                                            value={missingSql} 
                                            className="w-full h-40 bg-slate-900 text-green-400 font-mono text-[10px] p-3 rounded-lg overflow-x-auto whitespace-pre"
                                        />
                                        <button 
                                            onClick={() => { navigator.clipboard.writeText(missingSql); alert('คัดลอก SQL แล้ว!'); }}
                                            className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 rounded"
                                        >
                                            Copy SQL
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                     </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-2 pb-safe z-40 flex justify-between items-end">
                <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'calendar' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-[10px] font-bold">ปฏิทิน</span>
                </button>
                <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                     <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-[10px] font-bold">ตารางเรียน</span>
                </button>
                <button onClick={() => setActiveTab('post')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'post' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full mb-1 shadow-lg ${activeTab === 'post' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                </button>
                <button onClick={() => { setActiveTab('history'); handleCancelEdit(); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'history' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="text-[10px] font-bold">ประวัติ</span>
                </button>
                <button onClick={() => setActiveTab('users')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'users' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-[10px] font-bold">ผู้ใช้</span>
                </button>
                 <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'settings' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-[10px] font-bold">ตั้งค่า</span>
                </button>
            </div>

            <ConfirmModal 
                isOpen={isConfirmSendScheduleOpen}
                title="ยืนยันการส่งตารางเรียน"
                message={`คุณต้องการส่งตารางเรียนของชั้น ${scheduleGrade}/${scheduleClassroom} ไปยังกลุ่มไลน์ใช่หรือไม่?`}
                onConfirm={confirmSendSchedule}
                onCancel={() => setIsConfirmSendScheduleOpen(false)}
            />

            <ConfirmModal 
                isOpen={isConfirmDeleteOpen}
                title="ยืนยันการลบ"
                message="คุณแน่ใจหรือไม่ว่าต้องการลบภาระงานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
                onConfirm={confirmDeleteTask}
                onCancel={() => setIsConfirmDeleteOpen(false)}
            />

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
                            {editingUser.role === 'teacher' && (
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">LINE User ID</label><input value={editingUser.line_user_id || ''} onChange={e => setEditingUser({...editingUser, line_user_id: e.target.value})} className="w-full p-2.5 border border-green-200 rounded-xl bg-green-50 text-green-700 font-mono text-xs" placeholder="Uxxxxxxxx..." /></div>
                            )}
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
                             <div><label className="block text-xs font-bold text-slate-500 mb-1">LINE User ID (Optional)</label><input name="lineUserId" placeholder="Uxxxx..." className="w-full p-2.5 border border-green-200 bg-green-50 rounded-xl font-mono text-green-700" /></div>
                             
                             <button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition">
                                 {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                             </button>
                         </form>
                    </div>
                </div>
            )}

            {viewingStudentId && <StudentDetailModal studentId={viewingStudentId} onClose={() => setViewingStudentId(null)} />}
        </div>
    );
};

export default TeacherDashboardPage;