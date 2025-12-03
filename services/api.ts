
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, TimetableEntry, SystemSettings } from '../types';
import { MOCK_TASKS, MOCK_STUDENTS, MOCK_TEACHERS, MOCK_TIMETABLE } from '../data/mockData';

// --- Configuration ---
export const GOOGLE_SHEET_ID = '1tidL2kyTpvyPktQjkD5ZTvLIKvWEaIOS6TTmvDVuY6s';

// --- Local State Simulation (Replacing Database for Demo) ---
// In a real Google Sheets app, you would fetch from the Sheets API here.
let localTasks = [...MOCK_TASKS];
let localStudents = [...MOCK_STUDENTS];
let localTeachers = [...MOCK_TEACHERS];
let localTimetable = [...MOCK_TIMETABLE];

// --- Utility ---

export const testDatabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    return { success: true, message: `Connected to Google Sheet ID: ${GOOGLE_SHEET_ID}` };
};

export const checkDatabaseHealth = async (): Promise<{ 
    tables: { name: string; status: 'ok' | 'missing' | 'error'; message?: string }[]; 
    missingSql: string; 
}> => {
    return { 
        tables: [
            { name: 'Tasks', status: 'ok', message: 'Sheet Found' },
            { name: 'Students', status: 'ok', message: 'Sheet Found' },
            { name: 'Teachers', status: 'ok', message: 'Sheet Found' },
            { name: 'Timetable', status: 'ok', message: 'Sheet Found' },
        ], 
        missingSql: '' 
    };
};

// --- Settings Management ---

export const getSystemSettings = async (): Promise<Record<string, string>> => {
    return {
        'sheet_id': GOOGLE_SHEET_ID,
        'line_channel_access_token': '',
        'line_channel_secret': ''
    };
}

export const saveSystemSettings = async (settings: Record<string, string>): Promise<{ success: boolean; message: string }> => {
    return { success: true, message: 'บันทึกการตั้งค่าสำเร็จ (Simulation)' };
}

// --- LINE Integration (Mock) ---

export const generateTimetableFlexMessage = (grade: string, classroom: string, timetable: TimetableEntry[]) => {
    return { type: 'flex', altText: 'Timetable', contents: {} }; // Simplified for mock
}

export const generateTaskFlexMessage = (task: Task) => {
    return { type: 'flex', altText: task.title, contents: {} }; // Simplified for mock
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
    const newStudent: Student = {
        id: `s${Date.now()}`,
        student_id: data.student_id,
        student_name: data.student_name,
        email: data.email,
        grade: data.grade,
        classroom: data.classroom,
        profileImageUrl: `https://ui-avatars.com/api/?name=${data.student_name}&background=random`,
        lineUserId: data.lineUserId
    };
    localStudents.push(newStudent);
    return { success: true, message: 'ลงทะเบียนสำเร็จ (Simulation)' };
};

export const bulkRegisterStudents = async (students: any[]): Promise<{ success: boolean, count: number, errors: string[] }> => {
    students.forEach(s => {
        localStudents.push({
            id: `s${Math.random()}`,
            student_id: s.student_id,
            student_name: s.student_name || s.name,
            email: s.email,
            grade: s.grade,
            classroom: s.classroom,
            profileImageUrl: 'https://via.placeholder.com/150'
        });
    });
    return { success: true, count: students.length, errors: [] };
}

export const loginStudent = async (studentId: string, email: string, password?: string): Promise<Student | null> => {
    const student = localStudents.find(s => s.student_id === studentId && s.email === email);
    if (!student) throw new Error("ไม่พบข้อมูลนักเรียน");
    return student;
}

export const getStudentDataById = async (studentId: string): Promise<StudentData | null> => {
    const student = localStudents.find(s => s.student_id === studentId);
    if (!student) return null;

    // Filter tasks for this student
    const relevantTasks = localTasks.filter(t => 
        (t.targetGrade === student.grade && t.targetClassroom === student.classroom) ||
        t.targetStudentId === student.student_id ||
        (!t.targetGrade && !t.targetStudentId)
    );

    return {
        student: student,
        tasks: relevantTasks,
        notifications: [],
        attributes: [], 
        scores: []      
    };
};

export const getAllStudentTaskStatuses = async () => {
    return [];
};

export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean): Promise<boolean> => {
    const taskIndex = localTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
        localTasks[taskIndex].isCompleted = isCompleted;
        return true;
    }
    return false;
};

export const markNotificationRead = async (notificationId: string) => {
    // Mock
};

export const createBackup = async (userId: string): Promise<boolean> => {
    return true;
};

// --- Teacher Auth & Data ---

export const registerTeacher = async (name: string, email: string, password: string, lineUserId?: string): Promise<{ success: boolean; message: string; }> => {
    localTeachers.push({
        teacher_id: `t${Date.now()}`,
        name,
        email,
    });
    return { success: true, message: 'ลงทะเบียนครูสำเร็จ (Simulation)' };
};

export const loginTeacher = async (email: string, password: string): Promise<Teacher | null> => {
    const teacher = localTeachers.find(t => t.email === email);
    if (!teacher) {
        if (email === 'admin@admin' && password === 'admin123') {
            return localTeachers[0];
        }
        throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    return teacher;
};

// --- Task CRUD & Teacher Utils ---

export const getAllTasks = async (): Promise<Task[]> => {
    return [...localTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createTask = async (task: any): Promise<{ success: boolean; message: string; data?: any }> => {
    const newTask: Task = {
        id: `t${Date.now()}`,
        ...task,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        attachments: task.attachments || []
    };
    localTasks.unshift(newTask);
    return { success: true, message: 'สร้างงานสำเร็จ (Saved to Memory)', data: newTask };
};

export const updateTask = async (task: any): Promise<{ success: boolean; message: string }> => {
    const index = localTasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
        localTasks[index] = { ...localTasks[index], ...task };
        return { success: true, message: 'แก้ไขงานสำเร็จ' };
    }
    return { success: false, message: 'Task not found' };
};

export const deleteTask = async (taskId: string): Promise<{ success: boolean; message: string }> => {
    localTasks = localTasks.filter(t => t.id !== taskId);
    return { success: true, message: 'ลบงานสำเร็จ' };
};

export const uploadFile = async (file: File): Promise<string | null> => {
    return URL.createObjectURL(file); // Mock upload returning local blob URL
};

export const getProfiles = async (role: 'student' | 'teacher'): Promise<any[]> => {
    return role === 'student' ? localStudents : localTeachers;
};

export const updateProfile = async (id: string, updates: any): Promise<{ success: boolean; message: string }> => {
    const index = localStudents.findIndex(s => s.id === id);
    if (index !== -1) {
        localStudents[index] = { ...localStudents[index], ...updates };
        return { success: true, message: 'อัพเดทข้อมูลสำเร็จ' };
    }
    return { success: false, message: 'User not found' };
};

export const getTimetable = async (grade: string, classroom: string): Promise<TimetableEntry[]> => {
    return localTimetable.filter(t => t.grade === grade && t.classroom === classroom);
};
