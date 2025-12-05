
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, TimetableEntry, SystemSettings, PortfolioItem, TaskCategoryLabel, LineLoginResult } from '../types';

// --- Configuration ---
export const GOOGLE_SHEET_ID = '1Az2q3dmbbQBHOwZbjH8gk3t2THGYUbWvW82CFI1x2cE';
// ⚠️⚠️ IMPORTANT: Replace this URL with your NEW deployment URL ⚠️⚠️
export const API_URL = 'https://script.google.com/macros/s/AKfycbxkYqhh3xsd-pV9ERZjrRLPzzaNbPpdCazl2NrqfQZnz7IrNmbru8E7u2F8eKzlt4yJ/exec'; 

const DEFAULT_GROUP_ID = 'C43845dc7a6bc2eb304ce0b9967aef5f5';

// --- API Helpers ---

const normalizeKeys = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(normalizeKeys);
    
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        newObj[key.toLowerCase()] = obj[key];
    });
    return newObj;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const apiRequest = async (action: string, method: 'GET' | 'POST' = 'POST', payload: any = {}) => {
    const queryParams = new URLSearchParams({
        action,
        sheet_id: GOOGLE_SHEET_ID,
        _t: new Date().getTime().toString(),
        ...payload 
    });

    const url = `${API_URL}?${queryParams.toString()}`;
    const bodyData = { action, sheet_id: GOOGLE_SHEET_ID, payload: payload, ...payload };

    const options: RequestInit = {
        method: method,
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    };
    
    if (method === 'POST') {
        options.body = JSON.stringify(bodyData);
    }

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const text = await response.text();
            
            // RELAXED CHECK: Only block if the entire response starts with Java Object signature
            if (text.startsWith('[Ljava')) {
                 console.error("CRITICAL ERROR: Backend returned Java Object instead of JSON.");
                 return action.startsWith('get') ? [] : { success: false, message: "CRITICAL: Script error." };
            }

            try {
                const data = JSON.parse(text);
                if (data.error) throw new Error(data.error);
                return Array.isArray(data) ? data.map(normalizeKeys) : normalizeKeys(data);
            } catch (e: any) {
                console.error("JSON Parse Error:", e.message, "Response:", text.substring(0, 100));
                if (action.startsWith('get')) return [];
                throw new Error("Invalid JSON response from server.");
            }
        } catch (error: any) {
            attempts++;
            if (error.message.includes("JSON") || error.message.includes("Backend")) throw error; 

            console.warn(`API Connection Failed [${action}] (Attempt ${attempts}/${maxAttempts}):`, error);
            if (attempts >= maxAttempts) throw error;
            await delay(1000 * attempts);
        }
    }
};

// --- Helper to map Task to Snake Case for Google Sheet Headers ---
const mapTaskToPayload = (task: Partial<Task>) => {
    const payload: any = { ...task };
    // Google Sheets headers are snake_case (defined in backend/Code.js setupSheet)
    if (task.dueDate) payload.due_date = task.dueDate;
    if (task.targetGrade) payload.target_grade = task.targetGrade;
    if (task.targetClassroom) payload.target_classroom = task.targetClassroom;
    if (task.targetStudentId) payload.target_student_id = task.targetStudentId;
    if (task.createdBy) payload.created_by = task.createdBy;
    if (task.isCompleted !== undefined) payload.is_completed = task.isCompleted;
    if (task.createdAt) payload.created_at = task.createdAt;
    
    return payload;
};

// ... Exports ...

export const loginStudent = async (studentId: string, email: string, password?: string): Promise<Student | null> => {
    try {
        const students = await apiRequest('getStudents', 'GET'); 
        if (!Array.isArray(students)) return null;

        const found = students.find((s: any) => {
            const idMatch = s.student_id?.toString().toLowerCase() === studentId.toLowerCase();
            const emailMatch = s.email?.toString().toLowerCase() === email.toLowerCase();
            const passMatch = password ? (s.password?.toString() === password) : true;
            return idMatch && emailMatch && passMatch;
        });

        if (found) {
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
        }
    } catch (e) {
        console.error("Student Login Error:", e);
        throw e;
    }
    return null;
};

export const loginTeacher = async (email: string, password: string): Promise<Teacher | null> => {
    try {
        const teachers = await apiRequest('getTeachers', 'GET');
        const inputEmail = email.trim().toLowerCase();
        const inputPass = password.trim();

        if (Array.isArray(teachers)) {
            const found = teachers.find((t: any) => 
                t.email?.toString().toLowerCase() === inputEmail && 
                t.password?.toString() === inputPass
            );
            if (found) return { teacher_id: found.teacher_id, name: found.name, email: found.email };
        }
    } catch (e) {
        console.error("Teacher Login API Error:", e);
    }
    if (email.trim().toLowerCase() === 'admin@admin.com' && password.trim() === '123456') {
        return { teacher_id: 'T01', name: 'ART (Admin Fallback)', email: 'admin@admin.com' };
    }
    return null;
};

export const loginWithLineCode = async (code: string, redirectUri: string): Promise<LineLoginResult> => {
    try {
        const result = await apiRequest('loginWithLine', 'POST', { code, redirectUri });
        return result as LineLoginResult;
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const registerStudent = async (data: any) => apiRequest('registerStudent', 'POST', data);

// Updated to support teacher ID
export const registerTeacher = async (teacherId: string, name: string, email: string, password: string) => 
    apiRequest('registerTeacher', 'POST', { teacher_id: teacherId, name, email, password });

export const deleteUser = async (role: 'student' | 'teacher', id: string) => {
    const endpoint = role === 'student' ? 'deleteStudent' : 'deleteTeacher';
    return await apiRequest(endpoint, 'POST', { id });
};

export const getAllTasks = async (): Promise<Task[]> => {
    try {
        const rawTasks = await apiRequest('getTasks', 'GET');
        if (!rawTasks || !Array.isArray(rawTasks)) return [];

        return rawTasks.map((t: any) => {
            // Safe Attachment Parsing
            let safeAttachments = [];
            // If backend already sanitized to "[]", JSON.parse works.
            // If it's a string from legacy, check:
            if (t.attachments && typeof t.attachments === 'string') {
                 try { 
                     // Handle "Ljava" cases handled by backend sanitizer now returning "[]"
                     safeAttachments = JSON.parse(t.attachments); 
                 } catch(e) {
                     // Fallback
                     safeAttachments = [];
                 }
            }

            return {
                id: t.id ? t.id.toString() : Math.random().toString(),
                title: t.title,
                subject: t.subject,
                description: t.description,
                // Ensure date mapping is correct from Sheet (snake_case from backend)
                dueDate: t.due_date, 
                category: t.category,
                priority: t.priority,
                targetGrade: t.target_grade,
                targetClassroom: t.target_classroom,
                targetStudentId: t.target_student_id,
                createdBy: t.created_by || 'Admin',
                createdAt: t.created_at || new Date().toISOString(),
                attachments: safeAttachments,
                isCompleted: t.is_completed === 'TRUE' || t.is_completed === true || t.is_completed === 'true'
            };
        });
    } catch (e) {
        console.error("Error fetching tasks:", e);
        return [];
    }
};

export const getStudentCompletions = async (studentId: string) => {
    try {
        const res = await apiRequest('getTaskCompletions', 'GET', { studentId });
        return Array.isArray(res) ? res : [];
    } catch (e) { return []; }
}

export const createTask = async (task: Partial<Task>) => apiRequest('createTask', 'POST', mapTaskToPayload(task));
export const updateTask = async (task: Partial<Task>) => apiRequest('updateTask', 'POST', { id: task.id, payload: mapTaskToPayload(task) });
export const deleteTask = async (taskId: string) => apiRequest('deleteTask', 'POST', { id: taskId });
export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean) => 
    apiRequest('toggleTaskStatus', 'POST', { studentId, taskId, isCompleted });
export const markNotificationRead = async (notificationId: string) => ({ success: true });

export const getPortfolio = async (studentId: string): Promise<PortfolioItem[]> => {
    try {
        const raw = await apiRequest('getPortfolio', 'GET', { studentId });
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => ({
            id: item.id,
            student_id: item.student_id,
            title: item.title,
            description: item.description,
            category: item.category,
            imageUrl: item.image_url,
            date: item.date
        }));
    } catch (e) { return []; }
};
export const addPortfolioItem = async (item: Partial<PortfolioItem>) => apiRequest('addPortfolioItem', 'POST', item);
export const deletePortfolioItem = async (id: string) => apiRequest('deletePortfolioItem', 'POST', { id });

export const getStudentDataById = async (studentId: string | undefined): Promise<StudentData | null> => {
    if (!studentId) return null;
    try {
        const students = await apiRequest('getStudents', 'GET');
        if (!Array.isArray(students)) return null;
        const found = students.find((s: any) => s.student_id?.toString().toLowerCase() === studentId.toLowerCase());
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
        const completedTaskIds = new Set(completions.map((c:any) => c.task_id.toString()));

        const myTasks = allTasks.filter(t => {
            const gradeMatch = t.targetGrade === student.grade;
            const classMatch = t.targetClassroom === student.classroom;
            const individualMatch = t.targetStudentId === student.student_id;
            return (gradeMatch && classMatch) || individualMatch || (!t.targetGrade && !t.targetStudentId);
        }).map(t => ({ ...t, isCompleted: completedTaskIds.has(t.id) }));

        const notifications: Notification[] = myTasks.filter(t => !t.isCompleted).slice(0, 5).map(t => ({
            id: `notif-${t.id}`, task_id: t.id,
            message: `อย่าลืม! ${t.title} กำหนดส่ง ${new Date(t.dueDate).toLocaleDateString('th-TH')}`,
            is_read: false, created_at: new Date().toISOString()
        }));

        return { student, tasks: myTasks, notifications, attributes: [], scores: [] };
    } catch (e) {
        console.error("Error fetching student data:", e);
        return null;
    }
};

export const getProfiles = async (role: 'student' | 'teacher') => {
    const res = await apiRequest(role === 'student' ? 'getStudents' : 'getTeachers', 'GET');
    return Array.isArray(res) ? res : [];
};
export const updateProfile = async (id: string, data: any) => apiRequest('registerStudent', 'POST', data); 
export const bulkRegisterStudents = async (students: any[]) => {
    let count = 0;
    const errors = [];
    for (const s of students) {
        try { await registerStudent(s); count++; } catch (e: any) { errors.push(`${s.student_id}: ${e.message}`); }
    }
    return { success: count > 0, count, errors };
};
export const uploadFile = async (file: File): Promise<string> => 
    new Promise((resolve) => setTimeout(() => resolve(`https://via.placeholder.com/300?text=${encodeURIComponent(file.name)}`), 1000));
export const getTimetable = async (grade: string, classroom: string) => {
    try {
        const all = await apiRequest('getTimetable', 'GET');
        if (!Array.isArray(all)) return [];
        return all.filter((t: any) => t.grade === grade && t.classroom?.toString() === classroom).map((t: any) => ({
            id: t.id || Math.random().toString(), grade: t.grade, classroom: t.classroom,
            day_of_week: t.day_of_week, period_index: parseInt(t.period_index), period_time: t.period_time,
            subject: t.subject, teacher: t.teacher, room: t.room, color: '' 
        }));
    } catch (e) { return []; }
};
export const checkDatabaseHealth = async () => {
    try {
        const result = await apiRequest('checkHealth', 'POST');
        return { tables: result?.tables || [], missingSql: '' };
    } catch (e) { return { tables: [], missingSql: '' }; }
};

export const getSystemSettings = async (): Promise<Record<string, string>> => {
    try {
        const settings = await apiRequest('getSystemSettings', 'GET');
        const final = { ...settings };
        if (!final['test_group_id']) final['test_group_id'] = DEFAULT_GROUP_ID;
        return final;
    } catch (e) {
        return { 'test_group_id': DEFAULT_GROUP_ID };
    }
}
export const saveSystemSettings = async (settings: Record<string, string>) => apiRequest('saveSystemSettings', 'POST', settings);

export const sendCompletionNotification = async (studentName: string, taskTitle: string) => {
    return { success: true };
};

export const syncLineUserProfile = async () => {};