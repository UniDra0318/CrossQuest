import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Flame, BookOpen, Award, GraduationCap } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginView from './components/LoginView';
import ActivateAccount from './views/ActivateAccount';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import AdminDashboard from './views/AdminDashboard';
import StaffDashboard from './views/StaffDashboard';
import TrainerDashboard from './views/TrainerDashboard';
import CompanyDashboard from './views/CompanyDashboard';
import TraineeDashboard from './views/TraineeDashboard';
import LandingView from './views/LandingView';
import CryptoSandboxLab from './views/CryptoSandboxLab';
import InstallPwaModal from './components/InstallPwaModal';
// B2: LiveQuizPopUpModal unmounted per Chapter 1 scope (future work, zero localStorage quiz sync)
import ErrorBoundary from './components/ErrorBoundary';
import { ROUTES, ROLE_HOME } from './routes/routeConfig';
import './App.css';
import './styles/darkmode.css';

/**
 * Role-aware route guard ensuring UX consistency and immediate canonical redirection.
 */
export function RoleGuard({ roles, children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!roles.includes(currentUser.role)) {
    return <Navigate to={ROLE_HOME[currentUser.role] || '/login'} replace />;
  }
  return children;
}

function MainAppShell({ page }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Trainee streak lifted here so Topbar can display live value
  const [liveStreakDays, setLiveStreakDays] = useState(() => 
    currentUser?.role === 'trainee' ? (currentUser?.streak ?? 7) : 7
  );

  // Collapsible sidebar state persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('cq_sidebar_collapsed');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cq_sidebar_collapsed', String(next));
      } catch {
        /* ignore localStorage quota/disabled errors */
      }
      return next;
    });
  };

  // Distraction-free quiz takeover state: removes sidebar and topbar when taking a quiz
  const [isQuizActive, setIsQuizActive] = useState(false);

  useEffect(() => {
    const handleQuizState = (e) => {
      if (typeof e.detail?.active === 'boolean') {
        setIsQuizActive(e.detail.active);
      }
    };
    window.addEventListener('cq_quiz_active_state', handleQuizState);
    return () => window.removeEventListener('cq_quiz_active_state', handleQuizState);
  }, []);

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const targetTag = e.target?.tagName?.toLowerCase();
        if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) {
          return;
        }
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Instantly synchronize topbar streak when role switcher changes active persona
  useEffect(() => {
    if (currentUser?.role === 'trainee') {
      setLiveStreakDays(currentUser?.streak ?? 1);
    }
  }, [currentUser]);

  const handleNavChange = (targetPage) => {
    const targetRoute = ROUTES.find(r => r.page === targetPage && r.roles.includes(currentUser?.role));
    if (targetRoute) {
      navigate(targetRoute.path);
    }
  };

  const matchedRoute = ROUTES.find(r => r.page === page && r.roles.includes(currentUser?.role));
  const activeTitle = matchedRoute?.title || matchedRoute?.label || (page === 'crypto_lab' ? 'Cryptographic Sandbox Lab' : 'CrossQuest');

  useEffect(() => {
    document.title = `${activeTitle} | CrossQuest`;
  }, [activeTitle]);

  return (
    <div className={`enterprise-layout ${isQuizActive ? 'quiz-mode-active' : ''}`}>
      {/* Persistent Navigation Sidebar with Collapse & Profile Support */}
      {!isQuizActive && (
        <Sidebar 
          activeView={page} 
          setActiveView={handleNavChange} 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      )}

      {/* Main Content Viewport */}
      <div className={`enterprise-viewport ${isQuizActive ? 'viewport-quiz-active' : ''}`}>
        {!isQuizActive && (
          <Topbar 
            streakDays={liveStreakDays} 
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />
        )}

        <main className={`enterprise-page-area ${isQuizActive ? 'page-area-quiz-active' : ''}`}>
          <ErrorBoundary>
            {page === 'crypto_lab' ? (
              <CryptoSandboxLab />
            ) : (
              <>
                {currentUser?.role === 'admin' && (
                  <AdminDashboard activeSubView={page} setActiveView={handleNavChange} />
                )}

                {currentUser?.role === 'account_manager' && (
                  <StaffDashboard activeSubView={page} setActiveView={handleNavChange} />
                )}

                {currentUser?.role === 'trainer' && (
                  <TrainerDashboard activeSubView={page} setActiveView={handleNavChange} />
                )}

                {(currentUser?.role === 'finance' || currentUser?.role === 'company_staff') && (
                  <CompanyDashboard activeSubView={page} setActiveView={handleNavChange} />
                )}

                {currentUser?.role === 'trainee' && (
                  <TraineeDashboard 
                    activeSubView={page} 
                    setActiveView={handleNavChange} 
                    onStreakLoad={setLiveStreakDays}
                    onQuizActiveChange={setIsQuizActive} 
                  />
                )}
              </>
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Trainee Mobile Bottom Navigation Bar (< 768px) */}
      {!isQuizActive && currentUser?.role === 'trainee' && (
        <nav className="trainee-mobile-bottom-nav" aria-label="Trainee Mobile Navigation">
          <button
            type="button"
            className={`trainee-bottom-nav-item ${page === 'trainee_quest' ? 'active' : ''}`}
            onClick={() => navigate('/home')}
          >
            <Flame size={20} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`trainee-bottom-nav-item ${page === 'trainee_trainings' ? 'active' : ''}`}
            onClick={() => navigate('/home/trainings')}
          >
            <BookOpen size={20} />
            <span>My Trainings</span>
          </button>
          <button
            type="button"
            className={`trainee-bottom-nav-item ${page === 'trainee_certs' ? 'active' : ''}`}
            onClick={() => navigate('/home/certificates')}
          >
            <Award size={20} />
            <span>Credentials</span>
          </button>
          <button
            type="button"
            className={`trainee-bottom-nav-item ${page === 'trainee_quiz' ? 'active' : ''}`}
            onClick={() => navigate('/home/quizzes')}
          >
            <GraduationCap size={20} />
            <span>Quizzes</span>
          </button>
        </nav>
      )}

      {/* B2: LiveQuizPopUpModal unmounted to prevent unauthorized background localStorage quiz sync */}
      <InstallPwaModal />
    </div>
  );
}

// Top level App with Routes
function AppRoutes() {
  const { currentUser } = useAuth();
  const currentRole = currentUser?.role || 'trainee';
  const roleHome = ROLE_HOME[currentRole] || '/home';

  return (
    <Routes>
      {/* Public Unauthenticated Routes */}
      <Route path="/" element={<LandingView />} />
      <Route path="/landing" element={<LandingView />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/activate" element={<ActivateAccount />} />

      {/* Single Route Table generation with RoleGuard */}
      {ROUTES.map((route) => {
        return (
          <Route 
            key={route.path}
            path={route.path}
            element={
              <RoleGuard roles={route.roles}>
                <MainAppShell page={route.page} />
              </RoleGuard>
            }
          />
        );
      })}

      {/* Canonical Role Home Redirection */}
      <Route 
        path="/dashboard" 
        element={
          currentUser ? <Navigate to={roleHome} replace /> : <Navigate to="/login" replace />} 
      />

      {/* Legacy and Convenience Path Redirects */}
      <Route path="/staff" element={<Navigate to="/am" replace />} />
      <Route path="/staff/portfolios" element={<Navigate to="/am/clients" replace />} />
      <Route path="/staff/reports" element={<Navigate to="/am/reports" replace />} />
      <Route path="/admin/access" element={<Navigate to="/admin/people" replace />} />
      <Route path="/admin/vault" element={<Navigate to="/admin/records" replace />} />
      <Route path="/admin/anomalies" element={<Navigate to="/admin/alerts" replace />} />
      <Route path="/trainer/roster" element={<Navigate to="/trainer" replace />} />
      <Route path="/trainer/sessions" element={<Navigate to="/trainer" replace />} />
      <Route path="/trainer/grade" element={<Navigate to="/trainer" replace />} />
      <Route path="/trainer/quiz" element={<Navigate to="/trainer/quizzes" replace />} />
      <Route path="/trainer/analytics" element={<Navigate to="/trainer/results" replace />} />
      <Route path="/finance/reconciliation" element={<Navigate to="/finance/import" replace />} />
      <Route path="/trainings" element={<Navigate to="/home/trainings" replace />} />
      <Route path="/courses" element={<Navigate to="/home" replace />} />
      <Route 
        path="/quizzes" 
        element={
          currentRole === 'trainer'
            ? <Navigate to="/trainer/quizzes" replace />
            : <Navigate to="/home/quizzes" replace />
        } 
      />
      <Route 
        path="/quiz" 
        element={
          currentRole === 'trainer'
            ? <Navigate to="/trainer/quizzes" replace />
            : <Navigate to="/home/quizzes" replace />
        } 
      />
      <Route path="/badges" element={<Navigate to="/home/badges" replace />} />
      <Route path="/certifications" element={<Navigate to="/home/certificates" replace />} />
      <Route path="/certificates" element={<Navigate to="/home/certificates" replace />} />
      <Route 
        path="/records" 
        element={
          currentRole === 'admin' 
            ? <Navigate to="/admin/records" replace /> 
            : (currentRole === 'finance' || currentRole === 'company_staff') 
              ? <Navigate to="/finance" replace /> 
              : <Navigate to="/am" replace />
        } 
      />
      <Route 
        path="/trainees" 
        element={
          currentRole === 'trainer' 
            ? <Navigate to="/trainer" replace /> 
            : (currentRole === 'finance' || currentRole === 'company_staff') 
              ? <Navigate to="/finance" replace /> 
              : <Navigate to="/am" replace />
        } 
      />
      <Route path="/anomalies" element={<Navigate to="/admin/alerts" replace />} />
      <Route 
        path="/compliance" 
        element={
          (currentRole === 'finance' || currentRole === 'company_staff') 
            ? <Navigate to="/finance/reports" replace /> 
            : <Navigate to="/am/reports" replace />
        } 
      />
      <Route path="/analytics" element={<Navigate to="/trainer/results" replace />} />
      <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
      <Route path="/crypto-lab" element={<Navigate to="/demo/crypto-lab" replace />} />

      {/* Fallback Catch-all */}
      <Route 
        path="*" 
        element={
          currentUser ? <Navigate to={roleHome} replace /> : <Navigate to="/" replace />
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
