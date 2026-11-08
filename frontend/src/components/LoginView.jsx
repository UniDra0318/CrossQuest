import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight, 
  User, 
  Building2, 
  GraduationCap, 
  Award, 
  Key,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

export default function LoginView() {
  const { loginRole, loginWithCredentials, completeMfaLogin, DEMO_USERS } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'demo'

  // MFA Challenge State (SEC-01, OI-26)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState(null);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaUserMeta, setMfaUserMeta] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    const result = await loginWithCredentials(email, password);
    setLoading(false);

    if (result?.mfa_required) {
      setMfaRequired(true);
      setChallengeToken(result.challenge_token);
      setMfaUserMeta({ name: result.full_name, role: result.role, email });
      return;
    }

    if (!result?.success) {
      setLoginError(result?.error || 'Invalid email or password. Please verify your credentials.');
      return;
    }

    if (result?.user?.role === 'finance') {
      navigate('/finance/reconciliation');
    } else {
      navigate('/dashboard');
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode.trim()) return;
    setMfaLoading(true);
    setMfaError(null);

    const result = await completeMfaLogin(challengeToken, mfaCode.trim());
    setMfaLoading(false);

    if (!result?.success) {
      setMfaError(result?.error || 'Invalid verification code. Please check your authenticator app and try again.');
      return;
    }

    if (result?.user?.role === 'finance') {
      navigate('/finance/reconciliation');
    } else {
      navigate('/dashboard');
    }
  };

  const handleBackToCredentials = () => {
    setMfaRequired(false);
    setChallengeToken('');
    setMfaCode('');
    setMfaError(null);
    setUseRecoveryCode(false);
  };

  const handleRoleQuickSelect = async (roleKey) => {
    const user = await loginRole(roleKey);
    if (roleKey === 'finance' || user?.role === 'finance') {
      navigate('/finance/reconciliation');
    } else {
      navigate('/dashboard');
    }
  };

  const roleList = [
    { key: 'admin', title: 'Administrator', name: 'Dr. Sarah Jenkins', org: 'Crossworks Admin', icon: Shield, badgeClass: 'admin' },
    { key: 'admin_roel', title: 'Co-Administrator', name: 'Prof. Roel Traballo', org: 'Crossworks Admin', icon: Shield, badgeClass: 'admin' },
    { key: 'account_manager', title: 'Account Manager (Vertiv & Red Oak)', name: 'Sharon De Vera', org: 'VHL_2 • ROP_3', icon: Key, badgeClass: 'staff' },
    { key: 'am_brian', title: 'Account Manager (IPRoyal & Amihan)', name: 'Brian Mendoza', org: 'IPROY_SERVI_2 • AMIHAN_SOLUTI_2', icon: Key, badgeClass: 'staff' },
    { key: 'staff_vertiv', title: 'Client HR / L&D Manager', name: 'Elena Vance', org: 'Vertiv Holdings Ltd (VHL_2)', icon: Building2, badgeClass: 'company' },
    { key: 'trainer', title: 'Lead Trainer (Cybersecurity & GenAI)', name: 'Joey Ramos', org: 'Crossworks Lead Trainer', icon: GraduationCap, badgeClass: 'trainer' },
    { key: 'trainer_billy', title: 'Senior Trainer (Cloud & Infra)', name: 'Billy Fernandez', org: 'Crossworks Senior Trainer', icon: GraduationCap, badgeClass: 'trainer' },
    { key: 'trainee', title: 'Trainee (Vertiv Holdings)', name: 'Andrea Aguilar', org: 'VHL_2 • TRN-8000', icon: Award, badgeClass: 'trainee' },
    { key: 'trainee_ricardo', title: 'Trainee (IPRoyal Services)', name: 'Ricardo Ocampo', org: 'IPROY_SERVI_2 • TRN-8001', icon: Award, badgeClass: 'trainee' },
    { key: 'trainee_bea', title: 'Trainee (IPRoyal Services)', name: 'Bea Macaraeg', org: 'IPROY_SERVI_2 • TRN-8002', icon: Award, badgeClass: 'trainee' },
    { key: 'trainee_rafael', title: 'Trainee (Amihan Solutions)', name: 'Rafael Dizon', org: 'AMIHAN_SOLUTI_2 • TRN-8015', icon: Award, badgeClass: 'trainee' }
  ];

  return (
    <div className="clean-login-viewport">
      {/* Top Bar with Return to Landing Page & Theme Toggle */}
      <div className="login-top-bar">
        <button type="button" className="login-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={15} />
          <span>Back to Landing Page</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ width: '32px', height: '32px' }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className="login-badge-pill">
            <Sparkles size={12} />
            <span>ENTERPRISE LMS</span>
          </div>
        </div>
      </div>

      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-center">
          <div className="login-brand-logo-wrap" onClick={() => navigate('/')} title="Go to CrossQuest Home">
            <img src={logoStacked} alt="CrossQuest Logo" className="login-brand-logo-img" />
            <span className="logo__tag">ENTERPRISE LEARNING</span>
          </div>
          <h1 className="login-brand-heading">Sign In to CrossQuest</h1>
          <p className="login-brand-subtext">Access your training quests, track skill streaks, and unlock certifications.</p>
        </div>

        {/* Card */}
        <div className="card-login-box">
          {mfaRequired ? (
            /* MFA / Google Authenticator Challenge (SEC-01, OI-26) */
            <div className="mfa-challenge-panel">
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: '#10b981'
                }}>
                  <Shield size={26} />
                </div>
                <h2 style={{ fontSize: '19px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
                  Two-Factor Authentication
                </h2>
                <p style={{ fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', margin: 0, lineHeight: 1.5 }}>
                  {useRecoveryCode
                    ? 'Enter one of your single-use backup recovery codes to verify identity.'
                    : 'Enter the 6-digit verification code from your Google Authenticator app.'}
                </p>
                {mfaUserMeta?.email && (
                  <div style={{
                    marginTop: '10px',
                    display: 'inline-block',
                    padding: '3px 12px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    fontFamily: 'var(--font-mono)',
                    background: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 165, 233, 0.08)',
                    color: isDark ? '#38bdf8' : '#0284c7'
                  }}>
                    {mfaUserMeta.email}
                  </div>
                )}
              </div>

              <form onSubmit={handleMfaSubmit} className="clean-login-form">
                <div className="login-input-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{useRecoveryCode ? 'Backup Recovery Code' : 'Authenticator Code'}</span>
                    <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'normal' }}>
                      {useRecoveryCode ? 'e.g. RECO-1111' : '6 digits'}
                    </span>
                  </label>
                  <div className="input-field-wrap">
                    <Key size={16} className="input-field-icon" />
                    <input
                      type="text"
                      placeholder={useRecoveryCode ? 'RECO-XXXX' : '000000'}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(useRecoveryCode ? e.target.value.toUpperCase() : e.target.value.replace(/\s+/g, ''))}
                      maxLength={useRecoveryCode ? 16 : 8}
                      autoFocus
                      required
                      style={{
                        letterSpacing: useRecoveryCode ? '2px' : '6px',
                        fontSize: '18px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-mono)',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>

                {mfaError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                    border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #fecaca',
                    color: isDark ? '#fca5a5' : '#b91c1c',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{mfaError}</span>
                  </div>
                )}

                <button type="submit" className="login-submit-btn" disabled={mfaLoading || !mfaCode.trim()}>
                  <span>{mfaLoading ? 'Verifying Code...' : 'Verify & Sign In'}</span>
                  <ArrowRight size={16} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(!useRecoveryCode);
                      setMfaCode('');
                      setMfaError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isDark ? '#38bdf8' : '#0284c7',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '4px',
                      textDecoration: 'underline'
                    }}
                  >
                    {useRecoveryCode ? 'Use Google Authenticator code instead' : 'Use a backup recovery code instead'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToCredentials}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    ← Back to email sign in
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Tabs: Sign In vs Quick Demo Roles */}
              <div className="login-toggle-tabs">
                <button
                  type="button"
                  className={`toggle-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
                  onClick={() => setActiveTab('credentials')}
                >
                  Sign In
                </button>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    className={`toggle-tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
                    onClick={() => setActiveTab('demo')}
                  >
                    Quick Role Access (Dev)
                  </button>
                )}
              </div>

              {activeTab === 'credentials' || !import.meta.env.DEV ? (
                <form onSubmit={handleSubmit} className="clean-login-form">
                  {loginError && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                      border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #fecaca',
                      color: isDark ? '#fca5a5' : '#b91c1c',
                      fontSize: '12.5px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="login-input-group">
                    <label>Email Address</label>
                    <div className="input-field-wrap">
                      <Mail size={16} className="input-field-icon" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="login-input-group">
                    <label>Password</label>
                    <div className="input-field-wrap">
                      <Lock size={16} className="input-field-icon" />
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="login-form-extras">
                    <label className="remember-checkbox">
                      <input type="checkbox" defaultChecked />
                      <span>Remember me</span>
                    </label>
                    <a href="#forgot" className="forgot-pass-link">Forgot password?</a>
                  </div>

                  <button type="submit" className="login-submit-btn" disabled={loading}>
                    <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                    <ArrowRight size={16} />
                  </button>

                  {import.meta.env.DEV && (
                    <div className="login-footer-hint">
                      <span>Development mode active. Switch to <strong onClick={() => setActiveTab('demo')}>Quick Role Access</strong> above to test personas.</span>
                    </div>
                  )}
                </form>
              ) : (
                <div className="demo-roles-panel">
                  <p className="demo-intro-text">
                    Select any user persona to sign in instantly and explore their designated portal:
                  </p>

                  <div className="demo-roles-stack">
                    {roleList.map((r) => {
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          className="demo-role-card-btn"
                          onClick={() => handleRoleQuickSelect(r.key)}
                        >
                          <div className={`demo-role-icon ${r.badgeClass}`}>
                            <Icon size={18} />
                          </div>
                          <div className="demo-role-details">
                            <div className="demo-role-title">{r.title}</div>
                            <div className="demo-role-person">{r.name} • {r.org}</div>
                          </div>
                          <ArrowRight size={15} className="demo-role-arrow" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
