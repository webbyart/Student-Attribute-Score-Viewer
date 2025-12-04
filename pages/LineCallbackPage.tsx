
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loginWithLineCode } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { Role } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const LineCallbackPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('กำลังยืนยันตัวตนกับ LINE...');

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state'); // 'student' or 'teacher'
            const error = searchParams.get('error');

            if (error) {
                setStatus('เกิดข้อผิดพลาด: ' + (searchParams.get('error_description') || error));
                return;
            }

            if (!code) {
                setStatus('ไม่พบ Authorization Code');
                return;
            }

            try {
                // Determine redirect URI used
                const redirectUri = window.location.origin + window.location.pathname + 'https://student-homework.netlify.app/#/line-callback';
                
                setStatus('กำลังตรวจสอบข้อมูลผู้ใช้...');
                const result = await loginWithLineCode(code, redirectUri);

                if (result.success && result.user) {
                    setStatus('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...');
                    
                    if (result.role === 'student') {
                        const studentUser = {
                            id: result.user.student_id,
                            student_id: result.user.student_id,
                            name: result.user.student_name,
                            email: result.user.email,
                            profileImageUrl: result.lineProfile?.pictureUrl || result.user.profile_image,
                            class: `ชั้น ${result.user.grade}/${result.user.classroom}`,
                            role: Role.STUDENT,
                        };
                        sessionStorage.setItem('studentUser', JSON.stringify(studentUser));
                        window.location.href = `#/student/${result.user.student_id}`;
                        window.location.reload();

                    } else {
                        // Teacher
                        const teacherUser = {
                            teacher_id: result.user.teacher_id,
                            name: result.user.name,
                            email: result.user.email
                        };
                        sessionStorage.setItem('teacher', JSON.stringify(teacherUser));
                         window.location.href = `#/teacher/dashboard`;
                         window.location.reload();
                    }

                } else {
                    if (result.lineUserId) {
                         setStatus('ไม่พบบัญชีในระบบ... กำลังนำคุณไปลงทะเบียน');
                         setTimeout(() => {
                            const targetRole = state === 'teacher' ? 'teacher' : 'student';
                            const profileImg = result.lineProfile?.pictureUrl ? `&profileImage=${encodeURIComponent(result.lineProfile.pictureUrl)}` : '';
                            navigate(`/${targetRole}/register?lineUserId=${result.lineUserId}${profileImg}`);
                         }, 2000);
                    } else {
                        setStatus('เข้าสู่ระบบล้มเหลว: ' + (result.message || 'ไม่พบผู้ใช้นี้ในระบบ'));
                        setTimeout(() => navigate('/login-select'), 3000);
                    }
                }
            } catch (e: any) {
                setStatus('เกิดข้อผิดพลาด: ' + e.message);
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <LoadingSpinner />
            <p className="mt-4 text-slate-600 font-medium">{status}</p>
        </div>
    );
};

export default LineCallbackPage;
