// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'; // Добавлен useCallback
import { useRouter } from 'next/router';
import apiClient from '../services/apiClient';
import { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { username?: string; password?: string }) => Promise<void>;
  register: (userData: Omit<User, 'id' | 'role'> & { password?: string, role?: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
  fetchCurrentUser: () => Promise<void>; // Тип остается прежним
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const attemptLoadSession = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        setToken(storedToken);
        // apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`; // Интерцептор apiClient сделает это
        try {
          const response = await apiClient.get<{ logged_in_as: User }>('/protected');
          setUser(response.data.logged_in_as);
        } catch (error) {
          console.warn("Failed to fetch current user on initial load, token might be invalid.", error);
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
          delete apiClient.defaults.headers.common['Authorization'];
        }
      }
      setIsLoading(false); 
    };

    attemptLoadSession();
  }, []); 

  // ИЗМЕНЕНО: Оборачиваем fetchCurrentUser в useCallback
  const fetchCurrentUser = useCallback(async () => {
    console.log("AuthContext: fetchCurrentUser called. Current token state:", token);
    const currentToken = token || localStorage.getItem('authToken'); 
    if (currentToken) {
      // apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`; // Интерцептор apiClient сделает это
      try {
        const response = await apiClient.get<{ logged_in_as: User }>('/protected');
        console.log("AuthContext: fetchCurrentUser successful, user data:", response.data.logged_in_as);
        setUser(response.data.logged_in_as);
        if (!token && currentToken) { // Если токен был только в localStorage, сохраняем в стейт
            console.log("AuthContext: Setting token from localStorage to state");
            setToken(currentToken);
        }
      } catch (error) {
        console.error("AuthContext: Failed to fetch/refresh current user in fetchCurrentUser", error);
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
        delete apiClient.defaults.headers.common['Authorization'];
        // Не делаем здесь router.push('/login'), так как это может быть вызвано из ProtectedRoute,
        // который уже управляет редиректом.
      }
    } else {
      console.log("AuthContext: fetchCurrentUser - no token, setting user to null.");
      setUser(null); // Убедимся, что пользователь сброшен, если нет токена
      setToken(null); // И токен тоже
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]); // Зависимость от 'token' (стейт-переменной) важна.

  const login = async (credentials: { username?: string; password?: string }) => {
    try {
      const response = await apiClient.post<AuthResponse>('/login', credentials);
      const { access_token, ...userData } = response.data;
      localStorage.setItem('authToken', access_token);
      setToken(access_token); // Это вызовет обновление token и потенциальный перезапуск fetchCurrentUser, если он используется где-то еще в зависимостях
      setUser(userData as User);
      // apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`; // Интерцептор apiClient сделает это
      
      const redirectPath = (router.query.redirect as string) || '/';
      console.log(`AuthContext: Login successful, redirecting to: ${redirectPath}`);
      if (router.asPath !== redirectPath) { // Предотвращаем навигацию на тот же URL
          router.push(redirectPath);
      } else {
          console.warn(`AuthContext: Attempted to redirect to the same path after login: ${redirectPath}`);
          // Если мы уже на целевой странице, возможно, просто нужно обновить данные (что setUser и setToken уже делают)
          // или принудительно перезагрузить, если это необходимо: router.reload(); (но это крайняя мера)
      }

    } catch (error) {
      console.error("AuthContext: Login failed:", error);
      throw error; 
    }
  };

  const register = async (userData: Omit<User, 'id' | 'role'> & { password?: string, role?: string }) => {
    setIsLoading(true); // Можно оставить для индикации процесса регистрации
    try {
      await apiClient.post<User>('/register', userData);
      router.push('/login?registered=true'); 
    } catch (error) {
      console.error("AuthContext: Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
    if (router.pathname !== '/login') { // Предотвращаем навигацию на тот же URL
        router.push('/login');
    }
  };

  const isAuthenticated = useCallback(() : boolean => {
    // isAuthenticated теперь также мемоизирована, хотя это менее критично, чем fetchCurrentUser
    // Зависит от token и user, которые являются стейт-переменными.
    return !!token && !!user;
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, isAuthenticated, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};