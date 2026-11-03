import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BitMascot from '../components/BitMascot/BitMascot';
import '../styles/admin.css';
import './trainer.css';

export default function TrainerLayout({ activeTab, onTabChange, children }) {
  const navigate = useNavigate();
  const location = useLocation();

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
          CROSSWORKS ENTERPRISE / <strong>LEAD INSTRUCTOR PORTAL</strong>
        </div>
      </div>

      {/* 2. 3D HERO BANNER */}
      <div className="adm-hero adm-hero--trainer">
        <div className="adm-hero__text">
          <span className="adm-pill adm-pill--green">
            <span className="adm-live" /> INSTRUCTOR ACCESS
          </span>
          <h1>Course Cohorts, Trainee Grading & Assessment Studio</h1>
          <p>
            Zero-Trust cryptography course delivery, trainee certification workbench, and real-time competency analytics.
          </p>

          <div className="trn-chips" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="trn-glass">WATERS11 / BSW07 ENVELOPE ENGINE</span>
            <span className="trn-glass trn-glass--amber">MULTI-TENANT CRYPTOGRAPHIC ISOLATION</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('cq_open_trainer_broadcast_modal'))}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: '8px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚡ Instant Pop-Up Quiz
            </button>
          </div>

          <div className="adm-tabs" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className={isCurrentTab('cohorts', '/trainer') ? 'on' : ''}
              onClick={() => handleTabClick('cohorts', '/trainer')}
            >
              Course Cohorts
            </button>
            <button
              type="button"
              className={isCurrentTab('roster', '/trainer/roster') ? 'on' : ''}
              onClick={() => handleTabClick('roster', '/trainer/roster')}
            >
              Trainee Roster
            </button>
            <button
              type="button"
              className={isCurrentTab('grade', '/trainer/grade') ? 'on' : ''}
              onClick={() => handleTabClick('grade', '/trainer/grade')}
            >
              Grade & Certify
            </button>
            <button
              type="button"
              className={isCurrentTab('quiz', '/trainer/quiz') ? 'on' : ''}
              onClick={() => handleTabClick('quiz', '/trainer/quiz')}
            >
              Quiz & Studio
            </button>
            <button
              type="button"
              className={isCurrentTab('analytics', '/trainer/analytics') ? 'on' : ''}
              onClick={() => handleTabClick('analytics', '/trainer/analytics')}
            >
              Cohort Analytics
            </button>
          </div>
        </div>

        {/* Mascot Scene */}
        <div className="adm-hero__cube">
          <span className="adm-float adm-float--tl">WATERS11 / BN254</span>
          <span className="adm-float adm-float--br adm-float--orange">CP-ABE ACCESS TREE</span>
          <BitMascot size={210} />
        </div>
      </div>

      {/* 3. PAGE VIEW CONTENT */}
      {children}
    </div>
  );
}
