import React from 'react';
import Card from '../../components/ui/Card';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';

const TeacherProfilePage: React.FC = () => {
  const { teacher, logout } = useTeacherAuth();

  if (!teacher) {
    return null;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-md mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">โปรไฟล์ของคุณครู</h1>
        <p className="text-slate-500">จัดการข้อมูลบัญชีของคุณ</p>
      </header>

      <div className="flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-purple-200 flex items-center justify-center mb-4 border-4 border-white shadow-xl">
            <span className="text-5xl">👩‍🏫</span>
        </div>
        <h2 className="text-2xl font-bold">{teacher.name}</h2>
        <p className="text-slate-500">{teacher.email}</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium text-slate-600">ชื่อ-นามสกุล:</span>
            <span>{teacher.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-slate-600">อีเมล:</span>
            <span>{teacher.email}</span>
          </div>
           <div className="flex justify-between">
            <span className="font-medium text-slate-600">Teacher ID:</span>
            <span>{teacher.teacher_id}</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-center">
        <button
          onClick={logout}
          className="w-full bg-red-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-red-600 transition-all duration-300 transform hover:scale-105"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
};

export default TeacherProfilePage;
