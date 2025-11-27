
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { TeacherAuthProvider, useTeacherAuth } from './contexts/TeacherAuthContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Page Imports
import PublicCalendarPage from './pages/PublicCalendarPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import StudentSearchPage from './pages/student/StudentSearchPage'; // Acting as Login
import StudentRegisterPage from './pages/student/StudentRegisterPage';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import StudentScoresPage from './pages/student/StudentScoresPage'; // Acting as Schedule/Calendar
import StudentSummaryPage from './pages/student/StudentSummaryPage'; // Acting as Categories
import TeacherLoginPage from './pages/teacher/TeacherLoginPage';
import TeacherRegisterPage from './pages/teacher/TeacherRegisterPage';
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import TeacherProfilePage from './pages/teacher/TeacherProfilePage';
import BottomNavBar from './components/layout/BottomNavBar';

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
  if (loading) return <div className="flex justify-center items-center h-screen"><div>Loading...</div></div>;
  return user ? <Outlet /> : <Navigate to="/student/login" />;
}

const TeacherLayout: React.FC = () => {
  const teacherNavItems = [
    { path: '/teacher/dashboard', label: 'จัดการงาน', icon: 'HomeIcon' },
    { path: '/teacher/profile', label: 'โปรไฟล์', icon: 'UserCircleIcon' },
  ];
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-fuchsia-50 via-blue-50 to-yellow-50">
      <main className="pb-28 pt-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <BottomNavBar items={teacherNavItems} />
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
