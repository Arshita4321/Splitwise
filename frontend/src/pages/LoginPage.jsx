import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';

export default function LoginPage() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const update = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res = await login(form);
      const { user, token } = res.data.data;
      signIn(token, user);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'var(--accent)', marginBottom: '16px',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#fff',
          }}>
            S
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
            Sign in to keep splitting expenses with your crew
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '24px',
        }}>
          {errors.form && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--red-dim)', color: 'var(--red)', fontSize: '13px',
            }}>
              {errors.form}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={update('password')}
            required
            autoComplete="current-password"
          />

          <Button type="submit" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-2)', marginTop: '20px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
