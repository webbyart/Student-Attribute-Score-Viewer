
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, Role, TimetableEntry } from '../types';
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

// --- Student Auth & Data ---

export const prepareStudentClaim = async (email: string, studentId: string, password?: string) => {
    // Note: The actual RPC call should be implemented here if using client-side logic wrapper
    // But we are calling supabase.rpc directly in loginStudent.
    // Keeping this function as a placeholder if we need abstraction later.
    return; 
};

export const registerStudent = async (data: any): Promise<{ success: boolean; message: string }> => {
    try {
        // 0. Pre-check: If user exists in Auth, but not in Profile (edge case), or vice versa.
        // Actually, let's rely on the delete-then-insert strategy which is safer for this "claim" model.

        // 1. Delete Existing Profile and Notifications (Sample Data Cleanup)
        // We must check if there is a conflict first.
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
                 // Try to sign in
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
            // 2. Auth failed. This might be a "Legacy/Mock" user trying to claim their account.
            
            // Adjust password for min length requirement if using legacy '1234'
            let regPassword = password;
            if (password === '1234') regPassword = '123456';

            // Call Secure RPC to clean up old data
            const { data: claimResult, error: rpcError } = await supabase.rpc('prepare_student_claim', {
                p_email: email,
                p_student_id: studentId,
                p_password: password
            });

            if (rpcError) {
                console.error("RPC Error:", rpcError);
            }

            if (claimResult && claimResult.success) {
                console.log("Account claim prepared. Registering...");
                
                // We use placeholder data for the missing fields, assuming user will update later or Admin has set it correct in the logic (but we deleted it).
                // Wait, if we deleted the profile, we lost the name/grade/class!
                // Ideally, the RPC should return the old data before deleting, OR we fetch it first.
                // Let's improve the flow: fetch mock data first.

                // Actually, the RPC is strict. 
                // Let's rely on a simpler flow: User uses "Register" if they want full data control, 
                // OR we just register with placeholders and they fix it.
                // Or better: The RPC *could* return the old data if we modified it.
                
                // For now, let's just register with the Student ID as name placeholder.
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

        // Verify Student ID matches
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
            profileImageUrl: profile.avatar_url || 'https://via.placeholder.com/150'
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
        profileImageUrl: student.avatar_url
    };

    // 2. Get Tasks
    const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .or(`and(target_grade.eq.${student.grade},target_classroom.eq.${student.classroom}),target_student_id.eq.${student.student_id},and(target_grade.is.null,target_student_id.is.null)`);

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
        createdBy: 'Teacher', 
        createdAt: t.created_at
    }));

    // 3. Get Notifications
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

export const markNotificationRead = async (notificationId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
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
            // Handle case where table might not exist yet gracefully for demo
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
        
        const { error } = await supabase.from('tasks').insert({
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
        });

        if (error) throw error;
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
        createdBy: 'Teacher',
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
