
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom';
import { TeacherAuthProvider, useTeacherAuth } from './contexts/TeacherAuthContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { syncLineUserProfile } from './services/api';

// Page Imports
import PublicCalendarPage from './pages/PublicCalendarPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import StudentSearchPage from './pages/student/StudentSearchPage'; 
import StudentRegisterPage from './pages/student/StudentRegisterPage';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentScoresPage from './pages/student/StudentScoresPage'; 
import StudentSummaryPage from './pages/student/StudentSummaryPage';
import StudentProfilePage from './pages/student/StudentProfilePage'; // Added
import TeacherLoginPage from './pages/teacher/TeacherLoginPage';
import TeacherRegisterPage from './pages/teacher/TeacherRegisterPage';
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import TeacherProfilePage from './pages/teacher/TeacherProfilePage';
import HomeIcon from './assets/icons/HomeIcon';
import UserCircleIcon from './assets/icons/UserCircleIcon';

const App: React.FC = () => {
  return (
    <TeacherAuthProvider>
      <AuthProvider>
        <HashRouter>
          <div className="bg-slate-100 min-h-screen text-slate-800">
            <AppRoutes />
          </div>
        </HashRouter>
      </AuthProvider>
    </TeacherAuthProvider>
  );
};

const ProtectedTeacherRoute: React.FC = () => {
  const { teacher, loading } = useTeacherAuth();
  if (loading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  return teacher ? <Outlet /> : <Navigate to="/teacher/login" />;
};

const ProtectedStudentRoute: React.FC = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
     if (user) syncLineUserProfile();
  }, [user]);

  if (loading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  return user ? <Outlet /> : <Navigate to="/student/login" />;
}

const TeacherLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-slate-50">
      <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-50 px-4 h-14 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span className="bg-purple-600 text-white p-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </span>
            <span className="font-bold text-slate-700 text-sm">Admin Panel</span>
        </div>
        
        <div className="flex items-center gap-2">
            <NavLink 
                to="/teacher/dashboard" 
                className={({ isActive }) => 
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${isActive ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`
                }
            >
                <HomeIcon className="w-4 h-4" />
                <span>จัดการงาน</span>
            </NavLink>
            <NavLink 
                to="/teacher/profile" 
                className={({ isActive }) => 
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${isActive ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`
                }
            >
                <UserCircleIcon className="w-4 h-4" />
                <span>โปรไฟล์</span>
            </NavLink>
        </div>
      </nav>

      <main className="pb-4">
        <Outlet />
      </main>
    </div>
  );
}

const AppRoutes: React.FC = () => {
  const { teacher } = useTeacherAuth();
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<PublicCalendarPage />} />
      <Route path="/login-select" element={<RoleSelectionPage />} />
      
      {/* Student Flow */}
      <Route path="/student/login" element={!user ? <StudentSearchPage /> : <Navigate to={`/student/${user.student_id}`} />} />
      <Route path="/student/register" element={!user ? <StudentRegisterPage /> : <Navigate to={`/student/${user.student_id}`} />} />
      
      <Route element={<ProtectedStudentRoute />}>
        <Route path="/student/:studentId" element={<StudentLayout />}>
          <Route index element={<StudentDashboardPage />} />
          <Route path="schedule" element={<StudentScoresPage />} />
          <Route path="categories" element={<StudentSummaryPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>
      </Route>

      {/* Teacher Flow */}
      <Route path="/teacher/login" element={!teacher ? <TeacherLoginPage /> : <Navigate to="/teacher/dashboard" />} />
      <Route path="/teacher/register" element={!teacher ? <TeacherRegisterPage /> : <Navigate to="/teacher/dashboard" />} />
      <Route element={<ProtectedTeacherRoute />}>
        <Route element={<TeacherLayout />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/teacher/profile" element={<TeacherProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
