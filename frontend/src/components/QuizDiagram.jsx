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
  FileCode
} from 'lucide-react';

export default function QuizDiagram({ type, customNodes, customTitle, imageUrl, imageCaption, targetNode }) {
  const [isZoomed, setIsZoomed] = useState(false);

  const isTarget = (name) => {
    if (!targetNode || !name) return false;
    const t = String(targetNode).trim().toLowerCase();
    const n = String(name).trim().toLowerCase();
    return t === n || n.includes(t) || t.includes(n);
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
            <Maximize2 size={13} />
            <span>Enlarge Diagram</span>
          </button>
        </div>

        <div className="diagram-image-frame" onClick={() => setIsZoomed(true)}>
          <img
            src={imageUrl}
            alt={imageCaption || 'Architectural Diagram'}
            className="diagram-rendered-img"
          />
          <div className="diagram-image-hover-hint">
            <Maximize2 size={18} />
            <span>Click to expand full size</span>
          </div>
        </div>

        {imageCaption && (
          <div className="diagram-caption-footer">
            <Sparkles size={13} className="text-purple flex-shrink-0" />
            <span>{imageCaption}</span>
          </div>
        )}

        {/* Fullscreen Lightbox Zoom Modal */}
        {isZoomed && (
          <div className="diagram-lightbox-backdrop" onClick={() => setIsZoomed(false)}>
            <div className="diagram-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <div className="diagram-lightbox-header flex-between">
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

  // If a custom node flow was authored
  if (customNodes && Array.isArray(customNodes) && customNodes.length > 0) {
    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Sparkles size={16} className="text-purple" />
          <span>{customTitle || 'CUSTOM ARCHITECTURAL SEQUENCE PIPELINE'}</span>
        </div>

        <div className="diagram-pipeline-wrapper custom-flow-wrapper">
          {customNodes.map((node, nIdx) => {
            const matchesTarget = node.isTarget || isTarget(node.title);
            const nodeColor = node.color || 'purple';

            return (
              <React.Fragment key={node.id || nIdx}>
                <div className={`pipeline-node node-${nodeColor} ${matchesTarget ? 'node-active-guard is-hotspot-target' : ''}`}>
                  <div className={`node-icon-bubble bg-${nodeColor}-subtle ${matchesTarget ? 'pulse-slow' : ''}`}>
                    {node.iconType === 'database' ? <Database size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'server' ? <Server size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'cloud' ? <Cloud size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'lock' ? <Lock size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'shield' ? <Shield size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'code' ? <FileCode size={22} className={`text-${nodeColor}`} /> :
                     <Cpu size={22} className={`text-${nodeColor}`} />}
                  </div>
                  <div className="node-title">{node.title || `Stage ${nIdx + 1}`}</div>
                  <div className={`node-badge-tag ${matchesTarget ? 'badge-gold-glow' : ''}`}>
                    {matchesTarget ? '★ Target Hotspot' : (node.badge || `Stage ${nIdx + 1}`)}
                  </div>
                  {node.subtitle && <div className="node-desc">{node.subtitle}</div>}
                </div>

                {nIdx < customNodes.length - 1 && (
                  <div className="pipeline-connector">
                    <div className="connector-line">
                      <div className={`connector-pulse-dot delay-${(nIdx % 3) + 1}`} />
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

  // 1. Generalized Sequential Process Pipeline
  if (type === 'security_pipeline' || type === 'sequential_pipeline') {
    const tClient = isTarget('Client') || isTarget('Trainee');
    const tGateway = isTarget('Gateway') || isTarget('API Gateway') || isTarget('Ingress');
    const tEngine = isTarget('Engine') || isTarget('Policy Engine') || isTarget('CP-ABE') || (!targetNode);
    const tDb = isTarget('Vault') || isTarget('Database') || isTarget('Storage');

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Shield size={16} className="text-cyan" />
          <span>{customTitle || 'SEQUENTIAL PROCESS PIPELINE ARCHITECTURE'}</span>
        </div>

        <div className="diagram-pipeline-wrapper">
          {/* Step 1: Client */}
          <div className={`pipeline-node node-browser ${tClient ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-cyan-subtle">
              <Users size={22} className="text-cyan" />
            </div>
            <div className="node-title">Client Interface</div>
            <div className={`node-badge-tag ${tClient ? 'badge-gold-glow' : ''}`}>
              {tClient ? '★ Target Hotspot' : 'Client Ingress'}
            </div>
            <div className="node-desc">HTTPS Session Stream</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line">
              <div className="connector-pulse-dot" />
            </div>
            <ArrowRight size={16} className="connector-arrow text-cyan" />
          </div>

          {/* Step 2: Gateway */}
          <div className={`pipeline-node node-gateway ${tGateway ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-purple-subtle">
              <Shield size={22} className="text-purple" />
            </div>
            <div className="node-title">API Gateway</div>
            <div className={`node-badge-tag ${tGateway ? 'badge-gold-glow' : ''}`}>
              {tGateway ? '★ Target Hotspot' : 'Perimeter Guard'}
            </div>
            <div className="node-desc">OAuth JWT Bearer Gate</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line">
              <div className="connector-pulse-dot delay-1" />
            </div>
            <ArrowRight size={16} className="connector-arrow text-purple" />
          </div>

          {/* Step 3: Engine */}
          <div className={`pipeline-node node-engine ${tEngine ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-gold-subtle pulse-slow">
              <Lock size={22} className="text-gold" />
            </div>
            <div className="node-title">Policy & Decryption Engine</div>
            <div className={`node-badge-tag ${tEngine ? 'badge-gold-glow' : ''}`}>
              {tEngine ? '★ Target Hotspot' : 'Core Processing Engine'}
            </div>
            <div className="node-desc">Evaluates Attribute Access Trees</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line">
              <div className="connector-pulse-dot delay-2" />
            </div>
            <ArrowRight size={16} className="connector-arrow text-emerald" />
          </div>

          {/* Step 4: Storage */}
          <div className={`pipeline-node node-db ${tDb ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-emerald-subtle">
              <Database size={22} className="text-emerald" />
            </div>
            <div className="node-title">Encrypted Storage Vault</div>
            <div className={`node-badge-tag ${tDb ? 'badge-gold-glow' : ''}`}>
              {tDb ? '★ Target Hotspot' : 'Persistent Storage'}
            </div>
            <div className="node-desc">RLS Ciphertext Partition</div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Generalized Tiered Hierarchy Pyramid
  if (type === 'clearance_hierarchy' || type === 'tiered_pyramid') {
    const tL3 = isTarget('Level 3') || isTarget('Administrator') || isTarget('Root');
    const tL2 = isTarget('Level 2') || isTarget('Manager') || isTarget('Scope') || (!targetNode);
    const tL1 = isTarget('Level 1') || isTarget('Trainee') || isTarget('Operator');

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Award size={16} className="text-purple" />
          <span>{customTitle || 'TIERED ACCESS HIERARCHY PYRAMID'}</span>
        </div>

        <div className="hierarchy-pyramid-container">
          {/* Level 3: Root Authority */}
          <div className={`hierarchy-level-card tier-top tier-level-3 ${tL3 ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="tier-rank-pill pill-purple">
              <span>CLEARANCE LEVEL 3</span>
              <span className={`tier-authority-badge ${tL3 ? 'badge-gold-glow' : ''}`}>
                {tL3 ? '★ TARGET HOTSPOT' : 'ROOT AUTHORITY'}
              </span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Shield size={20} className="text-purple" />
                <h4>Root System Administrator</h4>
              </div>
              <p className="tier-desc">
                Full authority across <strong>ALL system accounts and tenants</strong> simultaneously. Manages attribute master keys, revocation, and root audit telemetry.
              </p>
            </div>
          </div>

          <div className="hierarchy-connector-flow">
            <div className="hierarchy-flow-line" />
            <ChevronDown size={18} className="hierarchy-arrow" />
          </div>

          {/* Level 2: Portfolio / Scope Manager */}
          <div className={`hierarchy-level-card tier-mid tier-level-2 ${tL2 ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="tier-rank-pill pill-cyan">
              <span>CLEARANCE LEVEL 2</span>
              <span className={`tier-authority-badge ${tL2 ? 'badge-gold-glow' : ''}`}>
                {tL2 ? '★ TARGET HOTSPOT' : 'PORTFOLIO SCOPE'}
              </span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Building size={20} className="text-cyan" />
                <h4>Client Account & Portfolio Manager</h4>
              </div>
              <p className="tier-desc">
                Authorized for <strong>assigned corporate accounts only</strong>. Strict cryptographic isolation prevents viewing cross-tenant data.
              </p>
            </div>
          </div>

          <div className="hierarchy-connector-flow">
            <div className="hierarchy-flow-line" />
            <ChevronDown size={18} className="hierarchy-arrow" />
          </div>

          {/* Level 1: Standard Operator */}
          <div className={`hierarchy-level-card tier-base tier-level-1 ${tL1 ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="tier-rank-pill pill-emerald">
              <span>CLEARANCE LEVEL 1</span>
              <span className={`tier-authority-badge ${tL1 ? 'badge-gold-glow' : ''}`}>
                {tL1 ? '★ TARGET HOTSPOT' : 'INDIVIDUAL / COHORT SCOPE'}
              </span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Users size={20} className="text-emerald" />
                <h4>Instructor & Trainee Learner</h4>
              </div>
              <p className="tier-desc">
                Curriculum review and personal qualification testing. <strong>Zero key management</strong> or cross-user record decryption authority.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Generalized Relational Entity Matrix
  if (type === 'data_flow' || type === 'entity_matrix') {
    const tSub = isTarget('Subject') || isTarget('Learner') || isTarget('Trainee');
    const tCtrl = isTarget('Controller') || isTarget('Employer') || isTarget('PIC');
    const tProc = isTarget('Processor') || isTarget('Service') || isTarget('PIP') || (!targetNode);

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
              <Users size={20} className="text-emerald" />
              <span className={`flow-role-tag ${tSub ? 'badge-gold-glow' : 'tag-emerald'}`}>
                {tSub ? '★ Target Hotspot' : 'Data Subject'}
              </span>
            </div>
            <div className="flow-card-title">Trainee / Learner</div>
            <p className="flow-card-desc">
              Owner of personal identification, test metrics, and individual training records.
            </p>
          </div>

          <div className="flow-connector">
            <span className="flow-connector-label">Profile Transfer</span>
            <ArrowRight size={18} className="text-cyan" />
          </div>

          {/* Entity 2: Controller */}
          <div className={`data-flow-card card-controller ${tCtrl ? 'highlight-card is-hotspot-target node-active-guard' : ''}`}>
            <div className="flow-card-header">
              <Building size={20} className="text-cyan" />
              <span className={`flow-role-tag ${tCtrl ? 'badge-gold-glow' : 'tag-cyan'}`}>
                {tCtrl ? '★ Target Hotspot' : 'Controlling Entity (PIC)'}
              </span>
            </div>
            <div className="flow-card-title">Corporate Employer</div>
            <p className="flow-card-desc">
              Contractual entity deciding purposes and means of personnel qualification training.
            </p>
          </div>

          <div className="flow-connector">
            <span className="flow-connector-label">Engages Service</span>
            <ArrowRight size={18} className="text-purple" />
          </div>

          {/* Entity 3: Processor */}
          <div className={`data-flow-card card-processor ${tProc ? 'highlight-card is-hotspot-target node-active-guard' : ''}`}>
            <div className="flow-card-header">
              <Shield size={20} className="text-purple" />
              <span className={`flow-role-tag ${tProc ? 'badge-gold-glow' : 'tag-purple'}`}>
                {tProc ? '★ Target Hotspot' : 'Processing Service (PIP)'}
              </span>
            </div>
            <div className="flow-card-title">Crossworks Training Service</div>
            <p className="flow-card-desc">
              Executes qualification assessments strictly under contractual instructions of controller.
            </p>
            <div className="flow-statutory-badge">
              <CheckCircle2 size={12} />
              <span>DPA 2012 / NPC Compliant</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Generalized Dual-Partition Isolation Boundary
  if (type === 'tenant_partition' || type === 'partition_boundary') {
    const tA = isTarget('Alpha') || isTarget('Tenant A') || isTarget('Partition A');
    const tWall = isTarget('Barrier') || isTarget('Wall') || isTarget('Security Barrier') || (!targetNode);
    const tB = isTarget('Beta') || isTarget('Tenant B') || isTarget('Partition B');

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Lock size={16} className="text-gold" />
          <span>{customTitle || 'ISOLATED DUAL-PARTITION BOUNDARY'}</span>
        </div>

        <div className="tenant-partition-container">
          {/* Tenant A */}
          <div className={`tenant-vault-box vault-alpha ${tA ? 'is-hotspot-target node-active-guard' : ''}`}>
            <div className="vault-top-banner banner-cyan">
              <Lock size={16} />
              <span>{tA ? '★ TARGET: DOMAIN PARTITION A' : 'DOMAIN PARTITION A'}</span>
            </div>
            <div className="vault-body">
              <div className="vault-client-name">Tenant Alpha Organization</div>
              <div className="vault-key-chip">
                <code>Scope Attribute: SCOPE:CORP_ALPHA</code>
              </div>
              <p className="vault-desc">Encrypted ciphertext vault isolated by unique cryptographic CP-ABE polynomial key.</p>
            </div>
          </div>

          {/* Central Wall */}
          <div className={`cryptographic-barrier-wall ${tWall ? 'is-hotspot-target node-active-guard' : ''}`}>
            <div className="barrier-shield-icon">
              <AlertTriangle size={24} className="text-rose animate-bounce-subtle" />
            </div>
            <span className="barrier-title">{tWall ? '★ SECURITY BARRIER WALL' : 'CRYPTOGRAPHIC BARRIER'}</span>
            <span className="barrier-subtitle">Zero-Trust Cross-Boundary Guard</span>
            <div className="barrier-alert-tag">403 FORBIDDEN + ANOMALY LOGGED</div>
          </div>

          {/* Tenant B */}
          <div className={`tenant-vault-box vault-beta ${tB ? 'is-hotspot-target node-active-guard' : ''}`}>
            <div className="vault-top-banner banner-purple">
              <Lock size={16} />
              <span>{tB ? '★ TARGET: DOMAIN PARTITION B' : 'DOMAIN PARTITION B'}</span>
            </div>
            <div className="vault-body">
              <div className="vault-client-name">Tenant Beta Organization</div>
              <div className="vault-key-chip">
                <code>Scope Attribute: SCOPE:FINTECH_BETA</code>
              </div>
              <p className="vault-desc">Isolated ciphertext pool completely inaccessible to Tenant Alpha credentials.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Generalized Perimeter Ingress Gateway Flow
  if (type === 'network_dmz' || type === 'perimeter_gateway') {
    const tEdge = isTarget('Internet') || isTarget('Public') || isTarget('Edge');
    const tWaf = isTarget('WAF') || isTarget('Firewall') || isTarget('Inspection') || (!targetNode);
    const tProxy = isTarget('Proxy') || isTarget('Ingress') || isTarget('Gateway');
    const tMesh = isTarget('Mesh') || isTarget('VPC') || isTarget('Internal');

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Cloud size={16} className="text-cyan" />
          <span>{customTitle || 'PERIMETER INGRESS & GATEWAY ARCHITECTURE'}</span>
        </div>

        <div className="diagram-pipeline-wrapper">
          <div className={`pipeline-node ${tEdge ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-cyan-subtle">
              <Globe size={22} className="text-cyan" />
            </div>
            <div className="node-title">External Network</div>
            <div className={`node-badge-tag ${tEdge ? 'badge-gold-glow' : ''}`}>
              {tEdge ? '★ Target Hotspot' : 'Untrusted Edge'}
            </div>
            <div className="node-desc">Client Request Stream</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line" />
            <ArrowRight size={16} className="connector-arrow text-cyan" />
          </div>

          <div className={`pipeline-node ${tWaf ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-gold-subtle">
              <Shield size={22} className="text-gold" />
            </div>
            <div className="node-title">Inspection Firewall / WAF</div>
            <div className={`node-badge-tag ${tWaf ? 'badge-gold-glow' : ''}`}>
              {tWaf ? '★ Target Hotspot' : 'Layer 7 Filter'}
            </div>
            <div className="node-desc">Threat Inspection Gate</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line" />
            <ArrowRight size={16} className="connector-arrow text-purple" />
          </div>

          <div className={`pipeline-node ${tProxy ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-purple-subtle">
              <Server size={22} className="text-purple" />
            </div>
            <div className="node-title">Ingress Reverse Proxy</div>
            <div className={`node-badge-tag ${tProxy ? 'badge-gold-glow' : ''}`}>
              {tProxy ? '★ Target Hotspot' : 'mTLS Strict Gate'}
            </div>
            <div className="node-desc">Mutual Authentication</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line" />
            <ArrowRight size={16} className="connector-arrow text-emerald" />
          </div>

          <div className={`pipeline-node ${tMesh ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="node-icon-bubble bg-emerald-subtle">
              <Cpu size={22} className="text-emerald" />
            </div>
            <div className="node-title">Internal Service Mesh</div>
            <div className={`node-badge-tag ${tMesh ? 'badge-gold-glow' : ''}`}>
              {tMesh ? '★ Target Hotspot' : 'Private VPC'}
            </div>
            <div className="node-desc">Core Microservices</div>
          </div>
        </div>
      </div>
    );
  }

  // 6. Generalized Key Derivation & Token Hierarchy Tree
  if (type === 'pki_hierarchy' || type === 'branching_tree') {
    const tRoot = isTarget('Root') || isTarget('Master') || isTarget('Authority');
    const tMid = isTarget('Intermediate') || isTarget('Domain') || isTarget('Tenant') || (!targetNode);
    const tLeaf = isTarget('Ephemeral') || isTarget('Session') || isTarget('Secret Key');

    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Key size={16} className="text-gold" />
          <span>{customTitle || 'KEY DERIVATION & TOKEN HIERARCHY TREE'}</span>
        </div>

        <div className="hierarchy-pyramid-container">
          <div className={`hierarchy-level-card tier-top ${tRoot ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="tier-rank-pill pill-purple">
              <span>ROOT AUTHORITY MASTER KEY</span>
              <span className={`tier-authority-badge ${tRoot ? 'badge-gold-glow' : ''}`}>
                {tRoot ? '★ TARGET HOTSPOT' : 'ROOT PARAMETERS'}
              </span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Key size={20} className="text-purple" />
                <h4>Master Cryptographic Authority</h4>
              </div>
              <p className="tier-desc">Root pairing parameters used to derive attribute-weighted private key polynomial shares.</p>
            </div>
          </div>

          <div className="hierarchy-connector-flow">
            <ChevronDown size={18} className="hierarchy-arrow" />
          </div>

          <div className={`hierarchy-level-card tier-mid ${tMid ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="tier-rank-pill pill-cyan">
              <span>INTERMEDIATE DOMAIN AUTHORITY</span>
              <span className={`tier-authority-badge ${tMid ? 'badge-gold-glow' : ''}`}>
                {tMid ? '★ TARGET HOTSPOT' : 'ORGANIZATIONAL SCOPE'}
              </span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Building size={20} className="text-cyan" />
                <h4>Domain Attribute Authority (CA)</h4>
              </div>
              <p className="tier-desc">Issues scoped client policy tokens to authorized institutional personnel.</p>
            </div>
          </div>

          <div className="hierarchy-connector-flow">
            <ChevronDown size={18} className="hierarchy-arrow" />
          </div>

          <div className={`hierarchy-level-card tier-base ${tLeaf ? 'node-active-guard is-hotspot-target' : ''}`}>
            <div className="tier-rank-pill pill-emerald">
              <span>EPHEMERAL SESSION KEY</span>
              <span className={`tier-authority-badge ${tLeaf ? 'badge-gold-glow' : ''}`}>
                {tLeaf ? '★ TARGET HOTSPOT' : 'DECRYPTION ENVELOPE'}
              </span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Lock size={20} className="text-emerald" />
                <h4>Attribute Secret Key (Leaf)</h4>
              </div>
              <p className="tier-desc">User-bound polynomial key share that decrypts ciphers matching the embedded access tree.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
