// src/routes/index.tsx
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Lazy loading screen components to ensure fast startup times (<2 seconds)
const LoginScreen = React.lazy(() => import('../ui/screens/LoginScreen'));
const AppLayout = React.lazy(() => import('../ui/layouts/AppLayout'));
const SysAdminLayout = React.lazy(() => import('../ui/layouts/SysAdminLayout'));

// Route guards
interface GuardProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <p style={{ fontWeight: 'bold', color: 'var(--primary)' }}>جاري تحميل الجلسة...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'sysadmin') {
    return <Navigate to="/sysadmin" replace />;
  }

  return <>{children}</>;
};

const SysAdminRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <p style={{ fontWeight: 'bold', color: 'var(--primary)' }}>جاري التحميل...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'sysadmin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    if (user?.role === 'sysadmin') {
      return <Navigate to="/sysadmin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <React.Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
          <p style={{ fontWeight: 'bold', color: 'var(--primary)' }}>جاري تهيئة النظام...</p>
        </div>
      }>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginScreen />
            </PublicRoute>
          } />

          {/* SysAdmin Portal */}
          <Route path="/sysadmin/*" element={
            <SysAdminRoute>
              <SysAdminLayout />
            </SysAdminRoute>
          } />

          {/* Store Client App (Admin / Employee) */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />

          {/* Fallback to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </React.Suspense>
    </HashRouter>
  );
};
