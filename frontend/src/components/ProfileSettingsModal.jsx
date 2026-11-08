import React, { useState } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Monitor, 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Lock, 
  Check, 
  Key, 
  Building2, 
  Mail, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Sparkles,
  Phone,
  Globe,
  Clock,
  Layers,
  Send,
  QrCode,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { setupMfaApi, enableMfaApi } from '../services/api';

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const { currentUser, token, DEMO_USERS } = useAuth();
  const { 
    theme, 
    setTheme, 
    isDark, 
    soundEffects, 
    setSoundEffects,
    compactMode, 
    setCompactMode,
    highContrast, 
    setHighContrast,
    notificationsEnabled, 
    setNotificationsEnabled 
  } = useTheme();

  const [activeTab, setActiveTab] = useState('appearance');
  const [displayName, setDisplayName] = useState(currentUser?.display_name || currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '+63 917 123 4567');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // MFA Enrollment State
  const [showMfaEnroll, setShowMfaEnroll] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrUri, setMfaQrUri] = useState('');
  const [mfaInputCode, setMfaInputCode] = useState('');
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);
  const [mfaSetupError, setMfaSetupError] = useState(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState([]);
  const [mfaCopied, setMfaCopied] = useState(false);

  const handleStartMfaSetup = async () => {
    setShowMfaEnroll(true);
    setMfaSetupLoading(true);
    setMfaSetupError(null);
    setMfaRecoveryCodes([]);
    try {
      const data = await setupMfaApi(token);
      setMfaSecret(data.secret);
      setMfaQrUri(data.qr_code_uri);
    } catch (err) {
      setMfaSetupError(err.message || 'Failed to start MFA setup. Please check connection.');
    } finally {
      setMfaSetupLoading(false);
    }
  };

  const handleConfirmMfa = async (e) => {
    e.preventDefault();
    if (!mfaInputCode.trim()) return;
    setMfaSetupLoading(true);
    setMfaSetupError(null);
    try {
      const res = await enableMfaApi(mfaSecret, mfaInputCode.trim(), token);
      setMfaRecoveryCodes(res.recovery_codes || []);
    } catch (err) {
      setMfaSetupError(err.message || 'Invalid verification code. Please check your authenticator.');
    } finally {
      setMfaSetupLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    // Save profile display adjustments to localStorage
    if (currentUser) {
      try {
        const savedUser = localStorage.getItem('crossquest_auth_user');
        const userObj = savedUser ? JSON.parse(savedUser) : { ...currentUser };
        userObj.display_name = displayName;
        userObj.phone = phone;
        localStorage.setItem('crossquest_auth_user', JSON.stringify(userObj));
      } catch (e) {
        console.warn('Failed to persist user profile tweaks:', e);
      }
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRequestPasswordReset = () => {
    setResetEmailSent(true);
    setTimeout(() => setResetEmailSent(false), 4000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      padding: '16px'
    }}>
      <div 
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: isDark ? '#111827' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9',
          background: isDark ? '#0f172a' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <Palette size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Profile & System Settings
              </h2>
              <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                Personalize dark mode, notification preferences, security clearance & profile
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          background: isDark ? '#0f172a' : '#ffffff',
          borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
          overflowX: 'auto'
        }}>
          {[
            { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
            { id: 'profile', label: 'Profile Details', icon: User },
            { id: 'security', label: 'Security & Clearance', icon: Shield },
            { id: 'notifications', label: 'Alerts & Audio', icon: Bell }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  background: isActive 
                    ? (isDark ? '#1e293b' : '#eef2ff') 
                    : 'transparent',
                  color: isActive 
                    ? (isDark ? '#38bdf8' : '#4338ca') 
                    : (isDark ? '#94a3b8' : '#64748b'),
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Tab Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>

          {/* TAB 1: APPEARANCE & THEMES (DARK MODE) */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800' }}>Color Theme</h4>
                <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  Choose your preferred workspace interface contrast and illumination.
                </p>
              </div>

              {/* Theme Choice Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Crisp daytime view', bg: '#ffffff', fg: '#0f172a', border: '#e2e8f0' },
                  { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep obsidian theme', bg: '#090d16', fg: '#f8fafc', border: '#334155' },
                  { id: 'system', label: 'System Default', icon: Monitor, desc: 'Sync with OS setting', bg: isDark ? '#1e293b' : '#f1f5f9', fg: isDark ? '#f8fafc' : '#0f172a', border: '#cbd5e1' }
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSelected = theme === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setTheme(opt.id)}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        border: isSelected 
                          ? '2px solid #6366f1' 
                          : `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        background: isDark ? '#1e293b' : '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: opt.bg,
                          color: opt.fg,
                          border: `1px solid ${opt.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon size={18} />
                        </div>
                        {isSelected && (
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#4f46e5',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>{opt.label}</span>
                      <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>{opt.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Accessibility & Density Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h5 style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#94a3b8' : '#64748b' }}>
                  Interface Accessibility
                </h5>

                {/* High Contrast */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
                }}>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '13px', display: 'block' }}>High-Contrast Borders</span>
                    <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>Increases card stroke and button outline visibility (WCAG AAA)</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                  />
                </div>

                {/* Compact Mode */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
                }}>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '13px', display: 'block' }}>Compact Table & Grid Density</span>
                    <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>Tightens layout spacing to fit more audit logs and records per page</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={compactMode}
                    onChange={(e) => setCompactMode(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '16px', background: isDark ? '#1e293b' : '#f8fafc', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: '800',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}>
                  {currentUser?.initials || 'U'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>{currentUser?.name || 'User'}</h3>
                  <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>{currentUser?.email}</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', padding: '2px 8px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                    <span>{currentUser?.role?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    Display Handle / Gamer Tag
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '13px'
                    }}
                    placeholder="e.g. CyberKnight9021"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '13px'
                    }}
                    placeholder="+63 917 123 4567"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    Organization Affiliation
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.organization || 'Crossworks Enterprise'}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      opacity: 0.75,
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    Enterprise Scope Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.company_code || currentUser?.assigned_companies?.[0] || 'CROSSWORKS_HQ'}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      opacity: 0.75,
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '12px', background: isDark ? '#1e293b' : '#f1f5f9', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={16} color="#6366f1" />
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  Regional Timezone: <strong>Asia/Manila (PHT, UTC+8)</strong> — Audit events and streak sweep deadlines align to Philippine Standard Time.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & CLEARANCE */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', borderRadius: '16px', background: isDark ? '#1e293b' : '#f8fafc', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={20} color="#10b981" />
                    <div>
                      <span style={{ fontWeight: '800', fontSize: '14px', display: 'block' }}>Two-Factor Authentication (MFA / TOTP)</span>
                      <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>Cryptographic RFC 6238 time-based authenticator active</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleStartMfaSetup}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #10b981',
                        background: 'transparent',
                        color: '#10b981',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Configure TOTP
                    </button>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: '800' }}>
                      ENFORCED
                    </span>
                  </div>
                </div>

                {/* Inline MFA Setup Drawer */}
                {showMfaEnroll && (
                  <div style={{
                    marginTop: '8px',
                    padding: '16px',
                    borderRadius: '12px',
                    background: isDark ? '#0f172a' : '#f1f5f9',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <QrCode size={16} /> Link Google Authenticator
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMfaEnroll(false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b' }}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {mfaSetupLoading && (
                      <div style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', padding: '16px' }}>
                        Generating TOTP Secret and QR code...
                      </div>
                    )}

                    {mfaSetupError && (
                      <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px', marginBottom: '10px' }}>
                        {mfaSetupError}
                      </div>
                    )}

                    {mfaRecoveryCodes.length > 0 ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>
                          <CheckCircle2 size={16} /> Authenticator Successfully Linked!
                        </div>
                        <p style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 10px 0' }}>
                          Save these single-use recovery codes in a secure password manager. Each code can be used once if you lose device access:
                        </p>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px',
                          background: isDark ? '#1e293b' : '#ffffff',
                          padding: '12px',
                          borderRadius: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
                        }}>
                          {mfaRecoveryCodes.map((code, idx) => (
                            <div key={idx} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>{code}</div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(mfaRecoveryCodes.join('\n'));
                            setMfaCopied(true);
                            setTimeout(() => setMfaCopied(false), 2000);
                          }}
                          style={{
                            marginTop: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: isDark ? '#334155' : '#e2e8f0',
                            border: 'none',
                            color: isDark ? '#f8fafc' : '#1e293b',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Copy size={13} />
                          {mfaCopied ? 'Copied to Clipboard!' : 'Copy Recovery Codes'}
                        </button>
                      </div>
                    ) : (
                      mfaSecret && (
                        <div>
                          <p style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 12px 0' }}>
                            Scan this QR code in Google Authenticator or enter the secret key manually:
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            {mfaQrUri && (
                              <img
                                src={mfaQrUri}
                                alt="TOTP QR Code"
                                style={{
                                  width: '160px',
                                  height: '160px',
                                  borderRadius: '8px',
                                  border: '4px solid #ffffff',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                              />
                            )}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: isDark ? '#1e293b' : '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <span>Key: {mfaSecret}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(mfaSecret);
                                  setMfaCopied(true);
                                  setTimeout(() => setMfaCopied(false), 2000);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                <Copy size={13} color={mfaCopied ? '#10b981' : (isDark ? '#94a3b8' : '#64748b')} />
                              </button>
                            </div>
                          </div>

                          <form onSubmit={handleConfirmMfa} style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="6-digit code"
                              value={mfaInputCode}
                              onChange={(e) => setMfaInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              maxLength={6}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                                background: isDark ? '#1e293b' : '#ffffff',
                                color: isDark ? '#f8fafc' : '#0f172a',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: '700',
                                fontSize: '14px',
                                textAlign: 'center',
                                letterSpacing: '4px'
                              }}
                            />
                            <button
                              type="submit"
                              disabled={mfaSetupLoading || mfaInputCode.length !== 6}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: '#10b981',
                                border: 'none',
                                color: '#ffffff',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: (mfaSetupLoading || mfaInputCode.length !== 6) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              Verify & Activate
                            </button>
                          </form>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div style={{ height: '1px', background: isDark ? '#334155' : '#e2e8f0' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={20} color="#6366f1" />
                    <div>
                      <span style={{ fontWeight: '800', fontSize: '14px', display: 'block' }}>CP-ABE Clearance Token</span>
                      <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>Attribute-Based Encryption policy token active in session memory</span>
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#eef2ff', color: '#4338ca', fontSize: '11px', fontWeight: '800' }}>
                    {currentUser?.role === 'admin' ? 'LEVEL 3 ROOT CLEARANCE' : (currentUser?.role === 'account_manager' || currentUser?.role === 'finance') ? 'LEVEL 2 SUPERVISOR CLEARANCE' : 'LEVEL 1 STANDARD CLEARANCE'}
                  </span>
                </div>

                <div style={{ height: '1px', background: isDark ? '#334155' : '#e2e8f0' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={20} color="#f59e0b" />
                    <div>
                      <span style={{ fontWeight: '800', fontSize: '14px', display: 'block' }}>Role-Based Session Idle Timeout</span>
                      <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>Auto-locks inactive sessions after 15 minutes of inactivity</span>
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#fffbeb', color: '#b45309', fontSize: '11px', fontWeight: '800' }}>
                    15-MIN IDLE
                  </span>
                </div>
              </div>

              {/* Password Reset Request Trigger (FR-26) */}
              <div style={{ padding: '16px', borderRadius: '16px', background: isDark ? '#1e293b' : '#f8fafc', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '13.5px', display: 'block' }}>Password Reset Request (FR-26)</span>
                  <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    Triggers a time-bounded, single-use password reset link to your registered corporate email.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPasswordReset}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: resetEmailSent ? '#10b981' : '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {resetEmailSent ? <Check size={14} /> : <Send size={14} />}
                  <span>{resetEmailSent ? 'Sent to Email!' : 'Request Reset Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ALERTS & AUDIO */}
          {activeTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '14px',
                background: isDark ? '#1e293b' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {soundEffects ? <Volume2 size={20} color="#10b981" /> : <VolumeX size={20} color="#94a3b8" />}
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '13.5px', display: 'block' }}>Quiz & Gamification Audio Effects</span>
                    <span style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Plays interactive audio cues when claiming XP, completing streak days, or submitting quiz steps.
                    </span>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '14px',
                background: isDark ? '#1e293b' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bell size={20} color="#6366f1" />
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '13.5px', display: 'block' }}>Certification Expiry Alert Sweeps</span>
                    <span style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Automated 60-day, 30-day, and 7-day email warnings before corporate certificates expire (FR-18).
                    </span>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '14px',
                background: isDark ? '#1e293b' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Sparkles size={20} color="#f59e0b" />
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '13.5px', display: 'block' }}>Daily Streak Preservation Reminders</span>
                    <span style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                      Sends a gentle reminder at 5:00 PM PHT if you have not yet completed your daily training assessment.
                    </span>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  defaultChecked
                  style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9',
          background: isDark ? '#0f172a' : '#f8fafc'
        }}>
          <div>
            {saveSuccess && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px', fontWeight: '700' }}>
                <Check size={16} /> Preferences saved successfully!
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                background: 'transparent',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                color: isDark ? '#cbd5e1' : '#475569',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              <Check size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

