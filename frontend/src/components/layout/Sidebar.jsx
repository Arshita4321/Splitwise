import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Avatar from '../ui/Avatar.jsx';

const navItems = [
  { to: '/',       label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/groups', label: 'Groups',    icon: Users },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: 'var(--radius-md)',
    fontSize: '14px', fontWeight: 500,
    color: isActive ? 'var(--text-1)' : 'var(--text-2)',
    background: isActive ? 'var(--accent-dim)' : 'transparent',
    transition: 'background var(--transition), color var(--transition)',
  });

  return (
    <aside style={{
      width: '232px', flexShrink: 0, height: '100vh',
      borderRight: '1px solid var(--border)', background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', padding: '20px 14px',
      position: 'sticky', top: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '6px 10px 28px 10px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: 'var(--accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '15px', color: '#fff',
        }}>
          S
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px' }}>
          Splitwise
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} style={linkStyle}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px', borderTop: '1px solid var(--border)', marginTop: '8px',
      }}>
        <Avatar name={user?.name} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          title="Log out"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
            color: 'var(--text-2)', transition: 'background var(--transition), color var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
