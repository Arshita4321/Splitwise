import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import GroupDetailPage from './pages/GroupDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/"              element={<DashboardPage />} />
            <Route path="/groups"        element={<GroupsPage />} />
            <Route path="/groups/:id"    element={<GroupDetailPage />} />
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*"    element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  );
}