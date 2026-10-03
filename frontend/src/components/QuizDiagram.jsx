import React from 'react';
import { Shield, Lock, Server, Database, Key, Users, ArrowRight, AlertTriangle, Layers, CheckCircle } from 'lucide-react';

export default function QuizDiagram({ type }) {
  if (type === 'security_pipeline') {
    return (
      <div className="quiz-diagram-box">
        <div className="diagram-title-tag">SYSTEM ARCHITECTURE: ZERO-TRUST ENCRYPTION PIPELINE</div>
        <div className="diagram-flow-row">
          <div className="diagram-node node-client">
            <Users size={20} className="text-cyan" />
            <div className="node-title">Trainee Browser</div>
            <div className="node-sub">HTTPS / Web App</div>
          </div>
          <div className="diagram-arrow"><ArrowRight size={18} /></div>
          <div className="diagram-node node-gateway">
            <Shield size={20} className="text-purple" />
            <div className="node-title">API Gateway</div>
            <div className="node-sub">OAuth JWT Validation</div>
          </div>
          <div className="diagram-arrow"><ArrowRight size={18} /></div>
          <div className="diagram-node node-engine highlight-node">
            <Lock size={20} className="text-gold" />
            <div className="node-title">CP-ABE Engine</div>
            <div className="node-sub">Cryptographic Policy Tree</div>
            <span className="node-badge">Zero-Trust Guard</span>
          </div>
          <div className="diagram-arrow"><ArrowRight size={18} /></div>
          <div className="diagram-node node-db">
            <Database size={20} className="text-green" />
            <div className="node-title">Multi-Tenant DB</div>
            <div className="node-sub">PostgreSQL / RLS</div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'clearance_hierarchy') {
    return (
      <div className="quiz-diagram-box">
        <div className="diagram-title-tag">ACCESS CONTROL MATRIX: CLEARANCE LEVEL HIERARCHY</div>
        <div className="diagram-levels-stack">
          <div className="clearance-level-card level-3">
            <div className="level-badge badge-purple">CLEARANCE LEVEL 3</div>
            <div className="level-info">
              <strong>System Administrator (Root Authority)</strong>
              <p>Full cross-tenant audit access, cryptographic key issuance & attribute assignment.</p>
            </div>
          </div>
          <div className="clearance-level-card level-2">
            <div className="level-badge badge-cyan">CLEARANCE LEVEL 2</div>
            <div className="level-info">
              <strong>Client Account Manager</strong>
              <p>Restricted to assigned client accounts only (e.g. CORP_ALPHA only). Strict tenant boundary enforced.</p>
            </div>
          </div>
          <div className="clearance-level-card level-1">
            <div className="level-badge badge-gray">CLEARANCE LEVEL 1</div>
            <div className="level-info">
              <strong>Trainer & Trainee Analyst</strong>
              <p>Course cohort viewing and individual grade inspection. Zero administrative key authority.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'data_flow') {
    return (
      <div className="quiz-diagram-box">
        <div className="diagram-title-tag">DATA PRIVACY COMPLIANCE: ROLES UNDER R.A. 10173</div>
        <div className="diagram-flow-row">
          <div className="diagram-node node-subject">
            <Users size={20} className="text-emerald" />
            <div className="node-title">Trainee / Learner</div>
            <div className="node-sub">Data Subject</div>
          </div>
          <div className="diagram-arrow"><ArrowRight size={18} /></div>
          <div className="diagram-node node-controller">
            <Layers size={20} className="text-cyan" />
            <div className="node-title">Corporate Client</div>
            <div className="node-sub">Personal Info Controller (PIC)</div>
          </div>
          <div className="diagram-arrow"><ArrowRight size={18} /></div>
          <div className="diagram-node node-processor highlight-node">
            <Shield size={20} className="text-magenta" />
            <div className="node-title">Crossworks Training</div>
            <div className="node-sub">Personal Info Processor (PIP)</div>
            <span className="node-badge">Contractual Mandate</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'tenant_partition') {
    return (
      <div className="quiz-diagram-box">
        <div className="diagram-title-tag">MULTI-TENANT CRYPTOGRAPHIC PARTITIONING</div>
        <div className="diagram-partitions-row">
          <div className="partition-bucket bucket-alpha">
            <div className="bucket-header">
              <Lock size={16} className="text-cyan" />
              <span>TENANT ALPHA (CORP_ALPHA)</span>
            </div>
            <div className="bucket-content">
              <code>Ciphertext Key: SK_CORP_ALPHA</code>
              <p>San Miguel Holdings Records Vault</p>
            </div>
          </div>

          <div className="partition-barrier">
            <AlertTriangle size={24} className="text-rose" />
            <span>CRYPTOGRAPHIC BARRIER</span>
            <small>403 Out-of-Scope Trap</small>
          </div>

          <div className="partition-bucket bucket-beta">
            <div className="bucket-header">
              <Lock size={16} className="text-purple" />
              <span>TENANT BETA (FINTECH_BETA)</span>
            </div>
            <div className="bucket-content">
              <code>Ciphertext Key: SK_FINTECH_BETA</code>
              <p>Maya FinTech Digital Innovations</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
