import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Toast from '../ui/Toast.jsx';
import { useToast } from '../../hooks/useToast.js';

export default function AppLayout() {
  const [title, setTitle] = useState('');
  const { toasts, dismiss } = useToast();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar title={title} />
        <main style={{ flex: 1, padding: '28px', width: '100%', maxWidth: '1080px', margin: '0 auto' }}>
          <Outlet context={{ setTitle }} />
        </main>
      </div>

      <Toast toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
