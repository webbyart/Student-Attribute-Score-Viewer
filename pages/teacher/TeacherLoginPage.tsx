
import React, { useState, useEffect } from 'react';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { getSystemSettings, getLineLoginUrl } from '../../services/api';

const TeacherLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [lineLoginUrl, setLineLoginUrl] = useState('');
  const { login, loading } = useTeacherAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Setup LINE Login URL
    const setupLine = async () => {
        const settings = await getSystemSettings();
        if (settings['line_login_channel_id']) {
            const redirect = window.location.origin + window.location.pathname + '#/line-callback';
            setLineLoginUrl(getLineLoginUrl(settings['line_login_channel_id'], redirect, 'teacher'));
        }
    };
    setupLine();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
        const teacher = await login(email.trim(), password.trim());
        if (!teacher) {
          setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } else {
          navigate('/teacher/dashboard');
        }
    } catch (err: any) {
        console.error("Login Error UI:", err);
        let msg = err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        setError(msg);
    }
  };

  const handleLineLoginClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (lineLoginUrl) {
          // Force top level navigation to break out of iframes (AI Preview, etc)
          window.top.location.href = lineLoginUrl;
      }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-yellow-100 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">เข้าสู่ระบบ Admin</h1>
        <p className="text-slate-600 mb-8">จัดการภาระงานและกิจกรรม</p>
        
        <div className="bg-white/50 backdrop-blur-lg p-8 rounded-3xl shadow-lg">
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="ชื่อผู้ใช้งาน (Email)" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                required
              />
              <input 
                type="password" 
                placeholder="รหัสผ่าน" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm mt-4 bg-red-50 p-2 rounded border border-red-100">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-purple-600 disabled:bg-purple-300 transition-all duration-300 transform hover:scale-105"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

           <div className="mt-4 flex flex-col gap-2">
            {lineLoginUrl ? (
                <button 
                    onClick={handleLineLoginClick}
                    className="w-full bg-[#00C300] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-[#00B300] transition-all flex items-center justify-center gap-2"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.6 1.4 5 3.7 6.6.2.1.3.4.1.7-.2.6-.5 2.1-.5 2.2 0 .2.2.4.4.2.2-.1 2.3-1.4 3.2-1.9.3-.2.6-.2.9-.2.7.1 1.4.2 2.2.2 5.5 0 10-3.8 10-8.5C22 5.8 17.5 2 12 2z"/></svg>
                    เข้าสู่ระบบด้วย LINE
                </button>
            ) : (
                <p className="text-xs text-slate-400">ยังไม่เปิดใช้งาน LINE Login</p>
            )}
          </div>

           <button
                onClick={() => navigate('/')}
                className="mt-6 text-sm text-slate-500 hover:text-slate-700"
            >
                กลับไปหน้าหลัก
            </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherLoginPage;
