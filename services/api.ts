
import { StudentData, Student, Task, Teacher, TaskCategory } from '../types';
import { MOCK_STUDENTS, MOCK_TASKS, MOCK_TEACHERS } from '../data/mockData';

const apiRequest = <T,>(data: T, delay: number = 500): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, delay);
    });
};

// --- Student Data ---
export const getAllStudents = (): Promise<Student[]> => {
    return apiRequest(MOCK_STUDENTS);
}

export const registerStudent = (student: Omit<Student, 'profileImageUrl'>): Promise<{ success: boolean; message: string }> => {
    if (MOCK_STUDENTS.some(s => s.student_id === student.student_id || s.email === student.email)) {
        return apiRequest({ success: false, message: 'รหัสนักเรียนหรืออีเมลนี้มีอยู่ในระบบแล้ว' });
    }
    const newStudent: Student = {
        ...student,
        profileImageUrl: `https://picsum.photos/seed/${student.student_id}/200`,
    };
    MOCK_STUDENTS.push(newStudent);
    return apiRequest({ success: true, message: 'ลงทะเบียนสำเร็จ' });
}

export const loginStudent = (studentId: string, email: string): Promise<Student | null> => {
    // Basic validation: ID and Email must match
    const student = MOCK_STUDENTS.find(s => s.student_id === studentId && s.email === email);
    return apiRequest(student || null);
}

// --- Task Data ---
export const getStudentDataById = (studentId: string): Promise<StudentData | null> => {
    const student = MOCK_STUDENTS.find(s => s.student_id === studentId);
    if (!student) {
        return apiRequest(null);
    }
    // Filter tasks for this student's class OR assigned specifically to this student
    const tasks = MOCK_TASKS.filter(t => {
        const isClassMatch = t.targetGrade === student.grade && t.targetClassroom === student.classroom;
        const isIndividualMatch = t.targetStudentId === student.student_id;
        
        // If it's individual, it overrides class match (or adds to it)
        if (t.targetStudentId) {
            return isIndividualMatch;
        }
        return isClassMatch;
    });
    
    const data: StudentData = {
        student,
        tasks,
        attributes: [],
        scores: [],
    };
    return apiRequest(data);
};

export const createTask = (task: Omit<Task, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string }> => {
    const newTask: Task = {
        ...task,
        id: `task${Date.now()}`,
        createdAt: new Date().toISOString(),
    };
    MOCK_TASKS.push(newTask);
    
    // Simulate Push Notification
    console.log(`PUSH NOTIFICATION: New assignment "${task.title}"`);
    
    return apiRequest({ success: true, message: 'โพสต์ภาระงานสำเร็จ พร้อมแจ้งเตือนนักเรียนแล้ว' });
};

export const updateTask = (task: Task): Promise<{ success: boolean; message: string }> => {
    const index = MOCK_TASKS.findIndex(t => t.id === task.id);
    if (index > -1) {
        MOCK_TASKS[index] = { ...task };
        return apiRequest({ success: true, message: 'แก้ไขภาระงานสำเร็จ' });
    }
    return apiRequest({ success: false, message: 'ไม่พบภาระงาน' });
};

export const deleteTask = (taskId: string): Promise<{ success: boolean }> => {
    const index = MOCK_TASKS.findIndex(t => t.id === taskId);
    if (index > -1) {
        MOCK_TASKS.splice(index, 1);
        return apiRequest({ success: true });
    }
    return apiRequest({ success: false });
}

// --- Teacher Auth ---
export const loginTeacher = (email: string, password: string): Promise<Teacher | null> => {
    // Specific Admin Credentials
    if (email === 'admin@admin' && password === 'admin123') {
        const admin: Teacher = {
            teacher_id: 'admin01',
            name: 'ผู้ดูแลระบบ (Admin)',
            email: 'admin@admin'
        };
        return apiRequest(admin);
    }

    const teacher = MOCK_TEACHERS.find(t => t.email === email);
    if (teacher && password === '1234') { 
        const { password_hash, ...teacherData } = teacher;
        return apiRequest(teacherData);
    }
    return apiRequest(null);
};

export const registerTeacher = (name: string, email: string, password: string): Promise<{ success: boolean; message: string; }> => {
    if (MOCK_TEACHERS.some(t => t.email === email)) {
        return apiRequest({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }
    const newTeacher = {
        teacher_id: `t${Date.now()}`,
        name,
        email,
        password_hash: `hashed_${password}`,
    };
    MOCK_TEACHERS.push(newTeacher);
    return apiRequest({ success: true, message: 'ลงทะเบียนสำเร็จ' });
};
