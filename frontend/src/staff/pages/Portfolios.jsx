import React, { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, ArrowRight, ShieldCheck, Users, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../StaffContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Portfolios() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { portfolios, me } = useStaff();
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';
  const scrollContainerRef = useRef(null);

  const assignedScopes = currentUser?.assigned_client_accounts || currentUser?.assigned_companies || me?.scopes || ['CORP_ALPHA', 'BANK_DELTA'];

  // Prioritize active/assigned client portfolios first, followed by restricted portfolios
  const sortedPortfolios = useMemo(() => {
    return [...portfolios].sort((a, b) => {
      const aMine = assignedScopes.includes(a.scope);
      const bMine = assignedScopes.includes(b.scope);
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return 0;
    });
  }, [portfolios, assignedScopes]);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -360 : 360,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div>
      <div 
        className="adm-panel__head" 
        style={{ 
          background: isDark ? '#111827' : '#fff', 
          borderRadius: '24px', 
          padding: '22px 28px', 
          border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
          boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.3)' : '0 4px 18px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 style={{ color: isDark ? '#f8fafc' : '#0f172a', margin: '0 0 4px', fontSize: '18px' }}>
            Assigned Enterprise Portfolios
          </h2>
          <span className="adm-mono" style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '12.5px' }}>
            Multi-tenant client accounts and authorized training agreements ({portfolios.length} Total)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="adm-pill adm-pill--blue" style={{ margin: 0 }}>
            AUTHORIZED SCOPES: {assignedScopes.join(', ')}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleScroll('left')}
              title="Scroll Left"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#cbd5e1' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              title="Scroll Right"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#cbd5e1' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Side-Scrolling Horizontal Container */}
      <div 
        ref={scrollContainerRef}
        className="stf-cards"
        style={{ 
          display: 'flex', 
          flexWrap: 'nowrap', 
          gap: '24px', 
          marginTop: '24px', 
          overflowX: 'auto', 
          overflowY: 'hidden',
          paddingBottom: '20px',
          paddingTop: '6px',
          paddingLeft: '4px',
          paddingRight: '4px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin'
        }}
      >
        {sortedPortfolios.map((p) => {
          const isMine = assignedScopes.includes(p.scope);

          return (
            <div 
              key={p.scope} 
              className={`stf-card ${isMine ? 'stf-card--mine' : ''}`}
              style={{
                flex: '0 0 350px',
                minWidth: '350px',
                maxWidth: '350px',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                background: isMine 
                  ? (isDark ? '#111827' : '#ffffff')
                  : (isDark ? 'rgba(15, 23, 42, 0.65)' : '#fbfafe'),
                border: isMine 
                  ? '2px solid var(--cq-purple, #7c3aed)' 
                  : (isDark ? '1px dashed #334155' : '1px dashed rgba(23, 16, 43, 0.25)'),
                borderRadius: '24px',
                boxShadow: isMine 
                  ? (isDark ? '0 12px 30px rgba(124, 58, 237, 0.25)' : '0 18px 36px rgba(106, 43, 217, 0.18)')
                  : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px'
              }}
            >
              <div>
                <div className="stf-card__top">
                  <span className={`adm-chip ${isMine ? 'adm-chip--green' : 'adm-chip--red'}`}>
                    {p.scope}
                  </span>
                  {isMine ? (
                    <span className="stf-active">
                      <span className="adm-live" /> ACTIVE PORTFOLIO
                    </span>
                  ) : (
                    <span className="adm-mono" style={{ color: '#94a3b8' }}>
                      RESTRICTED
                    </span>
                  )}
                </div>

                <h2>{p.name}</h2>
                <div className="adm-mono" style={{ color: 'var(--cq-ink-soft)' }}>
                  {p.industry}
                </div>

                <dl className="stf-stats">
                  <div>
                    <dt>Account Agreement</dt>
                    <dd style={{ color: isMine ? '#087a54' : 'inherit' }}>{p.status}</dd>
                  </div>
                  <div>
                    <dt>Enrolled Trainees</dt>
                    <dd className="stf-mono">{p.trainees} active</dd>
                  </div>
                  <div>
                    <dt>CP-ABE Policy</dt>
                    <dd><code style={{ fontSize: '11px' }}>COMPANY:{p.scope}</code></dd>
                  </div>
                  <div>
                    <dt>Access Authorization</dt>
                    <dd>
                      {isMine ? (
                        <span className="adm-chip adm-chip--green">GRANTED</span>
                      ) : (
                        <span className="adm-chip adm-chip--red">LOCKED</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {isMine ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-solid adm-chip--solid stf-cta"
                    style={{ flex: 1, margin: 0 }}
                    onClick={() => navigate('/am/records?client=' + p.scope)}
                  >
                    <span>Records</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--light stf-cta"
                    style={{ 
                      flex: 1, 
                      margin: 0, 
                      background: isDark ? '#1e293b' : '#f8fafc', 
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      color: isDark ? '#f8fafc' : '#334155'
                    }}
                    onClick={() => navigate('/am/reports?client=' + p.scope)}
                  >
                    <FileText size={14} />
                    <span>Audit Report</span>
                  </button>
                </div>
              ) : (
                <div className="stf-cta stf-cta--locked" style={{ marginTop: '18px' }}>
                  <Lock size={14} />
                  <span>Scope Restricted (Requires Admin Authorization)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
