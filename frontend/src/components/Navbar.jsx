import React from 'react';
import { Shield, Sparkles, UserCheck, Wifi, WifiOff, Lock, ChevronDown } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  currentStaff,
  setCurrentStaff,
  staffProfiles,
  isOnline
}) {
  return (
    <header className="navbar-container">
      {/* Top Banner: Status & Engine info */}
      <div className="top-status-bar">
        <div className="status-badges-group">
          <span className="badge badge-cyan">
            <Lock size={12} /> CP-ABE: Waters11 (SS512)
          </span>
          <span className="badge badge-purple">
            <Shield size={12} /> RLS: Enforced
          </span>
          <span className={`badge ${isOnline ? 'badge-emerald' : 'badge-rose'}`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'PWA Online' : 'PWA Offline Cache Active'}
          </span>
        </div>
        <div className="system-org-tag">
          Crossworks Training & Consulting Corp.
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="main-nav glass-panel">
        <div className="brand-section">
          <div className="logo-icon pulse-glow">
            <Shield className="logo-glyph" size={24} />
          </div>
          <div>
            <h1 className="brand-title">
              Cross<span className="text-gradient">Quest</span>
            </h1>
            <p className="brand-subtitle">Secure Multi-Client Training Record Management</p>
          </div>
        </div>

        {/* Portal Switcher */}
        <div className="portal-switcher">
          <button
            id="nav-staff-portal-btn"
            className={`portal-tab ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Shield size={16} />
            <span>Staff Security & Records</span>
          </button>
          <button
            id="nav-trainee-portal-btn"
            className={`portal-tab ${activeTab === 'trainee' ? 'active' : ''}`}
            onClick={() => setActiveTab('trainee')}
          >
            <Sparkles size={16} />
            <span>Trainee Quest & Badges</span>
          </button>
        </div>

        {/* Staff Simulation Dropdown */}
        <div className="staff-selector-wrap">
          <div className="staff-selector-label">
            <UserCheck size={14} /> Active Persona
          </div>
          <div className="select-container">
            <select
              id="staff-profile-selector"
              value={currentStaff.id}
              onChange={(e) => {
                const found = staffProfiles.find(p => p.id === e.target.value);
                if (found) setCurrentStaff(found);
              }}
              className="staff-select"
            >
              {staffProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.avatar} {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
        </div>
      </nav>

      {/* Active Persona Attribute Ribbon */}
      <div className="attribute-ribbon">
        <div className="attribute-item">
          <span className="attr-label">Role:</span>
          <span className="attr-value badge badge-purple">{currentStaff.role}</span>
        </div>
        <div className="attribute-item">
          <span className="attr-label">Clearance:</span>
          <span className="attr-value badge badge-cyan">Level {currentStaff.clearance_level}</span>
        </div>
        <div className="attribute-item">
          <span className="attr-label">Assigned Accounts:</span>
          <div className="assigned-tags">
            {currentStaff.assigned_companies.map((code) => (
              <span key={code} className="badge badge-emerald">{code}</span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
