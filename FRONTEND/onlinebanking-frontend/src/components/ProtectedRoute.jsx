import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contextapi/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    if (allowedRoles.includes('ADMIN')) {
      return <Navigate to="/adminlogin" replace />;
    } else if (allowedRoles.includes('STAFF')) {
      return <Navigate to="/stafflogin" replace />;
    }
    return <Navigate to="/customerlogin" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If user is logged in with wrong role, send them to their own home
    if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'STAFF') return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/customer/profile" replace />;
  }

  return <Outlet />;
}
