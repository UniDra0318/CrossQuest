import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

/**
 * Sidebar - single unified persistent navigation sidebar for all authenticated roles.
 * Conforms to CrossQuest UI/UX Improvement Plan:
 * - Max 5 sidebar items per role
 * - Each role opens on a Home screen
 * - Uses clean task vocabulary (no internal requirement IDs or cryptographic jargon)
 */
export default function Sidebar({ activeView, setActiveView }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const userRole = currentUser?.role || 'trainee';

  // Role-specific navigation items per Section 4 of the UI/UX Improvement Plan
  const getNavItems = () => {
    switch (userRole) {
      case 'admin':
        return [
          { id: 'admin_overview', label: 'Home', icon: LayoutDashboard },
          { id: 'records_vault', label: 'Training Records', icon: FileText },
          { id: 'attribute_authority', label: 'People and Access', icon: Users },
          { id: 'anomalies', label: 'Alerts', icon: ShieldAlert },
          { id: 'system_settings', label: 'Settings', icon: Settings }
        ];

      case 'account_manager':
      case 'crossworks_staff':
        return [
          { id: 'staff_records', label: 'Home', icon: LayoutDashboard },
          { id: 'assigned_clients', label: 'My Clients', icon: Building2 },
          { id: 'compliance_reports', label: 'Client Reports', icon: BarChart3 }
        ];

      case 'trainer':
        return [
          { id: 'trainer_courses', label: 'Home', icon: LayoutDashboard },
          { id: 'trainee_roster', label: 'My Sessions', icon: BookOpen },
          { id: 'grade_entry', label: 'Session Sign-off', icon: CheckSquare },
          { id: 'quiz_creator', label: 'Quizzes and Teams', icon: Sparkles },
          { id: 'trainer_analytics', label: 'Results', icon: BarChart3 }
        ];

      case 'finance':
      case 'company_staff':
        return [
          { id: 'finance_reconciliation', label: 'Home', icon: LayoutDashboard },
          { id: 'company_overview', label: 'Enterprise Accounts', icon: Building2 },
          { id: 'company_trainees', label: 'Records', icon: FileText },
          { id: 'audit_certificate', label: 'Reports', icon: ShieldCheck }
        ];

      case 'trainee':
        return [
          { id: 'trainee_quest', label: 'Home', icon: Flame },
          { id: 'trainee_certs', label: 'Certificates', icon: Award },
          { id: 'trainee_quiz', label: 'Quizzes', icon: GraduationCap },
          { id: 'trainee_badges', label: 'Badges & Leaderboard', icon: Sparkles }
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const formatRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'account_manager':
      case 'crossworks_staff': return 'Account Manager';
      case 'finance': return 'Finance & Operations';
      case 'trainer': return 'Lead Trainer';
      case 'trainee': return 'Trainee';
      default: return role.replace(/_/g, ' ');
    }
  };

  const initials = currentUser?.initials || 
    (currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'CQ');

  return (
    <aside className="enterprise-sidebar">
      {/* Brand Top - Clickable Home Link */}
      <div 
        className="sidebar-brand" 
        style={{ 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '24px 20px 14px', 
          gap: '6px',
          cursor: 'pointer'
        }}
        onClick={() => {
          setActiveView(navItems[0]?.id || 'admin_overview');
          navigate('/dashboard');
        }}
        title="Go to Home"
      >
        <img src={logoStacked} alt="CrossQuest Logo" style={{ width: '85%', maxWidth: '175px', height: 'auto' }} />
        <span className="sidebar-brand-sub-badge" style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase' }}>
          ENTERPRISE LEARNING
        </span>
      </div>

      {/* Role Pill Banner */}
      <div className="sidebar-role-banner">
        <span className="role-chip">
          {formatRoleLabel(userRole).toUpperCase()}
        </span>
        <div className="user-org-text">{currentUser?.organization || 'Crossworks Consulting'}</div>
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
                  type="button"
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
            {initials}
          </div>
          <div className="user-info-text">
            <div className="user-display-name">{currentUser?.name || 'User'}</div>
            <div className="user-display-title">{formatRoleLabel(userRole)}</div>
          </div>
        </div>

        <button 
          type="button" 
          className="logout-action-btn" 
          onClick={() => {
            logout();
            navigate('/login');
          }} 
          title="Sign Out"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
