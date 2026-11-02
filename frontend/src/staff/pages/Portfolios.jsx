import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, ArrowRight, ShieldCheck, Users, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../StaffContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Portfolios() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { portfolios, me } = useStaff();
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  const assignedScopes = currentUser?.assigned_client_accounts || currentUser?.assigned_companies || me?.scopes || ['CORP_ALPHA', 'BANK_DELTA'];

  return (
    <div>
      <div 
        className="adm-panel__head" 
        style={{ 
          background: isDark ? '#111827' : '#fff', 
          borderRadius: '24px', 
          padding: '24px 28px', 
          border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
          boxShadow: isDark ? '0 4px 18px rgba(0,0,0,0.3)' : '0 4px 18px rgba(0,0,0,0.03)'
        }}
      >
        <div>
          <h2 style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Assigned Enterprise Portfolios</h2>
          <span className="adm-mono" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Multi-tenant client accounts and authorized training agreements</span>
        </div>
        <span className="adm-pill adm-pill--blue">
          AUTHORIZED SCOPES: {assignedScopes.join(', ')}
        </span>
      </div>

      <div className="stf-cards">
        {portfolios.map((p) => {
          const isMine = assignedScopes.includes(p.scope);

          return (
            <div key={p.scope} className={`stf-card ${isMine ? 'stf-card--mine' : ''}`}>
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

              {isMine ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-solid adm-chip--solid stf-cta"
                    style={{ flex: 1, margin: 0 }}
                    onClick={() => navigate('/staff')}
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
                    onClick={() => navigate(`/staff/reports?scope=${p.scope}`)}
                  >
                    <FileText size={14} />
                    <span>Audit Report</span>
                  </button>
                </div>
              ) : (
                <div className="stf-cta stf-cta--locked" style={{ marginTop: '14px' }}>
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
