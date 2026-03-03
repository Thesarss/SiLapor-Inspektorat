import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { BrandingProvider } from './components/branding/BrandingProvider';
import NotificationInitializer from './components/NotificationInitializer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { MatrixPage } from './pages/MatrixPage';
import { MatrixWorkPage } from './pages/MatrixWorkPage';
import { MatrixProgressPage } from './pages/MatrixProgressPage';
import { MatrixReviewPage } from './pages/MatrixReviewPage';
import { CreateReportPage } from './pages/CreateReportPage';
import { EvidencePage } from './pages/EvidencePage';
import { PerformancePage } from './pages/PerformancePage';
import { ReviewHistoryPage } from './pages/ReviewHistoryPage';

// Lazy load heavy pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then(module => ({ default: module.ApprovalsPage })));
const MyReportsPage = lazy(() => import('./pages/MyReportsPage').then(module => ({ default: module.MyReportsPage })));
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage').then(module => ({ default: module.ReportDetailPage })));
const MetricsPage = lazy(() => import('./pages/MetricsPage').then(module => ({ default: module.MetricsPage })));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage').then(module => ({ default: module.UserManagementPage })));

// Loading component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '16px',
    color: '#666'
  }}>
    <div>Loading...</div>
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/approvals" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ApprovalsPage />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/review-history" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <ReviewHistoryPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/my-reports" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <MyReportsPage />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/create-report" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <CreateReportPage />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports/:id" element={
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <ReportDetailPage />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports/:reportId/metrics" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <MetricsPage />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <UserManagementPage />
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/matrix" element={
        <ProtectedRoute>
          <Layout>
            <MatrixPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/matrix/progress/:id" element={
        <ProtectedRoute>
          <Layout>
            <MatrixProgressPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/matrix/detail/:id" element={
        <ProtectedRoute>
          <Layout>
            <MatrixProgressPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/matrix/review/:assignmentId" element={
        <ProtectedRoute>
          <Layout>
            <MatrixReviewPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/matrix/work/:assignmentId" element={
        <ProtectedRoute>
          <Layout>
            <MatrixWorkPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/evidence" element={
        <ProtectedRoute>
          <Layout>
            <EvidencePage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/performance" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <PerformancePage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/create-report" element={
        <ProtectedRoute>
          <Layout>
            <CreateReportPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <NotificationProvider>
          <NotificationInitializer />
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}

export default App;
