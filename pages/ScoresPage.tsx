import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/ui/Card';
import AttributeRadarChart from '../components/charts/AttributeRadarChart';
import Timeline from '../components/ui/Timeline';
import { useStudentData } from '../hooks/useStudentData';
import LoadingSpinner from '../components/ui/LoadingSpinner';
// FIX: Import useAuth to get the logged-in user's data.
import { useAuth } from '../contexts/AuthContext';

const ScoresPage: React.FC = () => {
  // FIX: Get the authenticated user to pass their ID to useStudentData.
  const { user } = useAuth();
  // FIX: The useStudentData hook requires a studentId.
  const { data: studentData, loading, error } = useStudentData(user?.student_id);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string | null>(null);

  useEffect(() => {
    if (studentData && !selectedAttributeId && studentData.attributes.length > 0) {
      // FIX: The 'Attribute' type uses 'attribute_id', not 'id'.
      setSelectedAttributeId(studentData.attributes[0].attribute_id);
    }
  }, [studentData, selectedAttributeId]);

  const selectedAttributeScores = useMemo(() => {
    if (!studentData || !selectedAttributeId) return [];
    // FIX: The 'Score' type uses 'attribute_id', not 'attributeId'.
    return studentData.scores.filter(score => score.attribute_id === selectedAttributeId);
  }, [studentData, selectedAttributeId]);
  
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
        <h1 className="text-3xl font-bold text-slate-800">คะแนนคุณลักษณะ</h1>
        <p className="text-slate-500">สำรวจผลการประเมินในแต่ละด้าน</p>
      </header>

      <Card>
        <h2 className="text-xl font-semibold mb-4">เรดาร์แสดงประสิทธิภาพ</h2>
        <AttributeRadarChart attributes={attributes} scores={scores} />
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">ประวัติคะแนน</h2>
        <div className="mb-6">
          <select
            value={selectedAttributeId || ''}
            onChange={(e) => setSelectedAttributeId(e.target.value)}
            className="w-full p-3 bg-white/70 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
          >
            {attributes.map(attr => (
              // FIX: The 'Attribute' type uses 'attribute_id' and 'attribute_name'.
              <option key={attr.attribute_id} value={attr.attribute_id}>{attr.attribute_name}</option>
            ))}
          </select>
        </div>
        <Timeline scores={selectedAttributeScores} />
      </Card>
    </div>
  );
};

export default ScoresPage;
