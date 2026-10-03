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
    if (activeSubPage) return activeSubPage;
    switch (currentUser?.role) {
      case 'admin': return 'admin_overview';
      case 'crossworks_staff': return 'staff_records';
      case 'trainer': return 'trainer_courses';
      case 'company_staff': return 'company_overview';
      case 'trainee': return 'trainee_quest';
      default: return 'overview';
    }
  });

  // Keep activeView in sync with activeSubPage prop
  useEffect(() => {
    if (activeSubPage) {
      // Map generic page routes to role-specific subviews if needed
      if (activeSubPage === 'records') {
        setActiveView(currentUser?.role === 'admin' ? 'records_vault' : 'staff_records');
      } else if (activeSubPage === 'trainees') {
        setActiveView(currentUser?.role === 'trainer' ? 'trainee_roster' : 'company_trainees');
      } else if (activeSubPage === 'courses') {
        setActiveView(currentUser?.role === 'trainer' ? 'trainer_courses' : 'trainee_quest');
      } else if (activeSubPage === 'anomalies') {
        setActiveView('anomalies');
      } else if (activeSubPage === 'compliance' || activeSubPage === 'audit') {
        setActiveView(currentUser?.role === 'company_staff' ? 'audit_certificate' : 'compliance_reports');
      } else if (activeSubPage === 'settings') {
        setActiveView('system_settings');
      } else {
        // default dashboard view
        switch (currentUser?.role) {
          case 'admin': setActiveView('admin_overview'); break;
          case 'crossworks_staff': setActiveView('staff_records'); break;
          case 'trainer': setActiveView('trainer_courses'); break;
          case 'company_staff': setActiveView('company_overview'); break;
          case 'trainee': setActiveView('trainee_quest'); break;
          default: setActiveView('overview');
        }
      }
    }
  }, [activeSubPage, currentUser?.role]);

  const handleNavChange = (viewId) => {
    setActiveView(viewId);
    // Also push meaningful route if applicable
    if (viewId === 'staff_records' || viewId === 'records_vault') {
      navigate('/records');
    } else if (viewId === 'trainee_roster' || viewId === 'company_trainees') {
      navigate('/trainees');
    } else if (viewId === 'trainer_courses' || viewId === 'trainee_quest') {
      navigate('/courses');
    } else if (viewId === 'anomalies') {
      navigate('/anomalies');
    } else if (viewId === 'compliance_reports' || viewId === 'audit_certificate') {
      navigate('/compliance');
    } else if (viewId === 'system_settings') {
      navigate('/settings');
    } else {
      navigate('/dashboard');
    }
  };

  const getViewTitle = () => {
    switch (currentUser?.role) {
      case 'admin': return 'Administrator Control Center';
      case 'crossworks_staff': return 'Crossworks Client Account Management';
      case 'trainer': return 'Lead Trainer Course Delivery';
      case 'company_staff': return 'Client Organization Portal';
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
            <AdminDashboard activeSubView={activeView} />
          )}

          {currentUser?.role === 'crossworks_staff' && (
            <StaffDashboard activeSubView={activeView} />
          )}

          {currentUser?.role === 'trainer' && (
            <TrainerDashboard activeSubView={activeView} />
          )}

          {currentUser?.role === 'company_staff' && (
            <CompanyDashboard activeSubView={activeView} />
          )}

          {currentUser?.role === 'trainee' && (
            <TraineeDashboard activeSubView={activeView} />
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
