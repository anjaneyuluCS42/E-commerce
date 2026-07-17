import { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { toast } from '../store/toastStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = () => {
    authService.logout();
    setUser(null);
    setError(null);
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authService.login(email, password);
      const userData = authService.getUser();
      setUser(userData);
      return response;
    } catch (err) {
      const message = typeof err === 'string' ? err : err?.detail || 'Login failed';
      setError(message);
      throw new Error(message, { cause: err });
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await authService.register(username, email, password);
      return response;
    } catch (err) {
      const message = typeof err === 'string' ? err : err?.detail || 'Registration failed';
      setError(message);
      throw new Error(message, { cause: err });
    }
  };

  const loginWithOAuth = async (accessToken) => {
    try {
      setError(null);
      const response = await authService.loginWithOAuth(accessToken);
      const userData = authService.getUser();
      setUser(userData);
      return response;
    } catch (err) {
      const message = typeof err === 'string' ? err : err?.detail || 'Google login verification failed';
      setError(message);
      throw new Error(message, { cause: err });
    }
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedUser = authService.getUser();
    if (storedUser && authService.isLoggedIn()) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  // Sync logout across all browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setUser(null);
        toast.info('Logged out from another tab.');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Idle timeout (auto logout after 15 minutes of inactivity)
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast.warning('Your session has expired due to inactivity.');
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousemove', 'keypress', 'click', 'scroll'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    loginWithOAuth,
    isLoggedIn: !!user && authService.isLoggedIn(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
