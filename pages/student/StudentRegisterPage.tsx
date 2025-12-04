
import React, { useState, useEffect } from 'react';
import { registerStudent } from '../../services/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const StudentRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
      student_id: '',
      student_name: '',
      email: '',
      grade: 'ม.3',
      classroom: '3',
      password: '',
      lineUserId: '',
      profileImageUrl: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
      const lineId = searchParams.get('lineUserId');
      const profileImage = searchParams.get('profileImage');
      
      if (lineId) {
          setFormData(prev => ({ 
              ...prev, 
              lineUserId: lineId,
              profileImageUrl: profileImage || prev.profileImageUrl
          }));
          setMessage('เชื่อมต่อ LINE ID แล้ว กรุณากรอกข้อมูลส่วนอื่นให้ครบถ้วน');
      }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
        const result = await registerStudent(formData);
        
        if (result.success) {
          setMessage('ลงทะเบียนสำเร็จ! กำลังนำท่านไปยังหน้าเข้าสู่ระบบ...');
          setTimeout(() => navigate('/student/login'), 2000);
        } else {
          setError(result.message);
        }
    } catch (err) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-sky-700 mb-2">ลงทะเบียน (นักเรียน)</h1>
        <p className="text-slate-600 mb-6">สร้างบัญชีเพื่อติดตามภาระงาน</p>
        
        <div className="bg-white/50 backdrop-blur-lg p-6 rounded-3xl shadow-lg">
          <form onSubmit={handleRegister} className="space-y-3">
              <input 
                name="student_id" type="text" placeholder="รหัสนักเรียน" value={formData.student_id} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none" required
              />
              <input 
                name="student_name" type="text" placeholder="ชื่อ-นามสกุล" value={formData.student_name} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none" required
              />
              <input 
                name="email" type="email" placeholder="อีเมลโรงเรียน" value={formData.email} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none" required
              />
              <div className="flex gap-2">
                 <input 
                    name="grade" type="text" placeholder="ชั้น (เช่น ม.3)" value={formData.grade} onChange={handleChange}
                    className="w-1/2 px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none" required
                />
                 <input 
                    name="classroom" type="text" placeholder="ห้อง (เช่น 3)" value={formData.classroom} onChange={handleChange}
                    className="w-1/2 px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none" required
                />
              </div>
              <input 
                name="password" type="password" placeholder="รหัสผ่าน" value={formData.password} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/70 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-400 focus:outline-none" required
              />
               <input 
                name="lineUserId" type="text" placeholder="LINE User ID (ถ้ามี)" value={formData.lineUserId} onChange={handleChange}
                className="w-full px-4 py-3 bg-white/70 border border-green-200 text-green-700 font-mono rounded-xl focus:ring-2 focus:ring-green-400 focus:outline-none"
                readOnly={!!formData.lineUserId}
              />
               <input 
                name="profileImageUrl" type="hidden" value={formData.profileImageUrl}
              />
            
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {message && <p className="text-green-600 text-sm mt-2">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-sky-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-sky-600 disabled:bg-sky-300 transition-all duration-300 transform hover:scale-105"
            >
              {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </button>
          </form>

          <p className="text-sm text-slate-600 mt-6">
            มีบัญชีแล้ว? <Link to="/student/login" className="font-semibold text-sky-600 hover:underline">เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentRegisterPage;
