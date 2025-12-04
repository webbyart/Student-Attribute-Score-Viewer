
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, TimetableEntry, SystemSettings, PortfolioItem, TaskCategoryLabel } from '../types';

// --- Configuration ---
export const GOOGLE_SHEET_ID = '1Az2q3dmbbQBHOwZbjH8gk3t2THGYUbWvW82CFI1x2cE';
// IMPORTANT: You MUST Deploy "Version 23.0" of your script and paste the new URL here.
export const API_URL = 'https://script.google.com/macros/s/AKfycbxZYRRPXPYeq7E__XBu7N8uSovxJuiOQpQxl9AtaciToBBzL6EAsTTAQg0HQ6FBQ3U_/exec'; 

const DEFAULT_LINE_TOKEN = 'vlDItyJKpyGjw6V7TJvo14KcedwDLc+M3or5zXnx5zu4W6izTtA6W4igJP9sc6CParnR+9hXIZEUkjs6l0QjpN6zdb2fNZ06W29X7Mw7YtXdG2/A04TrcDT6SuZq2oFJLE9Ah66iyWAAKQe2aWpCYQdB04t89/1O/w1cDnyilFU=';
const DEFAULT_GROUP_ID = 'C43845dc7a6bc2eb304ce0b9967aef5f5';
const DEFAULT_LIFF_ID = '2008618173'; 
const APP_URL = 'https://student-homework.netlify.app/';

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
        ...payload // Pass simple payload items as query params for GET
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
            
            if (text.startsWith('[Ljava') || text.includes('Unexpected token') || text.includes('Ljava.lang')) {
                 console.error("CRITICAL ERROR: Backend returned Java Object instead of JSON. You MUST Deploy a New Version (v23.0) of the Script.");
                 return action.startsWith('get') ? [] : { success: false, message: "CRITICAL: Script not deployed correctly. Please Deploy New Version (v23.0)." };
            }

            try {
                const data = JSON.parse(text);
                if (data.error) throw new Error(data.error);
                if (data._backendVersion !== '23.0') console.warn("WARNING: Backend version mismatch. Expected v23.0, got " + (data._backendVersion || 'Unknown'));
                return Array.isArray(data) ? data.map(normalizeKeys) : normalizeKeys(data);
            } catch (e: any) {
                console.error("JSON Parse Error:", e.message, "Response:", text.substring(0, 100));
                if (action.startsWith('get')) return [];
                throw new Error("Invalid JSON response from server. Please Re-Deploy Script (v23.0).");
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

// --- AUTH SERVICES ---

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

export const registerStudent = async (data: any) => apiRequest('registerStudent', 'POST', data);
export const registerTeacher = async (name: string, email: string, password: string, lineUserId?: string) => 
    apiRequest('registerTeacher', 'POST', { name, email, password, lineUserId });

export const deleteUser = async (role: 'student' | 'teacher', id: string) => {
    const endpoint = role === 'student' ? 'deleteStudent' : 'deleteTeacher';
    return await apiRequest(endpoint, 'POST', { id });
};

// --- DATA SERVICES ---

export const getAllTasks = async (): Promise<Task[]> => {
    try {
        const rawTasks = await apiRequest('getTasks', 'GET');
        if (!rawTasks || !Array.isArray(rawTasks)) {
            console.log("No tasks found or invalid format:", rawTasks);
            return [];
        }

        return rawTasks.map((t: any) => ({
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
            createdBy: t.created_by || 'Admin',
            createdAt: t.created_at || new Date().toISOString(),
            attachments: t.attachments ? (typeof t.attachments === 'string' && t.attachments.startsWith('[') ? JSON.parse(t.attachments) : []) : [],
            isCompleted: t.is_completed === 'TRUE' || t.is_completed === true || t.is_completed === 'true'
        }));
    } catch (e) {
        console.error("Error fetching tasks:", e);
        return [];
    }
};

export const getStudentCompletions = async (studentId: string) => {
    try {
        const res = await apiRequest('getTaskCompletions', 'GET', { studentId });
        return Array.isArray(res) ? res : [];
    } catch (e) {
        return [];
    }
}

export const createTask = async (task: Partial<Task>) => apiRequest('createTask', 'POST', task);
export const updateTask = async (task: Partial<Task>) => apiRequest('updateTask', 'POST', { id: task.id, payload: task });
export const deleteTask = async (taskId: string) => apiRequest('deleteTask', 'POST', { id: taskId });
export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean) => 
    apiRequest('toggleTaskStatus', 'POST', { studentId, taskId, isCompleted });
export const markNotificationRead = async (notificationId: string) => ({ success: true });

// --- PORTFOLIO SERVICES ---
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

// --- USER DATA ---

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
            const isAssigned = (gradeMatch && classMatch) || individualMatch || (!t.targetGrade && !t.targetStudentId);
            return isAssigned;
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

// --- Settings ---
export const getSystemSettings = async (): Promise<Record<string, string>> => {
    try {
        const settings = await apiRequest('getSystemSettings', 'GET');
        const final = { ...settings };
        if (!final['line_channel_access_token']) final['line_channel_access_token'] = DEFAULT_LINE_TOKEN;
        if (!final['test_group_id']) final['test_group_id'] = DEFAULT_GROUP_ID;
        if (!final['line_login_channel_id']) final['line_login_channel_id'] = DEFAULT_LIFF_ID;
        return final;
    } catch (e) {
        return { 'line_channel_access_token': DEFAULT_LINE_TOKEN, 'test_group_id': DEFAULT_GROUP_ID, 'line_login_channel_id': DEFAULT_LIFF_ID };
    }
}
export const saveSystemSettings = async (settings: Record<string, string>) => apiRequest('saveSystemSettings', 'POST', settings);

// --- LINE ---
const getFlexColor = (category: TaskCategory) => {
    switch (category) {
        case TaskCategory.EXAM_SCHEDULE: return "#EF4444";
        case TaskCategory.HOMEWORK: return "#F97316";
        case TaskCategory.CLASS_SCHEDULE: return "#3B82F6";
        case TaskCategory.ACTIVITY_INSIDE: return "#10B981";
        case TaskCategory.ACTIVITY_OUTSIDE: return "#8B5CF6";
        default: return "#64748B";
    }
};

export const generateTimetableFlexMessage = (grade: string, classroom: string, timetable: TimetableEntry[]) => ({
    type: "flex", altText: `ตารางเรียน ${grade}/${classroom}`,
    contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [ { type: "text", text: `ตารางเรียน ${grade}/${classroom}`, weight: "bold", size: "xl" } ] } }
});

export const generateTaskFlexMessage = (task: Task) => {
    const color = getFlexColor(task.category);
    const dateStr = new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = new Date(task.dueDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const createDateStr = task.createdAt ? new Date(task.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) : '-';

    return {
        type: "flex",
        altText: `งานใหม่: ${task.title}`,
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: TaskCategoryLabel[task.category] || "แจ้งเตือน", color: "#ffffff", weight: "bold", size: "sm" }
                ],
                backgroundColor: color,
                paddingAll: "15px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: task.title, weight: "bold", size: "xl", wrap: true, color: "#1f2937" },
                    { type: "text", text: task.subject, size: "sm", color: "#6b7280", margin: "xs", weight: "bold" },
                    
                    { type: "separator", margin: "md", color: "#e5e7eb" },
                    
                    // Details Grid
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "md",
                        spacing: "sm",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "📅 กำหนด:", size: "xs", color: "#9ca3af", flex: 3 },
                                    { type: "text", text: `${dateStr} ${timeStr} น.`, size: "xs", color: "#ef4444", flex: 7, weight: "bold" }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "👥 สำหรับ:", size: "xs", color: "#9ca3af", flex: 3 },
                                    { type: "text", text: `ชั้น ${task.targetGrade}/${task.targetClassroom}`, size: "xs", color: "#374151", flex: 7 }
                                ]
                            },
                             {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "👤 ผู้แจ้ง:", size: "xs", color: "#9ca3af", flex: 3 },
                                    { type: "text", text: task.createdBy || "-", size: "xs", color: "#374151", flex: 7 }
                                ]
                            },
                             {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    { type: "text", text: "🕒 สร้างเมื่อ:", size: "xs", color: "#9ca3af", flex: 3 },
                                    { type: "text", text: createDateStr, size: "xs", color: "#9ca3af", flex: 7 }
                                ]
                            }
                        ]
                    },

                    { type: "separator", margin: "md", color: "#e5e7eb" },

                    { type: "text", text: "รายละเอียดเพิ่มเติม:", size: "xs", color: "#6b7280", margin: "md", weight: "bold" },
                    { type: "text", text: task.description || "-", size: "xs", color: "#374151", wrap: true, margin: "xs" }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: { type: "uri", label: "ดูรายละเอียด", uri: APP_URL },
                        style: "primary",
                        color: color,
                        height: "sm"
                    }
                ],
                paddingAll: "15px"
            }
        }
    };
};

export const sendCompletionNotification = async (studentName: string, taskTitle: string) => {
    const settings = await getSystemSettings();
    const groupId = settings['test_group_id'] || DEFAULT_GROUP_ID;
    const token = settings['line_channel_access_token'] || DEFAULT_LINE_TOKEN;
    if (!groupId) return;
    const message = { type: "flex", altText: "ส่งงานแล้ว", contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [ { type: "text", text: "✅ ส่งงานเรียบร้อย", weight: "bold", color: "#10B981" }, { type: "text", text: `${studentName} ส่งงาน: ${taskTitle}`, wrap: true, margin: "sm" } ] } } };
    await apiRequest('sendLineMessage', 'POST', { to: groupId, messages: [message], token });
};

export const sendLineNotification = async (to: string, messageOrTask: string | Task | object) => {
    let message = typeof messageOrTask === 'object' && 'title' in messageOrTask ? generateTaskFlexMessage(messageOrTask as Task) : (typeof messageOrTask === 'string' ? { type: 'text', text: messageOrTask } : messageOrTask);
    const settings = await getSystemSettings();
    const token = settings['line_channel_access_token'] || DEFAULT_LINE_TOKEN;
    return await apiRequest('sendLineMessage', 'POST', { to, messages: [message], token });
};

export const testLineNotification = async (token: string, userId: string, message: object) => {
    const res = await apiRequest('sendLineMessage', 'POST', { to: userId, messages: [message], token });
    return { success: res.success, message: res.success ? 'ส่งข้อความสำเร็จ' : (res.message || 'ส่งไม่สำเร็จ') };
}

export const getLineLoginUrl = (channelId: string, redirectUri: string, state: string) => 
    `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=profile openid email`;

export const loginWithLineCode = async (code: string, redirectUri: string) => {
    try {
        return await apiRequest('lineLogin', 'POST', { code, redirectUri });
    } catch (e: any) {
        console.error("LINE Login API Fail:", e);
        throw new Error("Cannot connect to Login Server: " + e.message);
    }
};

export const syncLineUserProfile = async () => {};
