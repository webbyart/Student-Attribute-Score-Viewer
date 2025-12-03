
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Teacher } from '../types';
import { loginTeacher as apiLoginTeacher } from '../services/api';

interface TeacherAuthContextType {
  teacher: Teacher | null;
  login: (email: string, password: string) => Promise<Teacher | null>;
  logout: () => void;
  loading: boolean;
}

const TeacherAuthContext = createContext<TeacherAuthContextType | undefined>(undefined);

export const TeacherAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teacher, setTeacher] = useState<Teacher | null>(() => {
    try {
      const item = window.sessionStorage.getItem('teacher');
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (teacher) {
      window.sessionStorage.setItem('teacher', JSON.stringify(teacher));
    } else {
      window.sessionStorage.removeItem('teacher');
    }
  }, [teacher]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const loggedInTeacher = await apiLoginTeacher(email, password);
      setTeacher(loggedInTeacher);
      return loggedInTeacher;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setTeacher(null);
  };

  return (
    <TeacherAuthContext.Provider value={{ teacher, login, logout, loading }}>
      {children}
    </TeacherAuthContext.Provider>
  );
};

export const useTeacherAuth = (): TeacherAuthContextType => {
  const context = useContext(TeacherAuthContext);
  if (context === undefined) {
    throw new Error('useTeacherAuth must be used within a TeacherAuthProvider');
  }
  return context;
};
