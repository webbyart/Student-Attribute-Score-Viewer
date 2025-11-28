
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
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session) {
                // Fetch profile
                 const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (profileError) {
                    // If profile fetch fails but session exists, ignore (might be teacher or partial auth)
                    console.warn("Profile fetch failed:", profileError);
                } else if (profile && profile.role === 'student') {
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
        } catch (error: any) {
            console.error("Auth session check failed (Network or Config Error):", error.message || error);
            // We swallow the error here to allow the app to render the login page instead of crashing
        } finally {
            setLoading(false);
        }
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
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Sign out error:", error);
    }
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
