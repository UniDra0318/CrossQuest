import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AdminDashboard from './views/AdminDashboard';
import StaffDashboard from './views/StaffDashboard';
import TrainerDashboard from './views/TrainerDashboard';
import CompanyDashboard from './views/CompanyDashboard';
import TraineeDashboard from './views/TraineeDashboard';
import LandingView from './views/LandingView';
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

/**
 * Pure mapping helper: resolves canonical view ID based on subPage string and user role.
 * Single source of truth for both initial state and route synchronization.
 */
export function resolveView(subPage, role) {
  if (!subPage || subPage === 'dashboard') {
    switch (role) {
      case 'admin': return 'admin_overview';
      case 'account_manager':
      case 'crossworks_staff': return 'staff_records';
      case 'trainer': return 'trainer_courses';
      case 'finance':
      case 'company_staff': return 'company_overview';
      case 'trainee': return 'trainee_quest';
      default: return 'overview';
    }
  }

  switch (subPage) {
    case 'admin_overview': return 'admin_overview';
    case 'attribute_authority': return 'attribute_authority';
    case 'records_vault': return 'records_vault';
    case 'trainer_courses': return 'trainer_courses';
    case 'trainee_roster': return 'trainee_roster';
    case 'grade_entry': return 'grade_entry';
    case 'quiz_creator': return 'quiz_creator';
    case 'trainer_analytics': return 'trainer_analytics';
    case 'quizzes': return role === 'trainer' ? 'quiz_creator' : 'trainee_quiz';
    case 'badges': return 'trainee_badges';
    case 'certifications': return 'trainee_certs';
    case 'records': return role === 'admin' ? 'records_vault' : 'staff_records';
    case 'trainees': return role === 'trainer' ? 'trainee_roster' : 'company_trainees';
    case 'courses': return role === 'trainer' ? 'trainer_courses' : 'trainee_quest';
    case 'anomalies': return 'anomalies';
    case 'compliance':
    case 'audit': return role === 'company_staff' || role === 'finance' ? 'audit_certificate' : 'compliance_reports';
    case 'analytics': return 'trainer_analytics';
    case 'settings': return 'system_settings';
    case 'assigned_clients': return 'assigned_clients';
    default: return subPage;
  }
}

/**
 * Maps a viewId to its canonical URL route so navigation and browser history stay in sync.
 */
export function getRouteForView(viewId, role) {
  switch (viewId) {
    case 'admin_overview': return '/admin';
    case 'attribute_authority': return '/admin/access';
    case 'anomalies': return role === 'admin' ? '/admin/anomalies' : '/anomalies';
    case 'records_vault': return '/admin/vault';
    case 'system_settings': return role === 'admin' ? '/admin/settings' : '/settings';
    case 'trainee_quiz':
    case 'quiz_creator': return '/quizzes';
    case 'trainee_badges': return '/badges';
    case 'trainee_certs': return '/certifications';
    case 'staff_records': return '/staff';
    case 'assigned_clients': return '/staff/portfolios';
    case 'compliance_reports': return (role === 'crossworks_staff' || role === 'account_manager') ? '/staff/reports' : '/compliance';
    case 'trainer_courses': return '/trainer';
    case 'trainee_roster': return role === 'trainer' ? '/trainer/roster' : '/trainees';
    case 'grade_entry': return '/trainer/grade';
    case 'trainer_analytics': return '/trainer/analytics';
    case 'company_trainees': return '/trainees';
    case 'trainee_quest': return '/courses';
    case 'audit_certificate': return '/compliance';
    case 'company_overview': return '/dashboard';
    default: return '/dashboard';
  }
}

function MainAppShell({ activeSubPage }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  // Trainee streak lifted here so Topbar can display live value
  const [liveStreakDays, setLiveStreakDays] = useState(null);
  const [activeView, setActiveView] = useState(() => resolveView(activeSubPage, currentUser?.role));

  // Keep activeView synchronized with current route prop
  useEffect(() => {
    setActiveView(resolveView(activeSubPage, currentUser?.role));
  }, [activeSubPage, currentUser?.role]);

  const handleNavChange = (viewId) => {
    setActiveView(viewId);
    navigate(getRouteForView(viewId, currentUser?.role));
  };

  const getViewTitle = () => {
    switch (currentUser?.role) {
      case 'admin':
        if (activeView === 'attribute_authority') return 'Access Permissions Authority';
        if (activeView === 'anomalies') return 'Anomaly & Incident Monitor';
        if (activeView === 'records_vault') return 'Master Record Vault';
        if (activeView === 'system_settings') return 'Security Engine Settings';
        return 'Administrator Control Center';
      case 'account_manager':
      case 'crossworks_staff':
        if (activeView === 'assigned_clients') return 'Assigned Client Portfolios';
        if (activeView === 'compliance_reports') return 'Client Compliance & Audit Reports';
        return 'Crossworks Client Account Management';
      case 'trainer': 
        if (activeView === 'quiz_creator') return 'Quiz & Assessment Creator Studio';
        if (activeView === 'trainer_analytics') return 'Cohort Performance Analytics';
        if (activeView === 'grade_entry') return 'Evaluation & Certification Workbench';
        if (activeView === 'trainee_roster') return 'Enrolled Trainee Master Roster';
        return 'Lead Trainer Course Delivery';
      case 'finance':
      case 'company_staff':
        if (activeView === 'company_trainees') return 'Employee Training Records';
        if (activeView === 'audit_certificate') return 'Compliance & Audit Report';
        return 'Client Organization Portal';
      case 'trainee':
        if (activeView === 'trainee_quiz') return 'Knowledge Quizzes Catalog';
        if (activeView === 'trainee_badges') return 'Earned Badges & Achievements';
        if (activeView === 'trainee_certs') return 'My Verified Certifications';
        return 'Trainee Learning & Gamification Quest';
      default: return 'Workspace';
    }
  };

  return (
    <div className="enterprise-layout">
      {/* Dynamic Role Sidebar */}
      <Sidebar activeView={activeView} setActiveView={handleNavChange} />

      {/* Main Content Viewport */}
      <div className="enterprise-viewport">
        <Topbar activeViewTitle={getViewTitle()} streakDays={liveStreakDays} />

        <main className="enterprise-page-area">
          {currentUser?.role === 'admin' && (
            <AdminDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}

          {(currentUser?.role === 'crossworks_staff' || currentUser?.role === 'account_manager') && (
            <StaffDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}

          {currentUser?.role === 'trainer' && (
            <TrainerDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}

          {(currentUser?.role === 'company_staff' || currentUser?.role === 'finance') && (
            <CompanyDashboard activeSubView={activeView} setActiveView={handleNavChange} />
          )}

          {currentUser?.role === 'trainee' && (
            <TraineeDashboard activeSubView={activeView} setActiveView={handleNavChange} onStreakLoad={setLiveStreakDays} />
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

      {/* Admin Specific Console Routes */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="admin_overview" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/access" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="attribute_authority" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/anomalies" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="anomalies" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/vault" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="records_vault" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="settings" />
          </ProtectedRoute>
        } 
      />

      {/* Crossworks Staff Specific Portal Routes */}
      <Route 
        path="/staff" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="staff_records" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/staff/portfolios" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="assigned_clients" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/staff/reports" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="compliance_reports" />
          </ProtectedRoute>
        } 
      />

      {/* Crossworks Trainer Specific Portal Routes */}
      <Route 
        path="/trainer" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="trainer_courses" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/trainer/roster" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="trainee_roster" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/trainer/grade" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="grade_entry" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/trainer/quiz" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="quiz_creator" />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/trainer/analytics" 
        element={
          <ProtectedRoute>
            <MainAppShell activeSubPage="trainer_analytics" />
          </ProtectedRoute>
        } 
      />

      {/* Landing Page Route (Page 1 of Template) */}
      <Route path="/" element={<LandingView />} />
      <Route path="/landing" element={<LandingView />} />

      {/* Fallback Catch-all */}
      <Route 
        path="*" 
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
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
