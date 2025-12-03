
import React, { useState } from 'react';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import { Link, useNavigate } from 'react-router-dom';

const TeacherLoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const { login, loading } = useTeacherAuth();
  const navigate = useNavigate();

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
        
        // Translate common Supabase errors for better UX
        if (msg.includes('Invalid login credentials')) {
            msg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        } else if (msg.includes('Email not confirmed')) {
            msg = "อีเมลนี้ยังไม่ได้ยืนยันตัวตน";
        }
        
        setError(msg);
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
          <p className="text-sm text-slate-600 mt-6">
            ยังไม่มีบัญชี? <Link to="/teacher/register" className="font-semibold text-purple-600 hover:underline">ลงทะเบียนที่นี่</Link>
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

export default TeacherLoginPage;
