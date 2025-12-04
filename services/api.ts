
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, TimetableEntry, SystemSettings } from '../types';

// --- Configuration ---
export const GOOGLE_SHEET_ID = '1tidL2kyTpvyPktQjkD5ZTvLIKvWEaIOS6TTmvDVuY6s';
// UPDATED API URL
export const API_URL = 'https://script.google.com/macros/s/AKfycbxcDNmS3O7FbNE3O16kH8ydxq_HnAHDKPcqGBk7graJfB-mXfTkaLcp5y1Q78NydGfLdQ/exec'; 

// USER PROVIDED DEFAULT TOKENS (UPDATED)
const DEFAULT_LINE_TOKEN = 'vlDItyJKpyGjw6V7TJvo14KcedwDLc+M3or5zXnx5zu4W6izTtA6W4igJP9sc6CParnR+9hXIZEUkjs6l0QjpN6zdb2fNZ06W29X7Mw7YtXdG2/A04TrcDT6SuZq2oFJLE9Ah66iyWAAKQe2aWpCYQdB04t89/1O/w1cDnyilFU=';
const DEFAULT_GROUP_ID = 'C43845dc7a6bc2eb304ce0b9967aef5f5';
const DEFAULT_LIFF_ID = '2008618173'; 

// --- API Helpers ---

// Helper to normalize object keys to lowercase to avoid "Email" vs "email" issues
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
    // ALWAYS USE POST for Google Apps Script Web Apps to avoid caching and URL length issues.
    const effectiveMethod = 'POST';

    const queryParams = new URLSearchParams({
        action,
        sheet_id: GOOGLE_SHEET_ID,
        _t: new Date().getTime().toString() // Cache buster
    });

    const url = `${API_URL}?${queryParams.toString()}`;
    
    const bodyData = { 
        action, 
        sheet_id: GOOGLE_SHEET_ID,
        payload: payload, 
        ...payload 
    };

    const options: RequestInit = {
        method: effectiveMethod,
        redirect: 'follow',
        body: JSON.stringify(bodyData),
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', // "text/plain" prevents CORS preflight OPTIONS request
        }
    };

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            try {
                const data = JSON.parse(text);
                if (data.error) {
                    console.warn(`API returned error for [${action}]: ${data.error}`);
                    throw new Error(data.error);
                }
                // Normalize keys for list data
                if (Array.isArray(data)) {
                    return data.map(normalizeKeys);
                }
                return normalizeKeys(data);
            } catch (e) {
                // If it's HTML, it's likely a Google Error page (404/500/Permissions)
                if (text.trim().startsWith('<')) {
                    console.error("Received HTML instead of JSON. Check API_URL and Deployment Permissions.");
                    throw new Error("Invalid API Response (HTML). Please check deployment.");
                }
                console.error("JSON Parse Error:", text);
                throw new Error("Invalid JSON response from server");
            }
        } catch (error: any) {
            attempts++;
            console.warn(`API Connection Failed [${action}] (Attempt ${attempts}/${maxAttempts}):`, error);
            
            if (attempts >= maxAttempts) {
                console.error("************************************************************");
                console.error("CRITICAL API ERROR: Failed to fetch after multiple attempts.");
                console.error("POSSIBLE FIXES:");
                console.error("1. Check 'API_URL' in services/api.ts. Is it the latest deployment?");
                console.error("2. Ensure Google Script is deployed as 'Web App'.");
                console.error("3. Ensure 'Who has access' is set to 'ANYONE' (Critical!).");
                console.error("4. Run 'triggerAuth' in Script Editor to allow UrlFetchApp.");
                console.error("************************************************************");
                throw error;
            }
            
            await delay(1500 * attempts);
        }
    }
};

// --- AUTH SERVICES ---

export const loginStudent = async (studentId: string, email: string, password?: string): Promise<Student | null> => {
    try {
        const students = await apiRequest('getStudents', 'POST'); 
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
        const teachers = await apiRequest('getTeachers', 'POST');
        
        const inputEmail = email.trim().toLowerCase();
        const inputPass = password.trim();

        if (Array.isArray(teachers)) {
            const found = teachers.find((t: any) => 
                t.email?.toString().toLowerCase() === inputEmail && 
                t.password?.toString() === inputPass
            );

            if (found) {
                return {
                    teacher_id: found.teacher_id,
                    name: found.name,
                    email: found.email
                };
            }
        }
    } catch (e) {
        console.error("Teacher Login API Error:", e);
    }

    // FALLBACK for Admin only if API allows (no local mock data for normal users)
    if (email.trim().toLowerCase() === 'admin@admin.com' && password.trim() === '123456') {
        return {
            teacher_id: 'T01',
            name: 'ART (Admin Fallback)',
            email: 'admin@admin.com'
        };
    }

    return null;
};

export const registerStudent = async (data: any) => {
    return await apiRequest('registerStudent', 'POST', data);
};

export const registerTeacher = async (name: string, email: string, password: string, lineUserId?: string) => {
    return await apiRequest('registerTeacher', 'POST', { name, email, password, lineUserId });
};

// --- DATA SERVICES ---

export const getAllTasks = async (): Promise<Task[]> => {
    try {
        const rawTasks = await apiRequest('getTasks', 'POST');
        if (!rawTasks || !Array.isArray(rawTasks)) return [];

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
            createdBy: t.created_by,
            createdAt: t.created_at,
            attachments: t.attachments ? (typeof t.attachments === 'string' && t.attachments.startsWith('[') ? JSON.parse(t.attachments) : []) : [],
            isCompleted: false 
        }));
    } catch (e) {
        console.error("Error fetching tasks (returning empty list to prevent crash):", e);
        return [];
    }
};

export const getStudentCompletions = async (studentId: string) => {
    try {
        const res = await apiRequest('getTaskCompletions', 'POST', { studentId });
        return Array.isArray(res) ? res : [];
    } catch (e) {
        console.error("Error fetching completions", e);
        return [];
    }
}

export const createTask = async (task: Partial<Task>) => {
    return await apiRequest('createTask', 'POST', task);
};

export const updateTask = async (task: Partial<Task>) => {
    return await apiRequest('updateTask', 'POST', { id: task.id, payload: task });
};

export const deleteTask = async (taskId: string) => {
    return await apiRequest('deleteTask', 'POST', { id: taskId });
};

export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean) => {
    return await apiRequest('toggleTaskStatus', 'POST', { studentId, taskId, isCompleted });
};

export const markNotificationRead = async (notificationId: string) => {
    return { success: true };
};

// --- USER DATA ---

export const getStudentDataById = async (studentId: string | undefined): Promise<StudentData | null> => {
    if (!studentId) return null;
    try {
        // Fetch Student
        const student = await loginStudent(studentId, '', ''); 
        if (!student) return null;

        // Fetch Tasks (Parallel friendly now with POST)
        const [allTasks, completions] = await Promise.all([
            getAllTasks(),
            getStudentCompletions(studentId)
        ]);

        const completedTaskIds = new Set(completions.map((c:any) => c.task_id.toString()));

        const myTasks = allTasks.filter(t => {
            const gradeMatch = t.targetGrade === student.grade;
            const classMatch = t.targetClassroom === student.classroom;
            const individualMatch = t.targetStudentId === student.student_id;
            // Handle legacy data where targetGrade might be missing
            const isAssigned = (gradeMatch && classMatch) || individualMatch || (!t.targetGrade && !t.targetStudentId);
            return isAssigned;
        }).map(t => ({
            ...t,
            isCompleted: completedTaskIds.has(t.id)
        }));

        const notifications: Notification[] = myTasks
            .filter(t => !t.isCompleted)
            .slice(0, 5)
            .map(t => ({
                id: `notif-${t.id}`,
                task_id: t.id,
                message: `อย่าลืม! ${t.title} กำหนดส่ง ${new Date(t.dueDate).toLocaleDateString('th-TH')}`,
                is_read: false,
                created_at: new Date().toISOString()
            }));

        return {
            student,
            tasks: myTasks,
            notifications,
            attributes: [], 
            scores: [] 
        };
    } catch (e) {
        console.error("Error fetching student data:", e);
        throw e; 
    }
};

export const getProfiles = async (role: 'student' | 'teacher') => {
    if (role === 'student') {
        const res = await apiRequest('getStudents', 'POST');
        return Array.isArray(res) ? res : [];
    } else {
        const res = await apiRequest('getTeachers', 'POST');
        return Array.isArray(res) ? res : [];
    }
};

export const updateProfile = async (id: string, data: any) => {
    return await apiRequest('registerStudent', 'POST', data); 
};

export const bulkRegisterStudents = async (students: any[]) => {
    let count = 0;
    const errors = [];
    for (const s of students) {
        try {
            await registerStudent(s);
            count++;
        } catch (e: any) {
            errors.push(`${s.student_id}: ${e.message}`);
        }
    }
    return { success: count > 0, count, errors };
};

export const uploadFile = async (file: File): Promise<string> => {
    console.log("Uploading file:", file.name);
    return new Promise((resolve) => {
         setTimeout(() => resolve(`https://fake-storage.com/${file.name}`), 1000);
    });
};

export const getTimetable = async (grade: string, classroom: string) => {
    try {
        const all = await apiRequest('getTimetable', 'POST');
        if (!Array.isArray(all)) return [];
        
        return all.filter((t: any) => 
            t.grade === grade && 
            t.classroom?.toString() === classroom
        ).map((t: any) => ({
            id: t.id || Math.random().toString(),
            grade: t.grade,
            classroom: t.classroom,
            day_of_week: t.day_of_week,
            period_index: parseInt(t.period_index),
            period_time: t.period_time,
            subject: t.subject,
            teacher: t.teacher,
            room: t.room,
            color: '' 
        }));
    } catch (e) {
        return [];
    }
};

export const checkDatabaseHealth = async (): Promise<{ 
    tables: { name: string; status: 'ok' | 'missing' | 'error'; message?: string }[]; 
    missingSql: string; 
}> => {
    try {
        const result = await apiRequest('checkHealth', 'POST');
        if (result && result.tables) {
            return { tables: result.tables, missingSql: '' };
        }
    } catch (e) {
        return { tables: [{name: 'Connection', status: 'error', message: 'Failed to connect to Google Sheet API'}], missingSql: '' };
    }
    return { tables: [], missingSql: '' };
};

// --- Settings Management ---

export const getSystemSettings = async (): Promise<Record<string, string>> => {
    try {
        const settings = await apiRequest('getSystemSettings', 'POST');
        const finalSettings = { ...settings };
        
        // Use Defaults if not present in sheet response
        if (!finalSettings['line_channel_access_token']) finalSettings['line_channel_access_token'] = DEFAULT_LINE_TOKEN;
        if (!finalSettings['test_group_id']) finalSettings['test_group_id'] = DEFAULT_GROUP_ID;
        if (!finalSettings['line_login_channel_id']) finalSettings['line_login_channel_id'] = DEFAULT_LIFF_ID;

        return finalSettings;
    } catch (e) {
        console.warn("Failed to load settings (background):", e);
        return {
            'line_channel_access_token': DEFAULT_LINE_TOKEN,
            'test_group_id': DEFAULT_GROUP_ID,
            'line_login_channel_id': DEFAULT_LIFF_ID
        };
    }
}

export const saveSystemSettings = async (settings: Record<string, string>): Promise<{ success: boolean; message: string }> => {
    try {
        const res = await apiRequest('saveSystemSettings', 'POST', settings);
        return res;
    } catch (e: any) {
        return { success: false, message: e.message || 'บันทึกไม่สำเร็จ' };
    }
}

// --- LINE Integration ---

const getFlexColor = (category: TaskCategory) => {
    switch (category) {
        case TaskCategory.EXAM_SCHEDULE: return "#EF4444"; // Red
        case TaskCategory.HOMEWORK: return "#F97316"; // Orange
        case TaskCategory.CLASS_SCHEDULE: return "#3B82F6"; // Blue
        case TaskCategory.ACTIVITY_INSIDE: return "#10B981"; // Emerald
        case TaskCategory.ACTIVITY_OUTSIDE: return "#8B5CF6"; // Purple
        default: return "#64748B"; // Slate
    }
};

export const generateTimetableFlexMessage = (grade: string, classroom: string, timetable: TimetableEntry[]) => {
    return {
        type: "flex",
        altText: `ตารางเรียน ${grade}/${classroom}`,
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: `ตารางเรียน ${grade}/${classroom}`, weight: "bold", size: "xl" },
                    { type: "text", text: `จำนวน ${timetable.length} คาบ`, size: "sm", color: "#aaaaaa" }
                ]
            }
        }
    };
}

export const generateTaskFlexMessage = (task: Task) => {
    const color = getFlexColor(task.category);
    
    // Construct Flex Message
    return {
        type: "flex",
        altText: `งานใหม่: ${task.title}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "New Task Alert", color: "#ffffff", weight: "bold", size: "xxs", offsetTop: "-2px" },
                    { type: "text", text: task.title, color: "#ffffff", weight: "bold", size: "xl", wrap: true, margin: "md" }
                ],
                backgroundColor: color,
                paddingAll: "20px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            { type: "text", text: "วิชา", size: "sm", color: "#888888", flex: 2 },
                            { type: "text", text: task.subject, size: "sm", color: "#111111", flex: 5, wrap: true }
                        ],
                        margin: "md"
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            { type: "text", text: "กำหนดส่ง", size: "sm", color: "#888888", flex: 2 },
                            { type: "text", text: new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric'}), size: "sm", color: "#111111", flex: 5 }
                        ],
                        margin: "md"
                    },
                    {
                         type: "box",
                         layout: "horizontal",
                         contents: [
                             { type: "text", text: "เวลา", size: "sm", color: "#888888", flex: 2 },
                             { type: "text", text: new Date(task.dueDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น.", size: "sm", color: "#111111", flex: 5 }
                         ],
                         margin: "md"
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: {
                            type: "uri",
                            label: "ดูรายละเอียด",
                            uri: "https://liff.line.me/" + DEFAULT_LIFF_ID // Deep link to app if possible
                        },
                        style: "primary",
                        color: color
                    }
                ]
            }
        }
    };
};

export const sendCompletionNotification = async (studentName: string, taskTitle: string) => {
    const settings = await getSystemSettings();
    const groupId = settings['test_group_id'] || DEFAULT_GROUP_ID;
    const token = settings['line_channel_access_token'] || DEFAULT_LINE_TOKEN;

    if (!groupId) return;

    // Use a Flex Message with color for status
    const message = {
        type: "flex",
        altText: `${studentName} ส่งงานแล้ว`,
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { 
                        type: "text", 
                        text: "✅ ส่งงานเรียบร้อย", 
                        weight: "bold", 
                        color: "#10B981", 
                        size: "sm" 
                    },
                    { 
                        type: "text", 
                        text: taskTitle, 
                        weight: "bold", 
                        size: "md", 
                        margin: "sm", 
                        wrap: true 
                    },
                    { 
                        type: "separator", 
                        margin: "md", 
                        color: "#f0f0f0" 
                    },
                    { 
                        type: "box",
                        layout: "horizontal",
                        margin: "md",
                        contents: [
                             { type: "text", text: "นักเรียน:", size: "xs", color: "#aaaaaa", flex: 2 },
                             { type: "text", text: studentName, size: "xs", color: "#333333", flex: 5 }
                        ]
                    }
                ]
            },
            styles: {
                body: { backgroundColor: "#f9fafb" }
            }
        }
    };

    // Pass token explicitly to ensure backend uses it
    await apiRequest('sendLineMessage', 'POST', { to: groupId, messages: [message], token });
};

export const sendLineNotification = async (to: string, messageOrTask: string | Task | object) => {
    let message = messageOrTask;
    if (typeof messageOrTask === 'object' && 'title' in messageOrTask) {
        message = generateTaskFlexMessage(messageOrTask as Task);
    } else if (typeof messageOrTask === 'string') {
        message = { type: 'text', text: messageOrTask };
    }
    
    // 1. Get settings (handles default fallback)
    const settings = await getSystemSettings();
    const token = settings['line_channel_access_token'] || DEFAULT_LINE_TOKEN;

    // 2. PASS THE TOKEN TO BACKEND
    return await apiRequest('sendLineMessage', 'POST', { to, messages: [message], token });
};

export const testLineNotification = async (token: string, userId: string, message: object): Promise<{ success: boolean, message: string }> => {
    try {
        const res = await apiRequest('sendLineMessage', 'POST', { to: userId, messages: [message], token });
        if (res.success) return { success: true, message: 'ส่งข้อความสำเร็จ' };
        return { success: false, message: res.message || 'ส่งไม่สำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export const getLineLoginUrl = (channelId: string, redirectUri: string, state: string) => {
    const scope = 'profile openid email';
    return `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
}

export const loginWithLineCode = async (code: string, redirectUri: string) => {
    return await apiRequest('lineLogin', 'POST', { code, redirectUri });
}

export const syncLineUserProfile = async () => {
    // Sync logic placeholder
}
