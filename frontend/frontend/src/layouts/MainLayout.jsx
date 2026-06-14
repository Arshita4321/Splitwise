import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/common/Loader'
import { initials, colorFromString } from '../utils/helpers'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/groups', label: 'Groups' },
  { to: '/balances', label: 'Balances' },
]

export default function MainLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) return <Loader full label="Loading…" />
  if (!user) return <Navigate to="/login" replace />

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">SplitWise</div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div
            className="user-avatar"
            style={{ background: colorFromString(user.name) }}
            aria-hidden="true"
          >
            {initials(user.name)}
          </div>
          <div className="user-meta">
            <span className="user-name">{user.name}</span>
            <button className="link-btn" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
