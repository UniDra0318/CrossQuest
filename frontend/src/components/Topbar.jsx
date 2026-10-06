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

export default function Topbar({ activeViewTitle }) {
  const { currentUser, loginRole, logout, DEMO_USERS } = useAuth();
  const navigate = useNavigate();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return Shield;
      case 'crossworks_staff': return Key;
      case 'trainer': return GraduationCap;
      case 'company_staff': return Building2;
      case 'trainee': return Award;
      default: return User;
    }
  };

  const CurrentRoleIcon = getRoleIcon(currentUser.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="gamified-topbar">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="topbar-left">
        <div className="gamified-breadcrumb">
          <span className="crumb-brand">CrossQuest</span>
          <span className="crumb-divider">/</span>
          <span className="crumb-active">{activeViewTitle}</span>
        </div>
      </div>

      {/* Right: Streak (Trainees only) and User Dropdown */}
      <div className="topbar-right">
        {/* Streak Pill - Trainees only */}
        {currentUser?.role === 'trainee' && (
          <div className="gamified-stat-pill streak-pill">
            <Flame size={16} className="stat-flame-icon" />
            <span className="stat-num">7</span>
            <span className="stat-label">DAY STREAK</span>
          </div>
        )}

        {/* Role Switcher Menu */}
        <div className="role-dropdown-wrapper">
          <button 
            type="button"
            className="role-selector-trigger"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
          >
            <div className="role-trigger-left">
              <div className="topbar-user-avatar">
                {currentUser.initials || <CurrentRoleIcon size={16} />}
              </div>
              <div className="role-trigger-info">
                <span className="role-trigger-name">{currentUser.name}</span>
                <span className="role-trigger-badge">{currentUser.role === 'trainee' ? 'Trainee' : currentUser.role.replace(/_/g, ' ')}</span>
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
                  {Object.entries(DEMO_USERS).map(([key, u]) => {
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
                            <span className="role-org">• {u.organization}</span>
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
