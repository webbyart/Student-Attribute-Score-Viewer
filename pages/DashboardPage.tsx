import React from 'react';
import Card from '../components/ui/Card';
import OverallScoreChart from '../components/charts/OverallScoreChart';
import { useAuth } from '../contexts/AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  // FIX: The useStudentData hook requires a studentId. Get it from the authenticated user.
  const { data: studentData, loading, error } = useStudentData(user?.student_id);

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner /></div>;
  }

  if (error || !studentData) {
    return <p className="text-center text-red-500">{error || 'ไม่สามารถโหลดข้อมูลได้'}</p>;
  }

  const { attributes, scores } = studentData;

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">สวัสดี, {user?.name.split(' ')[0]}!</h1>
        <p className="text-slate-500">ภาพรวมความคืบหน้าของคุณ</p>
      </header>
      
      <Card className="flex flex-col md:flex-row items-center gap-6">
        <img
          src={user?.profileImageUrl}
          alt={user?.name}
          className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
        />
        <div>
          <h2 className="text-2xl font-semibold">{user?.name}</h2>
          <p className="text-slate-600">{user?.class}</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">คะแนนภาพรวม</h2>
        <OverallScoreChart attributes={attributes} scores={scores} />
      </Card>
    </div>
  );
};

export default DashboardPage;
