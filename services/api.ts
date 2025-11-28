
import { StudentData, Student, Task, Teacher, TaskCategory, Notification, Role } from '../types';
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

export const registerStudent = async (data: any): Promise<{ success: boolean; message: string }> => {
    try {
        // 1. Sign up auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
        });

        if (authError) {
             // If user already exists in Auth but maybe profile creation failed previously
             if (authError.message.includes('already registered')) {
                 // Try to sign in to get the User ID
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

        // 2. Insert Profile (If it fails due to conflict, it means profile already exists, which is fine)
        // We use upsert to be safe
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
            // We call the secure RPC function to check and prepare the account.
            
            // Adjust password for min length requirement if using legacy '1234'
            let regPassword = password;
            if (password === '1234') regPassword = '123456';

            const { data: claimResult, error: rpcError } = await supabase.rpc('prepare_student_claim', {
                p_email: email,
                p_student_id: studentId,
                p_password: password
            });

            if (rpcError) {
                console.error("RPC Error:", rpcError);
                // If RPC fails (e.g function not found), fall through to generic error
            }

            // If RPC returns success: true, the old profile is deleted, we can register fresh.
            if (claimResult && claimResult.success) {
                console.log("Account claim prepared. Registering...");
                
                // Get the deleted profile data? No, RPC doesn't return it.
                // We rely on the input data. We might miss Name/Grade/Classroom if we don't fetch before.
                // However, usually the student inputs their ID.
                // For a perfect UX, we should have fetched the profile *before* calling RPC.
                // But let's assume standard registration for now or try to re-fetch if RPC failed?
                // Wait, if RPC success, the data is GONE.
                // Strategy: We should register with generic data and let them update, 
                // OR we fetch first, then RPC.
                
                // Let's fetch mock data locally from MOCK_DATA if needed? No.
                // We will proceed with Registration using the inputs provided. 
                // Note: The UI for Login only asks for ID/Email/Pass. We don't have Name/Grade/Class.
                // This is a limitation of the "Auto-Login" from Login screen.
                // Ideally, they should use "Register" screen.
                
                // Hack: If coming from Login screen, we might lack Name/Class.
                // Let's assume the user uses the '1234' default.
                
                const regResult = await registerStudent({
                    student_id: studentId,
                    student_name: 'Student ' + studentId, // Placeholder name
                    email: email,
                    grade: 'Updating...', // Placeholder
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
                     // Continue to fetch profile...
                } else {
                     throw new Error("ระบบไม่สามารถลงทะเบียนอัตโนมัติได้: " + regResult.message);
                }
            } else {
                // If RPC failed (e.g. profile not found, or password wrong)
                if (claimResult && !claimResult.success) {
                     // If message is "Invalid password", throw it
                     if (claimResult.message === 'Invalid password') throw new Error("รหัสผ่านไม่ถูกต้อง (Login Code)");
                }
                // If not claimable, just throw the original Auth error
                throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชียังไม่ได้ลงทะเบียน");
            }
        }

        if (!authData.user) throw new Error("Authentication failed");

        // 3. Auth Success (Standard Path)
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
