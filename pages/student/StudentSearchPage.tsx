
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSystemSettings, getLineLoginUrl } from '../../services/api';

const StudentSearchPage: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lineLoginUrl, setLineLoginUrl] = useState('');
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  useEffect(() => {
    // Setup LINE Login URL
    const setupLine = async () => {
        const settings = await getSystemSettings();
        if (settings['line_login_channel_id']) {
            const redirect = window.location.origin + window.location.pathname + '#/line-callback';
            setLineLoginUrl(getLineLoginUrl(settings['line_login_channel_id'], redirect, 'student'));
        }
    };
    setupLine();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (studentId.trim() && email.trim() && password.trim()) {
       try {
         const success = await login(studentId.trim(), email.trim(), password.trim());
         if (success) {
             navigate(`/student/${studentId.trim()}`);
         }
       } catch (err: any) {
         setError(err.message || 'ข้อมูลไม่ถูกต้อง หรือรหัสผ่านผิด');
       }
    } else {
        setError('กรุณากรอกข้อมูลให้ครบถ้วน');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-sky-700 mb-2">เข้าสู่ระบบ (นักเรียน)</h1>
        <p className="text-slate-600 mb-8">กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบ</p>
        
        <div className="bg-white/50 backdrop-blur-lg p-8 rounded-3xl shadow-lg">
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="รหัสนักเรียน (เช่น std001)" 
              className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
              required
            />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมลโรงเรียน" 
              className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
              required
            />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน" 
              className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
              required
            />
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm text-left">
                    <p className="font-bold mb-1">เกิดข้อผิดพลาด</p>
                    <p>{error}</p>
                </div>
            )}
            
            <button
              type="submit"
              className="w-full mt-6 bg-sky-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-sky-600 disabled:bg-sky-300 transition-all duration-300 transform hover:scale-105"
              disabled={loading}
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-2">
            {lineLoginUrl ? (
                <a 
                    href={lineLoginUrl}
                    className="w-full bg-[#00C300] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-[#00B300] transition-all flex items-center justify-center gap-2"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.6 1.4 5 3.7 6.6.2.1.3.4.1.7-.2.6-.5 2.1-.5 2.2 0 .2.2.4.4.2.2-.1 2.3-1.4 3.2-1.9.3-.2.6-.2.9-.2.7.1 1.4.2 2.2.2 5.5 0 10-3.8 10-8.5C22 5.8 17.5 2 12 2z"/></svg>
                    เข้าสู่ระบบด้วย LINE
                </a>
            ) : (
                <p className="text-xs text-slate-400">ยังไม่เปิดใช้งาน LINE Login</p>
            )}
          </div>

           <p className="text-sm text-slate-600 mt-6">
            ยังไม่มีบัญชี? <Link to="/student/register" className="font-semibold text-sky-600 hover:underline">ลงทะเบียนที่นี่</Link>
          </p>
            <button
                onClick={() => navigate('/')}
                className="mt-4 text-sm text-slate-500 hover:text-slate-700"
            >
                กลับไปหน้าหลัก
            </button>
        </div>
      </div>
    </div>
  );
};

export default StudentSearchPage;
