import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loginWithLineCode } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherAuth } from '../contexts/TeacherAuthContext';
import { Role } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const LineCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('กำลังยืนยันตัวตนกับ LINE...');
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            // 1. ดึง URL ปัจจุบันมาแกะหา code โดยตรง (ไม่พึ่ง searchParams ของ Router)
            // วิธีนี้ช่วยแก้ปัญหาเวลา LINE ส่ง params มาก่อนเครื่องหมาย # (เช่น /?code=...#/callback)
            const currentUrl = window.location.href;
            
            // Regex ค้นหา code=... และ state=... ไม่ว่าจะอยู่ตรงไหนของ URL
            const codeMatch = currentUrl.match(/[?&]code=([^&]+)/);
            const stateMatch = currentUrl.match(/[?&]state=([^&]+)/);
            const errorMatch = currentUrl.match(/[?&]error=([^&]+)/);
            const errorDescMatch = currentUrl.match(/[?&]error_description=([^&]+)/);

            let code = codeMatch ? codeMatch[1] : null;
            let state = stateMatch ? stateMatch[1] : null;
            let error = errorMatch ? errorMatch[1] : null;
            let errorDesc = errorDescMatch ? errorDescMatch[1] : null;

            // ถ้า code ติดเครื่องหมาย # มาด้วย ให้ตัดออก (เช่น code=xyz#/line-callback)
            if (code && code.includes('#')) {
                code = code.split('#')[0];
            }
            if (state && state.includes('#')) {
                state = state.split('#')[0];
            }

            console.log("LINE Callback Parsed:", { code, state, error });

            if (error) {
                setStatus('เกิดข้อผิดพลาดจาก LINE: ' + (decodeURIComponent(errorDesc || error)));
                return;
            }

            if (!code) {
                setStatus('ไม่พบ Authorization Code (กรุณาลองใหม่อีกครั้ง)');
                setDebugInfo(`URL ที่ได้รับ: ${currentUrl}`);
                return;
            }

            try {
                // 2. กำหนด Redirect URI ให้ตรงกับหน้า Login (ต้องตรงกันเป๊ะๆ 100%)
                // เนื่องจากในหน้า Login เราบังคับใช้ URL ของ Netlify ดังนั้นที่นี่ก็ต้องใช้เหมือนกัน
                const redirectUri = 'https://student-homework.netlify.app/#/line-callback';
                
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
                        // ใช้ window.location เพื่อบังคับโหลดใหม่และเคลียร์ URL params
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
                         }, 1500);
                    } else {
                        setStatus('เข้าสู่ระบบล้มเหลว: ' + (result.message || 'ไม่พบผู้ใช้นี้ในระบบ'));
                        setDebugInfo('Account not found in Google Sheets');
                        setTimeout(() => navigate('/login-select'), 3000);
                    }
                }
            } catch (e: any) {
                console.error(e);
                setStatus('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                setDebugInfo(e.toString());
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <LoadingSpinner />
            <p className="mt-4 text-slate-600 font-medium text-center">{status}</p>
            {debugInfo && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-500 max-w-md break-all border border-gray-200">
                    <p className="font-bold mb-1">Debug Info:</p>
                    {debugInfo}
                </div>
            )}
        </div>
    );
};

export default LineCallbackPage;