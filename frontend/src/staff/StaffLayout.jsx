import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SpinCube from '../components/SpinCube';
import '../styles/admin.css';
import './staff.css';

export default function StaffLayout({ activeTab, onTabChange, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const handleTabClick = (tabId, path) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
    navigate(path);
  };

  const isCurrentTab = (tabId, path) => {
    if (activeTab) return activeTab === tabId;
    return location.pathname === path;
  };

  return (
    <div className="adm-main">
      {/* 1. TOP STATUS BAR */}
      <div className="adm-top">
        <div className="adm-crumbs">
          CROSSWORKS ENTERPRISE / <strong>CLIENT ACCOUNT PORTAL</strong>
        </div>
      </div>

      {/* 2. 3D HERO BANNER */}
      <div className="adm-hero">
        <div className="adm-hero__text">
          <span className="adm-pill">
            <span className="adm-live" /> ACCOUNT MANAGER ACCESS
          </span>
          <h1>Crossworks Client Account Management</h1>
          <p>
            Authorized access to client portfolios, training completion records, and compliance auditing.
          </p>

          <div className="stf-hero-chips">
            <span className="stf-glass stf-glass--ok">AUTHORIZED SCOPES: {currentUser?.assigned_client_accounts?.join(', ') || currentUser?.assigned_companies?.join(', ') || 'CORP_ALPHA, BANK_DELTA'}</span>
            <span className="stf-glass">MULTI-TENANT ISOLATION ACTIVE</span>
          </div>

          <div className="adm-tabs" style={{ marginTop: '18px' }}>
            <button
              type="button"
              className={isCurrentTab('records', '/staff') ? 'on' : ''}
              onClick={() => handleTabClick('records', '/staff')}
            >
              Client Record Vault
            </button>
            <button
              type="button"
              className={isCurrentTab('portfolios', '/staff/portfolios') ? 'on' : ''}
              onClick={() => handleTabClick('portfolios', '/staff/portfolios')}
            >
              Assigned Portfolios
            </button>
            <button
              type="button"
              className={isCurrentTab('reports', '/staff/reports') ? 'on' : ''}
              onClick={() => handleTabClick('reports', '/staff/reports')}
            >
              Client Audit Reports
            </button>
          </div>
        </div>

        {/* 3D Floating Scene */}
        <div className="adm-hero__cube">
          <span className="adm-float adm-float--tl">ASSIGNED SCOPE</span>
          <span className="adm-float adm-float--br adm-float--orange">ROW ENCRYPTION</span>
          <SpinCube size={76} />
        </div>
      </div>

      {/* Page Content */}
      <div style={{ marginTop: '24px' }}>
        {children}
      </div>
    </div>
  );
}
