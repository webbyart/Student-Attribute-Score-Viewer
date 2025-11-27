import React from 'react';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null; // Or a loading state
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">โปรไฟล์</h1>
        <p className="text-slate-500">จัดการข้อมูลบัญชีของคุณ</p>
      </header>

      <div className="flex flex-col items-center">
        <img
          src={user.profileImageUrl}
          alt={user.name}
          className="w-32 h-32 rounded-full border-4 border-white shadow-xl mb-4"
        />
        <h2 className="text-2xl font-bold">{user.name}</h2>
        <p className="text-slate-500">{user.email}</p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium text-slate-600">ชื่อ-นามสกุล:</span>
            <span>{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-slate-600">ชั้นเรียน:</span>
            <span>{user.class}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-slate-600">บทบาท:</span>
            <span className="capitalize">{user.role}</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-center">
        <button
          onClick={logout}
          className="w-full max-w-xs bg-red-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-red-600 transition-all duration-300 transform hover:scale-105"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
