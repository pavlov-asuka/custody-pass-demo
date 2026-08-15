import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ClipboardList, LogOut, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { maskEmployeeNo } from '../utils/format';

interface AppShellProps {
  children: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  context?: string;
  bare?: boolean;
}
export function AppShell({
  children,
  backLabel,
  onBack,
  context,
  bare = false,
}: AppShellProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function handleLogout() {
    if (!window.confirm('确定退出当前学习账号吗？')) return;
    await signOut();
    navigate('/login', { replace: true });
  }

  if (bare) return <>{children}</>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <button
            className="brand"
            type="button"
            onClick={() => navigate('/worlds')}
            aria-label="返回学习世界"
          >
            <span className="brand__mark"><Sparkles size={20} strokeWidth={3} /></span>
            <span>托管智训营</span>
          </button>
          <div className="topbar__context">
            {backLabel && (
              <button className="text-button" type="button" onClick={onBack}>
                ← {backLabel}
              </button>
            )}
            {context && <span className="topbar__divider" />}
            {context && <span>{context}</span>}
          </div>
          <div className="user-menu" ref={menuRef}>
            <button
              className="user-menu__trigger"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
            >
              <span className="avatar">{user?.displayName?.slice(0, 1) || '学'}</span>
              <ChevronDown size={17} strokeWidth={3} />
            </button>
            {menuOpen && (
              <div className="user-menu__panel">
                <div className="user-menu__identity">
                  <strong>{user?.displayName || '培训学员'}</strong>
                  <span>员工号：{maskEmployeeNo(user?.employeeNo || '')}</span>
                </div>
                <button type="button" onClick={() => navigate('/records')}>
                  <ClipboardList size={19} /> 我的训练记录
                </button>
                <button type="button" className="user-menu__logout" onClick={handleLogout}>
                  <LogOut size={19} /> 退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
