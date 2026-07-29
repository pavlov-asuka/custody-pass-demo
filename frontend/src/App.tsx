import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { PageLoading } from './components/States';
import { ToastProvider } from './components/Toast';
import { CasePage } from './pages/CasePage';
import { KnowledgePage } from './pages/KnowledgePage';
import { LoginPage } from './pages/LoginPage';
import { MapPage } from './pages/MapPage';
import { RecordResultPage } from './pages/RecordResultPage';
import { RecordsPage } from './pages/RecordsPage';

function FullScreenBoot() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageLoading text="正在恢复登录状态…" />
    </div>
  );
}

function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'booting') return <FullScreenBoot />;
  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

function GuestOnly() {
  const { status } = useAuth();
  if (status === 'booting') return <FullScreenBoot />;
  if (status === 'authed') return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<MapPage />} />
              <Route path="cases/:caseId" element={<CasePage />} />
              <Route path="records" element={<RecordsPage />} />
              <Route path="records/:recordId" element={<RecordResultPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
