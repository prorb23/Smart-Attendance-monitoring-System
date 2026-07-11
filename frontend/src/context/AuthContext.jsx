import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.getMe()
      .then(res => setUser(res.data))
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = async (username, password) => {
    try {
      const { data } = await authAPI.login({ username, password });
      localStorage.setItem('token', data.token);
      const { data: me } = await authAPI.getMe();
      setUser(me);
      return { success: true, role: data.role };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isStudent: user?.role === 'student',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
