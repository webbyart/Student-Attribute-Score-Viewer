import { useState, useEffect } from 'react';
import { StudentData } from '../types';
import { getStudentDataById } from '../services/api';

export const useStudentData = (studentId: string | undefined) => {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError('ไม่พบรหัสนักเรียน');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const studentData = await getStudentDataById(studentId);
        if (studentData) {
          setData(studentData);
        } else {
          setError(`ไม่พบข้อมูลสำหรับรหัสนักเรียน: ${studentId}`);
        }
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  return { data, loading, error };
};
