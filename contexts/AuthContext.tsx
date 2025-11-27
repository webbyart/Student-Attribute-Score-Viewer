
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Role } from '../types';
import { loginStudent } from '../services/api';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  login: (id: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check for existing session
  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Fetch profile
             const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profile && profile.role === 'student') {
                setUser({
                    id: profile.id,
                    student_id: profile.student_id,
                    name: profile.full_name,
                    email: profile.email,
                    profileImageUrl: profile.avatar_url,
                    class: `ชั้น ${profile.grade}/${profile.classroom}`,
                    role: Role.STUDENT,
                });
            }
        }
        setLoading(false);
    };
    checkUser();
  }, []);

  const login = async (id: string, email: string, password?: string) => {
    setLoading(true);
    try {
        const student = await loginStudent(id, email, password);
        if (student) {
            const loggedInUser: User = {
                id: student.id,
                student_id: student.student_id,
                name: student.student_name,
                email: student.email,
                profileImageUrl: student.profileImageUrl,
                class: `ชั้น ${student.grade}/${student.classroom}`,
                role: Role.STUDENT,
            };
            setUser(loggedInUser);
            setLoading(false);
            return true;
        }
    } catch (error) {
        setLoading(false);
        throw error; // Re-throw to allow component to handle specific error message
    }
    setLoading(false);
    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
