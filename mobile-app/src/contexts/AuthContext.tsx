import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, deliveryZone: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('user')
      .then((stored) => {
        if (stored) setUser(JSON.parse(stored));
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data;
    await AsyncStorage.multiSet([
      ['token', token],
      ['user', JSON.stringify(userData)],
    ]);
    setUser(userData);
  }

  async function register(email: string, password: string, name: string, deliveryZone: string) {
    const res = await api.post('/auth/register', { email, password, name, role: 'COURIER', deliveryZone });
    const { token, user: userData } = res.data;
    await AsyncStorage.multiSet([
      ['token', token],
      ['user', JSON.stringify(userData)],
    ]);
    setUser(userData);
  }

  async function logout() {
    await AsyncStorage.multiRemove(['token', 'user']);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
