
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

const StudentSearchPage: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, loading } = useAuth();

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

  const handleLineLogin = async () => {
      // Initiate Supabase OAuth with LINE
      // Note: This requires 'line' provider to be enabled in Supabase Dashboard
      const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'line',
          options: {
              redirectTo: window.location.origin + '/student/login',
          }
      });
      if (error) {
          setError('การเชื่อมต่อกับ LINE มีปัญหา: ' + error.message);
      }
  }

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
                    {error.includes("ยังไม่ได้ลงทะเบียน") && (
                         <Link to="/student/register" className="block mt-2 text-sky-600 underline font-bold">
                             คลิกที่นี่เพื่อลงทะเบียน
                         </Link>
                    )}
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

           {/* LINE Login Button */}
           <div className="mt-4 pt-4 border-t border-slate-200">
               <button
                  onClick={handleLineLogin}
                  className="w-full bg-[#06C755] hover:bg-[#05b54c] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
               >
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22 10.5C22 5.25 17.07 1 11 1S0 5.25 0 10.5c0 4.69 3.75 8.59 9 9.35.35.08.83.25.96.56.11.27.07.69.04.99-.08 1.1-.96 3.93-1.07 4.31-.17.61-.09.84.34.84.45 0 1.2-.23 4.96-3.38 3.58.98 7.77-.52 7.77-5.67z"/></svg>
                   เข้าสู่ระบบด้วย LINE
               </button>
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
