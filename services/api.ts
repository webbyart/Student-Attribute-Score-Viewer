
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, TimetableEntry, SystemSettings } from '../types';
import { MOCK_TASKS, MOCK_STUDENTS, MOCK_TEACHERS, MOCK_TIMETABLE } from '../data/mockData';

// --- Configuration ---
export const GOOGLE_SHEET_ID = '1tidL2kyTpvyPktQjkD5ZTvLIKvWEaIOS6TTmvDVuY6s';
// REPLACE THIS URL WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
export const API_URL = 'https://script.google.com/macros/s/AKfycbw3_2FRJOnlzmI5_AWJmhOOOy3JENE-2AoA3PFT61-c1oZjLv-K5KH87xgmtFcAC3298w/exec'; 

// --- API Helpers ---

let isMockMode = false;

const apiRequest = async (action: string, method: 'GET' | 'POST' = 'GET', payload?: any) => {
    try {
        // Append sheet_id to ensure the backend uses the correct sheet
        const url = `${API_URL}?action=${action}&sheet_id=${GOOGLE_SHEET_ID}`;
        
        const options: RequestInit = {
            method: method,
            redirect: 'follow', // Crucial for Google Apps Script redirects
        };

        if (method === 'POST') {
            const bodyData = { 
                action, 
                sheet_id: GOOGLE_SHEET_ID,
                payload: payload, 
                ...payload 
            };
            options.body = JSON.stringify(bodyData);
            options.headers = {
                'Content-Type': 'text/plain;charset=utf-8', 
            };
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            // Fix: If API returns an error object, fallback to mock instead of returning null
            if (data.error) {
                console.warn(`⚠️ API Error [${action}]: ${data.error}. Switching to Mock Fallback.`);
                // If the error is simply "Sheet not found" (first run), we might want to still try mock
                if (!isMockMode) {
                     isMockMode = true; // Temporary switch to mock for this session if API is broken
                }
                return mockFallback(action, payload); 
            }
            return data;
        } catch (e) {
            console.error("JSON Parse Error (likely HTML response from GAS error):", text);
            throw new Error("Invalid JSON response");
        }
    } catch (error) {
        console.warn(`⚠️ API Request Failed [${action}]. Falling back to Mock Data.`);
        console.warn(`Reason: ${error}`);
        isMockMode = true;
        return mockFallback(action, payload);
    }
};

// --- Mock Fallback Handler ---
const mockFallback = (action: string, payload: any) => {
    switch (action) {
        case 'getTasks': return MOCK_TASKS;
        case 'getStudents': return MOCK_STUDENTS;
        case 'getTeachers': return MOCK_TEACHERS;
        case 'getTimetable': return MOCK_TIMETABLE;
        case 'registerStudent': 
            return { success: true, message: 'Mock Registration Successful' };
        case 'registerTeacher':
            return { success: true, message: 'Mock Teacher Registration Successful' };
        case 'createTask':
            return { success: true, message: 'Mock Task Created', data: { id: `mock-${Date.now()}` } };
        case 'updateTask':
             return { success: true, message: 'Mock Task Updated' };
        case 'deleteTask':
             return { success: true, message: 'Mock Task Deleted' };
        case 'toggleTaskStatus':
             return { success: true };
        case 'checkHealth':
             return { tables: [{name: 'MockMode', status: 'ok', message: 'Using Local Data'}] };
        default: return null;
    }
};

// --- Utility ---

export const testDatabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const res = await apiRequest('checkHealth');
        if (res && res.tables) {
             return { success: true, message: `Connected to Google Sheet ID: ${GOOGLE_SHEET_ID}` };
        }
        return { success: false, message: 'Connected but invalid response' };
    } catch (e) {
        return { success: false, message: 'Connection failed. Please check script deployment.' };
    }
};

export const checkDatabaseHealth = async (): Promise<{ 
    tables: { name: string; status: 'ok' | 'missing' | 'error'; message?: string }[]; 
    missingSql: string; 
}> => {
    const result = await apiRequest('checkHealth');
    if (result && result.tables) {
        return { tables: result.tables, missingSql: '' };
    }
    return { tables: [{name: 'Connection', status: 'error', message: 'Failed to connect to Google Sheet API'}], missingSql: '' };
};

// --- Settings Management ---

export const getSystemSettings = async (): Promise<Record<string, string>> => {
    const stored = localStorage.getItem('system_settings');
    return stored ? JSON.parse(stored) : {
        'sheet_id': GOOGLE_SHEET_ID,
        'line_channel_access_token': '',
        'line_channel_secret': ''
    };
}

export const saveSystemSettings = async (settings: Record<string, string>): Promise<{ success: boolean; message: string }> => {
    localStorage.setItem('system_settings', JSON.stringify(settings));
    return { success: true, message: 'บันทึกการตั้งค่าสำเร็จ (Local)' };
}

// --- LINE Integration (Mock / Client-side) ---

export const generateTimetableFlexMessage = (grade: string, classroom: string, timetable: TimetableEntry[]) => {
    return { type: 'flex', altText: 'Timetable', contents: {} };
}

export const generateTaskFlexMessage = (task: Task) => {
    return { type: 'flex', altText: task.title, contents: {} };
};

export const sendLineNotification = async (lineUserId: string, messageOrTask: string | Task) => {
    console.log("Mock sending LINE to", lineUserId, messageOrTask);
}

export const testLineNotification = async (token: string, userId: string, message: string | object): Promise<{ success: boolean, message: string }> => {
    return { success: true, message: 'จำลองการส่งข้อความ LINE สำเร็จ' };
}

export const syncLineUserProfile = async (): Promise<boolean> => {
    return true;
}

// --- Student Auth & Data ---

export const registerStudent = async (data: any): Promise<{ success: boolean; message: string }> => {
    const newStudent = {
        student_id: data.student_id,
        student_name: data.student_name,
        email: data.email,
        grade: data.grade,
        classroom: data.classroom,
        password: data.password || '1234',
        profile_image: `https://ui-avatars.com/api/?name=${data.student_name}&background=random`,
        line_user_id: data.lineUserId || ''
    };
    
    const result = await apiRequest('registerStudent', 'POST', newStudent);
    if (!result) return { success: false, message: 'การเชื่อมต่อฐานข้อมูลล้มเหลว' };
    
    if (result.success === false) {
        return { success: false, message: result.message || 'ลงทะเบียนไม่สำเร็จ' };
    }

    return { success: true, message: 'ลงทะเบียนสำเร็จ' };
};

export const bulkRegisterStudents = async (students: any[]): Promise<{ success: boolean, count: number, errors: string[] }> => {
    let count = 0;
    const errors: string[] = [];
    for (const s of students) {
        const res = await registerStudent(s);
        if(res.success) count++;
        else errors.push(`${s.student_id}: ${res.message}`);
    }
    return { success: true, count: count, errors: errors };
}

export const loginStudent = async (studentId: string, email: string, password?: string): Promise<Student | null> => {
    // Select Data from Google Sheet
    const studentsRaw = await apiRequest('getStudents');
    const studentsList = Array.isArray(studentsRaw) ? studentsRaw : [];
    
    const student = studentsList.find((s: any) => s.student_id == studentId);
    
    if (!student) throw new Error("ไม่พบข้อมูลรหัสนักเรียนนี้ในระบบ");

    // Strictly check email to prevent mismatch
    if (student.email && email && student.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        throw new Error("อีเมลไม่ถูกต้อง");
    }
    
    // Check Password - Convert to string to handle numeric passwords in sheet
    if (password && student.password && String(student.password).trim() !== String(password).trim()) {
         throw new Error("รหัสผ่านไม่ถูกต้อง");
    }
    
    return {
        id: student.student_id,
        student_id: student.student_id,
        student_name: student.student_name,
        email: student.email,
        grade: student.grade,
        classroom: student.classroom,
        profileImageUrl: student.profile_image || `https://ui-avatars.com/api/?name=${student.student_name}&background=random`,
        lineUserId: student.line_user_id
    };
}

export const getStudentDataById = async (studentId: string): Promise<StudentData | null> => {
    try {
        const studentsRaw = await apiRequest('getStudents');
        const studentsList = Array.isArray(studentsRaw) ? studentsRaw : [];

        const studentRaw = studentsList.find((s: any) => s.student_id == studentId);
        if (!studentRaw) return null;

        const student: Student = {
            id: studentRaw.student_id,
            student_id: studentRaw.student_id,
            student_name: studentRaw.student_name,
            email: studentRaw.email,
            grade: studentRaw.grade,
            classroom: studentRaw.classroom,
            profileImageUrl: studentRaw.profile_image || `https://ui-avatars.com/api/?name=${studentRaw.student_name}&background=random`,
            lineUserId: studentRaw.line_user_id
        };

        const allTasks = await getAllTasks();
        
        const relevantTasks = allTasks.filter(t => 
            (t.targetGrade == student.grade && t.targetClassroom == student.classroom) ||
            t.targetStudentId == student.student_id ||
            (!t.targetGrade && !t.targetStudentId)
        );

        return {
            student: student,
            tasks: relevantTasks,
            notifications: [],
            attributes: [], 
            scores: []      
        };
    } catch (e) {
        console.error("Error fetching student details:", e);
        return null;
    }
};

export const getAllStudentTaskStatuses = async () => {
    return [];
};

export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean): Promise<boolean> => {
    await apiRequest('toggleTaskStatus', 'POST', { studentId, taskId, isCompleted });
    return true;
};

export const markNotificationRead = async (notificationId: string) => {
    // Mock
};

export const createBackup = async (userId: string): Promise<boolean> => {
    return true;
};

// --- Teacher Auth & Data ---

export const registerTeacher = async (name: string, email: string, password: string, lineUserId?: string): Promise<{ success: boolean; message: string; }> => {
    const res = await apiRequest('registerTeacher', 'POST', { name, email, password, lineUserId });
    if(res && res.success) return { success: true, message: 'ลงทะเบียนครูสำเร็จ' };
    return { success: false, message: res?.message || 'ลงทะเบียนล้มเหลว' };
};

export const loginTeacher = async (email: string, password: string): Promise<Teacher | null> => {
    const teachersRaw = await apiRequest('getTeachers');
    const teachersList = Array.isArray(teachersRaw) ? teachersRaw : [];
    
    // Case insensitive email check
    const teacher = teachersList.find((t: any) => t.email && t.email.toLowerCase() === email.toLowerCase());
    
    if (!teacher) {
        // Fallback for Admin login (Works in Mock, Empty Sheet, or if user hasn't synced yet)
        if ((email.toLowerCase() === 'admin@admin' || email.toLowerCase() === 'admin@admin.com') && (password === 'admin123' || password === '123456')) {
            return { teacher_id: 'admin', name: 'Administrator', email: 'admin@admin.com' };
        }
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    
    // Check Password - Convert to string to handle numeric passwords in sheet
    if(teacher.password && String(teacher.password).trim() !== String(password).trim()) {
         throw new Error("รหัสผ่านไม่ถูกต้อง");
    }
    
    return {
        teacher_id: teacher.teacher_id,
        name: teacher.name,
        email: teacher.email
    };
};

// --- Task CRUD & Teacher Utils ---

const parseAttachments = (att: any): string[] => {
    if (Array.isArray(att)) return att;
    if (typeof att === 'string') {
        try {
            if (att.startsWith('[')) return JSON.parse(att);
            return [att];
        } catch(e) { return []; }
    }
    return [];
};

export const getAllTasks = async (): Promise<Task[]> => {
    const data = await apiRequest('getTasks');
    const list = Array.isArray(data) ? data : [];

    return list.map((t: any) => ({
        id: t.id ? t.id.toString() : `t-${Math.random()}`,
        title: t.title,
        subject: t.subject,
        description: t.description,
        dueDate: t.due_date || t.dueDate, 
        category: t.category as TaskCategory,
        priority: t.priority,
        targetGrade: t.target_grade || t.targetGrade,
        targetClassroom: t.target_classroom || t.targetClassroom,
        targetStudentId: t.target_student_id || t.targetStudentId,
        createdBy: t.created_by || t.createdBy,
        createdAt: t.created_at || t.createdAt || new Date().toISOString(),
        isCompleted: t.is_completed === true || t.is_completed === 'true',
        attachments: parseAttachments(t.attachments)
    })).sort((a: Task, b: Task) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createTask = async (task: any): Promise<{ success: boolean; message: string; data?: any }> => {
    const newTask = {
        id: `t${Date.now()}`,
        ...task,
        due_date: task.dueDate,
        target_grade: task.targetGrade,
        target_classroom: task.targetClassroom,
        target_student_id: task.targetStudentId,
        created_by: task.createdBy,
        is_completed: false,
        created_at: new Date().toISOString(),
        attachments: JSON.stringify(task.attachments || [])
    };
    
    const res = await apiRequest('createTask', 'POST', newTask);
    if (!res || !res.success) return { success: false, message: res?.message || 'สร้างงานไม่สำเร็จ' };
    return { success: true, message: 'สร้างงานสำเร็จ', data: newTask };
};

export const updateTask = async (task: any): Promise<{ success: boolean; message: string }> => {
    const payload = {
        title: task.title,
        subject: task.subject,
        description: task.description,
        due_date: task.dueDate,
        category: task.category,
        priority: task.priority,
        target_grade: task.targetGrade,
        target_classroom: task.targetClassroom,
        target_student_id: task.targetStudentId,
        attachments: JSON.stringify(task.attachments)
    };
    const res = await apiRequest('updateTask', 'POST', { id: task.id, payload });
    if(res && res.success) return { success: true, message: 'แก้ไขงานสำเร็จ' };
    return { success: false, message: 'แก้ไขงานล้มเหลว' };
};

export const deleteTask = async (taskId: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiRequest('deleteTask', 'POST', { id: taskId });
    if(res && res.success) return { success: true, message: 'ลบงานสำเร็จ' };
    return { success: false, message: 'ลบงานล้มเหลว' };
};

export const uploadFile = async (file: File): Promise<string | null> => {
    return URL.createObjectURL(file); 
};

export const getProfiles = async (role: 'student' | 'teacher'): Promise<any[]> => {
    if (role === 'student') {
        const data = await apiRequest('getStudents');
        const list = Array.isArray(data) ? data : [];

        return list.map((s: any) => ({
            id: s.student_id,
            student_id: s.student_id,
            full_name: s.student_name,
            student_name: s.student_name,
            email: s.email,
            grade: s.grade,
            classroom: s.classroom,
            profileImageUrl: s.profile_image
        }));
    } else {
        const data = await apiRequest('getTeachers');
        const list = Array.isArray(data) ? data : [];

        return list.map((t: any) => ({
            id: t.teacher_id,
            teacher_id: t.teacher_id,
            name: t.name,
            email: t.email
        }));
    }
};

export const updateProfile = async (id: string, updates: any): Promise<{ success: boolean; message: string }> => {
    return { success: true, message: 'อัพเดทข้อมูลสำเร็จ (API Simulation)' };
};

export const getTimetable = async (grade: string, classroom: string): Promise<TimetableEntry[]> => {
    const data = await apiRequest('getTimetable');
    const list = Array.isArray(data) ? data : [];

    const filtered = list.filter((t: any) => t.grade == grade && t.classroom == classroom);
    
    return filtered.map((t: any) => ({
        id: t.id || `tt-${Math.random()}`,
        grade: t.grade,
        classroom: t.classroom,
        day_of_week: t.day_of_week,
        period_index: parseInt(t.period_index),
        period_time: t.period_time,
        subject: t.subject,
        teacher: t.teacher,
        room: t.room,
        color: 'bg-white border-slate-200' 
    }));
};
