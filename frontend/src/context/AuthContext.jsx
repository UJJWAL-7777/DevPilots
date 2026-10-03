import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('devpilot_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('devpilot_token'));
  const [loading, setLoading] = useState(true);

  // Verify persistent token on initial load
  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('devpilot_token');
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data.data);
          localStorage.setItem('devpilot_user', JSON.stringify(res.data.data));
        } catch (err) {
          console.error('[Auth Error] Token verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { token: receivedToken, ...userData } = res.data.data;
    
    setToken(receivedToken);
    setUser(userData);
    localStorage.setItem('devpilot_token', receivedToken);
    localStorage.setItem('devpilot_user', JSON.stringify(userData));
    return res.data;
  };

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: receivedToken, ...userData } = res.data.data;

    setToken(receivedToken);
    setUser(userData);
    localStorage.setItem('devpilot_token', receivedToken);
    localStorage.setItem('devpilot_user', JSON.stringify(userData));
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('devpilot_token');
    localStorage.removeItem('devpilot_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        register,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
