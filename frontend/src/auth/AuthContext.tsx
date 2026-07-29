import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api, clearCsrf, setUnauthorizedHandler } from '../api/client';
import type { CurrentUser } from '../api/types';

type AuthStatus = 'booting' | 'authed' | 'guest';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /** 标记会话已失效（401 全局钩子触发） */
  sessionExpiredNotice: boolean;
  login: (employeeNo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  dismissExpiredNotice: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  // 全局 401：清空用户态；守卫会带回登录页
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (statusRef.current === 'authed') {
        setSessionExpiredNotice(true);
      }
      clearCsrf();
      setUser(null);
      setStatus('guest');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // 启动：恢复会话
  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setStatus('authed');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setStatus('guest');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (employeeNo: string, password: string) => {
    await api.login(employeeNo, password);
    // 登录成功后以 /api/auth/me 再确认一次服务端会话，确保 Cookie 会话可用
    const confirmed = await api.me();
    setUser(confirmed);
    setSessionExpiredNotice(false);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearCsrf();
      setUser(null);
      setSessionExpiredNotice(false);
      setStatus('guest');
    }
  }, []);

  const dismissExpiredNotice = useCallback(() => setSessionExpiredNotice(false), []);

  const value = useMemo(
    () => ({ status, user, sessionExpiredNotice, login, logout, dismissExpiredNotice }),
    [status, user, sessionExpiredNotice, login, logout, dismissExpiredNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
