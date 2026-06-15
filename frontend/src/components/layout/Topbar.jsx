import React from 'react';
import { useLocation, useMatch } from 'react-router-dom';
import InviteBanner from '../groups/InviteBanner.jsx';

function getTitle(pathname, isGroupDetail) {
  if (pathname === '/') return 'Dashboard';
  if (pathname === '/groups') return 'Groups';
  if (isGroupDetail) return 'Group';
  return '';
}

export default function Topbar({ title }) {
  const location = useLocation();
  const isGroupDetail = useMatch('/groups/:id');
  const heading = title || getTitle(location.pathname, isGroupDetail);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 28px', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
    }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>
        {heading}
      </h1>
      <InviteBanner />
    </header>
  );
}
