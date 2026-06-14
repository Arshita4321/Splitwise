import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/common/Loader'

export default function AuthLayout() {
  const { user, loading } = useAuth()

  if (loading) return <Loader full label="Loading…" />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="auth-logo">SplitWise</div>
        <h1 className="auth-tagline">Share expenses.<br />Settle up easily.</h1>
        <p className="auth-sub">
          Track group spending, split bills four different ways, and chat about every
          expense in real time.
        </p>
      </div>
      <div className="auth-form-area">
        <Outlet />
      </div>
    </div>
  )
}
