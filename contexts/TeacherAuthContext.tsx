
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Teacher } from '../types';
import { loginTeacher as apiLoginTeacher } from '../services/api';
import { supabase } from '../lib/supabaseClient';

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
  const [loading, setLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const validateSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && teacher) {
            // Session expired but state exists -> Clear state
            setTeacher(null);
            window.sessionStorage.removeItem('teacher');
        } else if (session && !teacher) {
            // Session exists but state missing -> Try to restore (optional, basic restore)
             const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
             if (profile && profile.role === 'teacher') {
                 const restoredTeacher = { teacher_id: profile.id, name: profile.full_name, email: profile.email };
                 setTeacher(restoredTeacher);
             }
        }
        setLoading(false);
    };
    validateSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            setTeacher(null);
            window.sessionStorage.removeItem('teacher');
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

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
      throw error; // Re-throw to let the page handle the specific error message
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
