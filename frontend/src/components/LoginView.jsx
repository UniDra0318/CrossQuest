import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, UserCheck, CheckCircle2, Building2, GraduationCap, Award, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginView() {
  const { login, loginWithCredentials, DEMO_USERS } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      loginWithCredentials(email || 'admin@crossworks.ph', password);
      setLoading(false);
    }, 400);
  };

  const handleRoleQuickSelect = (roleKey) => {
    setLoading(true);
    setTimeout(() => {
      login(roleKey);
      setLoading(false);
    }, 300);
  };

  const roles = [
    {
      key: 'admin',
      title: 'Administrator',
      name: DEMO_USERS.admin.name,
      org: DEMO_USERS.admin.organization,
      icon: Shield,
      badge: 'Security Authority',
      desc: 'CP-ABE attribute issuance & access anomaly monitoring'
    },
    {
      key: 'crossworks_staff',
      title: 'Crossworks Staff',
      name: DEMO_USERS.crossworks_staff.name,
      org: 'Account Management',
      icon: Key,
      badge: 'Assigned Clients',
      desc: 'Authorized multi-client records & reporting'
    },
    {
      key: 'trainer',
      title: 'Trainer',
      name: DEMO_USERS.trainer.name,
      org: 'Course Delivery',
      icon: GraduationCap,
      badge: 'Instruction',
      desc: 'Grading, practical labs & encrypted record publishing'
    },
    {
      key: 'company_staff',
      title: 'Company Staff',
      name: DEMO_USERS.company_staff.name,
      org: DEMO_USERS.company_staff.organization,
      icon: Building2,
      badge: 'Client HR/L&D',
      desc: 'Isolated client training records & compliance audits'
    },
    {
      key: 'trainee',
      title: 'Trainee',
      name: DEMO_USERS.trainee.name,
      org: 'San Miguel Trainee',
      icon: Award,
      badge: 'Learner Quest',
      desc: 'Interactive quizzes, badges, and certification tracking'
    }
  ];

  return (
    <div className="login-page-container">
      <div className="login-backdrop-glow" />

      {/* Brand Header */}
      <header className="login-nav-header">
        <div className="flex-align gap-12">
          <div className="brand-logo-circle">
            <Shield size={22} className="text-cyan" />
          </div>
          <div>
            <div className="login-brand-title">CrossQuest</div>
            <div className="login-brand-subtitle">Crossworks Training & Consulting Corp.</div>
          </div>
        </div>
        <div className="login-header-pills">
          <span className="badge badge-purple">ISO/IEC 27001:2022</span>
          <span className="badge badge-blue">CP-ABE Waters11</span>
        </div>
      </header>

      {/* Main Content: Split Card */}
      <main className="login-content-box">
        {/* Left Side: Standard Credentials Login */}
        <div className="login-form-pane card">
          <div className="form-header">
            <h2>Welcome Back</h2>
            <p className="text-secondary text-sm">
              Sign in with your enterprise credentials to access your designated role portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-field">
              <label className="field-label">Enterprise Email</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="clean-input"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <div className="flex-between">
                <label className="field-label">Password</label>
                <a href="#forgot" className="forgot-link text-xs">Forgot password?</a>
              </div>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="clean-input"
                  required
                />
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-wrap">
                <input type="checkbox" defaultChecked />
                <span>Keep me signed in on this terminal</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="form-security-footer">
            <div className="flex-align gap-8 text-xs text-secondary">
              <CheckCircle2 size={14} className="text-emerald" />
              <span>TLS 1.3 End-to-End Encryption • Hardware RLS Bound</span>
            </div>
          </div>
        </div>

        {/* Right Side: Instant Role Selector */}
        <div className="role-switch-pane card">
          <div className="role-pane-header">
            <h3>Quick Role Selector</h3>
            <p className="text-secondary text-xs">
              Test each role's distinct UI, permissions, and CP-ABE attribute scope:
            </p>
          </div>

          <div className="role-buttons-grid">
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.key}
                  className="role-select-card"
                  onClick={() => handleRoleQuickSelect(r.key)}
                >
                  <div className="role-card-top">
                    <div className="role-icon-box">
                      <Icon size={18} />
                    </div>
                    <span className="badge badge-blue">{r.badge}</span>
                  </div>

                  <div className="role-card-body">
                    <div className="role-card-title">{r.title}</div>
                    <div className="role-card-name">{r.name}</div>
                    <p className="role-card-desc">{r.desc}</p>
                  </div>

                  <div className="role-card-footer">
                    <span>Enter Portal</span>
                    <ArrowRight size={13} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
