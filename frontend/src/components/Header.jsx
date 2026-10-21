import React, { useState } from 'react';
import { Shield, ChevronDown, Check, User, Wifi, WifiOff } from 'lucide-react';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

export default function Header({
  activeTab,
  setActiveTab,
  currentStaff,
  setCurrentStaff,
  staffProfiles,
  isOnline,
  unreadAnomaliesCount
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tabs = [
    { id: 'records', label: 'Training Records', count: null },
    { id: 'anomalies', label: 'Anomaly Monitor', count: unreadAnomaliesCount },
    { id: 'reports', label: 'Client Reports', count: null },
    { id: 'trainee', label: 'Trainee Quest', count: null }
  ];

  return (
    <header className="app-header">
      <div className="header-top">
        {/* Brand */}
        <div className="header-brand">
          <img src={logoStacked} alt="CrossQuest Logo" style={{ height: '64px', marginRight: '16px' }} />
          <div>
            <div className="brand-org">Crossworks Training & Consulting</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="header-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="nav-badge-pill">{tab.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Right Controls: Staff Persona Switcher */}
        <div className="header-user-section">
          <div className="online-indicator" title={isOnline ? 'PWA Online' : 'PWA Offline Mode'}>
            {isOnline ? <Wifi size={13} className="text-emerald" /> : <WifiOff size={13} className="text-rose" />}
            <span className="online-label">{isOnline ? 'Live' : 'Offline'}</span>
          </div>

          <div className="persona-dropdown-wrap">
            <button 
              className="persona-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="persona-avatar">{currentStaff.avatar}</span>
              <div className="persona-info">
                <span className="persona-name">{currentStaff.name.split(' ')[0]}</span>
                <span className="persona-role">{currentStaff.role}</span>
              </div>
              <ChevronDown size={14} className="persona-chevron" />
            </button>

            {dropdownOpen && (
              <>
                <div className="dropdown-overlay" onClick={() => setDropdownOpen(false)} />
                <div className="persona-menu card">
                  <div className="menu-header">
                    <span className="menu-title">Switch Active Persona</span>
                    <span className="menu-desc">Simulate CP-ABE attributes & access permissions</span>
                  </div>

                  <div className="menu-list">
                    {staffProfiles.map((p) => {
                      const isSelected = p.id === currentStaff.id;
                      return (
                        <button
                          key={p.id}
                          className={`menu-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setCurrentStaff(p);
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="item-avatar">{p.avatar}</span>
                          <div className="item-details">
                            <div className="item-name">{p.name}</div>
                            <div className="item-meta">
                              Clearance Lvl {p.clearance_level} • {p.assigned_companies.join(', ')}
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="item-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Active Context Bar */}
      <div className="active-context-bar">
        <span className="context-label">Current Role:</span>
        <span className="badge badge-purple">{currentStaff.role}</span>
        <span className="context-label">Clearance:</span>
        <span className="badge badge-blue">Level {currentStaff.clearance_level}</span>
        <span className="context-label">Client Access:</span>
        <div className="context-chips">
          {currentStaff.assigned_companies.map(c => (
            <span key={c} className="badge badge-green">{c}</span>
          ))}
        </div>
      </div>
    </header>
  );
}
