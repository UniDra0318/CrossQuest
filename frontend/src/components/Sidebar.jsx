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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

export default function Sidebar({ activeView, setActiveView }) {
  const { currentUser, logout } = useAuth();

  // Role-specific navigation items
  const getNavItems = () => {
    switch (currentUser.role) {
      case 'admin':
        return [
          { id: 'admin_overview', label: 'Security Overview', icon: LayoutDashboard },
          { id: 'attribute_authority', label: 'Access Permissions', icon: Key },
          { id: 'anomalies', label: 'Anomaly Monitor', icon: AlertTriangle },
          { id: 'records_vault', label: 'Master Record Vault', icon: FileText },
          { id: 'system_settings', label: 'Security Engine Settings', icon: Settings }
        ];

      case 'account_manager':
      case 'crossworks_staff':
        return [
          { id: 'staff_records', label: 'Client Record Vault', icon: FileText },
          { id: 'assigned_clients', label: 'Assigned Portfolios', icon: Building2 },
          { id: 'compliance_reports', label: 'Client Audit Reports', icon: BarChart3 }
        ];

      case 'trainer':
        return [
          { id: 'trainer_courses', label: 'Course Cohorts', icon: BookOpen },
          { id: 'trainee_roster', label: 'Trainee Roster', icon: Users },
          { id: 'grade_entry', label: 'Grade & Certify Records', icon: CheckSquare },
          { id: 'quiz_creator', label: 'Quiz & Question Studio', icon: Sparkles },
          { id: 'trainer_analytics', label: 'Cohort Performance', icon: BarChart3 }
        ];

      case 'finance':
      case 'company_staff':
        return [
          { id: 'company_overview', label: 'Company Compliance', icon: BarChart3 },
          { id: 'company_trainees', label: 'Employee Records', icon: Users },
          { id: 'audit_certificate', label: 'Compliance & Audit Report', icon: Shield }
        ];

      case 'trainee':
        return [
          { id: 'trainee_quest', label: 'Quest & Progress', icon: Flame },
          { id: 'trainee_quiz', label: 'Knowledge Quizzes', icon: GraduationCap },
          { id: 'trainee_badges', label: 'Earned Badges', icon: Award },
          { id: 'trainee_certs', label: 'My Certifications', icon: BookOpen }
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="enterprise-sidebar">
      {/* Brand Top */}
      <div className="sidebar-brand" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px 12px', gap: '6px' }}>
        <img src={logoStacked} alt="CrossQuest Logo" style={{ width: '85%', maxWidth: '190px', height: 'auto' }} />
        <span className="sidebar-brand-sub-badge" style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase' }}>
          ENTERPRISE LEARNING
        </span>
      </div>

      {/* Role Pill Banner */}
      <div className="sidebar-role-banner">
        <span className="role-chip">
          {currentUser.role.replace(/_/g, ' ').toUpperCase()}
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
              <li key={item.id}>
                <button
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Footer Profile */}
      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="user-avatar-circle">
            {currentUser.initials}
          </div>
          <div className="user-info-text">
            <div className="user-display-name">{currentUser.name}</div>
            <div className="user-display-title">{currentUser.title}</div>
          </div>
        </div>

        <button className="logout-action-btn" onClick={logout} title="Sign Out">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
