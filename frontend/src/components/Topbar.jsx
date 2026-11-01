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
  Award,
  Lock,
  Eye,
  EyeOff,
  X,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toggleLeaderboardOptOut } from '../services/api';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

/**
 * Topbar - global header bar rendered by MainAppShell for all authenticated roles.
 * Includes official logo, contextual view title, live streak indicator, and a fully functional profile.
 */
export default function Topbar({ activeViewTitle, streakDays }) {
  const { currentUser, token, loginRole, logout, DEMO_USERS } = useAuth();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [optOut, setOptOut] = useState(false);
  const [optOutLoading, setOptOutLoading] = useState(false);

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

        {/* Right: Streak (Trainees only) and Functional Profile Menu */}
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Streak Pill - Trainees only */}
          {currentUser?.role === 'trainee' && (
            <div className="gamified-stat-pill streak-pill">
              <Flame size={16} className="stat-flame-icon" />
              <span className="stat-num">
                {streakDays !== null && streakDays !== undefined ? streakDays : '...'}
              </span>
              <span className="stat-label">DAY STREAK</span>
            </div>
          )}

          {/* CP-ABE Live Sandbox for Capstone Defense Panelists */}
          <button 
            type="button"
            onClick={() => navigate('/crypto-lab')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '12px',
              boxShadow: '0 2px 10px rgba(124, 58, 237, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Open Interactive CP-ABE Cryptographic Sandbox for Capstone Defense"
          >
            <Shield size={13} />
            <span>CP-ABE Lab</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
          </button>

          {/* Interactive Profile Menu Trigger */}
          <div className="role-dropdown-wrapper" style={{ position: 'relative' }}>
            <button 
              type="button"
              className={`role-selector-trigger ${profileOpen ? 'active' : ''}`}
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px 6px 8px',
                borderRadius: '12px',
                background: profileOpen ? '#eef2ff' : '#f8fafc',
                border: profileOpen ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Open User Profile & Account Settings"
            >
              <div className="topbar-user-avatar" style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '12px',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
              }}>
                {currentUser?.initials || <CurrentRoleIcon size={16} />}
              </div>
              <div className="role-trigger-info" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <span className="role-trigger-name" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  {currentUser?.name || 'User'}
                </span>
                <span className="role-trigger-badge" style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {userRole === 'trainee' ? 'Trainee' : userRole.replace(/_/g, ' ')}
                </span>
              </div>
              <ChevronDown size={14} className={`role-chevron ${profileOpen ? 'open' : ''}`} color="#64748b" />
            </button>

            {/* Profile Popover Card */}
            {profileOpen && (
              <>
                <div 
                  className="dropdown-backdrop" 
                  onClick={() => { setProfileOpen(false); setShowRoleSwitcher(false); }}
                  style={{ position: 'fixed', inset: 0, zIndex: 250 }}
                />
                <div 
                  className="role-popover-card"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '320px',
                    zIndex: 260,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Popover Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '800',
                      boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
                    }}>
                      {currentUser?.initials || <CurrentRoleIcon size={20} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentUser?.name || 'Juan Dela Cruz'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentUser?.email || 'user@crossquest.ph'}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', padding: '2px 8px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
                        <CurrentRoleIcon size={11} />
                        <span>{userRole.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Organization & Scope Specs */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Organization:</span>
                      <strong style={{ color: '#0f172a', textAlign: 'right', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUser?.organization || 'Crossworks Enterprise'}
                      </strong>
                    </div>
                    {currentUser?.trainee_code && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>Trainee Code:</span>
                        <code style={{ color: '#4f46e5', fontWeight: '700' }}>{currentUser.trainee_code}</code>
                      </div>
                    )}
                    {currentUser?.assigned_companies && currentUser.assigned_companies.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>Client Scope:</span>
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>
                          {currentUser.assigned_companies.join(', ')}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>Data Isolation:</span>
                      <span style={{ color: '#059669', fontWeight: '700' }}>Strict CP-ABE Active</span>
                    </div>
                  </div>

                  {/* Trainee Leaderboard Privacy Toggle */}
                  {currentUser?.role === 'trainee' && (
                    <div style={{ background: '#fdf4ff', border: '1px solid #fae8ff', borderRadius: '10px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#86198f' }}>Leaderboard Privacy</span>
                        <span style={{ fontSize: '11px', color: '#a21caf' }}>
                          {optOut ? 'Hidden from rankings' : 'Public to corporate cohort'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleOptOut}
                        disabled={optOutLoading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          border: 'none',
                          cursor: 'pointer',
                          background: optOut ? '#9333ea' : '#e2e8f0',
                          color: optOut ? '#ffffff' : '#475569'
                        }}
                      >
                        {optOut ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{optOut ? 'Private' : 'Public'}</span>
                      </button>
                    </div>
                  )}

                  {/* Action: View Cryptographic Details Modal */}
                  <button
                    type="button"
                    onClick={() => { setShowDetailsModal(true); setProfileOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={13} color="#6366f1" />
                      <span>Security & Clearance Details</span>
                    </span>
                    <ExternalLink size={12} color="#94a3b8" />
                  </button>

                  {/* Dev Role Switcher Section */}
                  {import.meta.env.DEV && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <span>DEV ROLE SWITCHER</span>
                        <ChevronDown size={12} className={`role-chevron ${showRoleSwitcher ? 'open' : ''}`} />
                      </button>

                      {showRoleSwitcher && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                          {Object.entries(DEMO_USERS)
                            .filter(([key]) => key !== 'crossworks_staff' && key !== 'company_staff')
                            .map(([key, u]) => {
                              const RoleIcon = getRoleIcon(u.role);
                              const isSelected = u.role === currentUser?.role;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    loginRole(key);
                                    setProfileOpen(false);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: isSelected ? '#eef2ff' : 'transparent',
                                    color: isSelected ? '#4338ca' : '#475569',
                                    fontSize: '12px',
                                    fontWeight: isSelected ? '700' : '600',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                  }}
                                >
                                  <RoleIcon size={13} color={isSelected ? '#4f46e5' : '#94a3b8'} />
                                  <span style={{ flex: 1 }}>{u.name}</span>
                                  {isSelected && <Check size={13} color="#4f46e5" />}
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
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out of CrossQuest</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Security & Cryptographic Clearance Modal */}
      {showDetailsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px 28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    Security & Clearance Profile
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    CrossQuest Zero-Trust Attribute Authority
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Cryptographic Engine</strong>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
                  CP-ABE Waters11 on Barreto-Naehrig 254 curve (BN254). Strict tenant isolation with AES-256-GCM symmetric envelopes.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Identity ID</span>
                  <code style={{ fontSize: '12px', color: '#0f172a' }}>{currentUser?.id || 'usr-active-01'}</code>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Active Role</span>
                  <strong style={{ color: '#4338ca', fontSize: '12px', textTransform: 'uppercase' }}>{userRole}</strong>
                </div>
              </div>

              <div style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Assigned Scope</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                  {currentUser?.organization || 'Crossworks Enterprise'}
                </span>
              </div>

              <div style={{ padding: '10px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }}>
                <strong style={{ display: 'block', fontSize: '12px' }}>Authentication Status</strong>
                <span style={{ fontSize: '12px' }}>Valid JWT Session with Row-Level Security Enforced</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
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
