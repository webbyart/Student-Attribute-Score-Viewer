
import { Student, Task, Teacher, TaskCategory, TimetableEntry } from '../types';

export let MOCK_STUDENTS: Student[] = [
  {
    id: 's001',
    grade: 'ม.3',
    classroom: '3',
    student_id: 'std001',
    student_name: 'เด็กชายรักเรียน เพียรศึกษา',
    email: 'std001@school.ac.th',
    profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  },
  {
    id: 's002',
    grade: 'ม.3',
    classroom: '3',
    student_id: 'std002',
    student_name: 'เด็กหญิงใจดี มีวินัย',
    email: 'std002@school.ac.th',
    profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  }
];

export let MOCK_TEACHERS: Teacher[] = [
  {
    teacher_id: 't001',
    name: 'ครูสมชาย ใจดี',
    email: 'admin@admin',
  }
];

// 15 Sample Items
export let MOCK_TASKS: Task[] = [
  // Class Schedule Changes
  {
    id: 'task-01',
    title: 'นัดเรียนชดเชย วิทยาศาสตร์',
    subject: 'วิทยาศาสตร์พื้นฐาน',
    description: 'เรียนชดเชยเรื่องระบบนิเวศ ห้อง Lab 2',
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(), // Tomorrow
    category: TaskCategory.CLASS_SCHEDULE,
    priority: 'High',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ครูสมชาย',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-02',
    title: 'เปลี่ยนคาบเรียน พลศึกษา',
    subject: 'สุขศึกษาและพลศึกษา',
    description: 'ให้ไปเจอกันที่โรงยิมเก่า แทนสนามฟุตบอล',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    category: TaskCategory.CLASS_SCHEDULE,
    priority: 'Medium',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ครูพละ',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  // Exam Schedule
  {
    id: 'task-03',
    title: 'สอบเก็บคะแนนบทที่ 4',
    subject: 'คณิตศาสตร์',
    description: 'สอบเรื่องอสมการเชิงเส้นตัวแปรเดียว เตรียมเครื่องเขียนให้พร้อม',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    category: TaskCategory.EXAM_SCHEDULE,
    priority: 'High',
    attachments: ['exam_scope.pdf'],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ครูคณิต',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-04',
    title: 'สอบท่องคำศัพท์ภาษาอังกฤษ',
    subject: 'ภาษาอังกฤษ (อ33101)',
    description: 'สอบท่องศัพท์หน้า 24-25 จำนวน 20 คำ',
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    category: TaskCategory.EXAM_SCHEDULE,
    priority: 'Medium',
    attachments: ['vocab_list.jpg'],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'Teacher John',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-05',
    title: 'สอบปฏิบัติเป่าขลุ่ย',
    subject: 'ดนตรีสากล',
    description: 'สอบเป่าเพลงชาติไทย',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    category: TaskCategory.EXAM_SCHEDULE,
    priority: 'Low',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ครูดนตรี',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  // Homework
  {
    id: 'task-06',
    title: 'แบบฝึกหัดท้ายบทที่ 2',
    subject: 'ภาษาไทย',
    description: 'ตอบคำถามเรื่องพระอภัยมณี ตอนหนีนางผีเสื้อสมุทร ข้อ 1-10 ลงในสมุด',
    dueDate: new Date(Date.now() - 86400000 * 1).toISOString(), // Overdue
    category: TaskCategory.HOMEWORK,
    priority: 'Medium',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ครูภาษาไทย',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-07',
    title: 'ใบงานเรื่องประวัติศาสตร์ยุโรป',
    subject: 'สังคมศึกษา',
    description: 'ดาวน์โหลดใบงานแล้วทำส่งใน Google Classroom หรือปริ้นส่ง',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    category: TaskCategory.HOMEWORK,
    priority: 'Medium',
    attachments: ['worksheet_history.pdf'],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ครูสังคม',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-08',
    title: 'โครงงานวิทยาศาสตร์ (ส่งหัวข้อ)',
    subject: 'วิทยาศาสตร์',
    description: 'ส่งชื่อเรื่องและรายชื่อสมาชิกกลุ่ม',
    dueDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    category: TaskCategory.HOMEWORK,
    priority: 'High',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ครูวิทย์',
    createdAt: new Date().toISOString(),
    isCompleted: true
  },
  {
    id: 'task-09',
    title: 'อัดคลิปแนะนำตัวภาษาจีน',
    subject: 'ภาษาจีน',
    description: 'อัดคลิปความยาวไม่เกิน 1 นาที แนะนำชื่อ อายุ งานอดิเรก',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    category: TaskCategory.HOMEWORK,
    priority: 'Medium',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'Laoshi',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  // Activities Inside
  {
    id: 'task-10',
    title: 'กิจกรรมวันไหว้ครู',
    subject: 'กิจกรรมพัฒนาผู้เรียน',
    description: 'นักเรียนทุกคนเข้าร่วมพิธีไหว้ครูที่หอประชุม เวลา 08.00 น.',
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    category: TaskCategory.ACTIVITY_INSIDE,
    priority: 'High',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ฝ่ายกิจการนักเรียน',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-11',
    title: 'เลือกตั้งประธานนักเรียน',
    subject: 'กิจกรรมพัฒนาผู้เรียน',
    description: 'ลงคะแนนเสียงเลือกตั้งประธานนักเรียน บริเวณใต้อาคาร 4',
    dueDate: new Date(Date.now() + 86400000 * 8).toISOString(),
    category: TaskCategory.ACTIVITY_INSIDE,
    priority: 'Medium',
    attachments: ['candidates.jpg'],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'สภานักเรียน',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-12',
    title: 'ส่งหนังสือยืมคืนห้องสมุด',
    subject: 'ห้องสมุด',
    description: 'นักเรียนที่ยืมหนังสือเกินกำหนด กรุณานำมาคืนภายในสัปดาห์นี้',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    category: TaskCategory.ACTIVITY_INSIDE,
    priority: 'Low',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    targetStudentId: 'std001',
    createdBy: 'บรรณารักษ์',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  // Activities Outside
  {
    id: 'task-13',
    title: 'ทัศนศึกษาวิทยาศาสตร์',
    subject: 'กิจกรรมภายนอก',
    description: 'ทัศนศึกษา ณ องค์การพิพิธภัณฑ์วิทยาศาสตร์แห่งชาติ (อพวช.)',
    dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    category: TaskCategory.ACTIVITY_OUTSIDE,
    priority: 'High',
    attachments: ['itinerary.pdf', 'permission_slip.pdf'],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ฝ่ายวิชาการ',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-14',
    title: 'ค่ายลูกเสือ-เนตรนารี',
    subject: 'กิจกรรมภายนอก',
    description: 'เข้าค่ายพักแรม 2 คืน 3 วัน ที่ค่ายวชิราวุธ จ.ชลบุรี',
    dueDate: new Date(Date.now() + 86400000 * 20).toISOString(),
    category: TaskCategory.ACTIVITY_OUTSIDE,
    priority: 'High',
    attachments: ['camp_list.pdf'],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    createdBy: 'ฝ่ายกิจกรรม',
    createdAt: new Date().toISOString(),
    isCompleted: false
  },
  {
    id: 'task-15',
    title: 'แข่งขันหุ่นยนต์ระดับภาค',
    subject: 'กิจกรรมภายนอก',
    description: 'ตัวแทนนักเรียนเข้าร่วมแข่งขันหุ่นยนต์',
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    category: TaskCategory.ACTIVITY_OUTSIDE,
    priority: 'Medium',
    attachments: [],
    targetGrade: 'ม.3',
    targetClassroom: '3',
    targetStudentId: 'std002',
    createdBy: 'ชมรมหุ่นยนต์',
    createdAt: new Date().toISOString(),
    isCompleted: false
  }
];

export const MOCK_TIMETABLE: TimetableEntry[] = [
    { id: 'tt1', grade: 'ม.3', classroom: '3', day_of_week: 'Monday', period_index: 1, period_time: '08:30 - 09:20', subject: 'คณิตศาสตร์พื้นฐาน', teacher: 'ครูสมชาย', room: '303', color: 'bg-red-50 text-red-700 border-red-200' },
    { id: 'tt2', grade: 'ม.3', classroom: '3', day_of_week: 'Monday', period_index: 2, period_time: '09:20 - 10:10', subject: 'ภาษาไทย', teacher: 'ครูวิไล', room: '303', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { id: 'tt3', grade: 'ม.3', classroom: '3', day_of_week: 'Monday', period_index: 3, period_time: '10:10 - 11:00', subject: 'วิทยาศาสตร์', teacher: 'ครูวิทย์', room: 'Lab 1', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'tt4', grade: 'ม.3', classroom: '3', day_of_week: 'Monday', period_index: 4, period_time: '11:00 - 11:50', subject: 'วิทยาศาสตร์', teacher: 'ครูวิทย์', room: 'Lab 1', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'tt5', grade: 'ม.3', classroom: '3', day_of_week: 'Monday', period_index: 5, period_time: '12:50 - 13:40', subject: 'ภาษาอังกฤษ', teacher: 'Teacher John', room: '303', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'tt6', grade: 'ม.3', classroom: '3', day_of_week: 'Monday', period_index: 6, period_time: '13:40 - 14:30', subject: 'สุขศึกษา', teacher: 'ครูพล', room: '303', color: 'bg-green-50 text-green-700 border-green-200' },
    
    { id: 'tt7', grade: 'ม.3', classroom: '3', day_of_week: 'Tuesday', period_index: 1, period_time: '08:30 - 09:20', subject: 'พลศึกษา', teacher: 'ครูพล', room: 'สนามบอล', color: 'bg-green-50 text-green-700 border-green-200' },
    { id: 'tt8', grade: 'ม.3', classroom: '3', day_of_week: 'Tuesday', period_index: 2, period_time: '09:20 - 10:10', subject: 'สังคมศึกษา', teacher: 'ครูสังคม', room: '303', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'tt9', grade: 'ม.3', classroom: '3', day_of_week: 'Tuesday', period_index: 3, period_time: '10:10 - 11:00', subject: 'คณิตศาสตร์เพิ่มเติม', teacher: 'ครูสมชาย', room: '303', color: 'bg-red-50 text-red-700 border-red-200' },
    { id: 'tt10', grade: 'ม.3', classroom: '3', day_of_week: 'Tuesday', period_index: 4, period_time: '11:00 - 11:50', subject: 'ภาษาไทย', teacher: 'ครูวิไล', room: '303', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { id: 'tt11', grade: 'ม.3', classroom: '3', day_of_week: 'Tuesday', period_index: 5, period_time: '12:50 - 13:40', subject: 'แนะแนว', teacher: 'ครูแนะแนว', room: '303', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    
    { id: 'tt12', grade: 'ม.3', classroom: '3', day_of_week: 'Wednesday', period_index: 1, period_time: '08:30 - 09:20', subject: 'ศิลปะ', teacher: 'ครูศิลป์', room: 'ห้องศิลปะ', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'tt13', grade: 'ม.3', classroom: '3', day_of_week: 'Wednesday', period_index: 2, period_time: '09:20 - 10:10', subject: 'ศิลปะ', teacher: 'ครูศิลป์', room: 'ห้องศิลปะ', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'tt14', grade: 'ม.3', classroom: '3', day_of_week: 'Wednesday', period_index: 3, period_time: '10:10 - 11:00', subject: 'การงานอาชีพ', teacher: 'ครูงาน', room: 'โรงฝึกงาน', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'tt15', grade: 'ม.3', classroom: '3', day_of_week: 'Wednesday', period_index: 4, period_time: '11:00 - 11:50', subject: 'การงานอาชีพ', teacher: 'ครูงาน', room: 'โรงฝึกงาน', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'tt16', grade: 'ม.3', classroom: '3', day_of_week: 'Wednesday', period_index: 5, period_time: '12:50 - 13:40', subject: 'ลูกเสือ', teacher: 'ครูฝึก', room: 'ลานกิจกรรม', color: 'bg-amber-50 text-amber-700 border-amber-200' },

    { id: 'tt17', grade: 'ม.3', classroom: '3', day_of_week: 'Thursday', period_index: 1, period_time: '08:30 - 09:20', subject: 'วิทยาศาสตร์', teacher: 'ครูวิทย์', room: '303', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'tt18', grade: 'ม.3', classroom: '3', day_of_week: 'Thursday', period_index: 2, period_time: '09:20 - 10:10', subject: 'คอมพิวเตอร์', teacher: 'ครูคอม', room: 'Com 2', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'tt19', grade: 'ม.3', classroom: '3', day_of_week: 'Thursday', period_index: 3, period_time: '10:10 - 11:00', subject: 'คอมพิวเตอร์', teacher: 'ครูคอม', room: 'Com 2', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'tt20', grade: 'ม.3', classroom: '3', day_of_week: 'Thursday', period_index: 4, period_time: '11:00 - 11:50', subject: 'ประวัติศาสตร์', teacher: 'ครูสังคม', room: '303', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    
    { id: 'tt21', grade: 'ม.3', classroom: '3', day_of_week: 'Friday', period_index: 1, period_time: '08:30 - 09:20', subject: 'ภาษาอังกฤษ', teacher: 'Teacher John', room: '303', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'tt22', grade: 'ม.3', classroom: '3', day_of_week: 'Friday', period_index: 2, period_time: '09:20 - 10:10', subject: 'คณิตศาสตร์', teacher: 'ครูสมชาย', room: '303', color: 'bg-red-50 text-red-700 border-red-200' },
    { id: 'tt23', grade: 'ม.3', classroom: '3', day_of_week: 'Friday', period_index: 3, period_time: '10:10 - 11:00', subject: 'สวดมนต์', teacher: 'พระอาจารย์', room: 'หอประชุม', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { id: 'tt24', grade: 'ม.3', classroom: '3', day_of_week: 'Friday', period_index: 4, period_time: '11:00 - 11:50', subject: 'ชุมนุม', teacher: 'อิสระ', room: '-', color: 'bg-lime-50 text-lime-700 border-lime-200' },
];
