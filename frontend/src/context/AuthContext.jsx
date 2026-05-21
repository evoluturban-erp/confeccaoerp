import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (usuario, senha) => {
    // backend espera campo "login" (não "usuario")
    const { data } = await authService.login({ login: usuario, senha });
    // backend retorna "usuario" (não "user")
    const u = data.usuario ?? data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // ignora erro no logout remoto
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const atualizarUser = useCallback((dadosAtualizados) => {
    const updated = { ...user, ...dadosAtualizados };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const isAuthenticated = Boolean(user);
  const hasPermission = useCallback((role) => {
    if (!user) return false;
    // backend retorna "perfil", não "role"
    if (user.perfil === 'Administrador') return true;
    return user.permissions?.includes(role) ?? false;
  }, [user]);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, atualizarUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
