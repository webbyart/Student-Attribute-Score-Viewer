
import React, { useState, useEffect } from 'react';
import { useTeacherAuth } from '../../contexts/TeacherAuthContext';
import { useNavigate } from 'react-router-dom';
import { getSystemSettings, getLineLoginUrl } from '../../services/api';

const TeacherLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useTeacherAuth();
  const navigate = useNavigate();
  const [lineLoginUrl, setLineLoginUrl] = useState('');

  useEffect(() => {
      const initLine = async () => {
          const s = await getSystemSettings();
          if (s['line_login_channel_id']) {
              const redirect = window.location.origin + window.location.pathname + '#/line-callback';
              setLineLoginUrl(getLineLoginUrl(s['line_login_channel_id'], redirect));
          }
      };
      initLine();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
        const t = await login(email.trim(), password.trim());
        if (t) navigate('/teacher/dashboard');
        else setError('ข้อมูลไม่ถูกต้อง');
    } catch (err: any) { setError(err.message); }
  };

  const handleLineLogin = () => {
      if (lineLoginUrl) window.location.href = lineLoginUrl + '&state=teacher';
      else setError('ระบบยังไม่เปิดใช้งาน LINE Login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-yellow-100 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">Admin Login</h1>
        <div className="bg-white/50 backdrop-blur-lg p-8 rounded-3xl shadow-lg">
          <form onSubmit={handleLogin} className="space-y-4">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl" required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 bg-white/70 border border-purple-200 rounded-xl" required />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-purple-600">{loading ? '...' : 'เข้าสู่ระบบ'}</button>
          </form>
          <div className="mt-4">
              <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-300"></div><span className="flex-shrink mx-4 text-slate-400 text-xs">หรือ</span><div className="flex-grow border-t border-slate-300"></div></div>
              <button onClick={handleLineLogin} className="w-full bg-[#06C755] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-[#05b54c] flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.6 1.4 5 3.7 6.6.2.1.3.4.1.7-.2.6-.5 2.1-.5 2.2 0 .2.2.4.4.2.2-.1 2.3-1.4 3.2-1.9.3-.2.6-.2.9-.2.7.1 1.4.2 2.2.2 5.5 0 10-3.8 10-8.5C22 5.8 17.5 2 12 2z" /></svg>
                  Login with LINE
              </button>
          </div>
          <button onClick={() => navigate('/')} className="mt-6 text-sm text-slate-500 hover:text-slate-700">กลับหน้าหลัก</button>
        </div>
      </div>
    </div>
  );
};

export default TeacherLoginPage;
