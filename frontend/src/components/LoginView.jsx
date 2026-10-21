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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

export default function LoginView() {
  const { loginRole, loginWithCredentials, DEMO_USERS } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'demo'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await loginWithCredentials(email, password);
    setLoading(false);
    navigate('/dashboard');
  };

  const handleRoleQuickSelect = (roleKey) => {
    loginRole(roleKey);
    navigate('/dashboard');
  };

  const roleList = [
    { key: 'admin', title: 'Administrator', name: 'Dr. Sarah Jenkins', org: 'Crossworks Admin', icon: Shield, badgeClass: 'admin' },
    { key: 'account_manager', title: 'Account Manager', name: 'Marcus Reyes', org: 'Crossworks Staff', icon: Key, badgeClass: 'staff' },
    { key: 'finance', title: 'Finance & Operations', name: 'Elena Santos', org: 'Crossworks Finance', icon: Building2, badgeClass: 'company' },
    { key: 'trainer', title: 'Lead Trainer', name: 'David Lim', org: 'Course Instructor', icon: GraduationCap, badgeClass: 'trainer' },
    { key: 'trainee', title: 'Trainee Learner', name: 'Juan Dela Cruz', org: 'San Miguel Corp', icon: Award, badgeClass: 'trainee' }
  ];

  return (
    <div className="clean-login-viewport">
      {/* Top Bar with Return to Landing Page */}
      <div className="login-top-bar">
        <button type="button" className="login-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={15} />
          <span>Back to Landing Page</span>
        </button>
        <div className="login-badge-pill">
          <Sparkles size={12} />
          <span>ENTERPRISE LMS</span>
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
          {/* Tabs: Sign In vs Quick Demo Roles */}
          <div className="login-toggle-tabs">
            <button
              type="button"
              className={`toggle-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
              onClick={() => setActiveTab('credentials')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`toggle-tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
              onClick={() => setActiveTab('demo')}
            >
              Quick Role Access
            </button>
          </div>

          {activeTab === 'credentials' ? (
            <form onSubmit={handleSubmit} className="clean-login-form">
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

              <div className="login-footer-hint">
                <span>Want instant demo access? Switch to <strong onClick={() => setActiveTab('demo')}>Quick Role Access</strong> above.</span>
              </div>
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
        </div>
      </div>
    </div>
  );
}
