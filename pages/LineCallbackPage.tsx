import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithLineCode } from '../services/api';
import { Role } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const LineCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('กำลังยืนยันตัวตนกับ LINE...');
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            // 1. Get the FULL URL to parse params regardless of Router placement
            const currentUrl = window.location.href;
            
            // Regex to find code/state/error. 
            // Matches ?code=... or &code=... 
            // Stops at & or # (unless # is part of the fragment start, handled by logic below)
            const codeMatch = currentUrl.match(/[?&]code=([^&]+)/);
            const stateMatch = currentUrl.match(/[?&]state=([^&]+)/);
            const errorMatch = currentUrl.match(/[?&]error=([^&]+)/);
            const errorDescMatch = currentUrl.match(/[?&]error_description=([^&]+)/);

            let code = codeMatch ? codeMatch[1] : null;
            let state = stateMatch ? stateMatch[1] : null;
            let error = errorMatch ? errorMatch[1] : null;
            let errorDesc = errorDescMatch ? errorDescMatch[1] : null;

            // Cleanup: If code captured the hash (e.g. "abc#/line-callback"), strip it
            if (code && code.includes('#')) code = code.split('#')[0];
            if (state && state.includes('#')) state = state.split('#')[0];

            console.log("LINE Callback Debug:", { code, state, error, currentUrl });

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
                // 2. Generate Redirect URI strictly consistent with Login Pages
                const origin = window.location.origin;
                // Ensure pathname doesn't end with slash to avoid //#/
                const pathname = window.location.pathname.replace(/\/$/, ''); 
                const redirectUri = `${origin}${pathname}/#/line-callback`;
                
                setStatus('กำลังตรวจสอบข้อมูลผู้ใช้...');
                // console.log("Verifying with Redirect URI:", redirectUri);

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
                        // Force reload to clear URL params
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
                        setDebugInfo(JSON.stringify(result));
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
                <div className="mt-4 p-3 bg-gray-100 rounded-lg text-[10px] text-gray-500 max-w-md break-all border border-gray-200 font-mono">
                    <p className="font-bold mb-1">Debug Info:</p>
                    {debugInfo}
                </div>
            )}
        </div>
    );
};

export default LineCallbackPage;