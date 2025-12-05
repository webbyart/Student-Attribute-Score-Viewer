
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
    
    if (studentId.trim() === '' || email.trim() === '' || password.trim() === '') {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const success = await login(studentId.trim(), email.trim(), password.trim());
      if (!success) {
        setError('ไม่พบข้อมูลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
         navigate(`/student/${studentId}`);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-sky-700 mb-2">เข้าสู่ระบบ (นักเรียน)</h1>
        <p className="text-slate-600 mb-8">ดูภาระงานและคะแนนสะสม</p>
        
        <div className="bg-white/50 backdrop-blur-lg p-8 rounded-3xl shadow-lg">
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="รหัสนักเรียน (Student ID)" 
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                required
              />
               <input 
                type="email" 
                placeholder="อีเมลโรงเรียน" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                required
              />
              <input 
                type="password" 
                placeholder="รหัสผ่าน" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-sky-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-sky-600 disabled:bg-sky-300 transition-all duration-300 transform hover:scale-105"
            >
              {loading ? 'กำลังค้นหา...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="text-sm text-slate-600 mt-6">
            ยังไม่มีบัญชี? <Link to="/student/register" className="font-semibold text-sky-600 hover:underline">ลงทะเบียนใหม่</Link>
          </p>

           <button
                onClick={() => navigate('/')}
                className="mt-4 text-sm text-slate-500 hover:text-slate-700 block mx-auto"
            >
                กลับไปหน้าหลัก
            </button>
        </div>
      </div>
    </div>
  );
};

export default StudentSearchPage;
