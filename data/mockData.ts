
import { Student, Task, Teacher, TaskCategory } from '../types';

export let MOCK_STUDENTS: Student[] = [
  {
    id: 'mock-uuid-001',
    grade: 'ม.4',
    classroom: '2',
    student_id: 'std001',
    student_name: 'สมศรี ใจดี',
    email: 'std001@school.ac.th',
    profileImageUrl: 'https://picsum.photos/seed/amelia/200',
  },
  {
    id: 'mock-uuid-002',
    grade: 'ม.4',
    classroom: '2',
    student_id: 'std002',
    student_name: 'มานะ อดทน',
    email: 'std002@school.ac.th',
    profileImageUrl: 'https://picsum.photos/seed/john/200',
  },
   {
    id: 'mock-uuid-003',
    grade: 'ม.5',
    classroom: '1',
    student_id: 'std003',
    student_name: 'ปิติ ยินดี',
    email: 'std003@school.ac.th',
    profileImageUrl: 'https://picsum.photos/seed/peter/200',
  },
];

export let MOCK_TASKS: Task[] = [
  {
    id: 't001',
    title: 'ภาษาไทย (คาบ 1)',
    subject: 'ภาษาไทยพื้นฐาน',
    description: 'เรียนเรื่องนิราศภูเขาทอง เตรียมหนังสือวรรณคดี',
    dueDate: new Date(Date.now() + 86400000).toISOString(), 
    category: TaskCategory.CLASS_SCHEDULE,
    attachments: [],
    targetGrade: 'ม.4',
    targetClassroom: '2',
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't002',
    title: 'สอบเก็บคะแนน เคมี',
    subject: 'เคมี 1',
    description: 'สอบเรื่องตารางธาตุและแนวโน้ม ห้อง 422 เวลา 13.00 น.',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    category: TaskCategory.EXAM_SCHEDULE,
    attachments: ['periodic_table.pdf'],
    targetGrade: 'ม.4',
    targetClassroom: '2',
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't003',
    title: 'แบบฝึกหัดคณิตศาสตร์',
    subject: 'คณิตศาสตร์',
    description: 'ทำแบบฝึกหัดท้ายบทที่ 2 ข้อ 1-10 ส่งในคาบ',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    category: TaskCategory.HOMEWORK,
    attachments: ['math_work.jpg'],
    targetGrade: 'ม.4',
    targetClassroom: '2',
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 't004',
    title: 'ชุมนุมหุ่นยนต์',
    subject: 'กิจกรรมพัฒนาผู้เรียน',
    description: 'ประชุมเตรียมงานแข่งขันหุ่นยนต์ระดับภาค',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), 
    category: TaskCategory.ACTIVITY_INSIDE,
    attachments: [],
    targetGrade: 'ม.4',
    targetClassroom: '2',
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
  },
   {
    id: 't005',
    title: 'ทัศนศึกษาสวนพฤกษศาสตร์',
    subject: 'กิจกรรมภายนอก',
    description: 'นักเรียนชั้น ม.4 ไปทัศนศึกษาดูงานพันธุ์ไม้ ขึ้นรถเวลา 07.00 น.',
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), 
    category: TaskCategory.ACTIVITY_OUTSIDE,
    attachments: ['schedule_trip.pdf'],
    targetGrade: 'ม.4',
    targetClassroom: '2',
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
  },
   {
    id: 't006',
    title: 'ซ่อมเสริมคณิตศาสตร์ (เฉพาะบุคคล)',
    subject: 'คณิตศาสตร์',
    description: 'นัดสอบแก้ตัวหน่วยที่ 1',
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(), 
    category: TaskCategory.HOMEWORK,
    attachments: [],
    targetGrade: 'ม.4',
    targetClassroom: '2',
    targetStudentId: 'std001', // Assigned to specific student
    createdBy: 'Admin',
    createdAt: new Date().toISOString(),
  }
];

export let MOCK_TEACHERS: (Teacher & { password_hash: string })[] = [
  {
    teacher_id: 't001',
    name: 'ครูแอดมิน',
    email: 'admin@school.ac.th',
    password_hash: 'hashed_1234', 
  }
];