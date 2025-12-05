
export interface Student {
  id: string; // UUID from Supabase
  grade: string;
  classroom: string;
  student_id: string;
  student_name: string;
  email: string;
  profileImageUrl: string;
  lineUserId?: string; // Added for LINE Integration
}

export enum TaskCategory {
  CLASS_SCHEDULE = 'CLASS_SCHEDULE',
  EXAM_SCHEDULE = 'EXAM_SCHEDULE',
  HOMEWORK = 'HOMEWORK',
  ACTIVITY_INSIDE = 'ACTIVITY_INSIDE',
  ACTIVITY_OUTSIDE = 'ACTIVITY_OUTSIDE',
}

// Helper for display text
export const TaskCategoryLabel: Record<TaskCategory, string> = {
    [TaskCategory.CLASS_SCHEDULE]: 'ตารางเรียน',
    [TaskCategory.EXAM_SCHEDULE]: 'ตารางสอบ',
    [TaskCategory.HOMEWORK]: 'การบ้าน',
    [TaskCategory.ACTIVITY_INSIDE]: 'กิจกรรมเสริมหลักสูตร',
    [TaskCategory.ACTIVITY_OUTSIDE]: 'กิจกรรมภายนอก',
};

// Helper for display colors
export const getCategoryColor = (category: TaskCategory) => {
    switch (category) {
        case TaskCategory.CLASS_SCHEDULE:
            return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', solid: 'bg-blue-600', hover: 'hover:bg-blue-100' };
        case TaskCategory.EXAM_SCHEDULE:
            return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', solid: 'bg-red-600', hover: 'hover:bg-red-100' };
        case TaskCategory.HOMEWORK:
            return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', solid: 'bg-orange-500', hover: 'hover:bg-orange-100' };
        case TaskCategory.ACTIVITY_INSIDE:
            return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', solid: 'bg-emerald-600', hover: 'hover:bg-emerald-100' };
        case TaskCategory.ACTIVITY_OUTSIDE:
            return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', solid: 'bg-purple-600', hover: 'hover:bg-purple-100' };
        default:
            return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', solid: 'bg-slate-600', hover: 'hover:bg-slate-100' };
    }
};

export interface Task {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string; // ISO
  category: TaskCategory;
  priority?: 'High' | 'Medium' | 'Low'; 
  attachments: string[]; // filenames or URLs
  targetGrade: string;
  targetClassroom: string;
  targetStudentId?: string; // Added for individual assignment
  createdBy: string;
  createdAt: string;
  // New properties for student tracking
  isCompleted?: boolean;
}

export interface TimetableEntry {
    id: string;
    grade: string;
    classroom: string;
    day_of_week: string;
    period_index: number;
    period_time: string;
    subject: string;
    teacher: string;
    room: string;
    color: string;
}

export interface Notification {
    id: string;
    task_id: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export interface Teacher {
  teacher_id: string; // UUID
  name: string;
  email: string;
}

export interface Attribute {
  attribute_id: string;
  attribute_name: string;
}

export interface Score {
  score_id: string;
  attribute_id: string;
  score: number;
  date: string;
  teacherName?: string;
  comment?: string;
}

export interface BackupLog {
    id: string;
    user_id: string;
    backup_type: string;
    status: string;
    created_at: string;
}

// Combined data structure for student view
export interface StudentData {
  student: Student;
  tasks: Task[];
  notifications: Notification[];
  attributes: Attribute[];
  scores: Score[];
}

export enum Role {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export interface User {
  id: string;
  student_id?: string;
  name: string;
  email: string;
  profileImageUrl: string;
  class: string;
  role: Role;
  lineUserId?: string;
}

export interface SystemSettings {
    key: string;
    value: string;
}

export interface PortfolioItem {
    id: string;
    student_id: string;
    title: string;
    description: string;
    category: 'Award' | 'Project' | 'Activity';
    imageUrl: string;
    date: string;
}

export interface LineProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
}

export interface LineLoginResult {
    success: boolean;
    message: string;
    user?: any;
    role?: 'student' | 'teacher';
    lineProfile?: LineProfile;
    lineUserId?: string;
}
