
export interface Student {
  grade: string;
  classroom: string;
  student_id: string;
  student_name: string;
  email: string;
  profileImageUrl: string;
  password?: string; // For mock auth
}

export enum TaskCategory {
  CLASS_SCHEDULE = 'ตารางเรียน',
  EXAM_SCHEDULE = 'ตารางสอบ',
  HOMEWORK = 'การบ้าน',
  ACTIVITY_INSIDE = 'กิจกรรมเสริมหลักสูตร',
  ACTIVITY_OUTSIDE = 'กิจกรรมภายนอก',
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string; // ISO
  category: TaskCategory;
  attachments: string[]; // filenames
  targetGrade: string;
  targetClassroom: string;
  targetStudentId?: string; // Added for individual assignment
  createdBy: string;
  createdAt: string;
}

export interface Attribute {
  attribute_id: string;
  attribute_name: string;
}

export interface Score {
  score_id: string;
  attribute_id: string;
  score: number;
  date: string; // ISO string
  teacherName?: string;
  comment?: string;
}

export interface Teacher {
  teacher_id: string;
  name: string;
  email: string;
}

// Combined data structure for student view
export interface StudentData {
  student: Student;
  tasks: Task[];
  attributes: Attribute[];
  scores: Score[];
}

export enum Role {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export interface User {
  student_id: string;
  name: string;
  email: string;
  profileImageUrl: string;
  class: string;
  role: Role;
}
