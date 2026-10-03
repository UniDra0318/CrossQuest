import React, { useState, useEffect } from 'react';
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

function MainAppShell() {
  const { currentUser } = useAuth();
  const [activeView, setActiveView] = useState('overview');

  // Reset activeView whenever role changes
  useEffect(() => {
    if (!currentUser) return;
    switch (currentUser.role) {
      case 'admin':
        setActiveView('admin_overview');
        break;
      case 'crossworks_staff':
        setActiveView('staff_records');
        break;
      case 'trainer':
        setActiveView('trainer_courses');
        break;
      case 'company_staff':
        setActiveView('company_overview');
        break;
      case 'trainee':
        setActiveView('trainee_quest');
        break;
      default:
        setActiveView('overview');
    }
  }, [currentUser?.role]);

  if (!currentUser) {
    return <LoginView />;
  }

  const getViewTitle = () => {
    switch (currentUser.role) {
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
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* Main Content Viewport */}
      <div className="enterprise-viewport">
        <Topbar activeViewTitle={getViewTitle()} />

        <main className="enterprise-page-area">
          {currentUser.role === 'admin' && (
            <AdminDashboard activeSubView={activeView} />
          )}

          {currentUser.role === 'crossworks_staff' && (
            <StaffDashboard activeSubView={activeView} />
          )}

          {currentUser.role === 'trainer' && (
            <TrainerDashboard activeSubView={activeView} />
          )}

          {currentUser.role === 'company_staff' && (
            <CompanyDashboard activeSubView={activeView} />
          )}

          {currentUser.role === 'trainee' && (
            <TraineeDashboard activeSubView={activeView} />
          )}
        </main>
      </div>

      <InstallPwaModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}
