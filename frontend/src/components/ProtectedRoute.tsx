import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly }: Props) {
  const { user, loading, isSuperAdmin, isInspektorat } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // adminOnly allows both super_admin and inspektorat
  if (adminOnly && !isSuperAdmin && !isInspektorat) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
