import { createContext, useContext, useMemo, useState } from 'react';
import { setAuthCredentials } from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);

  const login = (payload) => {
    const next = {
      username: payload.username,
      password: payload.password,
      customerId: payload.customerId,
      customerName: payload.customerName || payload.username
    };
    setAuth(next);
    setAuthCredentials(next.username, next.password);
  };

  const logout = () => {
    setAuth(null);
    setAuthCredentials(null, null);
  };

  const value = useMemo(() => ({ auth, login, logout }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
