import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Check, 
  Copy 
} from 'lucide-react';

export default function Overview({ 
  overview = {}, 
  unreviewedCount = 0, 
  clients = [], 
  staffList = [], 
  anomalies = [], 
  onNavigateTab 
}) {
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopyPublicKey = () => {
    if (navigator.clipboard && overview.architecture?.publicKey) {
      navigator.clipboard.writeText(overview.architecture.publicKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="adm-overview-page" style={{ marginTop: '20px' }}>
      {/* Executive KPI Tiles */}
      <div className="adm-tiles">
        {/* Tile 1: Security Posture Score */}
        <div className="adm-kpi">
          <div className="adm-kpi__top">
            <span className="adm-label">SECURITY POSTURE</span>
            <span className="adm-pill adm-pill--green">STABLE</span>
          </div>
          <div className="adm-kpi__num">{overview.postureScore ?? 99}%</div>
          <div className="adm-progress">
            <i style={{ width: `${overview.postureScore ?? 99}%` }} />
          </div>
          <div className="adm-kpi__note">
            <CheckCircle2 size={13} /> {overview.postureNote || 'Zero security policy violations logged in 24h'}
          </div>
        </div>

        {/* Tile 2: Pending Anomaly Incidents */}
        <div 
          className="adm-kpi" 
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateTab && onNavigateTab('anomalies')}
          title="Click to inspect anomaly monitor"
        >
          <div className="adm-kpi__top">
            <span className="adm-label">PENDING ANOMALIES</span>
            <span className="adm-dot" />
          </div>
          <div className="adm-kpi__num" style={{ color: unreviewedCount > 0 ? '#d12a43' : 'inherit' }}>
            {unreviewedCount} Alerts
          </div>
          <div className="adm-bars">
            <span style={{ background: '#ff5a6e' }} />
            <span style={{ background: '#ff7a1a' }} />
            <span style={{ background: unreviewedCount > 2 ? '#ff5a6e' : '#ddd6f0' }} />
          </div>
          <div className="adm-kpi__note">
            Rule- & threshold-based active flags (Click to view)
          </div>
        </div>

        {/* Tile 3: Managed Staff Profiles */}
        <div 
          className="adm-kpi"
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigateTab && onNavigateTab('attribute_authority')}
          title="Click to view staff permissions"
        >
          <div className="adm-kpi__top">
            <span className="adm-label">PROVISIONED ACCOUNTS</span>
            <span className="adm-pill adm-pill--blue">{clients.length} CLIENTS</span>
          </div>
          <div className="adm-kpi__num">{staffList.length} Accounts</div>
          <div className="adm-avatars">
            {staffList.slice(0, 5).map((s, idx) => (
              <span 
                key={s.id || idx} 
                style={{ 
                  background: s.tone === 'purple' ? '#6a2bd9' : s.tone === 'orange' ? '#ff7a1a' : s.tone === 'green' ? '#087a54' : '#1d6fe0' 
                }} 
                title={s.name}
              />
            ))}
          </div>
          <div className="adm-kpi__note">
            Managed cryptographic credentials (Click to edit)
          </div>
        </div>

        {/* Tile 4: Database Layer Guard */}
        <div className="adm-kpi">
          <div className="adm-kpi__top">
            <span className="adm-label">DATABASE LAYER</span>
            <span className="adm-pill adm-pill--green">ACTIVE</span>
          </div>
          <div className="adm-kpi__num adm-kpi__num--sm">
            Data Isolation Active
          </div>
          <div className="adm-bars">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="adm-kpi__note">
            <CheckCircle2 size={13} /> {overview.isolationNote || 'Native CP-ABE policy isolation enforced'}
          </div>
        </div>
      </div>

      {/* Dual Split: Recent Alerts & Security Architecture */}
      <div className="adm-split">
        {/* Left: Recent Alerts */}
        <div className="adm-split__main">
          <div className="adm-panel">
            <div className="adm-panel__head">
              <h2>Recent Access Anomaly Alerts</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="adm-chip adm-chip--red">{unreviewedCount} Unreviewed</span>
                <button
                  type="button"
                  className="adm-btn adm-btn-ghost"
                  onClick={() => onNavigateTab && onNavigateTab('anomalies')}
                  style={{ fontSize: '12px', padding: '4px 10px', color: '#38bdf8' }}
                >
                  View Full Anomaly Report →
                </button>
              </div>
            </div>
            <div className="adm-stack">
              {anomalies.slice(0, 3).map((item) => (
                <div 
                  key={item.id} 
                  className={`adm-alert ${item.status === 'RESOLVED' ? 'adm-alert--done' : item.type === 'OUT_OF_SCOPE' ? 'adm-alert--red' : 'adm-alert--amber'}`}
                >
                  <div className="adm-alert__icon">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="adm-alert__body">
                    <div className="adm-alert__head">
                      <strong>{item.name}</strong>
                      <span className="adm-mono">({item.email})</span>
                      <span className={`adm-chip ${item.status === 'RESOLVED' ? 'adm-chip--green' : item.type === 'OUT_OF_SCOPE' ? 'adm-chip--red' : 'adm-chip--amber'}`}>
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p>{item.message}</p>
                    <div className="adm-alert__meta">
                      <span className="adm-mono">
                        <Clock size={12} /> {item.at}
                      </span>
                      {item.status === 'RESOLVED' && (
                        <span className="adm-ack">
                          <CheckCircle2 size={13} /> Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                  {item.status === 'UNREVIEWED' && (
                    <button 
                      type="button" 
                      className="adm-btn adm-btn-solid adm-chip--solid"
                      onClick={() => onNavigateTab && onNavigateTab('anomalies')}
                      title="Open Peer Review Desk to investigate and resolve anomaly"
                    >
                      <Shield size={13} /> Review
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Security Architecture Specs */}
        <div className="adm-split__side">
          <div className="adm-panel">
            <div className="adm-panel__head">
              <h2>Security Architecture</h2>
              <span className="adm-pill adm-pill--blue">CROSSWORKS CORE</span>
            </div>
            <div className="adm-pad">
              <div className="adm-stack3d">
                <div className="adm-stack3d__scene">
                  <div className="adm-layers">
                    <div className="adm-layer adm-layer--1" title="Row-Level Isolation Layer" />
                    <div className="adm-layer adm-layer--2" title="Access Control Policy Layer" />
                    <div className="adm-layer adm-layer--3" title="AES-256 + RSA Encryption Top Layer" />
                  </div>
                </div>
                <ul className="adm-legend">
                  <li>
                    <i style={{ background: '#ff7a1a' }} />
                    <div>
                      <strong>Top Layer</strong>
                      <span>AES-256 + RSA Suite</span>
                    </div>
                  </li>
                  <li>
                    <i style={{ background: '#1d6fe0' }} />
                    <div>
                      <strong>Policy Engine</strong>
                      <span>Attribute-Based (CP-ABE)</span>
                    </div>
                  </li>
                  <li>
                    <i style={{ background: '#6a2bd9' }} />
                    <div>
                      <strong>Base Guard</strong>
                      <span>Multi-Tenant Row Isolation</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Definition List */}
            <dl className="adm-dl">
              <div>
                <dt>Scheme</dt>
                <dd>{overview.architecture?.scheme || 'Native Charm CP-ABE'}</dd>
              </div>
              <div>
                <dt>Encryption Suite</dt>
                <dd>{overview.architecture?.encryption || 'AES-256-GCM + SS512'}</dd>
              </div>
              <div>
                <dt>Authority</dt>
                <dd>{overview.architecture?.authority || 'Decentralized Multi-Authority'}</dd>
              </div>
              <div>
                <dt>Master Public Key</dt>
                <dd>
                  <div className="adm-key">
                    <code>{overview.architecture?.publicKey || '0x4F...B82'}</code>
                    <button 
                      type="button" 
                      className="adm-iconbtn" 
                      onClick={handleCopyPublicKey}
                      title="Copy public key"
                    >
                      {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </dd>
              </div>
              <div>
                <dt>Defense Layer</dt>
                <dd>{overview.architecture?.defense || 'Strict Zero-Trust Model'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

