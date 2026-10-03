import React, { useState } from 'react';
import { Shield, Bell, Check, ChevronDown, User, LogOut, ArrowLeftRight, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Topbar({ activeViewTitle }) {
  const { currentUser, login, logout, DEMO_USERS } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  return (
    <header className="enterprise-topbar">
      <div className="topbar-left">
        <div className="page-breadcrumb">
          <span className="crumb-root">CrossQuest</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{activeViewTitle}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Security Badges */}
        <div className="topbar-badges">
          <span className="badge badge-purple">CP-ABE: Waters11</span>
          <span className="badge badge-blue">RLS: Enforced</span>
        </div>

        {/* Quick Role Switcher for Evaluators / Demonstrations */}
        <div className="role-switch-container">
          <button 
            className="role-switch-btn"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
          >
            <ArrowLeftRight size={13} />
            <span>Switch Role ({currentUser.role.replace(/_/g, ' ')})</span>
            <ChevronDown size={13} />
          </button>

          {roleMenuOpen && (
            <>
              <div className="dropdown-overlay" onClick={() => setRoleMenuOpen(false)} />
              <div className="topbar-role-menu card">
                <div className="menu-header">
                  <span className="menu-title">Switch Testing Role</span>
                  <span className="menu-desc">Jump into any separated role portal instantly</span>
                </div>
                <div className="menu-list">
                  {Object.entries(DEMO_USERS).map(([key, u]) => (
                    <button
                      key={key}
                      className={`menu-item ${u.role === currentUser.role ? 'selected' : ''}`}
                      onClick={() => {
                        login(key);
                        setRoleMenuOpen(false);
                      }}
                    >
                      <div className="item-details">
                        <div className="item-name">{u.name}</div>
                        <div className="item-meta">{u.role.replace(/_/g, ' ').toUpperCase()} • {u.organization}</div>
                      </div>
                      {u.role === currentUser.role && <Check size={14} className="text-cyan" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sign Out Button */}
        <button className="topbar-icon-btn" onClick={logout} title="Sign Out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
