import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, Map as MapIcon, MessagesSquare, ScrollText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Mascot } from './Mascot';
import './app-shell.css';

const NAV_ITEMS = [
  { to: '/', label: '学习地图', icon: MapIcon, end: true },
  { to: '/records', label: '训练记录', icon: ScrollText, end: false },
  { to: '/knowledge', label: '知识问答', icon: MessagesSquare, end: false },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" aria-label="托管智训营首页">
            <span className="brand-mark">
              <GraduationCap size={19} strokeWidth={2.1} />
            </span>
            <span className="brand-name">托管智训营</span>
            <span className="brand-sub">训练营</span>
          </NavLink>

          <nav className="topnav" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}
              >
                <item.icon size={15.5} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-right" ref={menuRef}>
            <button
              type="button"
              className="user-chip"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="user-avatar" aria-hidden="true">
                {user?.displayName?.slice(0, 1) ?? '·'}
              </span>
              <span className="user-name">{user?.displayName}</span>
            </button>
            {menuOpen && (
              <div className="user-menu" role="menu">
                <div className="user-menu-head">
                  <p className="user-menu-name">{user?.displayName}</p>
                  <p className="user-menu-no num">员工号 {user?.employeeNo}</p>
                </div>
                <button
                  type="button"
                  className="user-menu-item"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  role="menuitem"
                >
                  <LogOut size={15} />
                  {loggingOut ? '正在退出…' : '退出登录'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      {/* 小托全局停靠：问答页与作答页之外提供轻量入口 */}
      {location.pathname !== '/knowledge' && !location.pathname.startsWith('/cases/') && (
        <button
          type="button"
          className="mascot-dock"
          onClick={() => navigate('/knowledge')}
          aria-label="向小托提问"
        >
          <span className="mascot-dock-bubble">有疑问问小托</span>
          <Mascot size={62} mood="idle" />
        </button>
      )}
    </div>
  );
}
