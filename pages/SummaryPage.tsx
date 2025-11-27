import React, { useMemo } from 'react';
import Card from '../components/ui/Card';
import { useStudentData } from '../hooks/useStudentData';
import LoadingSpinner from '../components/ui/LoadingSpinner';
// FIX: Import useAuth to get the logged-in user's data.
import { useAuth } from '../contexts/AuthContext';

const SummaryPage: React.FC = () => {
  // FIX: Get the authenticated user to pass their ID to useStudentData.
  const { user } = useAuth();
  // FIX: The useStudentData hook requires a studentId.
  const { data: studentData, loading, error } = useStudentData(user?.student_id);

  const analysis = useMemo(() => {
    if (!studentData) return { topStrengths: [], areasForImprovement: [] };

    const averageScores = studentData.attributes.map(attr => {
      // FIX: Property names should be 'attribute_id' for both scores and attributes.
      const relevantScores = studentData.scores.filter(s => s.attribute_id === attr.attribute_id);
      const average = relevantScores.length > 0
        ? relevantScores.reduce((sum, s) => sum + s.score, 0) / relevantScores.length
        : 0;
      // FIX: The 'Attribute' type uses 'attribute_name', not 'name'.
      return { name: attr.attribute_name, score: average };
    });

    const sortedScores = [...averageScores].sort((a, b) => b.score - a.score);

    return {
      topStrengths: sortedScores.slice(0, 3).filter(s => s.score > 0),
      areasForImprovement: sortedScores.slice(-3).reverse().filter(s => s.score > 0),
    };
  }, [studentData]);

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner /></div>;
  }

  if (error || !studentData) {
    return <p className="text-center text-red-500">{error || 'ไม่สามารถโหลดข้อมูลได้'}</p>;
  }
  
  const StrengthIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const ImprovementIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-800">สรุปผลการประเมิน</h1>
        <p className="text-slate-500">ภาพรวมคุณลักษณะเด่นของคุณ</p>
      </header>

      <Card>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><StrengthIcon/> จุดแข็ง</h2>
        <ul className="space-y-3">
          {analysis.topStrengths.map(item => (
            <li key={item.name} className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
              <span className="font-medium text-green-800">{item.name}</span>
              <span className="font-bold text-green-600">{Math.round(item.score)}</span>
            </li>
          ))}
        </ul>
      </Card>
      
      <Card>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><ImprovementIcon/> สิ่งที่ควรพัฒนา</h2>
        <ul className="space-y-3">
          {analysis.areasForImprovement.map(item => (
            <li key={item.name} className="flex justify-between items-center bg-orange-50 p-3 rounded-lg">
              <span className="font-medium text-orange-800">{item.name}</span>
              <span className="font-bold text-orange-600">{Math.round(item.score)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-500 mt-4">เป็นส่วนที่สามารถเติบโตได้อีก ขอให้รักษามาตรฐานและพัฒนาต่อไป</p>
      </Card>
    </div>
  );
};

export default SummaryPage;
