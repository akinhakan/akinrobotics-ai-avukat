import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: () => Promise<void>; // Not used anymore but kept for compatibility
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithUsername: (username: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  registerWithUsername: (username: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  addUser: (user: any) => Promise<void>;
  removeUser: (uid: string) => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth State Listener (Check token on mount)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('auth_token');
          }
        } catch (err) {
          console.error("Auth check error:", err);
        }
      }
      setIsAuthReady(true);
    };
    checkAuth();
  }, []);

  // Fetch all users for Admin
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      const fetchUsers = async () => {
        try {
          const response = await fetch('/api/users');
          if (response.ok) {
            const data = await response.json();
            setUsers(data);
          }
        } catch (err) {
          console.error("Fetch users error:", err);
        }
      };
      fetchUsers();
      // In a real app, you might want to poll or use WebSockets here
      const interval = setInterval(fetchUsers, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async () => {
    // Google login removed as requested (Firebase removed)
    console.warn("Google login is disabled (Firebase removed)");
  };

  const loginWithEmail = async (email: string, pass: string) => {
    // For this custom implementation, we treat email as username if it matches the pattern
    const username = email.split('@')[0];
    return loginWithUsername(username, pass);
  };

  const loginWithUsername = async (username: string, pass: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });

    if (response.ok) {
      const { token, user: userData } = await response.json();
      localStorage.setItem('auth_token', token);
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      const err = await response.json();
      throw new Error(err.error || 'Giriş başarısız');
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const username = email.split('@')[0];
    return registerWithUsername(username, pass, name);
  };

  const registerWithUsername = async (username: string, pass: string, name: string) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass, name }) // Server will default to PENDING
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Kayıt başarısız');
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const addUser = async (newUser: any) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: newUser.username, 
        password: newUser.password,
        name: newUser.name,
        role: newUser.role
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Kullanıcı eklenemedi');
    }
  };

  const removeUser = async (uid: string) => {
    const response = await fetch(`/api/users/${uid}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Kullanıcı silinemedi');
  };
  
  const updateUserRole = async (uid: string, role: UserRole) => {
    const response = await fetch(`/api/users/${uid}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Rol güncellenemedi');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users, 
      isAuthenticated, 
      isAuthReady,
      login, 
      loginWithEmail,
      loginWithUsername,
      registerWithEmail,
      registerWithUsername,
      logout, 
      addUser, 
      removeUser, 
      updateUserRole 
    }}>
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
