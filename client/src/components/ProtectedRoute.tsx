import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: UserRole;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, role, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Check single role restriction
  if (role && user.role !== role) return <Navigate to="/login" replace />;

  // Check multi-role restriction
  if (roles && roles.length > 0 && !roles.includes(user.role)) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
