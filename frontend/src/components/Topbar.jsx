import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Flame, 
  ChevronDown, 
  Check, 
  LogOut, 
  User, 
  GraduationCap, 
  Building2, 
  Key, 
  Award 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

/**
 * Topbar - global header bar rendered by MainAppShell for all authenticated roles.
 * Props:
 *   activeViewTitle {string} - human-readable name of the current view (set by App.jsx)
 *   streakDays      {number|null} - live streak count passed from TraineeDashboard via
 *                                   MainAppShell; null while loading.
 *                                   Only rendered for the trainee role.
 */
export default function Topbar({ activeViewTitle, streakDays }) {
  const { currentUser, loginRole, logout, DEMO_USERS } = useAuth();
  const navigate = useNavigate();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return Shield;
      case 'account_manager':
      case 'crossworks_staff': return Key;
      case 'finance':
      case 'company_staff': return Building2;
      case 'trainer': return GraduationCap;
      case 'trainee': return Award;
      default: return User;
    }
  };

  const userRole = currentUser?.role || 'trainee';
  const CurrentRoleIcon = getRoleIcon(userRole);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="gamified-topbar">
      {/* Left: Brand Logo & View Breadcrumb */}
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div 
          className="topbar-brand-link" 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => navigate('/dashboard')}
          title="CrossQuest Dashboard"
        >
          <img 
            src={logoStacked} 
            alt="CrossQuest" 
            style={{ height: '36px', width: 'auto', display: 'block' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '900', fontSize: '17px', letterSpacing: '-0.02em', color: '#1e1b4b', lineHeight: 1.1 }}>
              CrossQuest
            </span>
            <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', color: '#6366f1', textTransform: 'uppercase' }}>
              Enterprise Learning
            </span>
          </div>
        </div>

        <span style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: '300' }}>/</span>

        <span className="crumb-active" style={{ fontSize: '13.5px', fontWeight: '700', color: '#475569' }}>
          {activeViewTitle}
        </span>
      </div>

      {/* Right: Streak (Trainees only) and User Dropdown */}
      <div className="topbar-right">
        {/* Streak Pill - Trainees only - live value from backend */}
        {currentUser?.role === 'trainee' && (
          <div className="gamified-stat-pill streak-pill">
            <Flame size={16} className="stat-flame-icon" />
            <span className="stat-num">
              {streakDays !== null && streakDays !== undefined ? streakDays : '...'}
            </span>
            <span className="stat-label">DAY STREAK</span>
          </div>
        )}

        {/* Role Switcher Menu - DEV ONLY (hidden in production build) */}
        {import.meta.env.DEV && (
          <div className="role-dropdown-wrapper">
            <button 
              type="button"
              className="role-selector-trigger"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            >
              <div className="role-trigger-left">
                <div className="topbar-user-avatar">
                  {currentUser?.initials || <CurrentRoleIcon size={16} />}
                </div>
                <div className="role-trigger-info">
                  <span className="role-trigger-name">{currentUser?.name || 'User'}</span>
                  <span className="role-trigger-badge">{userRole === 'trainee' ? 'Trainee' : userRole.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <ChevronDown size={14} className={`role-chevron ${roleMenuOpen ? 'open' : ''}`} />
            </button>

            {roleMenuOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setRoleMenuOpen(false)} />
                <div className="role-popover-card">
                  <div className="role-popover-header">
                    <div className="popover-title">Switch Account View</div>
                    <div className="popover-subtitle">Jump to another authorized portal</div>
                  </div>

                  <div className="role-options-list">
                    {Object.entries(DEMO_USERS)
                      .filter(([key]) => key !== 'crossworks_staff' && key !== 'company_staff')
                      .map(([key, u]) => {
                      const RoleIcon = getRoleIcon(u.role);
                      const isSelected = u.role === currentUser.role;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`role-option-row ${isSelected ? 'active-role' : ''}`}
                          onClick={() => {
                            loginRole(key);
                            setRoleMenuOpen(false);
                          }}
                        >
                          <div className="role-option-avatar">
                            <RoleIcon size={16} />
                          </div>
                          <div className="role-option-text">
                            <div className="role-option-name">{u.name}</div>
                            <div className="role-option-meta">
                              <span className="role-tag">{u.role.replace(/_/g, ' ').toUpperCase()}</span>
                              <span className="role-org">- {u.organization}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="role-check-mark">
                              <Check size={16} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* User Identity chip (shown in production when role switcher is hidden) */}
        {!import.meta.env.DEV && (
          <div className="role-selector-trigger" style={{ cursor: 'default', pointerEvents: 'none' }}>
            <div className="role-trigger-left">
              <div className="topbar-user-avatar">
                {currentUser?.initials || <CurrentRoleIcon size={16} />}
              </div>
              <div className="role-trigger-info">
                <span className="role-trigger-name">{currentUser?.name || 'User'}</span>
                <span className="role-trigger-badge">{userRole === 'trainee' ? 'Trainee' : userRole.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sign Out Action */}
        <button 
          type="button" 
          className="gamified-logout-btn" 
          onClick={handleLogout} 
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
