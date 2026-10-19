import React from 'react';
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  FileText, 
  Users, 
  GraduationCap, 
  Award, 
  Building2, 
  CheckSquare, 
  LogOut, 
  Settings, 
  BookOpen, 
  BarChart3,
  Flame,
  LayoutDashboard,
  Sparkles,
  CalendarCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ activeView, setActiveView }) {
  const { currentUser, logout } = useAuth();

  // Role-specific navigation items adhering strictly to Table 16
  const getNavItems = () => {
    switch (currentUser.role) {
      case 'admin':
        return [
          { id: 'admin_overview', label: 'Security & System Overview', icon: LayoutDashboard },
          { id: 'attribute_authority', label: 'User & Attribute Authority', icon: Key },
          { id: 'anomalies', label: 'Access Anomaly Monitor', icon: AlertTriangle },
          { id: 'records_vault', label: 'Master Training Records', icon: FileText },
          { id: 'system_settings', label: 'Security Engine Settings', icon: Settings }
        ];

      case 'account_manager':
        return [
          { id: 'staff_records', label: 'Assigned Client Records', icon: FileText },
          { id: 'assigned_clients', label: 'Client Portfolios', icon: Building2 },
          { id: 'compliance_reports', label: 'On-Demand Client Reports', icon: BarChart3 },
          { id: 'cert_expiry', label: 'Certification Tracking', icon: CalendarCheck }
        ];

      case 'finance':
        return [
          { id: 'staff_records', label: 'Enterprise Records Vault', icon: FileText },
          { id: 'assigned_clients', label: 'Client Companies Overview', icon: Building2 },
          { id: 'compliance_reports', label: 'Training Financials & Reports', icon: BarChart3 },
          { id: 'cert_expiry', label: 'Certification Status', icon: CalendarCheck }
        ];

      case 'trainer':
        return [
          { id: 'trainer_courses', label: 'Assigned Sessions', icon: BookOpen },
          { id: 'trainee_roster', label: 'Session Trainees', icon: Users },
          { id: 'quiz_creator', label: 'Quiz & Studio Management', icon: Sparkles },
          { id: 'trainer_analytics', label: 'Teams & Leaderboards', icon: BarChart3 }
        ];

      case 'trainee':
        return [
          { id: 'trainee_quest', label: 'My Cross-Company History', icon: Flame },
          { id: 'trainee_quiz', label: 'Gamified Quizzes (PWA)', icon: GraduationCap },
          { id: 'trainee_badges', label: 'Points & Badges', icon: Award },
          { id: 'trainee_certs', label: 'My Certifications & Expiry', icon: CalendarCheck }
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'ADMINISTRATOR';
      case 'account_manager': return 'ACCOUNT MANAGER';
      case 'finance': return 'FINANCE PERSONNEL';
      case 'trainer': return 'TRAINER';
      case 'trainee': return 'TRAINEE';
      default: return (role || '').replace(/_/g, ' ').toUpperCase();
    }
  };

  return (
    <aside className="enterprise-sidebar">
      {/* Brand Top */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <Shield size={20} />
        </div>
        <div className="brand-text">
          <div className="brand-title">CrossQuest</div>
          <div className="brand-sub">Enterprise Learning Vault</div>
        </div>
      </div>

      {/* Role Pill Banner */}
      <div className="sidebar-role-banner">
        <span className="role-chip">
          {getRoleDisplayName(currentUser.role)}
        </span>
        <div className="user-org-text">{currentUser.organization}</div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <div className="nav-group-title">WORKSPACE MODULES</div>
        <ul className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id} className="nav-item">
                <button
                  type="button"
                  className={`nav-button ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon size={17} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom User Card & Logout */}
      <div className="sidebar-footer">
        <div className="user-profile-tile">
          <div className="avatar-chip">{currentUser.initials || 'U'}</div>
          <div className="user-profile-info">
            <div className="user-name">{currentUser.name}</div>
            <div className="user-email">{currentUser.email}</div>
          </div>
          <button 
            type="button" 
            className="logout-action-btn"
            title="Sign out of CrossQuest"
            onClick={logout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
