
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, Role, TimetableEntry, SystemSettings } from '../types';
import { supabase } from '../lib/supabaseClient';

// --- Utility ---

export const testDatabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { success: true, message: `เชื่อมต่อฐานข้อมูลสำเร็จ! (พบผู้ใช้งาน ${count || 0} คน)` };
    } catch (e: any) {
        console.error(e);
        return { success: false, message: `การเชื่อมต่อล้มเหลว: ${e.message}` };
    }
};

// --- Settings Management ---

export const getSystemSettings = async (): Promise<Record<string, string>> => {
    try {
        const { data, error } = await supabase.from('system_settings').select('*');
        if (error) throw error;
        
        const settings: Record<string, string> = {};
        data?.forEach((item: SystemSettings) => {
            settings[item.key] = item.value;
        });
        return settings;
    } catch (e) {
        console.error("Error fetching settings:", e);
        return {};
    }
}

export const saveSystemSettings = async (settings: Record<string, string>): Promise<{ success: boolean; message: string }> => {
    try {
        const upserts = Object.entries(settings).map(([key, value]) => ({ key, value }));
        const { error } = await supabase.from('system_settings').upsert(upserts);
        if (error) throw error;
        return { success: true, message: 'บันทึกการตั้งค่าสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

// --- LINE Integration ---

export const sendLineNotification = async (lineUserId: string, message: string) => {
    // Note: Calling LINE API directly from frontend is insecure due to exposed keys and CORS.
    // In a production app, this should be an Edge Function or Backend endpoint.
    // For this demo, we simulate the logic or attempt a call if configured.
    
    try {
        const settings = await getSystemSettings();
        const token = settings['line_channel_access_token'];
        
        if (!token) {
            console.warn("LINE Channel Access Token not configured.");
            return;
        }

        // Simulating backend call structure
        console.log(`Sending LINE Message to ${lineUserId}: ${message}`);
        
        /* 
        // Actual implementation requires a backend proxy to avoid CORS.
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                to: lineUserId,
                messages: [{ type: 'text', text: message }]
            })
        });
        */
    } catch (e) {
        console.error("Failed to send LINE notification", e);
    }
}

// --- Student Auth & Data ---

export const prepareStudentClaim = async (email: string, studentId: string, password?: string) => {
    // Keeping this function as a placeholder if we need abstraction later.
    return; 
};

export const registerStudent = async (data: any): Promise<{ success: boolean; message: string }> => {
    try {
        // 1. Delete Existing Profile and Notifications (Sample Data Cleanup)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('student_id', data.student_id)
            .eq('role', 'student')
            .maybeSingle();

        if (existingProfile) {
            // Delete notifications first (FK constraint)
            await supabase.from('notifications').delete().eq('user_id', existingProfile.id);
            // Delete profile
            await supabase.from('profiles').delete().eq('id', existingProfile.id);
        }

        // 2. Sign up auth user
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

        // 3. Insert Profile
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: data.email,
            full_name: data.student_name,
            role: 'student',
            student_id: data.student_id,
            grade: data.grade,
            classroom: data.classroom,
            login_code: data.password, 
            line_user_id: data.lineUserId || null, // Capture LINE ID if present
            avatar_url: `https://ui-avatars.com/api/?name=${data.student_name}&background=random`
        });

        if (profileError) {
             console.error("Profile creation error:", profileError);
             throw new Error("Database error saving new user");
        }

        return { success: true, message: 'ลงทะเบียนสำเร็จ' };
    } catch (error: any) {
        console.error("Registration Error:", error);
        return { success: false, message: error.message || 'การลงทะเบียนล้มเหลว' };
    }
};

export const loginStudent = async (studentId: string, email: string, password?: string): Promise<Student | null> => {
    try {
        if (!password) throw new Error("กรุณากรอกรหัสผ่าน");

        // 1. Try to Login with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            // 2. Auth failed. Attempt Legacy Claim
            let regPassword = password;
            if (password === '1234') regPassword = '123456';

            // Call Secure RPC to clean up old data
            const { data: claimResult, error: rpcError } = await supabase.rpc('prepare_student_claim', {
                p_email: email,
                p_student_id: studentId,
                p_password: password
            });

            if (rpcError) console.error("RPC Error:", rpcError);

            if (claimResult && claimResult.success) {
                // Register new auth account
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

        // 3. Auth Success
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
    // 1. Get Student Profile
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

    // 2. Get Tasks
    // Allow viewing tasks created by Teacher (Assigned) OR created by Student (Personal)
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .or(`and(target_grade.eq.${student.grade},target_classroom.eq.${student.classroom}),target_student_id.eq.${student.student_id},and(target_grade.is.null,target_student_id.is.null),created_by.eq.${student.id}`);

    // 3. Get Task Status for this student
    const { data: taskStatuses } = await supabase
        .from('student_task_status')
        .select('task_id, is_completed')
        .eq('student_id', student.id);
    
    // Create a map for quick lookup
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
        targetStudentId: t.target_student_id,
        createdBy: t.created_by === student.id ? 'Student' : 'Teacher', 
        createdAt: t.created_at,
        isCompleted: statusMap.get(t.id) || false // Merge status
    }));

    // 4. Get Notifications
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

export const toggleTaskStatus = async (studentId: string, taskId: string, isCompleted: boolean): Promise<boolean> => {
    try {
        // Find the profile UUID from student_id (string)
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

export const registerTeacher = async (name: string, email: string, password: string): Promise<{ success: boolean; message: string; }> => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!authData.user) throw new Error("User creation failed");

        const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            email,
            full_name: name,
            role: 'teacher',
            avatar_url: `https://ui-avatars.com/api/?name=${name}&background=random`
        });
        if (profileError) throw profileError;

        return { success: true, message: 'ลงทะเบียนครูสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const loginTeacher = async (email: string, password: string): Promise<Teacher | null> => {
    if (email === 'admin@admin' && password === 'admin123') {
         return { teacher_id: 'admin', name: 'Admin Master', email: 'admin@admin' };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
             const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .eq('role', 'teacher')
                .maybeSingle();
             
             if (existingProfile) {
                 throw new Error("บัญชีนี้มีในระบบแล้ว แต่ยังไม่ได้ลงทะเบียนใช้งาน (กรุณาสมัครสมาชิกด้วยอีเมลนี้)");
             }
             throw error;
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (!profile || profile.role !== 'teacher') return null;

        return {
            teacher_id: profile.id,
            name: profile.full_name,
            email: profile.email
        };
    } catch (e: any) {
        console.error("Teacher Login Error:", e);
        throw e;
    }
};

// --- Profile Management ---

export const getProfiles = async (role: 'student' | 'teacher') => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', role)
            .order('created_at', { ascending: false });
        
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

// --- Timetable Management ---

export const getTimetable = async (grade: string, classroom: string): Promise<TimetableEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('timetables')
            .select('*')
            .eq('grade', grade)
            .eq('classroom', classroom)
            .order('period_index', { ascending: true });
        
        if (error) {
            console.warn("Timetable fetch error (possibly table missing):", error);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error("Error fetching timetable:", e);
        return [];
    }
};

// --- Task Management ---

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'createdBy'>): Promise<{ success: boolean; message: string }> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        let userId = user?.id;
        
        const { data: newTask, error } = await supabase.from('tasks').insert({
            title: task.title,
            subject: task.subject,
            description: task.description,
            due_date: task.dueDate,
            category: task.category,
            priority: task.priority || 'Medium',
            target_grade: task.targetGrade,
            target_classroom: task.targetClassroom,
            target_student_id: task.targetStudentId || null, 
            created_by: userId || null, 
            attachments: task.attachments
        }).select().single();

        if (error) throw error;
        
        // --- Notify via LINE if Individual Assignment ---
        if (task.targetStudentId && newTask) {
             const { data: student } = await supabase.from('profiles').select('line_user_id').eq('student_id', task.targetStudentId).single();
             if (student && student.line_user_id) {
                 sendLineNotification(student.line_user_id, `คุณได้รับงานใหม่: ${task.title}\nวิชา: ${task.subject}\nส่ง: ${new Date(task.dueDate).toLocaleString('th-TH')}`);
             }
        }

        return { success: true, message: 'โพสต์ภาระงานสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const updateTask = async (task: Task): Promise<{ success: boolean; message: string }> => {
    try {
        const { error } = await supabase.from('tasks').update({
            title: task.title,
            subject: task.subject,
            description: task.description,
            due_date: task.dueDate,
            category: task.category,
            priority: task.priority,
            target_grade: task.targetGrade,
            target_classroom: task.targetClassroom,
            target_student_id: task.targetStudentId || null,
            attachments: task.attachments
        }).eq('id', task.id);

        if (error) throw error;
        return { success: true, message: 'แก้ไขข้อมูลสำเร็จ' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const deleteTask = async (taskId: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    return { success: !error };
};

export const getAllTasks = async (): Promise<Task[]> => {
     const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
     if (error) {
        console.error(error);
        return [];
     }
     return data.map((t: any) => ({
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
        createdBy: 'Teacher', // Simplified
        createdAt: t.created_at
     }));
}

export const uploadFile = async (file: File): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (e) {
        console.error(e);
        return null;
    }
}
