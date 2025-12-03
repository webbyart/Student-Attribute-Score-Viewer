
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Role } from '../types';
import { loginStudent } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (id: string, email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
      const stored = sessionStorage.getItem('studentUser');
      return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
        sessionStorage.setItem('studentUser', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('studentUser');
    }
  }, [user]);

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
        throw error;
    }
    setLoading(false);
    return false;
  };

  const logout = async () => {
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
