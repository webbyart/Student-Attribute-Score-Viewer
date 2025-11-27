
import React from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-yellow-100 p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">ยินดีต้อนรับ</h1>
        <p className="text-slate-600 mb-12">ระบบติดตามภาระงานและกิจกรรมนักเรียน</p>
        
        <div className="bg-white/50 backdrop-blur-lg p-8 rounded-3xl shadow-lg space-y-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">กรุณาเลือกบทบาทของคุณ</h2>
          
          <button
            onClick={() => navigate('/teacher/login')}
            className="w-full bg-purple-500 text-white font-bold py-4 px-4 rounded-2xl shadow-lg hover:bg-purple-600 transition-all duration-300 transform hover:scale-105"
          >
            <span className="text-lg">👩‍🏫 สำหรับคุณครู (Admin)</span>
          </button>
          
          <button
            onClick={() => navigate('/student/login')}
            className="w-full bg-sky-500 text-white font-bold py-4 px-4 rounded-2xl shadow-lg hover:bg-sky-600 transition-all duration-300 transform hover:scale-105"
          >
            <span className="text-lg">🧑‍🎓 สำหรับนักเรียน</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
