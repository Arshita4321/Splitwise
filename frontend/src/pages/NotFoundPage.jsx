import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
      textAlign: 'center', padding: '24px',
    }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: 800, color: 'var(--accent)' }}>
        404
      </h1>
      <p style={{ fontSize: '16px', fontWeight: 600 }}>This page doesn't exist</p>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', maxWidth: '320px' }}>
        The page you're looking for may have been moved or never existed.
      </p>
      <Link to="/">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
