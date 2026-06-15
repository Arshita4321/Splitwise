import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await getMe();
      setUser(res.data.data.user);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const signIn = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refetchUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);