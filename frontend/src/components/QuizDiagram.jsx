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
    const nodes = (customNodes && customNodes.length > 0) ? customNodes : [
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

              // Dynamic stepped scaling for authentic pyramid silhouette across any number of nodes
              const widthRatio = total > 1 ? idx / (total - 1) : 0.5;
              const calcWidth = total === 1 ? 480 : Math.round(300 + (widthRatio * 480)); // 300px (Apex) ➔ 780px (Base)
              const padV = Math.round(11 + widthRatio * 6); // 11px ➔ 17px
              const padH = Math.round(16 + widthRatio * 10); // 16px ➔ 26px
              const titleSize = (13.5 + widthRatio * 1.5).toFixed(1);
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
    const nodes = (customNodes && customNodes.length > 0) ? customNodes : [
      { id: 'node-1', title: 'Master Cryptographic Authority', subtitle: 'Root pairing parameters used to derive key polynomial shares', iconType: 'key', color: 'purple', badge: 'Root Authority' },
      { id: 'node-2', title: 'Domain Attribute Authority (CA)', subtitle: 'Issues scoped client policy tokens to authorized personnel', iconType: 'server', color: 'cyan', badge: 'Intermediate CA' },
      { id: 'node-3', title: 'Attribute Secret Key (Leaf)', subtitle: 'User-bound polynomial key share that decrypts ciphers', iconType: 'lock', color: 'emerald', badge: 'Ephemeral Key' }
    ];

    // Dynamic Tree Tier Partitioning for ANY object count (1 to 10+)
    const rootNode = nodes[0];
    let midNodes = [];
    let leafNodes = [];

    if (nodes.length === 2) {
      midNodes = [nodes[1]];
    } else if (nodes.length === 3) {
      midNodes = [nodes[1]];
      leafNodes = [nodes[2]];
    } else if (nodes.length === 4) {
      midNodes = [nodes[1], nodes[2]];
      leafNodes = [nodes[3]];
    } else if (nodes.length === 5) {
      midNodes = [nodes[1], nodes[2]];
      leafNodes = [nodes[3], nodes[4]];
    } else if (nodes.length > 5) {
      midNodes = [nodes[1], nodes[2]];
      leafNodes = nodes.slice(3); // Renders ALL remaining nodes! 6, 7, 8...
    }

    const tRoot = isTarget(rootNode.title, rootNode.id);

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
                <span>{rootNode.badge || 'Root Authority'}</span>
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

          {/* Branch Split 1: Root to Intermediate Level */}
          {midNodes.length > 0 && (
            <div className="tree-branch-split">
              <div className="tree-stem-vertical" />
              {midNodes.length > 1 && <div className="tree-rail-horizontal" />}
              <div className="tree-stem-drops">
                {midNodes.map((_, i) => (
                  <div key={i} className="tree-stem-drop" />
                ))}
              </div>
            </div>
          )}

          {/* Level 2: Intermediate CAs */}
          {midNodes.length > 0 && (
            <div className="tree-mid-row">
              {midNodes.map((mNode) => {
                const tMid = isTarget(mNode.title, mNode.id);
                const mColor = mNode.color || 'cyan';
                return (
                  <div
                    key={mNode.id || mNode.title}
                    className={`tree-node-card ${tMid ? 'node-active-guard is-hotspot-target' : ''}`}
                    style={{ borderLeft: `4px solid ${mColor === 'cyan' ? '#06b6d4' : mColor === 'blue' ? '#3b82f6' : '#8b5cf6'}` }}
                  >
                    <div className={`tier-rank-pill pill-${mColor}`}>
                      <span>{mNode.badge || 'Intermediate CA'}</span>
                      <span className={`tier-authority-badge ${tMid ? 'badge-gold-glow' : ''}`}>
                        {tMid ? '★ TARGET HOTSPOT' : 'INTERMEDIATE CA'}
                      </span>
                    </div>
                    <div className="tier-title-row">
                      {renderDiagramNodeIcon(mNode.iconType, `text-${mColor}`)}
                      <h4>{mNode.title}</h4>
                    </div>
                    <p className="tier-desc">{mNode.subtitle}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Branch Split 2: Intermediates to Leaves */}
          {leafNodes.length > 0 && (
            <div className="tree-branch-split">
              <div className="tree-stem-vertical" />
              {leafNodes.length > 1 && <div className="tree-rail-horizontal" />}
              <div className="tree-stem-drops">
                {leafNodes.map((_, i) => (
                  <div key={i} className="tree-stem-drop" />
                ))}
              </div>
            </div>
          )}

          {/* Level 3: Leaf Keys & Tokens (All Remaining Nodes) */}
          {leafNodes.length > 0 && (
            <div className="tree-leaf-row">
              {leafNodes.map((lNode) => {
                const tLeaf = isTarget(lNode.title, lNode.id);
                const lColor = lNode.color || 'emerald';
                return (
                  <div
                    key={lNode.id || lNode.title}
                    className={`tree-node-card ${tLeaf ? 'node-active-guard is-hotspot-target' : ''}`}
                    style={{ borderLeft: `4px solid ${lColor === 'emerald' ? '#10b981' : lColor === 'gold' ? '#f59e0b' : '#8b5cf6'}` }}
                  >
                    <div className={`tier-rank-pill pill-${lColor}`}>
                      <span>{lNode.badge || 'Leaf Key Share'}</span>
                      <span className={`tier-authority-badge ${tLeaf ? 'badge-gold-glow' : ''}`}>
                        {tLeaf ? '★ TARGET HOTSPOT' : 'LEAF CREDENTIAL'}
                      </span>
                    </div>
                    <div className="tier-title-row">
                      {renderDiagramNodeIcon(lNode.iconType, `text-${lColor}`)}
                      <h4>{lNode.title}</h4>
                    </div>
                    <p className="tier-desc">{lNode.subtitle}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. DUAL-PARTITION BOUNDARY (Two Isolated Enclaves + Impenetrable Wall)
  // =========================================================================
  if (type === 'tenant_partition') {
    const nodes = (customNodes && customNodes.length > 0) ? customNodes : [
      { id: 'node-1', title: 'Tenant Alpha Organization', subtitle: 'Encrypted ciphertext vault isolated by unique CP-ABE key', iconType: 'lock', color: 'cyan', badge: 'Partition A' },
      { id: 'node-2', title: 'Cryptographic Barrier Wall', subtitle: 'Zero-Trust cross-boundary guard and anomaly detector', iconType: 'shield', color: 'rose', badge: 'Security Barrier' },
      { id: 'node-3', title: 'Tenant Beta Organization', subtitle: 'Isolated ciphertext pool inaccessible to Tenant Alpha credentials', iconType: 'lock', color: 'purple', badge: 'Partition B' }
    ];

    // Find barrier node index (look for barrier/wall or default to middle index)
    let barrierIdx = nodes.findIndex(n =>
      n.title.toLowerCase().includes('barrier') ||
      n.title.toLowerCase().includes('wall') ||
      (n.badge && n.badge.toLowerCase().includes('barrier'))
    );
    if (barrierIdx === -1) {
      barrierIdx = nodes.length > 2 ? Math.floor(nodes.length / 2) : (nodes.length > 1 ? 1 : 0);
    }

    const barrierNode = nodes[barrierIdx] || { title: 'Cryptographic Barrier Wall', subtitle: 'Zero-Trust cross-boundary guard', iconType: 'shield' };
    const leftNodes = nodes.filter((_, idx) => idx < barrierIdx);
    const rightNodes = nodes.filter((_, idx) => idx > barrierIdx);

    const tWall = isTarget(barrierNode.title, barrierNode.id);

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Lock size={16} className="text-gold" />
          <span>{customTitle || 'ISOLATED DUAL-PARTITION BOUNDARY'}</span>
        </div>

        <div className="tenant-partition-container">
          {/* Tenant A Enclosed Sandbox Enclave (All Left Nodes) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '240px' }}>
            {(leftNodes.length > 0 ? leftNodes : [nodes[0]]).map((tNode) => {
              const tA = isTarget(tNode.title, tNode.id);
              return (
                <div key={tNode.id || tNode.title} className={`tenant-vault-box ${tA ? 'is-hotspot-target node-active-guard' : ''}`} style={{ border: '2px solid #06b6d4' }}>
                  <div className="vault-top-banner banner-cyan" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={14} />
                      <span>{tNode.badge || 'Domain Partition A'}</span>
                    </div>
                    {tA && <span className="tier-authority-badge badge-gold-glow">★ TARGET HOTSPOT</span>}
                  </div>
                  <div className="vault-body">
                    <div className="vault-client-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderDiagramNodeIcon(tNode.iconType, 'text-cyan')}
                      <span>{tNode.title}</span>
                    </div>
                    <div className="vault-key-chip">
                      <code>SCOPE:CORP_ALPHA · CIPHERTEXT POOL A</code>
                    </div>
                    <p className="vault-desc">{tNode.subtitle}</p>
                    <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.08)', fontSize: '10.5px', color: '#0891b2', fontWeight: 600 }}>
                      🔒 Strict Row-Level Security Enforced
                    </div>
                  </div>
                </div>
              );
            })}
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

          {/* Tenant B Enclosed Sandbox Enclave (All Right Nodes) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minWidth: '240px' }}>
            {(rightNodes.length > 0 ? rightNodes : (nodes.length > 1 ? [nodes[nodes.length - 1]] : [])).map((tNode) => {
              const tB = isTarget(tNode.title, tNode.id);
              return (
                <div key={tNode.id || tNode.title} className={`tenant-vault-box ${tB ? 'is-hotspot-target node-active-guard' : ''}`} style={{ border: '2px solid #8b5cf6' }}>
                  <div className="vault-top-banner banner-purple" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={14} />
                      <span>{tNode.badge || 'Domain Partition B'}</span>
                    </div>
                    {tB && <span className="tier-authority-badge badge-gold-glow">★ TARGET HOTSPOT</span>}
                  </div>
                  <div className="vault-body">
                    <div className="vault-client-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderDiagramNodeIcon(tNode.iconType, 'text-purple')}
                      <span>{tNode.title}</span>
                    </div>
                    <div className="vault-key-chip">
                      <code>SCOPE:FINTECH_BETA · CIPHERTEXT POOL B</code>
                    </div>
                    <p className="vault-desc">{tNode.subtitle}</p>
                    <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.08)', fontSize: '10.5px', color: '#7c3aed', fontWeight: 600 }}>
                      🛡️ Zero Shared Memory or State
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. PERIMETER INGRESS GATEWAY (DMZ Network Enclaves)
  // =========================================================================
  if (type === 'network_dmz') {
    const nodes = (customNodes && customNodes.length > 0) ? customNodes : [
      { id: 'node-1', title: 'External Network', subtitle: 'Client Request Stream', iconType: 'globe', color: 'cyan', badge: 'Untrusted Edge' },
      { id: 'node-2', title: 'Inspection Firewall / WAF', subtitle: 'Layer 7 Threat Inspection Gate', iconType: 'shield', color: 'gold', badge: 'Layer 7 Filter' },
      { id: 'node-3', title: 'Ingress Reverse Proxy', subtitle: 'mTLS Strict Mutual Authentication', iconType: 'server', color: 'purple', badge: 'Ingress Proxy' },
      { id: 'node-4', title: 'Internal Service Mesh', subtitle: 'Core Microservices Private VPC', iconType: 'cpu', color: 'emerald', badge: 'Private VPC' }
    ];

    // Zone 1: First node (Public Edge)
    const extNode = nodes[0];
    // Zone 3: Last node (Private VPC) if total > 2
    const meshNode = nodes.length > 2 ? nodes[nodes.length - 1] : (nodes.length === 2 ? nodes[1] : null);
    // Zone 2: All intermediate inspection/gateway nodes (nodes.slice(1, -1))
    const dmzNodes = nodes.length > 2 ? nodes.slice(1, -1) : [];

    const tExt = isTarget(extNode.title, extNode.id);
    const tMesh = meshNode ? isTarget(meshNode.title, meshNode.id) : false;

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
                {tExt ? '★ Target Hotspot' : (extNode.badge || 'Public Edge')}
              </div>
              <div className="node-desc">{extNode.subtitle}</div>
            </div>
          </div>

          <div className="pipeline-connector">
            <ArrowRight size={18} className="connector-arrow text-cyan" />
          </div>

          {/* ZONE 2: DMZ Enclave (All Intermediate Inspection & Security Gates) */}
          {dmzNodes.length > 0 && (
            <>
              <div className="dmz-zone dmz-zone-enclave">
                <div className="dmz-zone-header">
                  <ShieldCheck size={13} />
                  <span>Zone 2: Perimeter DMZ Enclave ({dmzNodes.length} Stages)</span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {dmzNodes.map((dNode, dIdx) => {
                    const tD = isTarget(dNode.title, dNode.id);
                    const dColor = dNode.color || 'gold';
                    return (
                      <React.Fragment key={dNode.id || dIdx}>
                        <div className={`pipeline-node ${tD ? 'node-active-guard is-hotspot-target' : ''}`} style={{ flex: 1, minWidth: '130px' }}>
                          <div className={`node-icon-bubble bg-${dColor}-subtle`}>
                            {renderDiagramNodeIcon(dNode.iconType, `text-${dColor}`)}
                          </div>
                          <div className="node-title">{dNode.title}</div>
                          <div className={`node-badge-tag ${tD ? 'badge-gold-glow' : ''}`}>
                            {tD ? '★ Target Hotspot' : (dNode.badge || `Stage ${dIdx + 1}`)}
                          </div>
                          <div className="node-desc">{dNode.subtitle}</div>
                        </div>

                        {dIdx < dmzNodes.length - 1 && (
                          <ArrowRight size={14} className="text-purple flex-shrink-0" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="pipeline-connector">
                <ArrowRight size={18} className="connector-arrow text-emerald" />
              </div>
            </>
          )}

          {/* ZONE 3: Secure Private VPC */}
          {meshNode && (
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
                  {tMesh ? '★ Target Hotspot' : (meshNode.badge || 'Private VPC')}
                </div>
                <div className="node-desc">{meshNode.subtitle}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. RELATIONAL ENTITY MATRIX (Data Subject ➔ Controller ➔ Processor ➔ ...)
  // =========================================================================
  if (type === 'data_flow') {
    const nodes = (customNodes && customNodes.length > 0) ? customNodes : [
      { id: 'node-1', title: 'Trainee / Learner', subtitle: 'Owner of personal identification and qualification metrics', iconType: 'users', color: 'emerald', badge: 'Data Subject' },
      { id: 'node-2', title: 'Corporate Employer', subtitle: 'Contractual entity deciding purposes of personnel qualification', iconType: 'server', color: 'cyan', badge: 'Controlling Entity (PIC)' },
      { id: 'node-3', title: 'Crossworks Training Service', subtitle: 'Executes assessments strictly pursuant to controller agreements', iconType: 'shield', color: 'purple', badge: 'Processing Service (PIP)' }
    ];

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Layers size={16} className="text-rose" />
          <span>{customTitle || 'RELATIONAL ENTITY DATA MATRIX'}</span>
        </div>

        <div className="data-flow-container">
          {nodes.map((node, idx) => {
            const matchesTarget = isTarget(node.title, node.id);
            const nodeColor = node.color || (idx === 0 ? 'emerald' : idx === 1 ? 'cyan' : 'purple');

            return (
              <React.Fragment key={node.id || idx}>
                <div className={`data-flow-card ${matchesTarget ? 'highlight-card is-hotspot-target node-active-guard' : ''}`}>
                  <div className="flow-card-header">
                    {renderDiagramNodeIcon(node.iconType, `text-${nodeColor}`)}
                    <span className={`flow-role-tag ${matchesTarget ? 'badge-gold-glow' : `tag-${nodeColor}`}`}>
                      {matchesTarget ? '★ Target Hotspot' : (node.badge || `Entity ${idx + 1}`)}
                    </span>
                  </div>
                  <div className="flow-card-title">{node.title}</div>
                  <p className="flow-card-desc">{node.subtitle}</p>
                  <div style={{ marginTop: 'auto', fontSize: '10px', color: '#059669', fontWeight: 600 }}>
                    🛡️ Compliance Boundary Bound
                  </div>
                </div>

                {idx < nodes.length - 1 && (
                  <div className="flow-connector">
                    <span className="flow-connector-label">Flow {idx + 1}</span>
                    <ArrowRight size={18} className="text-cyan" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. SEQUENTIAL PROCESS PIPELINE (Linear connected pipeline flow)
  // =========================================================================
  const pipelineNodes = (customNodes && customNodes.length > 0) ? customNodes : [
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
