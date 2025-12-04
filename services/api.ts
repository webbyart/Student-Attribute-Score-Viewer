
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, TimetableEntry, SystemSettings, PortfolioItem, TaskCategoryLabel, getCategoryColor } from '../types';

export const GOOGLE_SHEET_ID = '1Az2q3dmbbQBHOwZbjH8gk3t2THGYUbWvW82CFI1x2cE';
export const API_URL = 'https://script.google.com/macros/s/AKfycbzNxmBNCllMNsNhDDkLU3yAY0_eMtveVLGTj00OrMERa6tbQ7qCdh0qP26lEpb2T0l6/exec'; 

const DEFAULT_LINE_TOKEN = 'vlDItyJKpyGjw6V7TJvo14KcedwDLc+M3or5zXnx5zu4W6izTtA6W4igJP9sc6CParnR+9hXIZEUkjs6l0QjpN6zdb2fNZ06W29X7Mw7YtXdG2/A04TrcDT6SuZq2oFJLE9Ah66iyWAAKQe2aWpCYQdB04t89/1O/w1cDnyilFU=';
const DEFAULT_GROUP_ID = 'C43845dc7a6bc2eb304ce0b9967aef5f5';
const APP_URL = 'https://student-homework.netlify.app/';

const normalizeKeys = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(normalizeKeys);
    const newObj: any = {};
    Object.keys(obj).forEach(key => newObj[key.toLowerCase()] = obj[key]);
    return newObj;
};

const apiRequest = async (action: string, method: 'GET' | 'POST' = 'POST', payload: any = {}) => {
    const params = new URLSearchParams({ action, sheet_id: GOOGLE_SHEET_ID, _t: Date.now().toString(), ...payload });
    let url = API_URL;
    let options: RequestInit = {};

    if (method === 'GET') {
        url += `?${params.toString()}`;
        options = { method: 'GET', redirect: 'follow' };
    } else {
        url += `?action=${action}&sheet_id=${GOOGLE_SHEET_ID}`;
        options = { method: 'POST', redirect: 'follow', body: JSON.stringify({ action, sheet_id: GOOGLE_SHEET_ID, payload }), headers: { 'Content-Type': 'text/plain' } };
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        
        if (text.includes('Ljava') || text.includes('Unexpected token')) {
             console.error("Backend Error: Java Object returned.");
             return action.startsWith('get') ? [] : { success: false, message: "Backend Error. Deploy v20.0" };
        }

        const data = JSON.parse(text);
        if (data._backendVersion && data._backendVersion !== '20.0') console.warn(`Backend version mismatch. Expected v20.0, got ${data._backendVersion}`);
        
        return Array.isArray(data) ? data.map(normalizeKeys) : normalizeKeys(data);
    } catch (error: any) {
        console.error(`API Failed [${action}]:`, error);
        if (action.startsWith('get')) return [];
        throw error;
    }
};

// --- AUTH ---
export const loginStudent = async (studentId: string, email: string, password?: string): Promise<Student | null> => {
    const students = await apiRequest('getStudents', 'GET'); 
    const found = students.find((s: any) => 
        s.student_id?.toString().toLowerCase() === studentId.toLowerCase() && 
        s.email?.toString().toLowerCase() === email.toLowerCase() &&
        (password ? s.password?.toString() === password : true)
    );
    if (!found) return null;
    return {
        id: found.id || found.student_id,
        student_id: found.student_id,
        student_name: found.student_name,
        email: found.email,
        grade: found.grade,
        classroom: found.classroom,
        profileImageUrl: found.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${found.student_id}`,
        lineUserId: found.line_user_id
    };
};

export const loginTeacher = async (email: string, password: string): Promise<Teacher | null> => {
    const teachers = await apiRequest('getTeachers', 'GET');
    const found = teachers.find((t: any) => t.email?.toLowerCase() === email.toLowerCase() && t.password === password);
    if (found) return { teacher_id: found.teacher_id, name: found.name, email: found.email };
    // Admin fallback for empty sheets
    if (email === 'admin@admin.com' && password === '123456' && teachers.length === 0) {
        return { teacher_id: 'T01', name: 'Admin Master', email: 'admin@admin.com' };
    }
    return null;
};

// --- USER MANAGEMENT ---
export const registerStudent = async (data: any) => apiRequest('registerStudent', 'POST', data);
export const registerTeacher = async (name: string, email: string, password: string, lineUserId?: string) => apiRequest('registerTeacher', 'POST', { name, email, password, lineUserId });
export const updateProfile = async (id: string, data: any) => apiRequest('registerStudent', 'POST', data);
export const deleteStudent = async (id: string) => apiRequest('deleteStudent', 'POST', { id });
export const deleteTeacher = async (teacher_id: string) => apiRequest('deleteTeacher', 'POST', { teacher_id });

// --- LINE LOGIN ---
export const getLineLoginUrl = (clientId: string, redirectUri: string) => {
    const state = Math.random().toString(36).substring(7);
    return `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile%20openid`;
};
export const loginWithLineCode = async (code: string, redirectUri: string) => apiRequest('loginWithLine', 'POST', { code, redirectUri });

export const syncLineUserProfile = async () => {
    // Placeholder: This function is called to sync user profile with LINE data
    // For now, it's a no-op that resolves immediately
    return Promise.resolve();
};

// --- TASKS ---
export const getAllTasks = async (): Promise<Task[]> => {
    const raw = await apiRequest('getTasks', 'GET');
    return raw.map((t: any) => ({
        id: t.id ? t.id.toString() : Math.random().toString(),
        title: t.title,
        subject: t.subject,
        description: t.description,
        dueDate: t.due_date,
        category: t.category,
        priority: t.priority,
        targetGrade: t.target_grade,
        targetClassroom: t.target_classroom,
        targetStudentId: t.target_student_id,
        createdBy: t.created_by,
        createdAt: t.created_at,
        attachments: t.attachments ? (typeof t.attachments === 'string' && t.attachments.startsWith('[') ? JSON.parse(t.attachments) : []) : [],
        isCompleted: String(t.is_completed).toLowerCase() === 'true'
    }));
};
export const createTask = async (task: Partial<Task>) => apiRequest('createTask', 'POST', task);
export const updateTask = async (task: Partial<Task>) => apiRequest('updateTask', 'POST', { id: task.id, payload: task });
export const deleteTask = async (taskId: string) => apiRequest('deleteTask', 'POST', { id: taskId });
export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean) => apiRequest('toggleTaskStatus', 'POST', { studentId, taskId, isCompleted });

// --- PORTFOLIO ---
export const getPortfolio = async (studentId: string) => {
    const raw = await apiRequest('getPortfolio', 'GET', { studentId });
    return raw.map((i: any) => ({ id: i.id, student_id: i.student_id, title: i.title, description: i.description, category: i.category, imageUrl: i.image_url, date: i.date }));
};
export const addPortfolioItem = async (item: Partial<PortfolioItem>) => apiRequest('addPortfolioItem', 'POST', item);
export const deletePortfolioItem = async (id: string) => apiRequest('deletePortfolioItem', 'POST', { id });

// --- OTHERS ---
export const getStudentCompletions = async (studentId: string) => apiRequest('getTaskCompletions', 'GET', { studentId });
export const getStudentDataById = async (studentId: string | undefined): Promise<StudentData | null> => {
    if (!studentId) return null;
    const students = await apiRequest('getStudents', 'GET');
    const found = students.find((s: any) => s.student_id?.toString() === studentId);
    if (!found) return null;

    const student: Student = {
        id: found.id || found.student_id,
        student_id: found.student_id,
        student_name: found.student_name,
        email: found.email,
        grade: found.grade,
        classroom: found.classroom,
        profileImageUrl: found.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${found.student_id}`,
        lineUserId: found.line_user_id
    };

    const [allTasks, completions] = await Promise.all([getAllTasks(), getStudentCompletions(studentId)]);
    const completedSet = new Set(completions.map((c: any) => c.task_id.toString()));
    
    const myTasks = allTasks.filter(t => 
        (t.targetGrade === student.grade && t.targetClassroom === student.classroom) || 
        t.targetStudentId === student.student_id || 
        (!t.targetGrade && !t.targetStudentId)
    ).map(t => ({ ...t, isCompleted: completedSet.has(t.id) }));

    return { student, tasks: myTasks, notifications: [], attributes: [], scores: [] };
};

export const getProfiles = async (role: 'student' | 'teacher') => apiRequest(role === 'student' ? 'getStudents' : 'getTeachers', 'GET');
export const bulkRegisterStudents = async (students: any[]) => {
    let count = 0, errors = [];
    for (const s of students) {
        try { await registerStudent(s); count++; } catch (e: any) { errors.push(e.message); }
    }
    return { success: count > 0, count, errors };
};
export const uploadFile = async (file: File): Promise<string> => new Promise(resolve => setTimeout(() => resolve(`https://via.placeholder.com/300?text=${encodeURIComponent(file.name)}`), 500));
export const getTimetable = async (grade: string, classroom: string) => {
    const raw = await apiRequest('getTimetable', 'GET');
    return raw.filter((t: any) => t.grade === grade && t.classroom?.toString() === classroom).map((t: any) => ({
        id: t.id, grade: t.grade, classroom: t.classroom, day_of_week: t.day_of_week, 
        period_index: parseInt(t.period_index), period_time: t.period_time, subject: t.subject, teacher: t.teacher, room: t.room, color: ''
    }));
};
export const checkDatabaseHealth = async () => ({ tables: (await apiRequest('checkHealth', 'GET')).tables || [], missingSql: '' });

// --- SETTINGS ---
export const getSystemSettings = async () => {
    const raw = await apiRequest('getSystemSettings', 'GET');
    return { 'line_channel_access_token': DEFAULT_LINE_TOKEN, 'test_group_id': DEFAULT_GROUP_ID, ...raw };
};
export const saveSystemSettings = async (settings: any) => apiRequest('saveSystemSettings', 'POST', settings);
export const testLineNotification = async (token: string, to: string, message: any) => apiRequest('sendLineMessage', 'POST', { token, to, messages: [message] });
export const sendLineNotification = async (to: string, task: Task) => testLineNotification('', to, generateTaskFlexMessage(task));
export const markNotificationRead = async (id: string) => ({ success: true });
export const sendCompletionNotification = async (name: string, title: string) => {
    const settings = await getSystemSettings();
    const msg = { type: "flex", altText: "ส่งงาน", contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [ { type: "text", text: "✅ ส่งงานแล้ว", weight: "bold", color: "#1DB446" }, { type: "text", text: `${name} ส่งงาน ${title}`, wrap: true } ] } } };
    return testLineNotification('', settings['test_group_id'], msg);
};

export const generateTaskFlexMessage = (task: Task) => {
    const color = getCategoryColor(task.category).solid.replace('bg-', '#').replace('-600', '').replace('-500', ''); // Approx
    return {
        type: "flex", altText: `งานใหม่: ${task.title}`,
        contents: { type: "bubble", header: { type: "box", layout: "vertical", contents: [{ type: "text", text: TaskCategoryLabel[task.category], color: "#FFFFFF", weight: "bold" }], backgroundColor: "#4F46E5" }, body: { type: "box", layout: "vertical", contents: [{ type: "text", text: task.title, weight: "bold", size: "xl" }, { type: "text", text: `วิชา: ${task.subject}` }, { type: "text", text: `ส่ง: ${new Date(task.dueDate).toLocaleDateString('th-TH')}`, color: "#EF4444", weight: "bold" }] }, footer: { type: "box", layout: "vertical", contents: [{ type: "button", action: { type: "uri", label: "ดูรายละเอียด", uri: APP_URL }, style: "primary", color: "#4F46E5" }] } }
    };
};
export const generateTimetableFlexMessage = (g: string, c: string, data: any) => ({ type: "flex", altText: "ตารางเรียน", contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [{ type: "text", text: `ตารางเรียน ${g}/${c}`, weight: "bold" }] } } });
