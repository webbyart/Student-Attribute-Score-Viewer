
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role: Role) => {
    if (role === Role.STUDENT) {
      navigate('/student/login');
    } else {
      navigate('/teacher/login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-yellow-100 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">ยินดีต้อนรับ</h1>
        <p className="text-slate-600 mb-8">ระบบดูคะแนนคุณลักษณะนักเรียน</p>
        
        <div className="bg-white/50 backdrop-blur-lg p-8 rounded-3xl shadow-lg">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">เข้าสู่ระบบ</h2>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="อีเมล" 
              className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              defaultValue="std001@email.com"
            />
            <input 
              type="password" 
              placeholder="รหัสผ่าน" 
              className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              defaultValue="1234"
            />
          </div>
          
          <div className="mt-8 space-y-4">
            <button
              onClick={() => handleLogin(Role.STUDENT)}
              disabled={loading}
              className="w-full bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-purple-600 disabled:bg-purple-300 transition-all duration-300 transform hover:scale-105"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (นักเรียน)'}
            </button>
            <button
              onClick={() => handleLogin(Role.TEACHER)}
              disabled={loading}
              className="w-full bg-slate-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-slate-600 disabled:bg-slate-300 transition-all duration-300 transform hover:scale-105"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (ครู)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;