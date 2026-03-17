import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  users: (User & { password?: string })[];
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  loginWithUsername: (username: string, pass: string) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<boolean>;
  registerWithUsername: (username: string, pass: string, name: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: User & { password?: string }) => void;
  removeUser: (uid: string) => void;
  resetPassword: (uid: string, newPass: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Varsayılan Admin
const DEFAULT_ADMIN: User & { password?: string } = {
  uid: 'admin-1',
  name: 'Sistem Yöneticisi',
  email: 'admin@akinrobotics.com',
  role: 'ADMIN',
  username: 'admin',
  password: 'password'
};

// Senin kullanıcıların
const INITIAL_USERS: (User & { password?: string })[] = [
  DEFAULT_ADMIN,
  { uid: 'u-hakan', name: 'Hakan', email: 'hakan@akinrobotics.com', role: 'ADMIN', username: 'hakan', password: '5265Hakan' },
  { uid: 'u-erdal', name: 'Erdal', email: 'erdal@akinrobotics.com', role: 'LAWYER', username: 'erdal', password: '12345' },
  { uid: 'u-arifegul', name: 'Arifegül', email: 'arifegul@akinrobotics.com', role: 'LAWYER', username: 'arifegul', password: '12345' },
  { uid: 'u-fahri', name: 'Fahri', email: 'fahri@akinrobotics.com', role: 'LAWYER', username: 'fahri', password: '12345' },
  { uid: 'u-sevval', name: 'Şevval', email: 'sevval@akinrobotics.com', role: 'LAWYER', username: 'sevval', password: '12345' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<(User & { password?: string })[]>(INITIAL_USERS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // LocalStorage'dan kullanıcıları yükle
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem('lexguard_users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        // Varsayılan kullanıcıları koru, yeni kullanıcıları ekle
        const mergedUsers = [...INITIAL_USERS];
        parsedUsers.forEach((savedUser: User & { password?: string }) => {
          if (!mergedUsers.find(u => u.uid === savedUser.uid)) {
            mergedUsers.push(savedUser);
          }
        });
        setUsers(mergedUsers);
      }
    } catch (e) {
      console.error('Kullanıcılar yüklenemedi:', e);
    }
    setIsAuthReady(true);
  }, []);

  // Kullanıcıları localStorage'a kaydet
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('lexguard_users', JSON.stringify(users));
    }
  }, [users]);

  const login = async () => {
    console.warn("Google login devre dışı");
    return false;
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const username = email.split('@')[0];
    return loginWithUsername(username, pass);
  };

  const loginWithUsername = async (username: string, pass: string) => {
    try {
      // Kullanıcı bul
      const foundUser = users.find(u => u.username === username && u.password === pass);
      
      if (foundUser) {
        // Şifreyi user objesinden çıkar
        const { password, ...safeUser } = foundUser;
        setUser(safeUser);
        setIsAuthenticated(true);
        localStorage.setItem('lexguard_session', JSON.stringify(safeUser));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const username = email.split('@')[0];
    return registerWithUsername(username, pass, name);
  };

  const registerWithUsername = async (username: string, pass: string, name: string) => {
    try {
      // Kullanıcı adı zaten var mı?
      if (users.find(u => u.username === username)) {
        throw new Error('Bu kullanıcı adı zaten kullanılıyor');
      }

      // Yeni kullanıcı oluştur
      const newUser: User & { password?: string } = {
        uid: `u-${Date.now()}`,
        name,
        email: `${username}@akinrobotics.com`,
        role: 'LAWYER',
        username,
        password: pass
      };

      // Kullanıcıları güncelle
      setUsers(prev => [...prev, newUser]);
      
      return true;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('lexguard_session');
  };

  const addUser = (newUser: User & { password?: string }) => {
    setUsers(prev => [...prev, newUser]);
  };

  const removeUser = (uid: string) => {
    setUsers(prev => prev.filter(u => u.uid !== uid));
  };

  const resetPassword = (uid: string, newPass: string) => {
    setUsers(prev => prev.map(u => 
      u.uid === uid ? { ...u, password: newPass } : u
    ));
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
      resetPassword
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
