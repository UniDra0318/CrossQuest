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

export default function QuizDiagram({ type, customNodes, customTitle, imageUrl, imageCaption }) {
  const [isZoomed, setIsZoomed] = useState(false);

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
            const isTarget = node.isTarget;
            const nodeColor = node.color || 'purple';

            return (
              <React.Fragment key={node.id || nIdx}>
                <div className={`pipeline-node node-${nodeColor} ${isTarget ? 'node-active-guard custom-target-node' : ''}`}>
                  <div className={`node-icon-bubble bg-${nodeColor}-subtle ${isTarget ? 'pulse-slow' : ''}`}>
                    {node.iconType === 'database' ? <Database size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'server' ? <Server size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'cloud' ? <Cloud size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'lock' ? <Lock size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'shield' ? <Shield size={22} className={`text-${nodeColor}`} /> :
                     node.iconType === 'code' ? <FileCode size={22} className={`text-${nodeColor}`} /> :
                     <Cpu size={22} className={`text-${nodeColor}`} />}
                  </div>
                  <div className="node-title">{node.title || `Stage ${nIdx + 1}`}</div>
                  {node.badge && (
                    <div className={`node-badge-tag ${isTarget ? 'badge-gold-glow' : ''}`}>
                      {node.badge}
                    </div>
                  )}
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
  // 1. Zero-Trust Security & Encryption Pipeline
  if (type === 'security_pipeline') {
    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Shield size={16} className="text-cyan" />
          <span>ZERO-TRUST CRYPTOGRAPHIC PIPELINE ARCHITECTURE</span>
        </div>

        <div className="diagram-pipeline-wrapper">
          {/* Step 1: Client */}
          <div className="pipeline-node node-browser">
            <div className="node-icon-bubble bg-cyan-subtle">
              <Users size={22} className="text-cyan" />
            </div>
            <div className="node-title">Trainee Client</div>
            <div className="node-badge-tag">Browser UI</div>
            <div className="node-desc">HTTPS Session</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line">
              <div className="connector-pulse-dot" />
            </div>
            <ArrowRight size={16} className="connector-arrow text-cyan" />
          </div>

          {/* Step 2: Gateway */}
          <div className="pipeline-node node-gateway">
            <div className="node-icon-bubble bg-purple-subtle">
              <Shield size={22} className="text-purple" />
            </div>
            <div className="node-title">API Gateway</div>
            <div className="node-badge-tag">Perimeter Guard</div>
            <div className="node-desc">OAuth JWT Bearer</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line">
              <div className="connector-pulse-dot delay-1" />
            </div>
            <ArrowRight size={16} className="connector-arrow text-purple" />
          </div>

          {/* Step 3: CP-ABE Engine (Hotspot Target) */}
          <div className="pipeline-node node-engine node-active-guard">
            <div className="node-icon-bubble bg-gold-subtle pulse-slow">
              <Lock size={22} className="text-gold" />
            </div>
            <div className="node-title">CP-ABE Engine</div>
            <div className="node-badge-tag badge-gold-glow">Zero-Trust Decryption</div>
            <div className="node-desc">Evaluates Attribute Policy</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line">
              <div className="connector-pulse-dot delay-2" />
            </div>
            <ArrowRight size={16} className="connector-arrow text-emerald" />
          </div>

          {/* Step 4: Database */}
          <div className="pipeline-node node-db">
            <div className="node-icon-bubble bg-emerald-subtle">
              <Database size={22} className="text-emerald" />
            </div>
            <div className="node-title">Encrypted Vault</div>
            <div className="node-badge-tag">PostgreSQL / RLS</div>
            <div className="node-desc">Ciphertext Storage</div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Clearance Level Hierarchy Diagram
  if (type === 'clearance_hierarchy') {
    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Award size={16} className="text-purple" />
          <span>MULTI-TENANT ACCESS CONTROL: CLEARANCE LEVEL PYRAMID</span>
        </div>

        <div className="hierarchy-pyramid-container">
          {/* Level 3: Root Admin */}
          <div className="hierarchy-level-card tier-top tier-level-3">
            <div className="tier-rank-pill pill-purple">
              <span>CLEARANCE LEVEL 3</span>
              <span className="tier-authority-badge">ROOT AUTHORITY</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Shield size={20} className="text-purple" />
                <h4>System Administrator</h4>
              </div>
              <p className="tier-desc">
                Full authority across <strong>ALL corporate accounts</strong> simultaneously. Manages attribute authority, key revocation, and system audit logs.
              </p>
            </div>
          </div>

          {/* Authority Flow Vector */}
          <div className="hierarchy-connector-flow">
            <div className="hierarchy-flow-line" />
            <ChevronDown size={18} className="hierarchy-arrow" />
          </div>

          {/* Level 2: Account Manager */}
          <div className="hierarchy-level-card tier-mid tier-level-2">
            <div className="tier-rank-pill pill-cyan">
              <span>CLEARANCE LEVEL 2</span>
              <span className="tier-authority-badge">CLIENT PORTFOLIO SCOPE</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Building size={20} className="text-cyan" />
                <h4>Client Account Manager</h4>
              </div>
              <p className="tier-desc">
                Authorized for <strong>assigned corporate accounts only</strong> (e.g. San Miguel Holdings). Strict cryptographic isolation prevents viewing cross-tenant data.
              </p>
            </div>
          </div>

          {/* Authority Flow Vector */}
          <div className="hierarchy-connector-flow">
            <div className="hierarchy-flow-line" />
            <ChevronDown size={18} className="hierarchy-arrow" />
          </div>

          {/* Level 1: Trainer & Trainee */}
          <div className="hierarchy-level-card tier-base tier-level-1">
            <div className="tier-rank-pill pill-emerald">
              <span>CLEARANCE LEVEL 1</span>
              <span className="tier-authority-badge">INDIVIDUAL & COHORT SCOPE</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Users size={20} className="text-emerald" />
                <h4>Instructor & Trainee Learner</h4>
              </div>
              <p className="tier-desc">
                Cohort curriculum review and personal assessment verification. <strong>Zero key management</strong> or cross-user record decryption authority.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Data Privacy Flow (R.A. 10173 Roles)
  if (type === 'data_flow') {
    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Layers size={16} className="text-rose" />
          <span>STATUTORY PRIVACY COMPLIANCE: DATA RELATIONSHIP MATRIX</span>
        </div>

        <div className="data-flow-container">
          {/* Entity 1: Trainee */}
          <div className="data-flow-card card-subject">
            <div className="flow-card-header">
              <Users size={20} className="text-emerald" />
              <span className="flow-role-tag tag-emerald">Data Subject</span>
            </div>
            <div className="flow-card-title">Trainee / Learner</div>
            <p className="flow-card-desc">
              Owner of personal identification, test metrics, and training assessment data.
            </p>
          </div>

          <div className="flow-connector">
            <span className="flow-connector-label">Transfers Profile</span>
            <ArrowRight size={18} className="text-cyan" />
          </div>

          {/* Entity 2: Corporate Employer */}
          <div className="data-flow-card card-controller">
            <div className="flow-card-header">
              <Building size={20} className="text-cyan" />
              <span className="flow-role-tag tag-cyan">Personal Info Controller (PIC)</span>
            </div>
            <div className="flow-card-title">Corporate Employer</div>
            <p className="flow-card-desc">
              Contractual entity deciding purposes and means of personnel qualification training.
            </p>
          </div>

          <div className="flow-connector">
            <span className="flow-connector-label">Engages via DPA Agreement</span>
            <ArrowRight size={18} className="text-purple" />
          </div>

          {/* Entity 3: Crossworks */}
          <div className="data-flow-card card-processor highlight-card">
            <div className="flow-card-header">
              <Shield size={20} className="text-purple" />
              <span className="flow-role-tag tag-purple">Personal Info Processor (PIP)</span>
            </div>
            <div className="flow-card-title">Crossworks Training Service</div>
            <p className="flow-card-desc">
              Processes trainee assessments strictly under contractual instructions of PIC.
            </p>
            <div className="flow-statutory-badge">
              <CheckCircle2 size={12} />
              <span>DPA 2012 / NPC Certified</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Multi-Tenant Cryptographic Partitioning
  if (type === 'tenant_partition') {
    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Lock size={16} className="text-gold" />
          <span>CRYPTOGRAPHIC MULTI-TENANT ISOLATION BOUNDARIES</span>
        </div>

        <div className="tenant-partition-container">
          {/* Tenant A */}
          <div className="tenant-vault-box vault-alpha">
            <div className="vault-top-banner banner-cyan">
              <Lock size={16} />
              <span>TENANT ALPHA PARTITION</span>
            </div>
            <div className="vault-body">
              <div className="vault-client-name">San Miguel Conglomerate Holdings</div>
              <div className="vault-key-chip">
                <code>Key Attribute: COMPANY:CORP_ALPHA</code>
              </div>
              <p className="vault-desc">Encrypted ciphertext vault isolated by unique cryptographic CP-ABE polynomial key.</p>
            </div>
          </div>

          {/* Central Wall */}
          <div className="cryptographic-barrier-wall">
            <div className="barrier-shield-icon">
              <AlertTriangle size={24} className="text-rose animate-bounce-subtle" />
            </div>
            <span className="barrier-title">CRYPTOGRAPHIC BARRIER</span>
            <span className="barrier-subtitle">Zero-Trust Cross-Boundary Trap</span>
            <div className="barrier-alert-tag">403 FORBIDDEN + ANOMALY LOGGED</div>
          </div>

          {/* Tenant B */}
          <div className="tenant-vault-box vault-beta">
            <div className="vault-top-banner banner-purple">
              <Lock size={16} />
              <span>TENANT BETA PARTITION</span>
            </div>
            <div className="vault-body">
              <div className="vault-client-name">Maya FinTech Digital Innovations</div>
              <div className="vault-key-chip">
                <code>Key Attribute: COMPANY:FINTECH_BETA</code>
              </div>
              <p className="vault-desc">Isolated ciphertext pool completely inaccessible to Tenant Alpha credentials.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Zero-Trust Ingress & Cloudflare WAF DMZ
  if (type === 'network_dmz') {
    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Cloud size={16} className="text-cyan" />
          <span>ZERO-TRUST INGRESS & CLOUDFLARE WAF PERIMETER</span>
        </div>

        <div className="diagram-pipeline-wrapper">
          <div className="pipeline-node">
            <div className="node-icon-bubble bg-cyan-subtle">
              <Globe size={22} className="text-cyan" />
            </div>
            <div className="node-title">Public Internet</div>
            <div className="node-badge-tag">Untrusted Edge</div>
            <div className="node-desc">Client HTTPS Requests</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line" />
            <ArrowRight size={16} className="connector-arrow text-cyan" />
          </div>

          <div className="pipeline-node node-active-guard">
            <div className="node-icon-bubble bg-gold-subtle">
              <Shield size={22} className="text-gold" />
            </div>
            <div className="node-title">Cloudflare WAF</div>
            <div className="node-badge-tag badge-gold-glow">DDoS & Layer 7 Inspection</div>
            <div className="node-desc">OWASP Core Rule Set</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line" />
            <ArrowRight size={16} className="connector-arrow text-purple" />
          </div>

          <div className="pipeline-node">
            <div className="node-icon-bubble bg-purple-subtle">
              <Server size={22} className="text-purple" />
            </div>
            <div className="node-title">Ingress Reverse Proxy</div>
            <div className="node-badge-tag">mTLS Strict Gate</div>
            <div className="node-desc">Mutual Authentication</div>
          </div>

          <div className="pipeline-connector">
            <div className="connector-line" />
            <ArrowRight size={16} className="connector-arrow text-emerald" />
          </div>

          <div className="pipeline-node">
            <div className="node-icon-bubble bg-emerald-subtle">
              <Cpu size={22} className="text-emerald" />
            </div>
            <div className="node-title">Internal Service Mesh</div>
            <div className="node-badge-tag">Private VPC</div>
            <div className="node-desc">FastAPI Microservices</div>
          </div>
        </div>
      </div>
    );
  }

  // 6. CP-ABE Key Issuance & KMS Hierarchy
  if (type === 'pki_hierarchy') {
    return (
      <div className="diagram-card-container">
        <div className="diagram-header-strip">
          <Key size={16} className="text-gold" />
          <span>CP-ABE MASTER KEY & EPHEMERAL TOKEN HIERARCHY</span>
        </div>

        <div className="hierarchy-pyramid-container">
          <div className="hierarchy-level-card tier-top">
            <div className="tier-rank-pill pill-purple">
              <span>ROOT AUTHORITY MASTER KEY (MK / PK)</span>
              <span className="tier-authority-badge">BSW07 / SS512</span>
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

          <div className="hierarchy-level-card tier-mid">
            <div className="tier-rank-pill pill-cyan">
              <span>TENANT INTERMEDIATE CA</span>
              <span className="tier-authority-badge">ORGANIZATIONAL SCOPE</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Building size={20} className="text-cyan" />
                <h4>Domain Attribute Authority</h4>
              </div>
              <p className="tier-desc">Issues versioned client policy tokens (e.g. CLIENT:CORP_ALPHA:V1) to authorized personnel.</p>
            </div>
          </div>

          <div className="hierarchy-connector-flow">
            <ChevronDown size={18} className="hierarchy-arrow" />
          </div>

          <div className="hierarchy-level-card tier-base">
            <div className="tier-rank-pill pill-emerald">
              <span>EPHEMERAL SESSION KEY</span>
              <span className="tier-authority-badge">DECRYPTION ENVELOPE</span>
            </div>
            <div className="tier-card-body">
              <div className="tier-title-row">
                <Lock size={20} className="text-emerald" />
                <h4>Attribute Secret Key (SK)</h4>
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
