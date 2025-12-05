
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
    checkDatabaseHealth,
    registerTeacher,
    getTimetable,
    deleteUser,
    registerStudent,
    bulkRegisterStudents
} from '../../services/api';
import { Task, TaskCategory, TaskCategoryLabel, getCategoryColor, TimetableEntry } from '../../types';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import TrashIcon from '../../assets/icons/TrashIcon';
import PencilIcon from '../../assets/icons/PencilIcon';
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
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
    
    // Confirm Delete Modal State
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
    const [isConfirmDeleteUserOpen, setIsConfirmDeleteUserOpen] = useState(false);

    useEffect(() => {
        loadTasks();
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

    const handleCheckDb = async () => {
        setIsCheckingDb(true);
        const result = await checkDatabaseHealth();
        setDbHealth(result.tables);
        setIsCheckingDb(false);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEditTask = (task: Task) => {
        setFormData({
            title: task.title,
            subject: task.subject,
            description: task.description,
            // Extract YYYY-MM-DD from ISO or simple date string
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
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
            id: editingTaskId || `task-${Date.now()}`,
            ...formData,
            targetStudentId: formData.targetStudentId.trim() === '' ? undefined : formData.targetStudentId.trim(),
            // Ensure simple YYYY-MM-DD format as requested
            dueDate: formData.dueDate, 
            priority: formData.priority as 'High'|'Medium'|'Low',
            attachments: allAttachments,
            createdBy: teacher.name,
            createdAt: editingTaskId ? undefined : new Date().toISOString(),
            isCompleted: false
        };

        try {
            if (editingTaskId) {
                 const result = await updateTask({
                    id: editingTaskId,
                    ...taskPayload
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

    const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        
        setIsSubmitting(true);
        let result;
        
        if (userType === 'teacher') {
             const teacherId = formData.get('teacher_id') as string;
             result = await registerTeacher(teacherId, name, email, password);
        } else {
             const studentId = formData.get('student_id') as string;
             const grade = formData.get('grade') as string;
             const classroom = formData.get('classroom') as string;
             const fileInput = formData.get('profileImage') as File;
             let profileImageUrl = '';
             
             if (fileInput && fileInput.size > 0) {
                 try {
                     profileImageUrl = await new Promise((resolve) => {
                         const reader = new FileReader();
                         reader.onloadend = () => resolve(reader.result as string);
                         reader.readAsDataURL(fileInput);
                     });
                 } catch (e) { console.error(e); }
             }

             result = await registerStudent({
                 student_id: studentId, 
                 student_name: name, 
                 email, 
                 password, 
                 grade, 
                 classroom,
                 profile_image: profileImageUrl // Key matches backend column
             });
        }
        
        setIsSubmitting(false);
        
        if (result.success) {
            alert('เพิ่มผู้ใช้งานสำเร็จ');
            setIsAddUserModalOpen(false);
            loadUsers();
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    }
    
    const handleDeleteUser = async (id: string) => {
        setUserToDelete(id);
        setIsConfirmDeleteUserOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (userToDelete) {
            await deleteUser(userType, userToDelete);
            loadUsers();
            setUserToDelete(null);
        }
        setIsConfirmDeleteUserOpen(false);
    };
    
    // --- CSV Helper Functions ---

    const handleExportCSV = () => {
        // Headers consistent with import expectations
        const headers = ["student_id", "student_name", "email", "grade", "classroom", "password"];
        
        // Use filteredUsers (current view) or all users of current type
        const dataToExport = filteredUsers.length > 0 ? filteredUsers : users;

        // Convert to CSV string
        const csvRows = [
            headers.join(','),
            ...dataToExport.map(user => {
                // Ensure values don't have commas that break CSV
                const safe = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
                return [
                    safe(user.student_id || user.teacher_id),
                    safe(user.student_name || user.name),
                    safe(user.email),
                    safe(user.grade || ''),
                    safe(user.classroom || ''),
                    safe('123456') // Placeholder or skip password for security
                ].join(',');
            })
        ];
        
        const csvString = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel Thai support
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${userType}_list.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            // Simple CSV Parser
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            const newStudents = [];

            for (let i = 1; i < lines.length; i++) {
                // Handle split by comma but ignore commas inside quotes
                const currentLine = lines[i];
                // Regex matches: "quoted,text", or unquoted,text
                const matches = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || currentLine.split(',');
                
                const values = matches.map((val: string) => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

                if (values.length >= 2) { // Minimum check
                    const entry: any = {};
                    // Map known headers
                    const getCol = (name: string) => {
                        const idx = headers.findIndex(h => h.toLowerCase().includes(name));
                        return idx !== -1 ? values[idx] : '';
                    };

                    // Student mapping
                    if (userType === 'student') {
                        entry.student_id = getCol('student_id') || values[0];
                        entry.student_name = getCol('name') || values[1];
                        entry.email = getCol('email') || values[2];
                        entry.grade = getCol('grade') || 'ม.3';
                        entry.classroom = getCol('classroom') || '3';
                        entry.password = getCol('password') || '123456';
                        entry.profile_image = ''; // Default empty
                        
                        if (entry.student_id && entry.student_name) newStudents.push(entry);
                    }
                }
            }

            if (newStudents.length > 0) {
                const confirmMsg = `พบข้อมูล ${newStudents.length} รายการ คุณต้องการนำเข้าหรือไม่?`;
                if (window.confirm(confirmMsg)) {
                    setIsSubmitting(true);
                    try {
                        const result = await bulkRegisterStudents(newStudents);
                        if (result.success) {
                            alert(`นำเข้าสำเร็จ: ${result.count} รายการ`);
                            loadUsers();
                        } else {
                            alert('นำเข้าล้มเหลว: ' + result.message);
                        }
                    } catch (err: any) {
                        alert('Error: ' + err.message);
                    }
                    setIsSubmitting(false);
                }
            } else {
                alert('ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV');
            }
            
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
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

    const filteredUsers = users.filter(u => {
        const term = userSearch.toLowerCase();
        // Combine name fields checks and safe string conversion
        const name = String(u.student_name || u.full_name || u.name || '').toLowerCase();
        // Safe string conversion for IDs which might be numbers from Google Sheet
        const studentId = u.student_id ? String(u.student_id).toLowerCase() : '';
        const teacherId = u.teacher_id ? String(u.teacher_id).toLowerCase() : '';
        const email = String(u.email || '').toLowerCase();
        
        return name.includes(term) || studentId.includes(term) || teacherId.includes(term) || email.includes(term);
    });

    // Stats for Main Menu (Specific Order requested by User)
    const specificCategories = [
        TaskCategory.CLASS_SCHEDULE,
        TaskCategory.EXAM_SCHEDULE,
        TaskCategory.HOMEWORK,
        TaskCategory.ACTIVITY_INSIDE,
        TaskCategory.ACTIVITY_OUTSIDE
    ];
    
    const categoryStats = specificCategories.map(cat => ({
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
                                    <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-purple-200 focus:outline-none" required />
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
                
                {activeTab === 'users' && (
                     <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                            <button onClick={() => setUserType('student')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${userType === 'student' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>นักเรียน</button>
                            <button onClick={() => setUserType('teacher')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${userType === 'teacher' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>ครู/บุคลากร</button>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex-1 w-full md:w-auto flex gap-2">
                                <button 
                                    onClick={() => setIsAddUserModalOpen(true)}
                                    className="flex-1 bg-purple-600 text-white font-bold py-2 px-4 rounded-xl shadow-md hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    เพิ่ม{userType === 'student' ? 'นักเรียน' : 'ครู'}
                                </button>
                                {userType === 'student' && (
                                    <>
                                        <button 
                                            onClick={handleExportCSV}
                                            className="px-4 bg-green-500 text-white font-bold py-2 rounded-xl shadow-md hover:bg-green-600 transition flex items-center justify-center gap-1 text-sm"
                                            title="Export CSV"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Export
                                        </button>
                                        <button 
                                            onClick={handleImportClick}
                                            className="px-4 bg-blue-500 text-white font-bold py-2 rounded-xl shadow-md hover:bg-blue-600 transition flex items-center justify-center gap-1 text-sm"
                                            title="Import CSV"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Import
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                            className="hidden" 
                                            accept=".csv" 
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                                    <tr><th className="p-4">ชื่อ-นามสกุล</th><th className="p-4 text-right">จัดการ</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-purple-50/30 transition">
                                            <td className="p-4"><div className="font-bold text-slate-800">{user.student_name || user.full_name || user.name}</div><div className="text-xs text-slate-400 font-mono mt-0.5">{user.student_id ? `ID: ${user.student_id}` : (userType === 'teacher' ? user.email : '')}</div></td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {userType === 'student' && <button onClick={() => setViewingStudentId(user.student_id)} className="text-xs font-bold text-white bg-indigo-500 px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition shadow-sm">ดูข้อมูล</button>}
                                                    <button onClick={() => setEditingUser(user)} className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition border border-purple-100">แก้ไข</button>
                                                    <button onClick={() => handleDeleteUser(user.student_id || user.teacher_id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition border border-red-100">ลบ</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={2} className="p-8 text-center text-slate-400">ไม่พบผู้ใช้งาน</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                     </div>
                )}
                
                {activeTab === 'settings' && (
                     <div className="space-y-4 animate-fade-in pb-12">
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

            {/* Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 py-2 pb-safe z-40 flex justify-between items-end">
                <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'calendar' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-[10px] font-bold">ปฏิทิน</span></button>
                <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] font-bold">ตาราง</span></button>
                <button onClick={() => setActiveTab('post')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'post' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><div className={`w-10 h-10 flex items-center justify-center rounded-full mb-1 shadow-lg ${activeTab === 'post' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div></button>
                <button onClick={() => { setActiveTab('history'); handleCancelEdit(); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'history' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="text-[10px] font-bold">ประวัติ</span></button>
                <button onClick={() => setActiveTab('users')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'users' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg><span className="text-[10px] font-bold">ผู้ใช้</span></button>
                 <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-[16%] ${activeTab === 'settings' ? 'text-green-600' : 'text-slate-400 hover:text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[10px] font-bold">ตั้งค่า</span></button>
            </div>

            {/* Modals ... */}
            <ConfirmModal isOpen={isConfirmDeleteOpen} title="ยืนยันการลบ" message="คุณแน่ใจหรือไม่ว่าต้องการลบภาระงานนี้?" onConfirm={confirmDeleteTask} onCancel={() => setIsConfirmDeleteOpen(false)} confirmText="ลบข้อมูล" variant="danger" />
            <ConfirmModal isOpen={isConfirmDeleteUserOpen} title="ยืนยันการลบผู้ใช้" message="คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานรายนี้? การกระทำนี้ไม่สามารถเรียกคืนได้" onConfirm={confirmDeleteUser} onCancel={() => setIsConfirmDeleteUserOpen(false)} confirmText="ลบผู้ใช้งาน" variant="danger" />
            
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
                         <div className="p-4 bg-purple-600 text-white flex justify-between items-center"><h3 className="font-bold text-lg">➕ เพิ่ม{userType === 'student' ? 'นักเรียน' : 'ครู'}ใหม่</h3><button onClick={() => setIsAddUserModalOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition">✕</button></div>
                         <form onSubmit={handleAddUser} className="p-6 space-y-3">
                             {userType === 'student' ? (
                                 <>
                                     <div><label className="block text-xs font-bold text-slate-500 mb-1">รหัสนักเรียน</label><input name="student_id" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                     <div><label className="block text-xs font-bold text-slate-500 mb-1">ชื่อ-นามสกุล</label><input name="name" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                     <div><label className="block text-xs font-bold text-slate-500 mb-1">อีเมล</label><input name="email" type="email" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                     <div className="flex gap-2">
                                         <div><label className="block text-xs font-bold text-slate-500 mb-1">ชั้น</label><input name="grade" defaultValue="ม.3" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                         <div><label className="block text-xs font-bold text-slate-500 mb-1">ห้อง</label><input name="classroom" defaultValue="3" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                     </div>
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">รูปโปรไฟล์</label>
                                        <input type="file" name="profileImage" accept="image/*" className="w-full p-2 border border-slate-200 rounded-xl text-xs" />
                                     </div>
                                 </>
                             ) : (
                                 <>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">รหัสครู (Teacher ID)</label><input name="teacher_id" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">ชื่อ-นามสกุล</label><input name="name" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-1">อีเมล</label><input name="email" type="email" className="w-full p-2.5 border border-slate-200 rounded-xl" required /></div>
                                 </>
                             )}
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
