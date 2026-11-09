import React, { useState } from 'react';
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
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
  Lock,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toggleLeaderboardOptOut } from '../services/api';
import ProfileSettingsModal from './ProfileSettingsModal';
import DevRoleSwitcherModal from './DevRoleSwitcherModal';
import logoStacked from '../assets/crossquest-logo-stacked.svg';
import logoStackedWhite from '../assets/crossquest-logo-stacked-white.svg';
import { ROUTES, ROLE_HOME } from '../routes/routeConfig';

/**
 * Sidebar - single unified persistent navigation sidebar for all authenticated roles.
 * Supports:
 * - Collapsible state (compact 72px icon mode vs expanded 260px)
 * - Complete embedded user profile, quick settings, security clearance, and multi-tenant switcher
 * - 5 role-specific modules per CrossQuest UI/UX Improvement Plan
 */
export default function Sidebar({ 
  activeView, 
  setActiveView, 
  isCollapsed = false, 
  onToggleCollapse 
}) {
  const { currentUser, token, loginRole, logout, DEMO_USERS } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [optOut, setOptOut] = useState(Boolean(currentUser?.leaderboard_opt_out));
  const [optOutLoading, setOptOutLoading] = useState(false);

  const isDark = theme === 'dark';
  const userRole = currentUser?.role || 'trainee';

  const [importCompleted, setImportCompleted] = useState(() => {
    try {
      return localStorage.getItem('cq_finance_import_completed') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const handleImportUpdate = () => {
      try {
        setImportCompleted(localStorage.getItem('cq_finance_import_completed') === 'true');
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('cq_import_status_change', handleImportUpdate);
    return () => window.removeEventListener('cq_import_status_change', handleImportUpdate);
  }, []);

  const navItems = ROUTES.filter(r => {
    if (!r.roles.includes(userRole) || !r.label) return false;
    if (userRole === 'finance' && r.path === '/finance/import' && importCompleted) return false;
    return true;
  });

  const formatRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'account_manager': return 'Account Manager';
      case 'finance': return 'Finance & Operations';
      case 'trainer': return 'Lead Trainer';
      case 'trainee': return 'Trainee';
      default: return (role || '').replace(/_/g, ' ');
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return Shield;
      case 'account_manager': return Users;
      case 'finance': return Building2;
      case 'trainer': return GraduationCap;
      case 'trainee': return Award;
      default: return Users;
    }
  };

  const CurrentRoleIcon = getRoleIcon(userRole);

  const initials = currentUser?.initials || 
    (currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CQ');

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const handleToggleOptOut = async () => {
    setOptOutLoading(true);
    const nextVal = !optOut;
    setOptOut(nextVal);
    await toggleLeaderboardOptOut(nextVal, token);
    setOptOutLoading(false);
  };

  return (
    <>
      <aside className={`enterprise-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Header (Only shown when expanded; when collapsed, brand moves to Topbar and hide button is removed) */}
        {!isCollapsed && (
          <div className="sidebar-brand-wrapper">
            <div 
              className="sidebar-brand" 
              onClick={() => {
                navigate(ROLE_HOME[userRole] || '/home');
              }}
              title="Go to Dashboard Home"
            >
              <img 
                src={isDark ? logoStacked : logoStackedWhite} 
                alt="CrossQuest Logo" 
                className="sidebar-brand-img" 
              />
              <span className="sidebar-brand-sub-badge">
                ENTERPRISE LEARNING
              </span>
            </div>
          </div>
        )}

        {/* Role Banner */}
        {!isCollapsed ? (
          <div className="sidebar-role-banner">
            <span className="role-chip">
              {formatRoleLabel(userRole).toUpperCase()}
            </span>
            <div className="user-org-text">
              {currentUser?.organization || 'Crossworks Consulting'}
            </div>
          </div>
        ) : (
          <div className="sidebar-role-banner-collapsed" title={`${formatRoleLabel(userRole)} - ${currentUser?.organization || 'Crossworks Consulting'}`}>
            <CurrentRoleIcon size={16} />
          </div>
        )}

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {!isCollapsed && <div className="nav-group-title">WORKSPACE MODULES</div>}
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = (item.page && activeView === item.page) || window.location.pathname === item.path;
              return (
                <li key={item.path}>
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (setActiveView && item.page) {
                        setActiveView(item.page);
                      }
                      navigate(item.path);
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={17} className="nav-btn-icon" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Section on Sidebar */}
        <div className="sidebar-footer">
          {/* Collapsed Mode Profile Button */}
          {isCollapsed ? (
            <div className="sidebar-user-collapsed">
              <button
                type="button"
                className={`sidebar-avatar-btn ${profileOpen ? 'active' : ''}`}
                onClick={() => setProfileOpen(!profileOpen)}
                title={`${currentUser?.name || 'User'} (${formatRoleLabel(userRole)}) - Open Profile Menu`}
              >
                <div className="user-avatar-circle">
                  {initials}
                  <span className="online-status-dot" />
                </div>
              </button>

              <div className="sidebar-quick-stacked">
                <button
                  type="button"
                  className="quick-icon-btn"
                  onClick={() => setShowSettingsModal(true)}
                  title="Profile & System Settings"
                >
                  <Settings size={15} />
                </button>
                <button
                  type="button"
                  className="quick-icon-btn theme-mode-switch"
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label="Toggle Theme Mode"
                >
                  {isDark ? (
                    <Sun size={15} style={{ color: '#38bdf8' }} />
                  ) : (
                    <Moon size={15} style={{ color: '#f59e0b' }} />
                  )}
                </button>
                <button
                  type="button"
                  className="quick-icon-btn logout"
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          ) : (
            /* Expanded Mode Profile Card & Quick Action Bar */
            <div className="sidebar-user-expanded">
              <button 
                type="button"
                className={`sidebar-profile-card ${profileOpen ? 'active' : ''}`}
                onClick={() => setProfileOpen(!profileOpen)}
                title="Open Account Profile & Settings"
              >
                <div className="user-avatar-circle">
                  {initials}
                  <span className="online-status-dot" />
                </div>
                <div className="user-info-text">
                  <div className="user-display-name">{currentUser?.name || 'User'}</div>
                  <div className="user-display-title">{formatRoleLabel(userRole)}</div>
                  <div className="user-display-org">{currentUser?.organization || 'Crossworks Consulting'}</div>
                </div>
                <ChevronUp size={15} className={`profile-chevron ${profileOpen ? 'open' : ''}`} />
              </button>

              <div className="sidebar-quick-actions-bar">
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => setShowSettingsModal(true)}
                  title="Profile & Preferences Settings"
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  className="quick-action-btn theme-mode-switch"
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label="Toggle Theme Mode"
                >
                  {isDark ? (
                    <Sun size={16} style={{ color: '#38bdf8' }} />
                  ) : (
                    <Moon size={16} style={{ color: '#f59e0b' }} />
                  )}
                </button>

                <button
                  type="button"
                  className="quick-action-btn logout"
                  onClick={handleLogout}
                  title="Sign Out of CrossQuest"
                >
                  <LogOut size={15} />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          )}

          {/* Elevated Flyout Profile Popover Menu */}
          {profileOpen && (
            <>
              <div 
                className="sidebar-popover-backdrop"
                onClick={() => { setProfileOpen(false); setShowRoleSwitcher(false); }}
              />
              <div className={`sidebar-profile-popover ${isCollapsed ? 'collapsed-flyout' : ''}`}>
                {/* Popover Header */}
                <div className="popover-user-header">
                  <div className="popover-avatar">
                    {initials}
                  </div>
                  <div className="popover-user-meta">
                    <div className="popover-name">{currentUser?.name || 'User'}</div>
                    <div className="popover-email">{currentUser?.email || 'user@crossquest.ph'}</div>
                    <div className="popover-role-chip">
                      <CurrentRoleIcon size={11} />
                      <span>{formatRoleLabel(userRole)}</span>
                    </div>
                  </div>
                </div>

                {/* Organization & Clearance Scope */}
                <div className="popover-scope-box">
                  <div className="scope-row">
                    <span className="scope-label">Organization:</span>
                    <strong className="scope-value">{currentUser?.organization || 'Crossworks Enterprise'}</strong>
                  </div>
                  {currentUser?.trainee_code && (
                    <div className="scope-row">
                      <span className="scope-label">Trainee Code:</span>
                      <code className="scope-code">{currentUser.trainee_code}</code>
                    </div>
                  )}
                  {currentUser?.assigned_companies && currentUser.assigned_companies.length > 0 && (
                    <div className="scope-row">
                      <span className="scope-label">Client Scope:</span>
                      <span className="scope-value">{currentUser.assigned_companies.join(', ')}</span>
                    </div>
                  )}
                  <div className="scope-row">
                    <span className="scope-label">Data Isolation:</span>
                    <span className="scope-status">Strict CP-ABE Active</span>
                  </div>
                </div>

                {/* Trainee Leaderboard Privacy Toggle */}
                {currentUser?.role === 'trainee' && (
                  <div className="popover-privacy-box">
                    <div className="privacy-info">
                      <span className="privacy-title">Leaderboard Privacy</span>
                      <span className="privacy-sub">
                        {optOut ? 'Hidden from rankings' : 'Public to corporate cohort'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleOptOut}
                      disabled={optOutLoading}
                      className={`privacy-toggle-btn ${optOut ? 'private' : 'public'}`}
                    >
                      {optOut ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{optOut ? 'Private' : 'Public'}</span>
                    </button>
                  </div>
                )}

                {/* Action: Profile & System Settings */}
                <button
                  type="button"
                  className="popover-action-btn"
                  onClick={() => { setShowSettingsModal(true); setProfileOpen(false); }}
                >
                  <span className="btn-left">
                    <Settings size={15} color="#4f46e5" />
                    <span>Profile & System Settings</span>
                  </span>
                  <span className="btn-tag">
                    {isDark ? '🌙 Dark' : '☀️ Light'}
                  </span>
                </button>

                {/* Action: Security & Clearance Profile */}
                <button
                  type="button"
                  className="popover-action-btn subtle"
                  onClick={() => { setShowDetailsModal(true); setProfileOpen(false); }}
                >
                  <span className="btn-left">
                    <Lock size={14} color="#6366f1" />
                    <span>Security & Clearance Details</span>
                  </span>
                  <ExternalLink size={12} color="#94a3b8" />
                </button>

                {/* Dev Role Switcher */}
                {import.meta.env.DEV && (
                  <div className="popover-dev-section">
                    <button
                      type="button"
                      className="popover-dev-trigger"
                      onClick={() => { setShowRoleModal(true); setProfileOpen(false); }}
                    >
                      <span className="btn-left">
                        <Zap size={15} color="#ea580c" />
                        <span>DEV ROLE SWITCHER</span>
                      </span>
                      <span className="dev-count-pill">{Object.keys(DEMO_USERS).filter(k => k !== 'crossworks_staff' && k !== 'company_staff').length} PERSONAS</span>
                    </button>

                    <button
                      type="button"
                      className="popover-quick-personas-btn"
                      onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                    >
                      <span>Quick Switch Persona</span>
                      <ChevronDown size={12} className={`role-chevron ${showRoleSwitcher ? 'open' : ''}`} />
                    </button>

                    {showRoleSwitcher && (
                      <div className="popover-personas-list">
                        {Object.entries(DEMO_USERS)
                          .filter(([key]) => key !== 'crossworks_staff' && key !== 'company_staff')
                          .map(([key, u]) => {
                            const PersonaIcon = getRoleIcon(u.role);
                            const isSelected = u.email === currentUser?.email;
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`persona-item-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  loginRole(key);
                                  setProfileOpen(false);
                                }}
                              >
                                <PersonaIcon size={13} className="persona-icon" />
                                <div className="persona-text">
                                  <span className="persona-name">{u.name}</span>
                                  <span className="persona-role">{u.title || u.role}</span>
                                </div>
                                {isSelected && <Check size={13} className="persona-check" />}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Sign Out Action */}
                <button
                  type="button"
                  className="popover-logout-btn"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  <span>Sign Out of CrossQuest</span>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Profile & System Settings Modal */}
      <ProfileSettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />

      {/* Developer Multi-Tenant Sandbox Switcher Modal */}
      {import.meta.env.DEV && (
        <DevRoleSwitcherModal 
          isOpen={showRoleModal} 
          onClose={() => setShowRoleModal(false)} 
        />
      )}

      {/* Security & Cryptographic Clearance Modal */}
      {showDetailsModal && (
        <div className="security-details-backdrop">
          <div className="security-details-modal">
            <div className="security-modal-header">
              <div className="modal-title-group">
                <div className="shield-icon-badge">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="modal-title">Security & Clearance Profile</h3>
                  <span className="modal-sub">CrossQuest Zero-Trust Attribute Authority</span>
                </div>
              </div>
              <button
                type="button"
                className="close-modal-icon-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="security-modal-body">
              <div className="security-spec-card">
                <strong className="spec-title">Cryptographic Engine</strong>
                <p className="spec-desc">
                  CP-ABE Waters11 on Barreto-Naehrig 254 curve (BN254). Strict tenant isolation with AES-256-GCM symmetric envelopes.
                </p>
              </div>

              <div className="spec-grid-two">
                <div className="spec-grid-item">
                  <span className="spec-label">Identity ID</span>
                  <code className="spec-code">{currentUser?.id || 'usr-active-01'}</code>
                </div>
                <div className="spec-grid-item">
                  <span className="spec-label">Active Role</span>
                  <strong className="spec-val-role">{userRole}</strong>
                </div>
              </div>

              <div className="spec-grid-item">
                <span className="spec-label">Assigned Scope</span>
                <span className="spec-val-org">
                  {currentUser?.organization || 'Crossworks Enterprise'}
                </span>
              </div>

              <div className="security-auth-status">
                <strong>Authentication Status</strong>
                <span>Valid JWT Session with Row-Level Security Enforced</span>
              </div>
            </div>

            <div className="security-modal-footer">
              <button
                type="button"
                className="close-security-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
