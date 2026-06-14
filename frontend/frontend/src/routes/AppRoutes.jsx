import { Routes, Route, Navigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import MainLayout from '../layouts/MainLayout'
import Login from '../pages/Auth/Login'
import Register from '../pages/Auth/Register'
import Dashboard from '../pages/Dashboard/Dashboard'
import Groups from '../pages/Groups/Groups'
import GroupDetails from '../pages/Groups/GroupDetails'
import Balances from '../pages/Balances/Balances'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/balances" element={<Balances />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
