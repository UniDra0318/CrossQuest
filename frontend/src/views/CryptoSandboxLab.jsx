import React, { useState, useEffect } from 'react';
import { 
  Copy,
  Check,
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  ArrowRight, 
  Layers, 
  Sliders, 
  Code2, 
  Eye, 
  Sparkles, 
  HelpCircle,
  FileCheck,
  UserCheck,
  UserX,
  Zap,
  Bomb
} from 'lucide-react';
import { 
  fetchCryptoPersonas, 
  runCryptoSandboxEncrypt, 
  runCryptoSandboxDecrypt 
} from '../services/api';

const PRESET_SCENARIOS = [
  {
    name: "Scenario 1: Enterprise Multi-Tenant Scoping (San Miguel)",
    policy: "ROLEADMIN or (ROLEACCTMGR and CLIENTCORPALPHAV1) or TRAINEETRN9021",
    payload: {
      trainee_name: "Juan Dela Cruz",
      trainee_id: "TRN-9021",
      company: "San Miguel Conglomerate Holdings",
      course: "ISO 31000 Enterprise Risk Management",
      score: 96.5,
      evaluation: "Passed with High Distinction",
      trainer_remarks: "Demonstrated exemplary zero-trust implementation and threat modeling.",
      certificate_ref: "CERT-ISO31000-2026-9021"
    },
    description: "Marcus (San Miguel AM) and Juan (Trainee) can decrypt; Andrea (Maya FinTech AM) is mathematically blocked."
  },
  {
    name: "Scenario 2: Cross-Company Trainee Identity Portability (DD-01)",
    policy: "TRAINEETRN9021 or ROLEADMIN",
    payload: {
      trainee_name: "Juan Dela Cruz",
      trainee_id: "TRN-9021",
      lifetime_portfolio: "Capstones & Cryptographic Badges across 3 Employers",
      verified_certifications: ["PMI PMP", "PECB ISO/IEC 27001", "CompTIA Security+"],
      status: "Personal Career Dossier"
    },
    description: "Allows Juan to access his lifetime training dossier even after transferring to another conglomerate."
  },
  {
    name: "Scenario 3: Trainer Evaluated Session Delivery",
    policy: "ROLEADMIN or (ROLETRAINER and TRAININGSEC2026V1)",
    payload: {
      session_code: "SESS-SEC-2026",
      module: "Advanced Cryptographic Envelopes",
      trainer: "David Lim",
      cohort_pass_rate: "94.2%",
      trainer_private_notes: "Cohort mastered CP-ABE policy trees and KMS envelope wrapping."
    },
    description: "Only Lead Trainer David Lim and Master Admin can decrypt session remarks."
  },
  {
    name: "Scenario 4: Strict Dual-Attribute Executive Audit",
    policy: "ROLEADMIN or (ROLEFINANCE and CLIENTCORPALPHAV1)",
    payload: {
      audit_type: "Corporate Compliance Audit",
      client: "San Miguel Conglomerate Holdings",
      tax_form_2307_cleared: true,
      data_isolation_certified: "100% Contamination Free"
    },
    description: "Requires both Finance clearance AND assigned client attribution."
  }
];

const FALLBACK_PERSONAS = [
  {
    id: "persona_admin",
    name: "Dr. Sarah Jenkins",
    role: "Administrator",
    organization: "Crossworks Training & Consulting",
    attributes: ["ROLEADMIN"],
    description: "Master Authority: Can decrypt all records across all enterprise tenants via universal authority clause.",
    badge_color: "#7c3aed"
  },
  {
    id: "persona_am_alpha",
    name: "Marcus Reyes",
    role: "Account Manager",
    organization: "Assigned: San Miguel & BDO Unibank",
    attributes: ["ROLEACCTMGR", "CLIENTCORPALPHAV1", "CLIENTBANKDELTAV1"],
    description: "Enterprise Scoped: Permitted for San Miguel (CORP_ALPHA) and BDO (BANK_DELTA) records only.",
    badge_color: "#2563eb"
  },
  {
    id: "persona_am_beta",
    name: "Andrea Salazar",
    role: "Account Manager",
    organization: "Assigned: Maya FinTech & Ayala Retail",
    attributes: ["ROLEACCTMGR", "CLIENTFINTECHBETAV1", "CLIENTRETAILGAMMAV1"],
    description: "Competitor Tenant: Permitted for Maya FinTech and Ayala Retail. Out-of-scope for San Miguel.",
    badge_color: "#0284c7"
  },
  {
    id: "persona_trainee_juan",
    name: "Juan Dela Cruz",
    role: "Trainee Analyst",
    organization: "San Miguel Conglomerate Holdings",
    attributes: ["TRAINEE", "TRAINEETRN9021"],
    description: "Personal Identity Portability (DD-01): Decrypts his own lifetime learning achievements across employers.",
    badge_color: "#059669"
  },
  {
    id: "persona_trainer_david",
    name: "David Lim",
    role: "Lead Security Trainer",
    organization: "Crossworks Instructor Faculty",
    attributes: ["ROLETRAINER", "TRAININGSEC2026V1"],
    description: "Course Scoped: Authorized for Information Security cohort sessions.",
    badge_color: "#d97706"
  },
  {
    id: "persona_adversary",
    name: "Unauthorized Intruder / Attacker",
    role: "Untrusted External Entity",
    organization: "External Internet / Rogue DBA",
    attributes: ["ANONYMOUS_ACTOR", "UNAUTHORIZED_GUEST"],
    description: "Adversary Simulation: Zero valid enterprise attributes. Mathematical decryption provably impossible.",
    badge_color: "#e11d48"
  }
];

export default function CryptoSandboxLab() {
  const [personas, setPersonas] = useState(FALLBACK_PERSONAS);
  const [loadingPersonas, setLoadingPersonas] = useState(false);

  // Encryption Form State
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [policyInput, setPolicyInput] = useState(PRESET_SCENARIOS[0].policy);
  const [payloadJsonInput, setPayloadJsonInput] = useState(JSON.stringify(PRESET_SCENARIOS[0].payload, null, 2));
  const [recordIdInput, setRecordIdInput] = useState("REC-PILOT-9021");
  const [versionInput, setVersionInput] = useState(1);

  // Encryption Result State
  const [encryptedPackage, setEncryptedPackage] = useState(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptError, setEncryptError] = useState(null);

  // Decryption Station State
  const [selectedPersona, setSelectedPersona] = useState(FALLBACK_PERSONAS[1]);
  const [customAttributesInput, setCustomAttributesInput] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionResult, setDecryptionResult] = useState(null);
  const [decryptError, setDecryptError] = useState(null);
  const [activeTamperMode, setActiveTamperMode] = useState("NONE");
  const [copiedCipher, setCopiedCipher] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedDecrypted, setCopiedDecrypted] = useState(false);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'abe') {
      setCopiedCipher(true);
      setTimeout(() => setCopiedCipher(false), 2000);
    } else if (type === 'payload') {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } else if (type === 'decrypted') {
      setCopiedDecrypted(true);
      setTimeout(() => setCopiedDecrypted(false), 2000);
    }
  };


  // Load Personas on Mount
  useEffect(() => {
    async function init() {
      setLoadingPersonas(true);
      try {
        const data = await fetchCryptoPersonas();
        if (data && Array.isArray(data)) {
          setPersonas(data);
          setSelectedPersona(data[1]); // Default to Marcus Reyes (AM Alpha)
        }
      } catch (err) {
        console.warn("Could not load personas from API:", err);
      } finally {
        setLoadingPersonas(false);
      }
    }
    init();
  }, []);

  // Handle Scenario Change
  const handleScenarioChange = (idx) => {
    setSelectedScenarioIdx(idx);
    const scen = PRESET_SCENARIOS[idx];
    setPolicyInput(scen.policy);
    setPayloadJsonInput(JSON.stringify(scen.payload, null, 2));
    setEncryptedPackage(null);
    setDecryptionResult(null);
  };

  // Run Real-Time Encryption
  const handleExecuteEncrypt = async () => {
    setIsEncrypting(true);
    setEncryptError(null);
    setDecryptionResult(null);

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payloadJsonInput);
    } catch (err) {
      setEncryptError("Invalid JSON in Record Payload field.");
      setIsEncrypting(false);
      return;
    }

    try {
      const res = await runCryptoSandboxEncrypt({
        payload: parsedPayload,
        policy: policyInput.trim(),
        recordId: recordIdInput.trim() || "REC-DEMO-001",
        version: versionInput
      });
      setEncryptedPackage(res);
    } catch (err) {
      setEncryptError(err.message || "Encryption failed.");
    } finally {
      setIsEncrypting(false);
    }
  };

  // Run Real-Time Decryption
  const handleExecuteDecrypt = async (tamperMode = activeTamperMode, personaOverride = null) => {
    if (!encryptedPackage) {
      alert("Please encrypt a record payload first in Step 1.");
      return;
    }

    const personaToUse = personaOverride || selectedPersona;
    let attrs = [];

    if (customAttributesInput.trim()) {
      attrs = customAttributesInput.split(',').map(s => s.trim()).filter(Boolean);
    } else if (personaToUse) {
      attrs = personaToUse.attributes || [];
    }

    setIsDecrypting(true);
    setDecryptError(null);
    setActiveTamperMode(tamperMode);

    try {
      const res = await runCryptoSandboxDecrypt({
        encryptedRecord: encryptedPackage,
        userAttributes: attrs,
        recordId: recordIdInput.trim() || "REC-DEMO-001",
        version: versionInput,
        simulateTamper: tamperMode
      });
      setDecryptionResult(res);
    } catch (err) {
      setDecryptError(err.message || "Decryption request failed.");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '26px', paddingBottom: '60px' }}>
      
      {/* DEMO & EVALUATION NOTICE BANNER */}
      <div className="crypto-lab-banner">
        <div className="crypto-lab-banner__left">
          <span className="crypto-lab-banner__badge">
            DEMO &amp; EVALUATION TOOL
          </span>
          <span className="crypto-lab-banner__desc">
            Diagnostic Route (<code className="crypto-lab-banner__code">/admin/crypto-lab</code>, <code className="crypto-lab-banner__code">/demo/crypto-lab</code>) &bull; Authenticated Administrator Access Only &bull; Chapter 3 / DD-02 DMA-CP-ABE
          </span>
        </div>
        <span className="crypto-lab-banner__guard">
          🔒 Protected by RoleGuard (admin)
        </span>
      </div>

      {/* 1. DEFENSE HERO HEADER */}
      <div 
        style={{ 
          background: 'linear-gradient(135deg, #170b2e 0%, #2e1065 60%, #3b0764 100%)', 
          borderRadius: '26px', 
          padding: '36px 36px', 
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(46, 16, 101, 0.28)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ background: '#7c3aed', color: '#ffffff', padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em' }}>
                CAPSTONE DEFENSE LIVE VERIFICATION
              </span>
              <span style={{ background: 'rgba(255,255,255,0.12)', color: '#a7f3d0', padding: '4px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={13} /> BSW07 ON SS512 PAIRING CURVE
              </span>
              <span style={{ background: 'rgba(255,255,255,0.12)', color: '#bae6fd', padding: '4px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700 }}>
                AES-256-GCM + AAD ENVELOPE
              </span>
            </div>

            <h1 style={{ margin: '8px 0 10px 0', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              CP-ABE & AES-256-GCM Cryptographic Sandbox
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }}>
              Interactive demonstration of Ciphertext-Policy Attribute-Based Encryption (BSW07) combined with authenticated symmetric encryption. Verify fine-grained boolean policy evaluation, cross-company trainee portability, and tamper detection in real time.
            </p>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px 20px', border: '1px solid rgba(255,255,255,0.14)', textAlign: 'center' }}>
              <span style={{ color: '#c4b5fd', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CRYPTO TEST BENCH
              </span>
              <div style={{ color: '#ffffff', fontSize: '22px', fontWeight: 800, marginTop: '2px' }}>
                Zero-Trust
              </div>
              <span style={{ color: '#86efac', fontSize: '11.5px', fontWeight: 700 }}>
                Data Layer Security
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN INTERACTIVE LAB WORKBENCH (LOCKED EQUAL WIDTHS & TOP-ALIGNED) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
        
        {/* COLUMN LEFT: STEP 1 - ENCRYPTION STATION */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            padding: '28px', 
            border: '1px solid var(--cq-line)', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--cq-line)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Step 1: Encryption Station</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Define sensitive record & boolean CP-ABE access policy</span>
              </div>
            </div>
            <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 800 }}>
              SENDER / TRAINER
            </span>
          </div>

          {/* Preset Scenario Selector */}
          <div>
            <label htmlFor="scenario-select" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              PRESET CAPSTONE DEFENSE SCENARIOS:
            </label>
            <select
              id="scenario-select"
              value={selectedScenarioIdx}
              onChange={(e) => handleScenarioChange(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1e293b',
                background: '#f8fafc',
                outline: 'none'
              }}
            >
              {PRESET_SCENARIOS.map((scen, idx) => (
                <option key={idx} value={idx}>{scen.name}</option>
              ))}
            </select>
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
              💡 {PRESET_SCENARIOS[selectedScenarioIdx].description}
            </p>
          </div>

          {/* CP-ABE Policy Input */}
          <div>
            <label htmlFor="policy-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              <span>BOOLEAN CP-ABE ACCESS POLICY STRING:</span>
              <span style={{ color: '#7c3aed', fontSize: '11px' }}>BSW07 Expression</span>
            </label>
            <input
              id="policy-input"
              type="text"
              value={policyInput}
              onChange={(e) => setPolicyInput(e.target.value)}
              placeholder="e.g. ROLEADMIN or (ROLEACCTMGR and CLIENTCORPALPHAV1)"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #a855f7',
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 700,
                color: '#581c87',
                background: '#faf5ff',
                outline: 'none'
              }}
            />
          </div>

          {/* Record Payload JSON */}
          <div>
            <label htmlFor="payload-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              <span>RECORD PAYLOAD (CONFIDENTIAL JSON DATA):</span>
              <span style={{ color: '#64748b', fontSize: '11px' }}>AES-256-GCM Protected</span>
            </label>
            <textarea
              id="payload-input"
              rows={7}
              value={payloadJsonInput}
              onChange={(e) => setPayloadJsonInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontFamily: 'monospace',
                fontSize: '12.5px',
                background: '#f8fafc',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Record Metadata Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="record-id-input" style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                RECORD ID (BOUND INTO AAD):
              </label>
              <input
                id="record-id-input"
                type="text"
                value={recordIdInput}
                onChange={(e) => setRecordIdInput(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label htmlFor="policy-version-input" style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                POLICY VERSION:
              </label>
              <input
                id="policy-version-input"
                type="number"
                value={versionInput}
                onChange={(e) => setVersionInput(Number(e.target.value))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Encrypt Action Button with guaranteed high-contrast visible text */}
          <button
            type="button"
            onClick={handleExecuteEncrypt}
            disabled={isEncrypting}
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '14px',
              cursor: isEncrypting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            {isEncrypting ? (
              <span style={{ color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13.5px' }}>
                <RefreshCw size={16} className="spin-animation" style={{ color: '#ffffff' }} />
                Generating Cryptographic Pairing & DEK...
              </span>
            ) : (
              <span style={{ color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px' }}>
                <Zap size={16} style={{ color: '#ffffff' }} />
                Execute CP-ABE + AES-256-GCM Encryption
              </span>
            )}
          </button>

          {encryptError && (
            <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12.5px' }}>
              {encryptError}
            </div>
          )}

          {/* Ciphertext Output Inspection with Full Text-Wrap & Copy Actions */}
          {encryptedPackage && (
            <div style={{ marginTop: '8px', padding: '18px 20px', background: '#0f172a', borderRadius: '18px', color: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> CIPHERTEXT ENVELOPE GENERATED ({encryptedPackage.execution_time_ms} ms)
                </span>
                <span style={{ background: '#1e293b', padding: '3px 10px', borderRadius: '8px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {encryptedPackage.engine}
                </span>
              </div>

              {/* ABE Ciphertext with Clean Text Wrap */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 700 }}>
                    1. CP-ABE Group Element Ciphertext (abe_ciphertext):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(encryptedPackage.abe_ciphertext, 'abe')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedCipher ? '#4ade80' : '#38bdf8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedCipher ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedCipher ? 'Copied!' : 'Copy Cipher'}</span>
                  </button>
                </div>
                <div 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '11px', 
                    color: '#c4b5fd', 
                    background: '#1e293b',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    lineHeight: 1.5
                  }}
                >
                  {encryptedPackage.abe_ciphertext}
                </div>
              </div>

              {/* AES-GCM Ciphertext with Clean Text Wrap */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 700 }}>
                    2. AES-256-GCM Encrypted Payload (payload_ciphertext):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(encryptedPackage.payload_ciphertext, 'payload')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedPayload ? '#4ade80' : '#38bdf8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedPayload ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedPayload ? 'Copied!' : 'Copy Cipher'}</span>
                  </button>
                </div>
                <div 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '11px', 
                    color: '#86efac', 
                    background: '#1e293b',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    wordBreak: 'break-all',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    lineHeight: 1.5
                  }}
                >
                  {encryptedPackage.payload_ciphertext}
                </div>
              </div>

              {/* Nonce and AAD Binding Footer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11.5px', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                <div>Nonce (96-bit IV): <code style={{ color: '#f1f5f9', wordBreak: 'break-all' }}>{encryptedPackage.nonce}</code></div>
                <div>AAD Binding: <code style={{ color: '#f1f5f9', wordBreak: 'break-all' }}>{encryptedPackage.aad}</code></div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN RIGHT: STEP 2 - MULTI-PERSONA DECRYPTION STATION */}
        <div 
          style={{ 
            background: '#ffffff', 
            borderRadius: '24px', 
            padding: '28px', 
            border: '1px solid var(--cq-line)', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--cq-line)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Unlock size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>Step 2: Decryption Station</h2>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Test user personas or custom attribute sets against policy</span>
              </div>
            </div>
            <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 800 }}>
              RECIPIENT / VERIFIER
            </span>
          </div>

          {/* Test Persona Selection Cards */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              SELECT USER PERSONA TO TEST (ONE-CLICK EVALUATION):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              {personas.map((p) => {
                const isSelected = selectedPersona?.id === p.id && !customAttributesInput.trim();
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPersona(p);
                      setCustomAttributesInput("");
                      if (encryptedPackage) handleExecuteDecrypt("NONE", p);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${p.badge_color}` : '1px solid #e2e8f0',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                      minWidth: 0,
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: '#1e293b', wordBreak: 'break-word' }}>{p.name}</strong>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.badge_color, flexShrink: 0 }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', wordBreak: 'break-word' }}>{p.role}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {p.attributes.map(attr => (
                        <span key={attr} style={{ background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, wordBreak: 'break-all' }}>
                          {attr}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Attributes Input (Alternative) */}
          <div>
            <label htmlFor="custom-attr-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              <span>OR TEST CUSTOM ATTRIBUTES:</span>
              <span style={{ color: '#64748b', fontSize: '11px' }}>Comma-separated</span>
            </label>
            <input
              id="custom-attr-input"
              type="text"
              value={customAttributesInput}
              onChange={(e) => setCustomAttributesInput(e.target.value)}
              placeholder="e.g. ROLEACCTMGR, CLIENTCORPALPHAV1"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* Decrypt Actions & Tamper Simulation Station */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleExecuteDecrypt("NONE")}
              disabled={isDecrypting || !encryptedPackage}
              style={{
                flex: 1,
                padding: '11px 18px',
                borderRadius: '12px',
                background: !encryptedPackage ? '#cbd5e1' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '13.5px',
                cursor: !encryptedPackage ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: !encryptedPackage ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.3)'
              }}
            >
              {isDecrypting ? (
                <>
                  <RefreshCw size={15} className="spin-animation" />
                  <span>Evaluating Pairing & MAC...</span>
                </>
              ) : (
                <>
                  <Unlock size={15} />
                  <span>Verify Decryption</span>
                </>
              )}
            </button>

            {/* Tamper Simulation Buttons */}
            <button
              type="button"
              title="Flip 1 byte in stored ciphertext to prove GCM integrity failure"
              onClick={() => handleExecuteDecrypt("CIPHERTEXT_BIT_FLIP")}
              disabled={isDecrypting || !encryptedPackage}
              style={{
                padding: '11px 16px',
                borderRadius: '12px',
                background: '#fff1f2',
                color: '#be123c',
                border: '1.5px solid #fecdd3',
                fontWeight: 700,
                fontSize: '12px',
                cursor: !encryptedPackage ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Bomb size={14} />
              <span>Simulate Bit-Flip</span>
            </button>
          </div>

          {/* Decryption Verification Outcome with Strict Text-Wrapping and Size Stability */}
          {decryptionResult ? (
            <div 
              style={{ 
                borderRadius: '18px', 
                padding: '18px 20px', 
                background: decryptionResult.decryption_status === 'GRANTED' 
                  ? '#ecfdf5' 
                  : decryptionResult.decryption_status === 'REJECTED_TAMPER_DETECTED' 
                    ? '#fffbeb' 
                    : '#fff1f2',
                border: decryptionResult.decryption_status === 'GRANTED'
                  ? '2px solid #10b981'
                  : decryptionResult.decryption_status === 'REJECTED_TAMPER_DETECTED'
                    ? '2px solid #f59e0b'
                    : '2px solid #f43f5e',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
                boxSizing: 'border-box',
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {decryptionResult.decryption_status === 'GRANTED' ? (
                    <CheckCircle2 size={20} color="#047857" style={{ flexShrink: 0 }} />
                  ) : decryptionResult.decryption_status === 'REJECTED_TAMPER_DETECTED' ? (
                    <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0 }} />
                  ) : (
                    <ShieldAlert size={20} color="#be123c" style={{ flexShrink: 0 }} />
                  )}
                  <strong 
                    style={{ 
                      fontSize: '14.5px', 
                      color: decryptionResult.decryption_status === 'GRANTED' 
                        ? '#065f46' 
                        : decryptionResult.decryption_status === 'REJECTED_TAMPER_DETECTED' 
                          ? '#92400e' 
                          : '#9f1239',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere'
                    }}
                  >
                    {decryptionResult.decryption_status === 'GRANTED' 
                      ? 'ACCESS GRANTED (DECRYPTION SUCCESSFUL)' 
                      : decryptionResult.decryption_status === 'REJECTED_TAMPER_DETECTED'
                        ? 'INTEGRITY REJECTION (TAMPERING DETECTED)'
                        : 'ACCESS DENIED (POLICY UNSATISFIED)'}
                  </strong>
                </div>

                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                  Latency: {decryptionResult.execution_time_ms} ms
                </span>
              </div>

              {/* Explanation with explicit break-word text-wrapping */}
              <p 
                style={{ 
                  margin: 0, 
                  fontSize: '13px', 
                  lineHeight: 1.55, 
                  color: '#334155', 
                  wordBreak: 'break-word', 
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap' 
                }}
              >
                {decryptionResult.explanation}
              </p>

              {/* Attributes and Policy Tested Summary */}
              {decryptionResult.user_attributes_tested && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap', fontSize: '11px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Attributes Evaluated:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {decryptionResult.user_attributes_tested.map(a => (
                      <span key={a} style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 700, wordBreak: 'break-all' }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Decrypted Plaintext JSON Display with Copy Action & Strict Break-All Wrap */}
              {decryptionResult.decrypted_content && (
                <div style={{ marginTop: '4px', width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857' }}>
                      AUTHENTICATED RECOVERED PLAINTEXT:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(decryptionResult.decrypted_content, null, 2), 'decrypted')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedDecrypted ? '#047857' : '#0284c7',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedDecrypted ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedDecrypted ? 'Copied!' : 'Copy Plaintext'}</span>
                    </button>
                  </div>
                  <pre 
                    style={{ 
                      margin: 0, 
                      padding: '12px 14px', 
                      background: '#ffffff', 
                      borderRadius: '10px', 
                      border: '1px solid #a7f3d0', 
                      fontSize: '12px', 
                      fontFamily: 'monospace', 
                      color: '#1e293b', 
                      maxHeight: '180px', 
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.5,
                      boxSizing: 'border-box',
                      width: '100%'
                    }}
                  >
                    {JSON.stringify(decryptionResult.decrypted_content, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div 
              style={{ 
                borderRadius: '16px', 
                padding: '24px 20px', 
                background: '#f8fafc', 
                border: '1.5px dashed #cbd5e1', 
                textAlign: 'center', 
                color: '#64748b', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <ShieldCheck size={28} color="#94a3b8" />
              <strong style={{ fontSize: '13px', color: '#475569' }}>Awaiting Decryption Verification</strong>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', maxWidth: '340px' }}>
                Select a test persona or custom attributes, then click "Verify Decryption" to evaluate the access policy tree.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. TECHNICAL EXPLANATION FOOTER CARDS FOR PANELISTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid var(--cq-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Key size={16} color="#7c3aed" />
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>BSW07 CP-ABE Scheme</strong>
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
            Implements Bethencourt-Sahai-Waters (BSW07) pairing curve cryptography. Decryption is mathematically impossible without attribute private keys that satisfy the boolean tree.
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid var(--cq-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Cpu size={16} color="#0284c7" />
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>AES-256-GCM Envelope</strong>
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
            Heavy pairing operations are restricted to deriving a 256-bit symmetric DEK via HKDF-SHA256, enabling sub-5ms bulk encryption while maintaining hardware-accelerated AES speeds.
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid var(--cq-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={16} color="#10b981" />
            <strong style={{ fontSize: '14px', color: '#1e293b' }}>AAD Integrity Binding</strong>
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
            Associated Authenticated Data binds <code>record_id:version:policy</code> into the GCM MAC. If an attacker modifies even a single bit or header, decryption is rejected instantly.
          </p>
        </div>
      </div>

    </div>
  );
}
