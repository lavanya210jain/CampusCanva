import React, { createContext, useContext, useState, useEffect } from 'react';
import { FullUserProfile, RegistrationInput, User, Student, Alumni, Faculty } from '../types';
import { api, isMockMode } from '../services/api';
import { sessionApi, uploadAvatar } from '../services/liveApi';
import { useToast } from './ToastContext';

interface AuthContextValue {
  currentUser: FullUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  allUsers: User[];
  login: (email: string, passwordHash?: string) => Promise<void>;
  register: (
    userData: RegistrationInput,
    specialized: {
      student?: Omit<Student, 'user_id'>;
      alumni?: Omit<Alumni, 'user_id'>;
      faculty?: Omit<Faculty, 'user_id'>;
    }
  ) => Promise<void>;
  logout: () => void;
  switchUser: (userId: number) => Promise<void>;
  updateProfile: (updates: Partial<User>, avatarFile?: File) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'campuscanva_active_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FullUserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const refreshUsers = async () => {
    try {
      const users = await api.getAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!isMockMode) {
          try {
            const profile = await sessionApi.me();
            setCurrentUser(profile);
            await refreshUsers();
          } catch (error) {
            if ((error as {status?:number}).status !== 401) showToast(error instanceof Error ? error.message : 'API connection failed', 'error');
          }
          return;
        }
        await refreshUsers();
        const storedUserId = localStorage.getItem(AUTH_STORAGE_KEY);
        // Default to user_id: 1 (Kavya Gupta, Student Lead) for immediate seamless demo
        const targetId = storedUserId ? parseInt(storedUserId, 10) : 1;
        const profile = await api.getUserProfile(targetId);
        if (profile) {
          setCurrentUser(profile);
          localStorage.setItem(AUTH_STORAGE_KEY, profile.user_id.toString());
        }
      } catch (e) {
        console.error('Failed to initialize auth:', e);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, passwordHash = 'demo_pass') => {
    setIsLoading(true);
    try {
      const user = await api.login(email, passwordHash);
      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, user.user_id.toString());
      await refreshUsers();
      showToast(`Welcome back, ${user.full_name}!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    userData: RegistrationInput,
    specialized: {
      student?: Omit<Student, 'user_id'>;
      alumni?: Omit<Alumni, 'user_id'>;
      faculty?: Omit<Faculty, 'user_id'>;
    }
  ) => {
    setIsLoading(true);
    try {
      const newUser = await api.register(userData, specialized);
      setCurrentUser(newUser);
      localStorage.setItem(AUTH_STORAGE_KEY, newUser.user_id.toString());
      await refreshUsers();
      showToast(`Account created successfully! Welcome to CampusCanva.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!isMockMode) {
      try { await sessionApi.logout(); } catch (error) { showToast(error instanceof Error ? error.message : 'Logout failed', 'error'); return; }
    }
    setCurrentUser(null);
    setAllUsers([]);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    showToast('Signed out.', 'info');
  };

  const switchUser = async (userId: number) => {
    try {
      const user = isMockMode ? await api.getUserProfile(userId) : await sessionApi.demo(userId);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem(AUTH_STORAGE_KEY, user.user_id.toString());
        await refreshUsers();
        showToast(`Switched active persona to ${user.full_name} (${user.user_type})`, 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not switch user', 'error');
      throw err;
    }
  };

  const updateProfile = async (updates: Partial<User>, avatarFile?: File) => {
    if (!currentUser) return;
    try {
      const updated = avatarFile && !isMockMode ? await uploadAvatar(avatarFile, updates) : await api.updateProfile(currentUser.user_id, updates);
      setCurrentUser(updated);
      await refreshUsers();
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        allUsers,
        login,
        register,
        logout,
        switchUser,
        updateProfile,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
