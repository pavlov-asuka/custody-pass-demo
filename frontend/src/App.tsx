import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoadingState } from './components/States';
import { AttemptPage } from './pages/AttemptPage';
import { LearningPage } from './pages/LearningPage';
import { LoginPage } from './pages/LoginPage';
import { MapPage } from './pages/MapPage';
import { RecordDetailPage } from './pages/RecordDetailPage';
import { RecordsPage } from './pages/RecordsPage';
import { RemediationPage } from './pages/RemediationPage';
import { WorldsPage } from './pages/WorldsPage';

function ProtectedLayout() {
  const { user, restoring } = useAuth();
  const location = useLocation();

  if (restoring) {
    return (
      <div className="app-restoring">
        <LoadingState label="正在恢复登录状态…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/worlds', element: <WorldsPage /> },
      { path: '/map/accounting', element: <MapPage /> },
      { path: '/learn/:routeId', element: <LearningPage /> },
      { path: '/attempts/:attemptId', element: <AttemptPage /> },
      { path: '/attempts/:attemptId/remediation', element: <RemediationPage /> },
      { path: '/records', element: <RecordsPage /> },
      { path: '/records/:attemptId', element: <RecordDetailPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/worlds" replace /> },
  { path: '*', element: <Navigate to="/worlds" replace /> },
]);
