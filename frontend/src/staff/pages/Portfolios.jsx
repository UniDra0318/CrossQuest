import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { useStaff } from '../StaffContext';

export default function Portfolios() {
  const navigate = useNavigate();
  const { portfolios, me } = useStaff();

  return (
    <div>
      <div className="adm-panel__head" style={{ background: '#fff', borderRadius: '24px', padding: '24px 28px', border: '1px solid var(--cq-line)' }}>
        <div>
          <h2>Assigned Enterprise Portfolios</h2>
          <span className="adm-mono">Multi-tenant client accounts and authorized training agreements</span>
        </div>
        <span className="adm-pill adm-pill--blue">
          AUTHORIZED SCOPES: {me?.scopes?.join(', ') || 'CORP_ALPHA'}
        </span>
      </div>

      <div className="stf-cards">
        {portfolios.map((p) => {
          const isMine = (me?.scopes || ['CORP_ALPHA']).includes(p.scope);

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
                <button
                  type="button"
                  className="adm-btn adm-btn-solid adm-chip--solid stf-cta"
                  onClick={() => navigate('/staff')}
                >
                  <span>View Client Records</span>
                  <ArrowRight size={15} />
                </button>
              ) : (
                <div className="stf-cta stf-cta--locked">
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
