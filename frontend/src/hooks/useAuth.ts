import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, type UserProfile } from '../services/auth.service';
import { isApiError, extractApiErrorMessage } from '../pages/home/utils/apiError';

interface UseAuthReturn {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setUser(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (err) {
      if (isApiError(err) && err.response?.status === 401) {
        authService.logout();
        setIsAuthenticated(false);
        setUser(null);
      } else {
        const message = extractApiErrorMessage(err, 'Nie udało się załadować profilu');
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login({ email, password });
      authService.setToken(response.access_token);
      setIsAuthenticated(true);
      await refreshProfile();
    } catch (err) {
      const message = extractApiErrorMessage(err, 'Logowanie nie powiodło się');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshProfile]);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
    navigate('/');
  }, [navigate]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedProfile = await authService.updateProfile(data);
      setUser(updatedProfile);
    } catch (err) {
      const message = extractApiErrorMessage(err, 'Nie udało się zaktualizować profilu');
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    logout,
    refreshProfile,
    updateProfile,
  };
};
