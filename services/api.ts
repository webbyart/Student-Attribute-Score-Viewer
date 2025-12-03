
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, Role, TimetableEntry, SystemSettings, TaskCategoryLabel } from '../types';
import { supabase } from '../lib/supabaseClient';

// --- Utility ---

export const testDatabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        // Add a timeout to prevent hanging on network errors
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000));
        const dbPromise = supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        const { count, error } = await Promise.race([dbPromise, timeoutPromise]) as any;
        
        if (error) throw error;
        return { success: true, message: `เชื่อมต่อฐานข้อมูลสำเร็จ! (พบผู้ใช้งาน ${count || 0} คน)` };
    } catch (e: any) {
        console.error(e);
        return { success: false, message: `การเชื่อมต่อล้มเหลว: ${e.message}` };
    }
};

export const checkDatabaseHealth = async (): Promise<{ 
    tables: { name: string; status: 'ok' | 'missing' | 'error'; message?: string }[]; 
    missingSql: string; 
}> => {
    const tablesToCheck = [
        'profiles',
        'tasks',
        'notifications',
        'student_task_status',
        'timetables',
        'system_settings',
        'shared_tasks',
        'backup_logs'
    ];

    const results = [];
    let sqlCommands: string[] = [];

    // 1. Check Tables
    for (const table of tablesToCheck) {
        try {
            // Use HEAD request to check existence without fetching data or specific columns
            const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            
            if (error) {
                if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('not found')) {
                    results.push({ name: table, status: 'missing', message: 'ไม่พบตาราง' });
                } else {
                    // Ignore permission errors (42501) as they imply table exists but RLS blocks reading
                    if (error.code === '42501') {
                         results.push({ name: table, status: 'ok', message: 'มีตารางแล้ว (Restricted)' });
                    } else {
                         results.push({ name: table, status: 'error', message: error.message });
                    }
                }
            } else {
                results.push({ name: table, status: 'ok' });
            }
        } catch (e: any) {
             results.push({ name: table, status: 'error', message: e.message });
        }
    }

    // 2. Check Specific Columns (only if table exists)
    // Check 'priority' in tasks
    if (results.find(r => r.name === 'tasks' && r.status === 'ok')) {
        const { error } = await supabase.from('tasks').select('priority').limit(1);
        if (error && !error.message.includes('permission')) {
             results.push({ name: 'tasks.priority', status: 'missing', message: 'คอลัมน์ priority หายไป' });
             sqlCommands.push(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';`);
        }
    }
    
    // Check 'line_user_id' in profiles
    if (results.find(r => r.name === 'profiles' && r.status === 'ok')) {
        const { error } = await supabase.from('profiles').select('line_user_id').limit(1);
        if (error && !error.message.includes('permission')) {
             results.push({ name: 'profiles.line_user_id', status: 'missing', message: 'คอลัมน์ line_user_id หายไป' });
             sqlCommands.push(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT;`);
        }
    }

    // Check 'login_code' in profiles
    if (results.find(r => r.name === 'profiles' && r.status === 'ok')) {
        const { error } = await supabase.from('profiles').select('login_code').limit(1);
        if (error && !error.message.includes('permission')) {
             results.push({ name: 'profiles.login_code', status: 'missing', message: 'คอลัมน์ login_code หายไป' });
             sqlCommands.push(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_code TEXT;`);
        }
    }

    // 3. Generate SQL for Missing Tables
    // Profiles
    if (results.find(r => r.name === 'profiles' && r.status === 'missing')) {
        sqlCommands.push(`
-- 1. Profiles Table
CREATE TYPE user_role AS ENUM ('student', 'teacher');
CREATE TABLE IF NOT EXISTS profiles (
id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
email TEXT UNIQUE,
full_name TEXT,
role user_role DEFAULT 'student',
student_id TEXT,
grade TEXT,
classroom TEXT,
login_code TEXT,
line_user_id TEXT,
avatar_url TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);`);
    }

    // Tasks
    if (results.find(r => r.name === 'tasks' && r.status === 'missing')) {
            sqlCommands.push(`
-- 2. Tasks Table
CREATE TYPE task_category AS ENUM ('CLASS_SCHEDULE', 'EXAM_SCHEDULE', 'HOMEWORK', 'ACTIVITY_INSIDE', 'ACTIVITY_OUTSIDE');
CREATE TABLE IF NOT EXISTS tasks (
id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
title TEXT NOT NULL,
subject TEXT,
description TEXT,
due_date TIMESTAMP WITH TIME ZONE,
category task_category,
priority TEXT DEFAULT 'Medium',
target_grade TEXT,
target_classroom TEXT,
target_student_id TEXT,
created_by UUID,
attachments TEXT[],
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view tasks" ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated users can view tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage tasks" ON tasks FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'));
CREATE POLICY "Students can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Students can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = created_by);`);
    }

    // Notifications
    if (results.find(r => r.name === 'notifications' && r.status === 'missing')) {
        sqlCommands.push(`
-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
message TEXT,
is_read BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);`);
    }
    
    // Settings
    if (results.find(r => r.name === 'system_settings' && r.status === 'missing')) {
            sqlCommands.push(`
-- 4. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
key TEXT PRIMARY KEY,
value TEXT
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage settings" ON system_settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'));`);
    }

    // Timetables
    if (results.find(r => r.name === 'timetables' && r.status === 'missing')) {
        sqlCommands.push(`
-- 5. Timetables Table
CREATE TABLE IF NOT EXISTS timetables (
id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
grade TEXT NOT NULL,
classroom TEXT NOT NULL,
day_of_week TEXT NOT NULL,
period_index INT NOT NULL,
period_time TEXT NOT NULL,
subject TEXT NOT NULL,
teacher TEXT,
room TEXT,
color TEXT DEFAULT 'bg-slate-100'
);
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read timetables" ON timetables FOR SELECT USING (true);
CREATE POLICY "Teachers can manage timetables" ON timetables FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'));`);
    }

        // Student Task Status
    if (results.find(r => r.name === 'student_task_status' && r.status === 'missing')) {
            sqlCommands.push(`
-- 6. Student Task Status Table
CREATE TABLE IF NOT EXISTS student_task_status (
id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
is_completed BOOLEAN DEFAULT FALSE,
completed_at TIMESTAMP WITH TIME ZONE,
is_archived BOOLEAN DEFAULT FALSE,
UNIQUE(student_id, task_id)
);
ALTER TABLE student_task_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own status" ON student_task_status FOR ALL USING (auth.uid() = student_id);`);
    }
    
    // Backup Logs
    if (results.find(r => r.name === 'backup_logs' && r.status === 'missing')) {
        sqlCommands.push(`
-- 7. Backup Logs Table
CREATE TABLE IF NOT EXISTS backup_logs (
id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
backup_type TEXT,
status TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own backups" ON backup_logs FOR ALL USING (auth.uid() = user_id);`);
    }

    // Shared Tasks
    if (results.find(r => r.name === 'shared_tasks' && r.status === 'missing')) {
        sqlCommands.push(`
-- 8. Shared Tasks Table
CREATE TABLE IF NOT EXISTS shared_tasks (
id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
shared_with_email TEXT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE shared_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tasks shared with them" ON shared_tasks FOR SELECT USING (true);
CREATE POLICY "Users can share own tasks" ON shared_tasks FOR INSERT WITH CHECK (auth.uid() = owner_id);`);
    }

    let finalSql = sqlCommands.length > 0 ? `-- Run this SQL in Supabase SQL Editor to fix missing tables/columns --\n\n${sqlCommands.join('\n\n')}` : '';

    return { tables: results as any, missingSql: finalSql };
};

// --- Settings Management ---

export const getSystemSettings = async (): Promise<Record<string, string>> => {
    try {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (error) {
            // Check for "relation does not exist" error (Code 42P01) or specific schema cache error
            if (error.code === '42P01' || error.message.includes('Could not find the table') || error.message.includes('relation "system_settings" does not exist')) {
                console.warn("Table 'system_settings' not found. Please run the SQL migration script.");
                return {};
            }
            throw error;
        }
        
        const settings: Record<string, string> = {};
        data?.forEach((item: SystemSettings) => {
            settings[item.key] = item.value;
        });
        return settings;
    } catch (e: any) {
        // Handle network errors (Failed to fetch) gracefully
        if (e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'))) {
             console.warn("Network error fetching settings. Using defaults.");
             return {};
        }
        // If it's the specific schema cache error, treat as empty settings
        if (e.message && (e.message.includes('Could not find the table') || e.message.includes('system_settings'))) {
             return {};
        }
        console.error("Error fetching settings:", e.message || e);
        return {};
    }
}

export const saveSystemSettings = async (settings: Record<string, string>): Promise<{ success: boolean; message: string }> => {
    try {
        const upserts = Object.entries(settings).map(([key, value]) => ({ key, value }));
        const { error } = await supabase.from('system_settings').upsert(upserts);
        if (error) {
             if (error.code === '42P01' || error.message.includes('Could not find the table') || error.message.includes('relation "system_settings" does not exist')) {
                 return { success: false, message: "ไม่พบตาราง system_settings กรุณารัน SQL Script ตรวจสอบระบบ" };
             }
             if (error.message.includes('row-level security')) {
                 return { success: false, message: "ไม่มีสิทธิ์บันทึกค่า (RLS Error): โปรดตรวจสอบว่าบัญชีของคุณเป็น Teacher หรือไม่" };
             }
             throw error;
        }
        return { success: true, message: 'บันทึกการตั้งค่าสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

// --- LINE Integration ---

// Utility to ensure text is never empty string (causes LINE API error)
const safeStr = (str: string | undefined | null): string => {
    if (!str || str.trim() === '') return '-';
    return str.trim();
}

// Helper to generate a beautiful Flex Message from a Timetable
export const generateTimetableFlexMessage = (grade: string, classroom: string, timetable: TimetableEntry[]) => {
    const safeTimetable = Array.isArray(timetable) ? timetable : [];
    
    // Group by Day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dayMap: Record<string, string> = { 'Monday': 'จันทร์', 'Tuesday': 'อังคาร', 'Wednesday': 'พุธ', 'Thursday': 'พฤหัส', 'Friday': 'ศุกร์' };
    const dayColors: Record<string, string> = { 'Monday': '#FACC15', 'Tuesday': '#F472B6', 'Wednesday': '#4ADE80', 'Thursday': '#FB923C', 'Friday': '#60A5FA' };

    const grouped: Record<string, TimetableEntry[]> = {};
    days.forEach(d => grouped[d] = []);
    
    safeTimetable.forEach(t => {
        if (grouped[t.day_of_week]) {
            grouped[t.day_of_week].push(t);
        }
    });

    const dayContents = days.map(day => {
        const entries = grouped[day].sort((a, b) => a.period_index - b.period_index);
        if (entries.length === 0) return null;

        const subjectRows = entries.map(e => ({
            type: "box",
            layout: "horizontal",
            contents: [
                { type: "text", text: safeStr(e.period_time), size: "xs", color: "#6B7280", flex: 3 },
                { type: "text", text: safeStr(e.subject), size: "xs", color: "#1F2937", flex: 5, weight: "bold", wrap: true },
                { type: "text", text: safeStr(e.room), size: "xs", color: "#6B7280", flex: 2, align: "end" }
            ],
            margin: "sm"
        }));

        return {
            type: "box",
            layout: "vertical",
            margin: "lg",
            contents: [
                {
                    type: "box",
                    layout: "horizontal",
                    contents: [
                        { type: "box", layout: "vertical", width: "4px", height: "16px", backgroundColor: dayColors[day] || '#CCCCCC', cornerRadius: "2px" },
                        { 
                            type: "text", 
                            text: dayMap[day] || day, 
                            weight: "bold", 
                            size: "sm", 
                            color: "#374151",
                            margin: "md",
                            flex: 1
                        }
                    ],
                    alignItems: "center"
                },
                {
                    type: "box",
                    layout: "vertical",
                    contents: subjectRows,
                    paddingStart: "lg",
                    paddingTop: "sm"
                }
            ]
        };
    }).filter(Boolean);

    return {
        type: 'flex',
        altText: `ตารางเรียนชั้น ${safeStr(grade)}/${safeStr(classroom)}`,
        contents: {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                backgroundColor: "#4F46E5",
                contents: [
                    { type: "text", text: "📅 ตารางเรียน", color: "#FFFFFF", weight: "bold", size: "sm", opacity: "0.8" },
                    { type: "text", text: `ระดับชั้น ${safeStr(grade)}/${safeStr(classroom)}`, color: "#FFFFFF", weight: "bold", size: "xl", margin: "sm" }
                ],
                paddingAll: "20px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: dayContents.length > 0 ? dayContents : [
                    { type: "text", text: "ไม่มีข้อมูลตารางเรียน", align: "center", color: "#9CA3AF", margin: "md" }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "separator", color: "#F3F4F6" },
                    { 
                        type: "button", 
                        action: { type: "uri", label: "ดูตารางเรียนเต็ม", uri: "https://liff.line.me/2006857640-r8q7w165" },
                        style: "link",
                        color: "#4F46E5",
                        height: "sm"
                    }
                ],
                paddingAll: "0px"
            }
        }
    };
}

// Helper to generate a beautiful Flex Message from a Task
export const generateTaskFlexMessage = (task: Task) => {
    // 1. Define Colors and Header Text based on Category
    let themeColor = '#1DB446'; // Default LINE Green
    let categoryText = 'ข่าวสารทั่วไป';
    
    switch(task.category) {
        case TaskCategory.HOMEWORK: 
            themeColor = '#F59E0B'; // Amber/Orange
            categoryText = '📝 การบ้าน/ภาระงาน'; 
            break;
        case TaskCategory.EXAM_SCHEDULE: 
            themeColor = '#EF4444'; // Red
            categoryText = '🚨 แจ้งกำหนดการสอบ'; 
            break;
        case TaskCategory.CLASS_SCHEDULE: 
            themeColor = '#3B82F6'; // Blue
            categoryText = '📅 ตารางเรียน/นัดหมาย'; 
            break;
        case TaskCategory.ACTIVITY_INSIDE: 
            themeColor = '#10B981'; // Emerald
            categoryText = '🏫 กิจกรรมภายใน'; 
            break;
        case TaskCategory.ACTIVITY_OUTSIDE: 
            themeColor = '#8B5CF6'; // Purple
            categoryText = '🚌 กิจกรรมภายนอก'; 
            break;
    }

    // 2. Format Dates (Thai Date Format)
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('th-TH', { 
            day: 'numeric', month: 'short', year: 'numeric' 
        });
    };
    const formatTime = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        try {
            return date.toLocaleTimeString('th-TH', { 
                hour: '2-digit', minute: '2-digit' 
            }) + ' น.';
        } catch (e) {
            return date.toTimeString().slice(0, 5);
        }
    };

    const createdDate = formatDate(task.createdAt || new Date().toISOString());
    const dueDate = formatDate(task.dueDate);
    const dueTime = formatTime(task.dueDate);

    // 3. Define Target Audience Text
    let targetText = "ทุกคน";
    if (task.targetStudentId) targetText = `เฉพาะบุคคล (${task.targetStudentId})`;
    else if (task.targetGrade && task.targetClassroom) targetText = `ชั้น ${task.targetGrade}/${task.targetClassroom}`;
    else if (task.targetGrade) targetText = `ระดับชั้น ${task.targetGrade}`;

    // 4. Attachments Display Logic - validate URLs
    const safeAttachments = Array.isArray(task.attachments) ? task.attachments.filter(url => url && url.startsWith('http')) : [];
    
    const attachmentContents = safeAttachments.length > 0 ? [
        {
            type: "separator",
            margin: "md",
            color: "#E5E7EB"
        },
        {
            type: "text",
            text: "เอกสารแนบ:",
            size: "xs",
            color: "#9CA3AF",
            margin: "md"
        },
        ...safeAttachments.slice(0, 3).map(url => ({
            type: "text",
            text: `📎 ${safeStr(url.split('/').pop()?.split('?')[0] || 'Download')}`,
            size: "xxs",
            color: "#3B82F6",
            wrap: true,
            action: { type: "uri", uri: encodeURI(url) }, // Ensure URL is encoded
            margin: "sm"
        }))
    ] : [];

    // 5. Build Flex Message Structure
    return {
        type: 'flex',
        altText: safeStr(`แจ้งเตือน: ${task.title || 'งานใหม่'}`).substring(0, 400),
        contents: {
            type: "bubble",
            size: "mega", 
            header: {
                type: "box",
                layout: "vertical",
                backgroundColor: themeColor,
                paddingAll: "20px",
                contents: [
                    {
                        type: "text",
                        text: safeStr(categoryText),
                        color: "#FFFFFF",
                        weight: "bold",
                        size: "xs",
                        align: "start"
                    },
                    {
                        type: "text",
                        text: safeStr(task.title),
                        weight: "bold",
                        size: "xl",
                        color: "#FFFFFF",
                        wrap: true,
                        margin: "sm"
                    }
                ]
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    // Subject & Teacher Row
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    { type: "text", text: "รายวิชา", size: "xxs", color: "#9CA3AF" },
                                    { type: "text", text: safeStr(task.subject), size: "sm", color: "#1F2937", weight: "bold", wrap: true }
                                ],
                                flex: 1
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    { type: "text", text: "ผู้แจ้ง", size: "xxs", color: "#9CA3AF" },
                                    { type: "text", text: safeStr(task.createdBy || "Admin"), size: "sm", color: "#1F2937", wrap: true }
                                ],
                                flex: 1
                            }
                        ],
                        margin: "md"
                    },
                    { type: "separator", margin: "lg", color: "#F3F4F6" },
                    // Date Row
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "lg",
                        contents: [
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    { type: "text", text: "วันที่สร้าง", size: "xxs", color: "#9CA3AF" },
                                    { type: "text", text: safeStr(createdDate), size: "sm", color: "#4B5563" }
                                ],
                                flex: 1
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    { type: "text", text: "กำหนดส่ง", size: "xxs", color: "#EF4444" },
                                    { type: "text", text: safeStr(dueDate), size: "sm", color: "#EF4444", weight: "bold" },
                                    { type: "text", text: safeStr(dueTime), size: "xs", color: "#EF4444" }
                                ],
                                flex: 1
                            }
                        ]
                    },
                    { type: "separator", margin: "lg", color: "#F3F4F6" },
                    // Target & Description
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        contents: [
                            {
                                type: "text",
                                text: `สำหรับ: ${safeStr(targetText)}`,
                                size: "xs",
                                color: "#6B7280",
                                weight: "bold",
                                margin: "sm"
                            },
                            {
                                type: "text",
                                text: safeStr(task.description),
                                size: "sm",
                                color: "#374151",
                                wrap: true,
                                margin: "md"
                            }
                        ]
                    },
                    // Attachments Section
                    ...attachmentContents
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        style: "primary",
                        color: themeColor,
                        action: {
                            type: "uri",
                            label: "ดูรายละเอียด",
                            uri: "https://liff.line.me/2006857640-r8q7w165" 
                        }
                    }
                ],
                paddingAll: "20px"
            },
            styles: {
                footer: {
                    separator: true
                }
            }
        }
    };
};

export const sendLineNotification = async (lineUserId: string, messageOrTask: string | Task) => {
    try {
        const settings = await getSystemSettings();
        const token = settings['line_channel_access_token'];
        
        if (!token) {
            console.warn("LINE Channel Access Token not configured.");
            return;
        }

        let payload: string | object = '';
        if (typeof messageOrTask === 'string') {
            payload = messageOrTask;
        } else {
            payload = generateTaskFlexMessage(messageOrTask);
        }

        console.log(`Sending LINE Message to ${lineUserId}:`, JSON.stringify(payload, null, 2));
        await testLineNotification(token, lineUserId, payload);
    } catch (e) {
        console.error("Failed to send LINE notification", e);
    }
}

export const testLineNotification = async (token: string, userId: string, message: string | object = '🔔 ทดสอบ'): Promise<{ success: boolean, message: string }> => {
    if (!token || !userId) return { success: false, message: 'กรุณาระบุ Token และ User/Group ID' };

    try {
        const messages = typeof message === 'string' 
            ? [{ type: 'text', text: message }] 
            : [message]; 

        // Use CORS Proxy to bypass browser restrictions
        console.log("🚀 Sending to LINE API via Proxy:", JSON.stringify({ to: userId, messages }, null, 2));

        const response = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://api.line.me/v2/bot/message/push'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                to: userId,
                messages: messages
            })
        });

        if (response.ok) {
            return { success: true, message: 'ส่งข้อความสำเร็จ!' };
        } else {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error("LINE API Error Details:", JSON.stringify(errorData, null, 2));
            return { success: false, message: `ส่งไม่สำเร็จ (API Error): ${errorData.message || 'Unknown Error'} (ดู Console เพื่อดูรายละเอียด)` };
        }
    } catch (e: any) {
        console.warn("LINE API Network Error:", e);
        return { 
            success: false, 
            message: `เกิดข้อผิดพลาดเครือข่าย: ${e.message}` 
        };
    }
}

// --- Student Auth & Data ---

export const prepareStudentClaim = async (email: string, studentId: string, password?: string) => {
    return; 
};

// Update Sync function to handle OAuth login return
export const syncLineUserProfile = async (): Promise<boolean> => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return false;

        // Check if provider is LINE
        if (session.user.app_metadata.provider === 'line') {
            const lineUserId = session.user.user_metadata.sub || session.user.identities?.find((i:any) => i.provider === 'line')?.id;
            
            if (lineUserId) {
                 // Update the profile with LINE ID
                 const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ line_user_id: lineUserId })
                    .eq('id', session.user.id);
                 
                 if (!updateError) return true;
            }
        }
        return false;
    } catch (e) {
        console.error("Sync LINE Error:", e);
        return false;
    }
}

export const registerStudent = async (data: any): Promise<{ success: boolean; message: string }> => {
    try {
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('student_id', data.student_id)
            .eq('role', 'student')
            .maybeSingle();

        if (existingProfile) {
            await supabase.from('notifications').delete().eq('user_id', existingProfile.id);
            await supabase.from('profiles').delete().eq('id', existingProfile.id);
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
        });

        if (authError) {
             if (authError.message.includes('already registered')) {
                 const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                     email: data.email,
                     password: data.password
                 });
                 if (!signInError && signInData.user) {
                     authData.user = signInData.user;
                 } else {
                     throw authError;
                 }
             } else {
                 throw authError;
             }
        }
        
        if (!authData.user) throw new Error("No user created");

        const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: data.email,
            full_name: data.student_name,
            role: 'student',
            student_id: data.student_id,
            grade: data.grade,
            classroom: data.classroom,
            login_code: data.password, 
            line_user_id: data.lineUserId || null, 
            avatar_url: `https://ui-avatars.com/api/?name=${data.student_name}&background=random`
        });

        if (profileError) throw new Error("Database error saving new user");

        return { success: true, message: 'ลงทะเบียนสำเร็จ' };
    } catch (error: any) {
        console.error("Registration Error:", error);
        return { success: false, message: error.message || 'การลงทะเบียนล้มเหลว' };
    }
};

export const bulkRegisterStudents = async (students: any[]): Promise<{ success: boolean, count: number, errors: string[] }> => {
    let successCount = 0;
    const errors: string[] = [];

    for (const student of students) {
        // Basic validation
        if (!student.student_id || !student.email || !student.password) {
            errors.push(`ข้ามแถว: ข้อมูลไม่ครบ (ID: ${student.student_id || 'Unknown'})`);
            continue;
        }

        const result = await registerStudent(student);
        if (result.success) {
            successCount++;
        } else {
            errors.push(`Error ID ${student.student_id}: ${result.message}`);
        }
    }

    return { success: successCount > 0, count: successCount, errors };
}

export const loginStudent = async (studentId: string, email: string, password?: string): Promise<Student | null> => {
    try {
        if (!password) throw new Error("กรุณากรอกรหัสผ่าน");

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            let regPassword = password;
            if (password === '1234') regPassword = '123456';

            const { data: claimResult, error: rpcError } = await supabase.rpc('prepare_student_claim', {
                p_email: email,
                p_student_id: studentId,
                p_password: password
            });

            if (claimResult && claimResult.success) {
                const regResult = await registerStudent({
                    student_id: studentId,
                    student_name: 'Student ' + studentId, 
                    email: email,
                    grade: 'Updating...', 
                    classroom: '...',
                    password: regPassword
                });

                if (regResult.success) {
                     const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                         email,
                         password: regPassword
                     });
                     if (retryError) throw retryError;
                     authData.user = retryData.user;
                } else {
                     throw new Error("ระบบไม่สามารถลงทะเบียนอัตโนมัติได้: " + regResult.message);
                }
            } else {
                if (claimResult && !claimResult.success) {
                     if (claimResult.message === 'Invalid password') throw new Error("รหัสผ่านไม่ถูกต้อง (Login Code)");
                }
                throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชียังไม่ได้ลงทะเบียน");
            }
        }

        if (!authData.user) throw new Error("Authentication failed");

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) throw new Error("ไม่พบข้อมูลผู้ใช้งานในระบบ");

        if (profile.student_id !== studentId) {
            await supabase.auth.signOut();
            throw new Error("รหัสนักเรียนไม่ถูกต้องสำหรับบัญชีนี้");
        }

        return {
            id: profile.id,
            grade: profile.grade,
            classroom: profile.classroom,
            student_id: profile.student_id,
            student_name: profile.full_name,
            email: profile.email,
            profileImageUrl: profile.avatar_url || 'https://via.placeholder.com/150',
            lineUserId: profile.line_user_id
        };

    } catch (e: any) {
        console.error("Login error:", e.message);
        throw e; 
    }
}

export const getStudentDataById = async (studentId: string): Promise<StudentData | null> => {
    const { data: student, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('student_id', studentId)
        .eq('role', 'student')
        .maybeSingle();

    if (error || !student) return null;

    const mappedStudent: Student = {
        id: student.id,
        grade: student.grade,
        classroom: student.classroom,
        student_id: student.student_id,
        student_name: student.full_name,
        email: student.email,
        profileImageUrl: student.avatar_url,
        lineUserId: student.line_user_id
    };

    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .or(`and(target_grade.eq.${student.grade},target_classroom.eq.${student.classroom}),target_student_id.eq.${student.student_id},and(target_grade.is.null,target_student_id.is.null),created_by.eq.${student.id}`);

    const { data: taskStatuses } = await supabase
        .from('student_task_status')
        .select('task_id, is_completed')
        .eq('student_id', student.id);
    
    const statusMap = new Map();
    if (taskStatuses) {
        taskStatuses.forEach((status: any) => {
            statusMap.set(status.task_id, status.is_completed);
        });
    }

    const mappedTasks: Task[] = (tasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        subject: t.subject,
        description: t.description,
        dueDate: t.due_date,
        category: t.category,
        priority: t.priority || 'Medium',
        attachments: t.attachments || [],
        targetGrade: t.target_grade,
        targetClassroom: t.target_classroom,
        target_student_id: t.target_student_id,
        targetStudentId: t.target_student_id,
        createdBy: t.created_by === student.id ? 'Student' : 'Teacher', 
        createdAt: t.created_at,
        isCompleted: statusMap.get(t.id) || false
    }));

    const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', student.id)
        .order('created_at', { ascending: false });

    return {
        student: mappedStudent,
        tasks: mappedTasks,
        notifications: notifications || [],
        attributes: [], 
        scores: []      
    };
};

export const getAllStudentTaskStatuses = async () => {
    const { data: statuses } = await supabase.from('student_task_status').select('student_id, is_completed');
    return statuses || [];
};

export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean): Promise<boolean> => {
    try {
         const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('student_id', studentId)
            .single();
        
        if (!profile) return false;

        const { error } = await supabase.from('student_task_status').upsert({
            student_id: profile.id,
            task_id: taskId,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null
        }, { onConflict: 'student_id, task_id' });

        return !error;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const markNotificationRead = async (notificationId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
};

export const createBackup = async (userId: string): Promise<boolean> => {
    const { error } = await supabase.from('backup_logs').insert({
        user_id: userId,
        backup_type: 'Manual',
        status: 'Success'
    });
    return !error;
};

// --- Teacher Auth & Data ---

export const registerTeacher = async (name: string, email: string, password: string, lineUserId?: string): Promise<{ success: boolean; message: string; }> => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: { full_name: name, role: 'teacher' }
            }
        });
        
        if (authError) {
            // Re-throw specific errors so caller can handle them
            throw authError;
        }
        
        // Check if registration requires email confirmation
        if (authData.user && !authData.session) {
             return { success: false, message: "อีเมลนี้ยังไม่ได้ยืนยันตัวตน (หากใช้อีเมลปลอม กรุณาปิด 'Confirm email' ใน Supabase Authentication -> Providers -> Email)" };
        }
        
        if (authData.user) {
             // Create Profile
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                email: email,
                full_name: name,
                role: 'teacher',
                line_user_id: lineUserId || null,
                avatar_url: `https://ui-avatars.com/api/?name=${name}&background=random`
            });
            if (profileError) console.error("Profile creation warning:", profileError);
        }

        return { success: true, message: 'ลงทะเบียนครูสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const loginTeacher = async (email: string, password: string): Promise<Teacher | null> => {
    try {
        // 1. Attempt Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
             console.log("Login failed:", error.message);

             // 2. Special Handling for "admin@admin": Auto-Heal / Auto-Register
             if (email === 'admin@admin' && password === 'admin123') {
                 // Only try to register if the error suggests user doesn't exist or credentials failed (maybe account deleted)
                 if (error.message.includes("Invalid login credentials")) {
                     console.log("Admin account might be missing. Attempting auto-registration...");
                     
                     const regResult = await registerTeacher('Admin Master', email, password);
                     
                     if (regResult.success) {
                         // Retry login immediately
                         const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
                         if (!retryError && retryData.user) {
                             // Force profile creation just in case
                             await supabase.from('profiles').upsert({
                                id: retryData.user.id,
                                email: email,
                                full_name: 'Admin Master',
                                role: 'teacher',
                                avatar_url: `https://ui-avatars.com/api/?name=Admin&background=random`
                             });
                             return { teacher_id: retryData.user.id, name: 'Admin Master', email };
                         }
                     } else if (regResult.message.includes('already registered')) {
                         // User exists, password must be wrong
                         throw new Error("รหัสผ่านไม่ถูกต้อง (หากลืมรหัสผ่าน Admin ให้ลบ User ใน Supabase Auth แล้วลองใหม่)");
                     } else if (regResult.message.includes('ยืนยันตัวตน')) {
                         // If registration requires email confirmation, fail with that message
                         throw new Error(regResult.message);
                     }
                     // Fall through if other error - standard error will be thrown below
                 }
             }
             throw error;
        }

        if (!data.user) throw new Error("Authentication successful but no user data returned");

        // 3. Fetch Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
        
        // 4. Auto-Create Profile if missing (Robustness for Admin or manually deleted profiles)
        if (!profile) {
            console.log("Profile missing for existing auth user, creating...");
            const { error: insertError } = await supabase.from('profiles').insert({
                id: data.user.id,
                email: email,
                full_name: email.includes('admin') ? 'Admin Master' : 'Teacher',
                role: 'teacher',
                avatar_url: `https://ui-avatars.com/api/?name=${email}&background=random`
            });
            
            if (insertError) throw insertError;
            
            return { 
                teacher_id: data.user.id, 
                name: email.includes('admin') ? 'Admin Master' : 'Teacher', 
                email 
            };
        } 
        
        // 5. Ensure Role is Teacher (Fix for Admin if role got messed up)
        if (profile.role !== 'teacher') {
            if (email === 'admin@admin') {
                await supabase.from('profiles').update({ role: 'teacher' }).eq('id', data.user.id);
                return { teacher_id: profile.id, name: profile.full_name, email: profile.email };
            }
            throw new Error("บัญชีนี้ไม่ใช่บัญชีครู (Role: " + profile.role + ")");
        }

        // 6. Force Upsert Profile for Admin to ensure RLS passes (Fix for RLS errors)
        if (email === 'admin@admin') {
             await supabase.from('profiles').upsert({
                id: data.user.id,
                email: email,
                full_name: 'Admin Master',
                role: 'teacher',
                avatar_url: `https://ui-avatars.com/api/?name=Admin&background=random`
             });
        }

        return {
            teacher_id: profile.id,
            name: profile.full_name,
            email: profile.email
        };
    } catch (e: any) {
        throw e;
    }
};

// --- Task CRUD & Teacher Utils ---

export const getAllTasks = async (): Promise<Task[]> => {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            subject: t.subject,
            description: t.description,
            dueDate: t.due_date,
            category: t.category,
            priority: t.priority || 'Medium',
            attachments: t.attachments || [],
            targetGrade: t.target_grade,
            targetClassroom: t.target_classroom,
            targetStudentId: t.target_student_id,
            createdBy: 'Teacher',
            createdAt: t.created_at,
            isCompleted: false 
        }));
    } catch (e: any) {
        console.error("Error fetching tasks:", e.message);
        return [];
    }
};

export const createTask = async (task: any): Promise<{ success: boolean; message: string; data?: any }> => {
    try {
         const { data: { user } } = await supabase.auth.getUser();
         
         const dbTask = {
            title: task.title,
            subject: task.subject,
            description: task.description,
            due_date: task.dueDate,
            category: task.category,
            priority: task.priority,
            target_grade: task.targetGrade,
            target_classroom: task.targetClassroom,
            target_student_id: task.targetStudentId || null,
            attachments: task.attachments,
            created_by: user?.id
        };

        const { data, error } = await supabase.from('tasks').insert(dbTask).select().single();
        
        if (error) throw error;
        return { success: true, message: 'สร้างงานสำเร็จ', data: data };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const updateTask = async (task: any): Promise<{ success: boolean; message: string }> => {
    try {
        const dbTask = {
            title: task.title,
            subject: task.subject,
            description: task.description,
            due_date: task.dueDate,
            category: task.category,
            priority: task.priority,
            target_grade: task.targetGrade,
            target_classroom: task.targetClassroom,
            target_student_id: task.targetStudentId || null,
            attachments: task.attachments,
        };

        const { error } = await supabase.from('tasks').update(dbTask).eq('id', task.id);
        
        if (error) throw error;
        return { success: true, message: 'แก้ไขงานสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const deleteTask = async (taskId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) throw error;
        return { success: true, message: 'ลบงานสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const uploadFile = async (file: File): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

        if (uploadError) {
             console.error('Upload error (check if bucket "attachments" exists):', uploadError);
             return null;
        }

        const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (e) {
        console.error('File upload exception:', e);
        return null;
    }
};

export const getProfiles = async (role: 'student' | 'teacher'): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', role)
            .order('full_name');
            
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Error fetching profiles:", e);
        return [];
    }
};

export const updateProfile = async (id: string, updates: any): Promise<{ success: boolean; message: string }> => {
    try {
        const { error } = await supabase.from('profiles').update(updates).eq('id', id);
        if (error) throw error;
        return { success: true, message: 'อัพเดทข้อมูลสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const getTimetable = async (grade: string, classroom: string): Promise<TimetableEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('timetables')
            .select('*')
            .eq('grade', grade)
            .eq('classroom', classroom)
            .order('period_index');

        if (error) {
             if (error.code === '42P01') return []; 
             throw error;
        }
        return data || [];
    } catch (e) {
        console.error("Error fetching timetable:", e);
        return [];
    }
};
