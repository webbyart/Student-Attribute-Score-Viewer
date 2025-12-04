
import React from 'react';
import { useParams, Outlet, Navigate } from 'react-router-dom';
import BottomNavBar from '../../components/layout/BottomNavBar';
import { useStudentData } from '../../hooks/useStudentData';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const StudentLayout: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { data: studentData, loading, error } = useStudentData(studentId);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
  }

  if (error || !studentData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">เกิดข้อผิดพลาด</h1>
        <p className="text-slate-600">{error || 'ไม่สามารถโหลดข้อมูลได้'}</p>
        <a href="#/student/login" className="mt-6 bg-purple-500 text-white font-bold py-2 px-6 rounded-xl hover:bg-purple-600 transition">
          กลับไปหน้าเข้าสู่ระบบ
        </a>
      </div>
    );
  }

  const studentNavItems = [
    { path: `/student/${studentId}`, label: 'หน้าหลัก', icon: 'HomeIcon' },
    { path: `/student/${studentId}/schedule`, label: 'ปฏิทิน', icon: 'ChartBarIcon' }, 
    { path: `/student/${studentId}/categories`, label: 'กลุ่มงาน', icon: 'DocumentTextIcon' },
    { path: `/student/${studentId}/profile`, label: 'โปรไฟล์', icon: 'UserCircleIcon' },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-fuchsia-50 via-blue-50 to-yellow-50">
      <main className="pb-28 pt-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <Outlet context={studentData} />
      </main>
      <BottomNavBar items={studentNavItems} />
    </div>
  );
};

export default StudentLayout;
