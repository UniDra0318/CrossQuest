import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Database,
  Users,
  ArrowRight,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Key,
  Award,
  ChevronDown,
  Building,
  Sparkles,
  Maximize2,
  X,
  Cpu,
  Server,
  Cloud,
  Globe,
  Radio,
  FileCode,
  Terminal,
  Box,
  FileText,
  Zap,
  Eye,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

export const AVAILABLE_DIAGRAM_ICONS = [
  { id: 'shield', label: 'Shield / Security' },
  { id: 'database', label: 'Database / Vault' },
  { id: 'server', label: 'Server / Host' },
  { id: 'cloud', label: 'Cloud / Network' },
  { id: 'lock', label: 'Lock / Cipher' },
  { id: 'key', label: 'Key / Credential' },
  { id: 'cpu', label: 'CPU / Processing' },
  { id: 'users', label: 'Users / Subject' },
  { id: 'globe', label: 'Globe / Internet' },
  { id: 'terminal', label: 'Terminal / CLI' },
  { id: 'box', label: 'Box / Package' },
  { id: 'layers', label: 'Layers / Stack' },
  { id: 'file', label: 'File / Document' },
  { id: 'zap', label: 'Zap / Ingress' },
  { id: 'radio', label: 'Radio / Broadcast' },
  { id: 'eye', label: 'Eye / Audit' },
  { id: 'check', label: 'Check / Verified' }
];

export const renderDiagramNodeIcon = (iconType, colorClass = '') => {
  switch (iconType) {
    case 'shield': return <Shield size={22} className={colorClass} />;
    case 'database': return <Database size={22} className={colorClass} />;
    case 'server': return <Server size={22} className={colorClass} />;
    case 'cloud': return <Cloud size={22} className={colorClass} />;
    case 'lock': return <Lock size={22} className={colorClass} />;
    case 'key': return <Key size={22} className={colorClass} />;
    case 'cpu': return <Cpu size={22} className={colorClass} />;
    case 'users': return <Users size={22} className={colorClass} />;
    case 'globe': return <Globe size={22} className={colorClass} />;
    case 'terminal': return <Terminal size={22} className={colorClass} />;
    case 'box': return <Box size={22} className={colorClass} />;
    case 'layers': return <Layers size={22} className={colorClass} />;
    case 'file': return <FileText size={22} className={colorClass} />;
    case 'zap': return <Zap size={22} className={colorClass} />;
    case 'radio': return <Radio size={22} className={colorClass} />;
    case 'eye': return <Eye size={22} className={colorClass} />;
    case 'check': return <CheckCircle2 size={22} className={colorClass} />;
    default: return <Cpu size={22} className={colorClass} />;
  }
};

export default function QuizDiagram({ type = 'security_pipeline', customNodes, customTitle, imageUrl, imageCaption, targetNode, customLayout }) {
  const [isZoomed, setIsZoomed] = useState(false);

  // Exact target comparison to prevent false-positive multiple highlights
  const isTarget = (name, id = null) => {
    if (!targetNode) return false;
    const t = String(targetNode).trim().toLowerCase();
    if (id && String(id).trim().toLowerCase() === t) return true;
    if (!name) return false;
    const n = String(name).trim().toLowerCase();
    return t === n;
  };

  // If an uploaded or URL image is provided for the diagram
  if (imageUrl) {
    return (
      <div className="diagram-card-container diagram-image-container">
        <div className="diagram-header-strip flex-between">
          <div className="flex-align gap-8">
            <Layers size={16} className="text-purple" />
            <span>{customTitle || 'EXAMINATION ARCHITECTURAL DIAGRAM'}</span>
          </div>
          <button
            type="button"
            className="diagram-zoom-btn"
            onClick={() => setIsZoomed(true)}
            title="Click to view full-resolution diagram"
          >
            <Maximize2 size={14} />
            <span>Enlarge</span>
          </button>
        </div>

        <div className="diagram-image-wrapper">
          <img
            src={imageUrl}
            alt={customTitle || 'Technical Architectural Diagram'}
            className="diagram-embedded-img"
            onClick={() => setIsZoomed(true)}
          />
        </div>

        {imageCaption && (
          <div className="diagram-caption-footer">
            <AlertTriangle size={14} className="text-purple flex-shrink-0" />
            <span>{imageCaption}</span>
          </div>
        )}

        {isZoomed && (
          <div className="diagram-lightbox-backdrop" onClick={() => setIsZoomed(false)}>
            <div className="diagram-lightbox-modal" onClick={(e) => e.stopPropagation()}>
              <div className="diagram-lightbox-header">
                <span className="font-bold text-sm text-slate-800">{customTitle || imageCaption || 'Diagram View'}</span>
                <button
                  type="button"
                  className="btn-icon-ghost"
                  onClick={() => setIsZoomed(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="diagram-lightbox-body">
                <img src={imageUrl} alt="Enlarged Diagram" className="diagram-lightbox-img" />
              </div>
              {imageCaption && (
                <div className="diagram-lightbox-footer text-xs text-secondary">
                  {imageCaption}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper to extract or fallback node data
  const getNode = (idx, fallback) => {
    if (customNodes && Array.isArray(customNodes) && customNodes[idx]) {
      const n = customNodes[idx];
      return {
        id: n.id,
        title: n.title || fallback.title,
        subtitle: n.subtitle || fallback.subtitle,
        iconType: n.iconType || fallback.iconType,
        color: n.color || fallback.color,
        badge: n.badge || fallback.badge
      };
    }
    return fallback;
  };

  // =========================================================================
  // 1. TIERED HIERARCHY PYRAMID (True Stepped Pyramid Silhouette)
  // =========================================================================
  if (type === 'clearance_hierarchy') {
    const nodes = (customNodes && customNodes.length >= 3) ? customNodes : [
      { id: 'node-1', title: 'Root System Administrator', subtitle: 'Full authority across all accounts and tenants', iconType: 'shield', color: 'purple', badge: 'Clearance Level 3' },
      { id: 'node-2', title: 'Client Account & Portfolio Manager', subtitle: 'Authorized for assigned corporate accounts only', iconType: 'server', color: 'cyan', badge: 'Clearance Level 2' },
      { id: 'node-3', title: 'Instructor & Trainee Learner', subtitle: 'Curriculum review and personal qualification testing', iconType: 'users', color: 'emerald', badge: 'Clearance Level 1' }
    ];

    const total = nodes.length;

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Award size={16} className="text-purple" />
          <span>{customTitle || 'TIERED HIERARCHY PYRAMID'}</span>
        </div>

        <div className="pyramid-silhouette-wrapper">
          <div className="pyramid-apex-icon">▲ PRIVILEGE APEX</div>

          <div className="hierarchy-pyramid-container" style={{ width: '100%' }}>
            {nodes.map((node, idx) => {
              const isApex = idx === 0;
              const isBase = idx === total - 1;
              const tierClass = isApex ? 'tier-apex' : isBase ? 'tier-base' : 'tier-mid';

              // Dynamic stepped scaling for authentic pyramid silhouette
              // Apex: 320px, Base: 780px, intermediate tiers step smoothly and proportionally
              const widthRatio = total > 1 ? idx / (total - 1) : 0.5;
              const calcWidth = Math.round(320 + (widthRatio * 460)); // 320px (Apex) ➔ 780px (Base)
              const padV = Math.round(11 + widthRatio * 6); // 11px ➔ 17px
              const padH = Math.round(16 + widthRatio * 10); // 16px ➔ 26px
              const titleSize = (13.5 + widthRatio * 1.5).toFixed(1); // 13.5px ➔ 15px
              const matchesTarget = isTarget(node.title, node.id);
              const nodeColor = node.color || (isApex ? 'purple' : isBase ? 'emerald' : 'cyan');

              return (
                <React.Fragment key={node.id || idx}>
                  <div
                    className={`hierarchy-level-card ${tierClass} ${matchesTarget ? 'node-active-guard is-hotspot-target' : ''}`}
                    style={{
                      width: `${calcWidth}px`,
                      maxWidth: '96%',
                      padding: `${padV}px ${padH}px`,
                      boxShadow: isApex
                        ? '0 6px 18px rgba(139, 92, 246, 0.22)'
                        : isBase
                        ? '0 8px 24px rgba(16, 185, 129, 0.22)'
                        : '0 6px 20px rgba(6, 182, 212, 0.18)'
                    }}
                  >
                    <div className={`tier-rank-pill pill-${nodeColor}`}>
                      <span>{node.badge || (isApex ? `LEVEL ${total}: APEX PRIVILEGE` : isBase ? 'LEVEL 1: BROAD OPERATIONAL BASE' : `LEVEL ${total - idx}: SEGREGATED SCOPE`)}</span>
                      <span className={`tier-authority-badge ${matchesTarget ? 'badge-gold-glow' : ''}`}>
                        {matchesTarget ? '★ TARGET HOTSPOT' : (isApex ? 'ROOT AUTHORITY' : isBase ? 'INDIVIDUAL SCOPE' : 'PORTFOLIO SCOPE')}
                      </span>
                    </div>
                    <div className="tier-card-body">
                      <div className="tier-title-row">
                        {renderDiagramNodeIcon(node.iconType, `text-${nodeColor}`)}
                        <h4 style={{ fontSize: `${titleSize}px`, fontWeight: 800 }}>{node.title}</h4>
                      </div>
                      {node.subtitle && <p className="tier-desc">{node.subtitle}</p>}
                    </div>
                  </div>

                  {idx < total - 1 && (
                    <div className="hierarchy-connector-flow">
                      <ChevronDown size={18} className="hierarchy-arrow" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. HIERARCHICAL BRANCHING TREE (PKI / Key Derivation Tree)
  // =========================================================================
  if (type === 'pki_hierarchy') {
    const rootNode = getNode(0, { id: 'root', title: 'Master Cryptographic Authority', subtitle: 'Root pairing parameters used to derive key polynomial shares', iconType: 'key', color: 'purple', badge: 'Root Authority' });
    const midLeftNode = getNode(1, { id: 'mid-left', title: 'Domain Attribute Authority (CA)', subtitle: 'Issues scoped client policy tokens to authorized personnel', iconType: 'server', color: 'cyan', badge: 'Intermediate Domain CA' });
    const midRightNode = getNode(2, { id: 'mid-right', title: 'Institutional Issuer CA', subtitle: 'Validates corporate directory clearance and department scopes', iconType: 'shield', color: 'blue', badge: 'Intermediate Org CA' });
    const leafLeftNode = getNode(3, { id: 'leaf-left', title: 'Attribute Secret Key (Leaf)', subtitle: 'User-bound polynomial key share that decrypts matching ciphers', iconType: 'lock', color: 'emerald', badge: 'Ephemeral Session Key' });
    const leafRightNode = getNode(4, { id: 'leaf-right', title: 'Scoped Verification Token', subtitle: 'Time-bound cryptographic bearer token for access evaluation', iconType: 'lock', color: 'gold', badge: 'Target Identity Envelope' });

    const tRoot = isTarget(rootNode.title, rootNode.id);
    const tMidLeft = isTarget(midLeftNode.title, midLeftNode.id);
    const tMidRight = isTarget(midRightNode.title, midRightNode.id);
    const tLeafLeft = isTarget(leafLeftNode.title, leafLeftNode.id);
    const tLeafRight = isTarget(leafRightNode.title, leafRightNode.id);

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Key size={16} className="text-gold" />
          <span>{customTitle || 'HIERARCHICAL BRANCHING TREE (PKI)'}</span>
        </div>

        <div className="branching-tree-container">
          {/* Level 1: Root Authority (Center) */}
          <div className="tree-root-row">
            <div className={`tree-node-card ${tRoot ? 'node-active-guard is-hotspot-target' : ''}`} style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div className="tier-rank-pill pill-purple">
                <span>{rootNode.badge}</span>
                <span className={`tier-authority-badge ${tRoot ? 'badge-gold-glow' : ''}`}>
                  {tRoot ? '★ TARGET HOTSPOT' : 'MASTER ROOT'}
                </span>
              </div>
              <div className="tier-title-row">
                {renderDiagramNodeIcon(rootNode.iconType, `text-${rootNode.color || 'purple'}`)}
                <h4>{rootNode.title}</h4>
              </div>
              <p className="tier-desc">{rootNode.subtitle}</p>
            </div>
          </div>

          {/* Branch Split 1: Root to 2 Intermediates */}
          <div className="tree-branch-split">
            <div className="tree-stem-vertical" />
            <div className="tree-rail-horizontal" />
            <div className="tree-stem-drops">
              <div className="tree-stem-drop" />
              <div className="tree-stem-drop" />
            </div>
          </div>

          {/* Level 2: Two Intermediate CAs Branching Out Side by Side */}
          <div className="tree-mid-row">
            {/* Intermediate CA 1 */}
            <div className={`tree-node-card ${tMidLeft ? 'node-active-guard is-hotspot-target' : ''}`} style={{ borderLeft: '4px solid #06b6d4' }}>
              <div className="tier-rank-pill pill-cyan">
                <span>{midLeftNode.badge}</span>
                <span className={`tier-authority-badge ${tMidLeft ? 'badge-gold-glow' : ''}`}>
                  {tMidLeft ? '★ TARGET HOTSPOT' : 'CLIENT SCOPE'}
                </span>
              </div>
              <div className="tier-title-row">
                {renderDiagramNodeIcon(midLeftNode.iconType, `text-${midLeftNode.color || 'cyan'}`)}
                <h4>{midLeftNode.title}</h4>
              </div>
              <p className="tier-desc">{midLeftNode.subtitle}</p>
            </div>

            {/* Intermediate CA 2 */}
            <div className={`tree-node-card ${tMidRight ? 'node-active-guard is-hotspot-target' : ''}`} style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="tier-rank-pill pill-cyan">
                <span>{midRightNode.badge}</span>
                <span className={`tier-authority-badge ${tMidRight ? 'badge-gold-glow' : ''}`}>
                  {tMidRight ? '★ TARGET HOTSPOT' : 'ORG SCOPE'}
                </span>
              </div>
              <div className="tier-title-row">
                {renderDiagramNodeIcon(midRightNode.iconType, `text-${midRightNode.color || 'blue'}`)}
                <h4>{midRightNode.title}</h4>
              </div>
              <p className="tier-desc">{midRightNode.subtitle}</p>
            </div>
          </div>

          {/* Branch Split 2: Intermediates to Leaves */}
          <div className="tree-branch-split">
            <div className="tree-stem-drops">
              <div className="tree-stem-drop" />
              <div className="tree-stem-drop" />
            </div>
          </div>

          {/* Level 3: Leaf Keys Branching Underneath */}
          <div className="tree-leaf-row">
            {/* Leaf 1 */}
            <div className={`tree-node-card ${tLeafLeft ? 'node-active-guard is-hotspot-target' : ''}`} style={{ borderLeft: '4px solid #10b981' }}>
              <div className="tier-rank-pill pill-emerald">
                <span>{leafLeftNode.badge}</span>
                <span className={`tier-authority-badge ${tLeafLeft ? 'badge-gold-glow' : ''}`}>
                  {tLeafLeft ? '★ TARGET HOTSPOT' : 'USER DECRYPTION SHARE'}
                </span>
              </div>
              <div className="tier-title-row">
                {renderDiagramNodeIcon(leafLeftNode.iconType, `text-${leafLeftNode.color || 'emerald'}`)}
                <h4>{leafLeftNode.title}</h4>
              </div>
              <p className="tier-desc">{leafLeftNode.subtitle}</p>
            </div>

            {/* Leaf 2 */}
            <div className={`tree-node-card ${tLeafRight ? 'node-active-guard is-hotspot-target' : ''}`} style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="tier-rank-pill pill-purple">
                <span>{leafRightNode.badge}</span>
                <span className={`tier-authority-badge ${tLeafRight ? 'badge-gold-glow' : ''}`}>
                  {tLeafRight ? '★ TARGET HOTSPOT' : 'EPHEMERAL TOKEN'}
                </span>
              </div>
              <div className="tier-title-row">
                {renderDiagramNodeIcon(leafRightNode.iconType, `text-${leafRightNode.color || 'gold'}`)}
                <h4>{leafRightNode.title}</h4>
              </div>
              <p className="tier-desc">{leafRightNode.subtitle}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. DUAL-PARTITION BOUNDARY (Two Isolated Enclaves + Impenetrable Wall)
  // =========================================================================
  if (type === 'tenant_partition') {
    const tenantANode = getNode(0, { id: 'alpha', title: 'Tenant Alpha Organization', subtitle: 'Encrypted ciphertext vault isolated by unique CP-ABE polynomial key', iconType: 'lock', color: 'cyan', badge: 'Domain Partition A' });
    const barrierNode = getNode(1, { id: 'wall', title: 'Cryptographic Barrier Wall', subtitle: 'Zero-Trust cross-boundary guard and anomaly detector', iconType: 'shield', color: 'rose', badge: 'Security Barrier' });
    const tenantBNode = getNode(2, { id: 'beta', title: 'Tenant Beta Organization', subtitle: 'Isolated ciphertext pool completely inaccessible to Tenant Alpha credentials', iconType: 'lock', color: 'purple', badge: 'Domain Partition B' });

    const tA = isTarget(tenantANode.title, tenantANode.id);
    const tWall = isTarget(barrierNode.title, barrierNode.id);
    const tB = isTarget(tenantBNode.title, tenantBNode.id);

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Lock size={16} className="text-gold" />
          <span>{customTitle || 'ISOLATED DUAL-PARTITION BOUNDARY'}</span>
        </div>

        <div className="tenant-partition-container">
          {/* Tenant A Enclosed Sandbox */}
          <div className={`tenant-vault-box ${tA ? 'is-hotspot-target node-active-guard' : ''}`} style={{ border: '2px solid #06b6d4' }}>
            <div className="vault-top-banner banner-cyan" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} />
                <span>{tenantANode.badge}</span>
              </div>
              {tA && <span className="tier-authority-badge badge-gold-glow">★ TARGET HOTSPOT</span>}
            </div>
            <div className="vault-body">
              <div className="vault-client-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderDiagramNodeIcon(tenantANode.iconType, 'text-cyan')}
                <span>{tenantANode.title}</span>
              </div>
              <div className="vault-key-chip">
                <code>SCOPE:CORP_ALPHA · CIPHERTEXT POOL A</code>
              </div>
              <p className="vault-desc">{tenantANode.subtitle}</p>

              <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.08)', fontSize: '10.5px', color: '#0891b2', fontWeight: 600 }}>
                🔒 Strict Row-Level Security Enforced
              </div>
            </div>
          </div>

          {/* Central Cryptographic Barrier Wall */}
          <div className={`cryptographic-barrier-wall ${tWall ? 'is-hotspot-target node-active-guard' : ''}`} style={{ minWidth: '200px' }}>
            <div className="barrier-shield-icon">
              <AlertTriangle size={24} className="text-rose" />
            </div>
            <span className="barrier-title">{barrierNode.title}</span>
            <span className="barrier-subtitle">{barrierNode.subtitle}</span>

            <div style={{ marginTop: '4px', padding: '3px 8px', borderRadius: '4px', background: '#e11d48', color: '#ffffff', fontSize: '9px', fontWeight: 800 }}>
              ⛔ CROSS-DOMAIN ACCESS 403
            </div>

            <span className={`tier-authority-badge ${tWall ? 'badge-gold-glow' : ''}`} style={{ marginTop: '4px' }}>
              {tWall ? '★ TARGET HOTSPOT' : 'ISOLATION BOUNDARY'}
            </span>
          </div>

          {/* Tenant B Enclosed Sandbox */}
          <div className={`tenant-vault-box ${tB ? 'is-hotspot-target node-active-guard' : ''}`} style={{ border: '2px solid #8b5cf6' }}>
            <div className="vault-top-banner banner-purple" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} />
                <span>{tenantBNode.badge}</span>
              </div>
              {tB && <span className="tier-authority-badge badge-gold-glow">★ TARGET HOTSPOT</span>}
            </div>
            <div className="vault-body">
              <div className="vault-client-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderDiagramNodeIcon(tenantBNode.iconType, 'text-purple')}
                <span>{tenantBNode.title}</span>
              </div>
              <div className="vault-key-chip">
                <code>SCOPE:FINTECH_BETA · CIPHERTEXT POOL B</code>
              </div>
              <p className="vault-desc">{tenantBNode.subtitle}</p>

              <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.08)', fontSize: '10.5px', color: '#7c3aed', fontWeight: 600 }}>
                🛡️ Zero Shared Memory or State
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. PERIMETER INGRESS GATEWAY (DMZ Network Enclaves)
  // =========================================================================
  if (type === 'network_dmz') {
    const extNode = getNode(0, { id: 'ext', title: 'External Network', subtitle: 'Untrusted Client Request Stream', iconType: 'globe', color: 'cyan', badge: 'Untrusted Edge' });
    const wafNode = getNode(1, { id: 'waf', title: 'Inspection Firewall / WAF', subtitle: 'Layer 7 Threat Filter & Header Sanitization', iconType: 'shield', color: 'gold', badge: 'Threat Guard' });
    const proxyNode = getNode(2, { id: 'proxy', title: 'Ingress Reverse Proxy', subtitle: 'Mutual TLS Termination & Bearer Validation', iconType: 'server', color: 'purple', badge: 'mTLS Gateway' });
    const meshNode = getNode(3, { id: 'mesh', title: 'Internal Service Mesh', subtitle: 'Private VPC Microservices & Cluster Mesh', iconType: 'cpu', color: 'emerald', badge: 'Private VPC' });

    const tExt = isTarget(extNode.title, extNode.id);
    const tWaf = isTarget(wafNode.title, wafNode.id);
    const tProxy = isTarget(proxyNode.title, proxyNode.id);
    const tMesh = isTarget(meshNode.title, meshNode.id);

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Cloud size={16} className="text-cyan" />
          <span>{customTitle || 'PERIMETER INGRESS & GATEWAY ARCHITECTURE'}</span>
        </div>

        <div className="dmz-zones-container">
          {/* ZONE 1: Untrusted Public Edge */}
          <div className="dmz-zone dmz-zone-untrusted">
            <div className="dmz-zone-header">
              <Globe size={13} />
              <span>Zone 1: Public Edge</span>
            </div>

            <div className={`pipeline-node ${tExt ? 'node-active-guard is-hotspot-target' : ''}`} style={{ width: '100%' }}>
              <div className="node-icon-bubble bg-cyan-subtle">
                {renderDiagramNodeIcon(extNode.iconType, 'text-cyan')}
              </div>
              <div className="node-title">{extNode.title}</div>
              <div className={`node-badge-tag ${tExt ? 'badge-gold-glow' : ''}`}>
                {tExt ? '★ Target Hotspot' : extNode.badge}
              </div>
              <div className="node-desc">{extNode.subtitle}</div>
            </div>
          </div>

          <div className="pipeline-connector">
            <ArrowRight size={18} className="connector-arrow text-cyan" />
          </div>

          {/* ZONE 2: DMZ Enclave (Firewall + Proxy) */}
          <div className="dmz-zone dmz-zone-enclave">
            <div className="dmz-zone-header">
              <ShieldCheck size={13} />
              <span>Zone 2: Perimeter DMZ Enclave</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* WAF */}
              <div className={`pipeline-node ${tWaf ? 'node-active-guard is-hotspot-target' : ''}`} style={{ flex: 1 }}>
                <div className="node-icon-bubble bg-gold-subtle">
                  {renderDiagramNodeIcon(wafNode.iconType, 'text-gold')}
                </div>
                <div className="node-title">{wafNode.title}</div>
                <div className={`node-badge-tag ${tWaf ? 'badge-gold-glow' : ''}`}>
                  {tWaf ? '★ Target Hotspot' : wafNode.badge}
                </div>
                <div className="node-desc">{wafNode.subtitle}</div>
              </div>

              <ArrowRight size={14} className="text-purple flex-shrink-0" />

              {/* Reverse Proxy */}
              <div className={`pipeline-node ${tProxy ? 'node-active-guard is-hotspot-target' : ''}`} style={{ flex: 1 }}>
                <div className="node-icon-bubble bg-purple-subtle">
                  {renderDiagramNodeIcon(proxyNode.iconType, 'text-purple')}
                </div>
                <div className="node-title">{proxyNode.title}</div>
                <div className={`node-badge-tag ${tProxy ? 'badge-gold-glow' : ''}`}>
                  {tProxy ? '★ Target Hotspot' : proxyNode.badge}
                </div>
                <div className="node-desc">{proxyNode.subtitle}</div>
              </div>
            </div>
          </div>

          <div className="pipeline-connector">
            <ArrowRight size={18} className="connector-arrow text-emerald" />
          </div>

          {/* ZONE 3: Secure Private VPC */}
          <div className="dmz-zone dmz-zone-private">
            <div className="dmz-zone-header">
              <Lock size={13} />
              <span>Zone 3: Private VPC</span>
            </div>

            <div className={`pipeline-node ${tMesh ? 'node-active-guard is-hotspot-target' : ''}`} style={{ width: '100%' }}>
              <div className="node-icon-bubble bg-emerald-subtle">
                {renderDiagramNodeIcon(meshNode.iconType, 'text-emerald')}
              </div>
              <div className="node-title">{meshNode.title}</div>
              <div className={`node-badge-tag ${tMesh ? 'badge-gold-glow' : ''}`}>
                {tMesh ? '★ Target Hotspot' : meshNode.badge}
              </div>
              <div className="node-desc">{meshNode.subtitle}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. RELATIONAL ENTITY MATRIX (Data Subject ➔ Controller ➔ Processor)
  // =========================================================================
  if (type === 'data_flow') {
    const subNode = getNode(0, { id: 'sub', title: 'Trainee / Learner', subtitle: 'Owner of personal training metrics and qualification records', iconType: 'users', color: 'emerald', badge: 'Data Subject' });
    const ctrlNode = getNode(1, { id: 'ctrl', title: 'Corporate Employer', subtitle: 'Contractual entity determining purposes of personnel training', iconType: 'server', color: 'cyan', badge: 'Controlling Entity (PIC)' });
    const procNode = getNode(2, { id: 'proc', title: 'Crossworks Training Service', subtitle: 'Executes assessments strictly pursuant to controller instructions', iconType: 'shield', color: 'purple', badge: 'Processing Service (PIP)' });

    const tSub = isTarget(subNode.title, subNode.id);
    const tCtrl = isTarget(ctrlNode.title, ctrlNode.id);
    const tProc = isTarget(procNode.title, procNode.id);

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Layers size={16} className="text-rose" />
          <span>{customTitle || 'RELATIONAL ENTITY DATA MATRIX'}</span>
        </div>

        <div className="data-flow-container">
          {/* Entity 1: Subject */}
          <div className={`data-flow-card card-subject ${tSub ? 'highlight-card is-hotspot-target node-active-guard' : ''}`}>
            <div className="flow-card-header">
              {renderDiagramNodeIcon(subNode.iconType, 'text-emerald')}
              <span className={`flow-role-tag ${tSub ? 'badge-gold-glow' : 'tag-emerald'}`}>
                {tSub ? '★ Target Hotspot' : subNode.badge}
              </span>
            </div>
            <div className="flow-card-title">{subNode.title}</div>
            <p className="flow-card-desc">{subNode.subtitle}</p>
            <div style={{ marginTop: 'auto', fontSize: '10px', color: '#059669', fontWeight: 600 }}>
              🛡️ Individual Rights & Consent
            </div>
          </div>

          <div className="flow-connector">
            <span className="flow-connector-label">Enrollment Profile</span>
            <ArrowRight size={18} className="text-cyan" />
          </div>

          {/* Entity 2: Controller */}
          <div className={`data-flow-card card-controller ${tCtrl ? 'highlight-card is-hotspot-target node-active-guard' : ''}`}>
            <div className="flow-card-header">
              {renderDiagramNodeIcon(ctrlNode.iconType, 'text-cyan')}
              <span className={`flow-role-tag ${tCtrl ? 'badge-gold-glow' : 'tag-cyan'}`}>
                {tCtrl ? '★ Target Hotspot' : ctrlNode.badge}
              </span>
            </div>
            <div className="flow-card-title">{ctrlNode.title}</div>
            <p className="flow-card-desc">{ctrlNode.subtitle}</p>
            <div style={{ marginTop: 'auto', fontSize: '10px', color: '#0891b2', fontWeight: 600 }}>
              📋 Training Directive & Agreement
            </div>
          </div>

          <div className="flow-connector">
            <span className="flow-connector-label">Engages Assessment</span>
            <ArrowRight size={18} className="text-purple" />
          </div>

          {/* Entity 3: Processor */}
          <div className={`data-flow-card card-processor ${tProc ? 'highlight-card is-hotspot-target node-active-guard' : ''}`}>
            <div className="flow-card-header">
              {renderDiagramNodeIcon(procNode.iconType, 'text-purple')}
              <span className={`flow-role-tag ${tProc ? 'badge-gold-glow' : 'tag-purple'}`}>
                {tProc ? '★ Target Hotspot' : procNode.badge}
              </span>
            </div>
            <div className="flow-card-title">{procNode.title}</div>
            <p className="flow-card-desc">{procNode.subtitle}</p>
            <div className="flow-statutory-badge">
              <CheckCircle2 size={12} />
              <span>DPA 2012 / NPC Compliant PIP</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. SEQUENTIAL PROCESS PIPELINE (Linear connected pipeline flow)
  // =========================================================================
  // Default or explicit security_pipeline
  const pipelineNodes = (customNodes && customNodes.length >= 2) ? customNodes : [
    { id: 'step-1', title: 'Client Interface', subtitle: 'HTTPS Session Stream', iconType: 'users', color: 'cyan', badge: 'Client Ingress' },
    { id: 'step-2', title: 'API Gateway', subtitle: 'OAuth JWT Bearer Gate', iconType: 'shield', color: 'purple', badge: 'Perimeter Guard' },
    { id: 'step-3', title: 'Policy & Decryption Engine', subtitle: 'Evaluates Attribute Access Trees', iconType: 'lock', color: 'gold', badge: 'Core Engine' },
    { id: 'step-4', title: 'Encrypted Storage Vault', subtitle: 'RLS Ciphertext Partition', iconType: 'database', color: 'emerald', badge: 'Persistent Storage' }
  ];

  return (
    <div className="diagram-card-container">
      <div className="diagram-header-strip">
        <Shield size={16} className="text-cyan" />
        <span>{customTitle || 'SEQUENTIAL PROCESS PIPELINE ARCHITECTURE'}</span>
      </div>

      <div className="diagram-pipeline-wrapper">
        {pipelineNodes.map((node, idx) => {
          const matchesTarget = isTarget(node.title, node.id);
          const nodeColor = node.color || 'purple';

          return (
            <React.Fragment key={node.id || idx}>
              <div className={`pipeline-node node-${nodeColor} ${matchesTarget ? 'node-active-guard is-hotspot-target' : ''}`}>
                <div className={`node-icon-bubble bg-${nodeColor}-subtle ${matchesTarget ? 'pulse-slow' : ''}`}>
                  {renderDiagramNodeIcon(node.iconType, `text-${nodeColor}`)}
                </div>
                <div className="node-title">{node.title}</div>
                <div className={`node-badge-tag ${matchesTarget ? 'badge-gold-glow' : ''}`}>
                  {matchesTarget ? '★ Target Hotspot' : (node.badge || `Stage ${idx + 1}`)}
                </div>
                {node.subtitle && <div className="node-desc">{node.subtitle}</div>}
              </div>

              {idx < pipelineNodes.length - 1 && (
                <div className="pipeline-connector">
                  <div className="connector-line">
                    <div className={`connector-pulse-dot delay-${(idx % 3) + 1}`} />
                  </div>
                  <ArrowRight size={16} className="connector-arrow text-purple" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
