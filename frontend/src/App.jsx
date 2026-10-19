import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AdminDashboard from './views/AdminDashboard';
import StaffDashboard from './views/StaffDashboard';
import TrainerDashboard from './views/TrainerDashboard';
import CompanyDashboard from './views/CompanyDashboard';
import TraineeDashboard from './views/TraineeDashboard';
import InstallPwaModal from './components/InstallPwaModal';
import './App.css';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function MainAppShell({ activeSubPage }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState(() => {
    if (activeSubPage === 'quizzes') return currentUser?.role === 'trainer' ? 'quiz_creator' : 'trainee_quiz';
    if (activeSubPage === 'badges') return 'trainee_badges';
    if (activeSubPage === 'certifications') return 'trainee_certs';
    if (activeSubPage === 'records') return currentUser?.role === 'admin' ? 'records_vault' : 'staff_records';
    if (activeSubPage === 'trainees') return currentUser?.role === 'trainer' ? 'trainee_roster' : 'company_trainees';
    if (activeSubPage === 'courses') return currentUser?.role === 'trainer' ? 'trainer_courses' : 'trainee_quest';
    if (activeSubPage === 'anomalies') return 'anomalies';
    if (activeSubPage === 'compliance') return currentUser?.role === 'company_staff' ? 'audit_certificate' : 'compliance_reports';
    if (activeSubPage === 'analytics') return 'trainer_analytics';
    if (activeSubPage === 'settings') return 'system_settings';

    switch (currentUser?.role) {
      case 'admin': return 'admin_overview';
      case 'account_manager':
      case 'finance': return 'staff_records';
      case 'trainer': return 'trainer_courses';
      case 'trainee': return 'trainee_quest';
      default: return 'overview';
    }
  });

  // Keep activeView in sync with activeSubPage prop without reverting user choices
  useEffect(() => {
    if (!activeSubPage) return;
    if (activeSubPage === 'quizzes') {
      setActiveView(currentUser?.role === 'trainer' ? 'quiz_creator' : 'trainee_quiz');
    } else if (activeSubPage === 'badges') {
      setActiveView('trainee_badges');
    } else if (activeSubPage === 'certifications') {
      setActiveView(currentUser?.role === 'trainee' ? 'trainee_certs' : 'cert_expiry');
    } else if (activeSubPage === 'records') {
      setActiveView(currentUser?.role === 'admin' ? 'records_vault' : 'staff_records');
    } else if (activeSubPage === 'trainees') {
      setActiveView(currentUser?.role === 'trainer' ? 'trainee_roster' : 'assigned_clients');
    } else if (activeSubPage === 'courses') {
      setActiveView(currentUser?.role === 'trainer' ? 'trainer_courses' : 'trainee_quest');
    } else if (activeSubPage === 'anomalies') {
      setActiveView('anomalies');
    } else if (activeSubPage === 'compliance' || activeSubPage === 'audit') {
      setActiveView('compliance_reports');
    } else if (activeSubPage === 'analytics') {
      setActiveView('trainer_analytics');
    } else if (activeSubPage === 'settings') {
      setActiveView('system_settings');
    } else if (activeSubPage === 'dashboard') {
      setActiveView(prev => {
        if (prev) return prev;
        switch (currentUser?.role) {
          case 'admin': return 'admin_overview';
          case 'account_manager':
          case 'finance': return 'staff_records';
          case 'trainer': return 'trainer_courses';
          case 'trainee': return 'trainee_quest';
          default: return 'overview';
        }
      });
    }
  }, [activeSubPage, currentUser?.role]);

  const handleNavChange = (viewId) => {
    setActiveView(viewId);
    if (viewId === 'trainee_quiz' || viewId === 'quiz_creator') {
      navigate('/quizzes');
    } else if (viewId === 'trainee_badges') {
      navigate('/badges');
    } else if (viewId === 'trainee_certs' || viewId === 'cert_expiry') {
      navigate('/certifications');
    } else if (viewId === 'staff_records' || viewId === 'records_vault') {
      navigate('/records');
    } else if (viewId === 'trainee_roster' || viewId === 'assigned_clients') {
      navigate('/trainees');
    } else if (viewId === 'trainer_courses' || viewId === 'trainee_quest') {
      navigate('/courses');
    } else if (viewId === 'trainer_analytics') {
      navigate('/analytics');
    } else if (viewId === 'anomalies') {
      navigate('/anomalies');
    } else if (viewId === 'compliance_reports') {
      navigate('/compliance');
    } else if (viewId === 'system_settings') {
      navigate('/settings');
    } else {
      navigate('/dashboard');
    }
  };

  const getViewTitle = () => {
    switch (currentUser?.role) {
      case 'admin': return 'Administrator Control Center (Full Record & Anomaly Management)';
      case 'account_manager': return 'Account Manager Workspace (Assigned Clients Only)';
      case 'finance': return 'Finance Records Management (Add & Edit Records)';
      case 'trainer': 
        if (activeView === 'quiz_creator') return 'Quiz & Assessment Creator Studio';
        if (activeView === 'trainer_analytics') return 'Cohort Performance Analytics';
        if (activeView === 'grade_entry') return 'Evaluation & Certification Workbench';
        if (activeView === 'trainee_roster') return 'Enrolled Trainee Master Roster';
        return 'Lead Trainer Course Delivery';
      case 'trainee': return 'Trainee Learning & Gamification Quest';
      default: return 'Workspace';
    }
  };

  return (
    <div className="enterprise-layout">
      {/* Dynamic Role Sidebar */}
      <Sidebar activeView={activeView} setActiveView={handleNavChange} />

      {/* Main Content Viewport */}
      <div className="enterprise-viewport">
        <Topbar activeViewTitle={getViewTitle()} />

        <main className="enterprise-page-area">
          {currentUser?.role === 'admin' && (
            <AdminDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}

          {(currentUser?.role === 'account_manager' || currentUser?.role === 'finance') && (
            <StaffDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}

          {currentUser?.role === 'trainer' && (
            <TrainerDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}

          {currentUser?.role === 'trainee' && (
            <TraineeDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}
        </main>
      </div>

      <InstallPwaModal />
    </div>
  );
}

// Top level App with Routes
function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Login Route */}
      <Route path="/login" element={<LoginView />} />

      {/* Main Application Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="dashboard" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/quizzes" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="quizzes" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/quiz" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="quizzes" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/badges" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="badges" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/certifications" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="certifications" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/records" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="records" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/trainees" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="trainees" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/courses" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="courses" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/anomalies" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="anomalies" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/compliance" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="compliance" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="analytics" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="settings" />
          </ProtectedRoute>
        } 
      />

      {/* Root Route: If logged in, go to dashboard, else go to login */}
      <Route 
        path="/" 
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } 
      />

      {/* Fallback Catch-all */}
      <Route 
        path="*" 
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
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
