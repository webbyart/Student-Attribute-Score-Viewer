
export interface Student {
  id: string; // UUID from Supabase
  grade: string;
  classroom: string;
  student_id: string;
  student_name: string;
  email: string;
  profileImageUrl: string;
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

export interface Task {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string; // ISO
  category: TaskCategory;
  attachments: string[]; // filenames or URLs
  targetGrade: string;
  targetClassroom: string;
  targetStudentId?: string; // Added for individual assignment
  createdBy: string;
  createdAt: string;
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
}