import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/api';
import { LogoutApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 로그인 상태 체크
  const fetchMe = async () => {
    try {
      const res = await api.get('/me');
      const me = res.data?.result ?? null;
      setUser(me);
      // console.log("fetchMe:", me); // 디버깅용
    } catch (err) {
      console.error('fetchMe error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      await LogoutApi();
    } catch {
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const value = {
    user,
    loading,
    isLoggedIn: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    fetchMe,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth는 AuthProvider 내부에서만 사용 가능합니다.');
  return context;
};
