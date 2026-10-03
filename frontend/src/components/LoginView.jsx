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
  Key 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
    { key: 'admin', title: 'Administrator', name: 'Dr. Sarah Jenkins', org: 'Crossworks Admin', icon: Shield },
    { key: 'crossworks_staff', title: 'Account Manager', name: 'Marcus Reyes', org: 'Crossworks Staff', icon: Key },
    { key: 'trainer', title: 'Trainer', name: 'David Lim', org: 'Course Instructor', icon: GraduationCap },
    { key: 'company_staff', title: 'Company Manager', name: 'Patricia Santos', org: 'San Miguel Corp HR', icon: Building2 },
    { key: 'trainee', title: 'Trainee', name: 'Juan Dela Cruz', org: 'Enrolled Learner', icon: Award }
  ];

  return (
    <div className="clean-login-viewport">
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-center">
          <div className="brand-badge-icon">
            <Shield size={28} />
          </div>
          <h1>CrossQuest</h1>
          <p className="login-subtext">Training & Learning Management Platform</p>
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
                <span>Want to test without typing? Switch to <strong>Quick Role Access</strong> above.</span>
              </div>
            </form>
          ) : (
            <div className="demo-roles-panel">
              <p className="demo-intro-text">
                Select any user to log in instantly and explore their designated portal:
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
                      <div className="demo-role-icon">
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
