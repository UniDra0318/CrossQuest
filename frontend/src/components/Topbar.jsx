import React, { useState } from 'react';
import { 
  Shield, 
  Coins, 
  Flame, 
  ChevronDown, 
  Check, 
  LogOut, 
  Sparkles, 
  User, 
  Layers,
  GraduationCap,
  Building2,
  Key,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Topbar({ activeViewTitle }) {
  const { currentUser, login, logout, DEMO_USERS } = useAuth();
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

      {/* Center/Right: Gamified Currency & Stats (Inspired by Quizizz / Wayground) */}
      <div className="topbar-right">
        {/* Streak Pill */}
        <div className="gamified-stat-pill streak-pill">
          <Flame size={18} className="stat-flame-icon" />
          <span className="stat-num">7</span>
          <span className="stat-label">DAY STREAK</span>
        </div>

        {/* Coins / Points Pill */}
        <div className="gamified-stat-pill coin-pill">
          <Coins size={18} className="stat-coin-icon" />
          <span className="stat-num">12,877</span>
          <span className="stat-label">XP</span>
        </div>

        {/* Security Engine Badge */}
        <div className="security-engine-pill">
          <Shield size={14} className="text-cyan" />
          <span>CP-ABE Waters11</span>
        </div>

        {/* Role Switcher Menu (Custom Polished Dropdown) */}
        <div className="role-dropdown-wrapper">
          <button 
            type="button"
            className="role-selector-trigger"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
          >
            <div className="role-trigger-left">
              <div className="role-trigger-icon-box">
                <CurrentRoleIcon size={16} />
              </div>
              <div className="role-trigger-info">
                <span className="role-trigger-name">{currentUser.name.split(' ')[0]}</span>
                <span className="role-trigger-badge">{currentUser.role.replace(/_/g, ' ')}</span>
              </div>
            </div>
            <ChevronDown size={14} className={`role-chevron ${roleMenuOpen ? 'open' : ''}`} />
          </button>

          {roleMenuOpen && (
            <>
              <div className="dropdown-backdrop" onClick={() => setRoleMenuOpen(false)} />
              <div className="role-popover-card">
                <div className="role-popover-header">
                  <div className="popover-title">Switch Testing Persona</div>
                  <div className="popover-subtitle">Experience each separated role interface & CP-ABE attributes</div>
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
                          login(key);
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
          onClick={logout} 
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
