
import React, { useState } from 'react';
import { registerTeacher } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

const TeacherRegisterPage: React.FC = () => {
  const [teacherId, setTeacherId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    
    if (password.length < 4) {
        setError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
        return;
    }

    setLoading(true);
    const result = await registerTeacher(teacherId, name, email, password);
    if (result.success) {
      setMessage('ลงทะเบียนสำเร็จ! กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...');
      setTimeout(() => navigate('/teacher/login'), 2000);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-yellow-100 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">ลงทะเบียน (ครู)</h1>
        <p className="text-slate-600 mb-8">สร้างบัญชีเพื่อเริ่มใช้งาน</p>
        
        <div className="bg-white/50 backdrop-blur-lg p-8 rounded-3xl shadow-lg">
          <form onSubmit={handleRegister}>
            <div className="space-y-4">
               <input 
                type="text" 
                placeholder="รหัสครู (Teacher ID)" 
                value={teacherId}
                onChange={e => setTeacherId(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                required
              />
              <input 
                type="text" 
                placeholder="ชื่อ-นามสกุล" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                required
              />
              <input 
                type="email" 
                placeholder="อีเมล" 
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
              <input 
                type="password" 
                placeholder="ยืนยันรหัสผ่าน" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            {message && <p className="text-green-600 text-sm mt-4">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-purple-600 disabled:bg-purple-300 transition-all duration-300 transform hover:scale-105"
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </button>
          </form>
          <p className="text-sm text-slate-600 mt-6">
            มีบัญชีอยู่แล้ว? <Link to="/teacher/login" className="font-semibold text-purple-600 hover:underline">เข้าสู่ระบบที่นี่</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherRegisterPage;
