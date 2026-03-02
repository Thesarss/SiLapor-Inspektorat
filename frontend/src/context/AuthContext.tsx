import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../api/client';
import { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isInspektorat: boolean;
  isOPD: boolean;
  canManageUsers: boolean;
  canReviewReports: boolean;
  canCreateReports: boolean;
  canFillReports: boolean;
  canAccessAnalytics: boolean;
  canImportData: boolean;
  canCreateMatrix: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      setUser(response.data.user);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { identifier, password });
      if (response.data.success && response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response.data.error || 'Login gagal' };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || 'Login gagal' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isInspektorat = user?.role === 'inspektorat';
  const isOPD = user?.role === 'opd';
  const isAdmin = isSuperAdmin; // Only super_admin for user management
  const canManageUsers = isSuperAdmin; // Only super admin can manage users
  const canReviewReports = isSuperAdmin || isInspektorat; // Both can review reports
  const canCreateReports = isInspektorat; // Inspektorat creates reports for OPD
  const canFillReports = isOPD; // OPD fills reports
  const canAccessAnalytics = isInspektorat || isSuperAdmin; // Inspektorat gets all analytics
  const canImportData = isInspektorat || isSuperAdmin; // Inspektorat gets import features
  const canCreateMatrix = isInspektorat || isSuperAdmin; // Inspektorat creates evaluation matrices

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      isAdmin,
      isSuperAdmin,
      isInspektorat,
      isOPD,
      canManageUsers,
      canReviewReports,
      canCreateReports,
      canFillReports,
      canAccessAnalytics,
      canImportData,
      canCreateMatrix
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
