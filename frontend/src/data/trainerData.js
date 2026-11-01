// Mock data + business rules for the Trainer portal.
// Used by mock-api/server.js and, in mock mode, by src/api/trainer.js. Replace with real services.
// Grading rules live here (and must live on your real server): the client never decides a tier or a pass.

export const PASS_MARK = 75;

export const me = {
  name: 'David Lim',
  initials: 'DL',
  role: 'Lead Training Instructor',
  badge: 'LEAD TRAINER',
  email: 'david.lim@crossworks.ph',
  org: 'Crossworks Training & Consulting',
};

export const cohorts = [
  { id: 'SEC-201', org: 'San Miguel Conglomerate', scope: 'CORP_ALPHA', course: 'Enterprise Security Audit & Zero-Trust Architecture', schedule: 'Mon / Wed / Fri · 09:00–12:00 PHT', enrolled: 24, certified: 21, avg: 92.4, progress: 88, status: 'ACTIVE COHORT' },
  { id: 'PRV-202', org: 'Maya FinTech Innovations', scope: 'FINTECH_BETA', course: 'Privacy Impact Assessment (PIA) & Statutory Compliance', schedule: 'Tue / Thu · 13:00–17:00 PHT', enrolled: 18, certified: 14, avg: 86.8, progress: 78, status: 'ACTIVE COHORT' },
  { id: 'THM-301', org: 'Ayala Retail Omnichannel', scope: 'RETAIL_GAMMA', course: 'Multi-Tenant Cloud Data Isolation & Threat Modeling', schedule: 'Saturdays · 08:00–15:00 PHT', enrolled: 15, certified: 9, avg: 78.5, progress: 60, status: 'UNDER EVALUATION' },
];

const roster0 = [
  { id: 't1', name: 'Juan Dela Cruz', scope: 'CORP_ALPHA', cohort: 'SEC-201', score: 94.5, tier: 'High Distinction', state: 'CERTIFIED' },
  { id: 't2', name: 'Maria Clara', scope: 'FINTECH_BETA', cohort: 'PRV-202', score: 88, tier: 'Pass with Merit', state: 'CERTIFIED' },
  { id: 't3', name: 'Beatrice Tan', scope: 'CORP_ALPHA', cohort: 'SEC-201', score: 98, tier: 'Perfect Score', state: 'CERTIFIED' },
  { id: 't4', name: 'Gabriel Ramos', scope: 'RETAIL_GAMMA', cohort: 'THM-301', score: null, tier: 'Pending', state: 'DRAFTING' },
  { id: 't5', name: 'Carlos Mendoza', scope: 'FINTECH_BETA', cohort: 'PRV-202', score: 68.5, tier: 'Needs Review', state: 'PENDING REVIEW' },
];

export const RUBRIC = [
  'Zero-Trust Access & Policy Tree Validation',
  'CP-ABE Ciphertext Decryption & Attribute Scope',
  'RLS & Multi-Tenant Boundaries',
  'R.A. 10173 & NPC Audit Trail Mandates',
];

export const tierFor = (score) => {
  if (score == null) return 'Pending';
  if (score >= 98) return 'Perfect Score';
  if (score >= 90) return 'High Distinction';
  if (score >= 80) return 'Pass with Merit';
  if (score >= PASS_MARK) return 'Passing Baseline';
  return 'Needs Remediation';
};

const POLICY = (scope) => `(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:${scope})`;

const quizzes0 = () => [
  { id: 'q-sec', category: 'Information Security', title: 'Enterprise Security Audit Challenge', timePerQ: 45, pass: 80, questions: [
    { id: 'a1', type: 'kahoot', prompt: 'Which control enforces “never trust, always verify” on every request?', options: ['Perimeter firewall', 'Zero-trust policy engine', 'VPN split tunnel', 'Static allow-list'], answer: 1 },
    { id: 'a2', type: 'identification', prompt: 'Name the architecture model that removes implicit network trust.', accepted: ['zero trust', 'zero-trust', 'zero trust architecture', 'zta'] },
    { id: 'a3', type: 'sequence', prompt: 'Order the steps of a security audit.', steps: ['Scope the audit', 'Collect evidence', 'Assess controls', 'Report findings'] },
    { id: 'a4', type: 'hotspot', prompt: 'Tap the layer that keeps tenant records cryptographically isolated.', answerLabel: 'CP-ABE Payload Encryption with Cryptographic Isolation' },
    { id: 'a5', type: 'kahoot', prompt: 'A staff member opens another client’s record. What anomaly is logged?', options: ['LATE_LOGIN', 'OUT_OF_SCOPE', 'BRUTE_FORCE', 'GEO_SHIFT'], answer: 1 },
  ] },
  { id: 'q-acc', category: 'Access Control', title: 'Role-Based Access & Policy Verification', timePerQ: 45, pass: 80, questions: [
    { id: 'acc1', type: 'kahoot', prompt: 'Which cryptographic algorithm evaluates boolean attribute access policies against secret keys?', options: ['CP-ABE (Waters11 / BSW07)', 'Symmetric AES-256-CBC', 'RSA 2048 without attribute binding', 'SHA-256 Hashing'], answer: 0 },
    { id: 'acc2', type: 'identification', prompt: 'What anomaly rule flags an access attempt when a staff member accesses a client company outside their assigned tenant clearance?', accepted: ['out_of_scope', 'out of scope', 'out-of-scope', 'rule 1', 'r1'] },
    { id: 'acc3', type: 'sequence', prompt: 'Order the policy evaluation pipeline for cryptographic record decryption.', steps: ['Receive JWT bearer token and authenticate user role', 'Extract user CP-ABE attributes (role, tenant scope, clearance)', 'Evaluate boolean policy tree against attribute set in pairing group', 'Recover AES-256-GCM symmetric session key and decrypt confidential payload'] },
    { id: 'acc4', type: 'hotspot', prompt: 'Tap the authority component responsible for issuing and versioning CP-ABE private keys.', answerLabel: 'Attribute Authority & Private Key Generator (PKG)' },
    { id: 'acc5', type: 'kahoot', prompt: 'What is the security outcome if a staff member attempts to decrypt a record without holding the required company token?', options: ['Decryption fails mathematically in pairing evaluation (HTTP 403)', 'Server returns plain text with a warning', 'Database automatically grants temporary clearance', 'Password is reset automatically'], answer: 0 },
  ] },
  { id: 'q-prv', category: 'Privacy Management', title: 'PIA Simulation', timePerQ: 45, pass: 80, questions: [
    { id: 'prv1', type: 'kahoot', prompt: 'Under Republic Act 10173 (Data Privacy Act of 2012), within how many hours must an organization notify the NPC upon confirmation of a major breach?', options: ['72 hours from reasonable knowledge', '24 hours', '7 calendar days', '30 business days'], answer: 0 },
    { id: 'prv2', type: 'identification', prompt: 'Name the privacy-preserving technique that replaces individual retail customer identities with pseudonyms in volatile memory.', accepted: ['pseudonymization', 'pseudonym', 'in-memory pseudonymization', 'tokenization'] },
    { id: 'prv3', type: 'sequence', prompt: 'Arrange the 4 core phases of a statutory Privacy Impact Assessment (PIA).', steps: ['Data Flow Mapping & Inventory Assessment', 'Privacy Risk Identification & Vulnerability Analysis', 'Control Evaluation against NPC Circular 16-03 Guidelines', 'Remediation Action Plan & Risk Sign-Off'] },
    { id: 'prv4', type: 'hotspot', prompt: 'Tap the statutory privacy control that prevents public leaderboard disclosure of a trainee’s real personal identity.', answerLabel: 'Leaderboard Pseudonymous Display Name & Explicit Opt-Out Mechanism' },
    { id: 'prv5', type: 'kahoot', prompt: 'Which columns are stripped in volatile memory during Excel workbook staging to comply with FR-22 and DAT-01?', options: ['Sales Invoice (SI #), PO #, and Tax Form 2307 billing columns', 'Trainee Full Name and Company Code', 'Training Score and Evaluation Remarks', 'Course Title and Delivery Method'], answer: 0 },
  ] },
  { id: 'q-db', category: 'Database Security', title: 'Multi-Tenant Data Isolation & Security', timePerQ: 45, pass: 80, questions: [
    { id: 'db1', type: 'kahoot', prompt: 'Which PostgreSQL mechanism enforces that SQL queries are scoped strictly to the current tenant session, even with SQL injection attempts?', options: ['Row-Level Security (FORCE RLS)', 'Client-side array filtering', 'Shared unpartitioned views', 'File system permission flags'], answer: 0 },
    { id: 'db2', type: 'identification', prompt: 'What PostgreSQL session variable is set per-request to enforce database-level tenant isolation?', accepted: ['app.current_company_code', 'current_company_code', 'rls tenant', 'company_code'] },
    { id: 'db3', type: 'sequence', prompt: 'Order the multi-tier defense-in-depth layers protecting confidential training records.', steps: ['Transport Layer Security (TLS 1.3 / OWASP Headers)', 'Role-Based Authorization & Session JWT Verification', 'PostgreSQL Row-Level Security (RLS Tenant Scoping)', 'CP-ABE Cryptographic Envelope & AES-256-GCM Storage'] },
    { id: 'db4', type: 'hotspot', prompt: 'Tap the verification engine that guarantees 100% row parity between physical training workbooks and staged database records.', answerLabel: 'Ordinal Physical-to-Database Reconciliation & Discrepancy Quarantine Desk' },
    { id: 'db5', type: 'kahoot', prompt: 'How does CrossQuest handle records with completion dates prior to the August 1, 2026 baseline cutoff?', options: ['Quarantined as PRE_CUTOFF_DATE discrepancy with explanation required', 'Silently dropped without audit logs', 'Overwritten with current date', 'Stored in public leaderboard directly'], answer: 0 },
  ] },
];

const benchmarks = [
  { format: 'Kahoot 4-tile', correct: 92, secs: 14.8 },
  { format: 'Sequence', correct: 84, secs: 28.2 },
  { format: 'Matching pairs', correct: 78, secs: 32.5 },
  { format: 'Diagram hotspot', correct: 74, secs: 36.1 },
  { format: 'Identification', correct: null, secs: null },
];

/** One store per process (server) or per tab (mock mode). */
export function createStore() {
  let roster = structuredClone(roster0);
  let quizzes = quizzes0();
  const find = (id) => roster.find((r) => r.id === id);

  return {
    roster: () => structuredClone(roster),
    cohorts: () => structuredClone(cohorts),

    /** Validates server-side, then returns the (mock) CP-ABE envelope. */
    grade(id, body = {}) {
      const t = find(id);
      if (!t) throw Object.assign(new Error('Trainee not found.'), { status: 404 });
      const score = Number(body.score);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw Object.assign(new Error('Score must be a number from 0 to 100.'), { status: 400 });
      }
      const rubric = Array.isArray(body.rubric) ? body.rubric.filter((i) => Number.isInteger(i) && i >= 0 && i < RUBRIC.length) : [];
      const remarks = String(body.remarks ?? '').slice(0, 1000);
      t.score = Math.round(score * 10) / 10;
      t.tier = tierFor(t.score);
      t.state = t.score >= PASS_MARK ? 'CERTIFIED' : 'PENDING REVIEW';
      return {
        trainee: t,
        rubricMet: rubric.length,
        remarks,
        envelope: { scheme: 'WATERS11 / BSW07', curve: 'BN254', tenant: t.scope, policy: POLICY(t.scope), signedBy: 'D. Lim (Lead Trainer)' },
      };
    },

    quizzes: () => structuredClone(quizzes),
    createQuiz(title) {
      const name = String(title ?? '').trim().slice(0, 80);
      if (!name) throw Object.assign(new Error('Give the quiz a title.'), { status: 400 });
      const quiz = { id: `q-${Date.now()}`, category: 'Custom', title: name, timePerQ: 45, pass: 80, questions: [] };
      quizzes.push(quiz);
      return structuredClone(quiz);
    },
    addQuestion(quizId, q = {}) {
      const quiz = quizzes.find((x) => x.id === quizId);
      if (!quiz) throw Object.assign(new Error('Quiz not found.'), { status: 404 });
      const prompt = String(q.prompt ?? '').trim().slice(0, 300);
      if (!prompt) throw Object.assign(new Error('Question text is required.'), { status: 400 });

      const qType = q.type || 'identification';
      let question;
      if (qType === 'kahoot') {
        question = {
          id: `n${Date.now()}`,
          type: 'kahoot',
          prompt,
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: Number(q.answer) || 0
        };
      } else if (qType === 'sequence') {
        question = {
          id: `n${Date.now()}`,
          type: 'sequence',
          prompt,
          steps: Array.isArray(q.steps) && q.steps.length > 0 ? q.steps : ['Step 1', 'Step 2', 'Step 3', 'Step 4']
        };
      } else if (qType === 'hotspot') {
        question = {
          id: `n${Date.now()}`,
          type: 'hotspot',
          prompt,
          answerLabel: String(q.answerLabel || 'Target Security Component')
        };
      } else {
        const accepted = Array.isArray(q.accepted) && q.accepted.length > 0
          ? q.accepted
          : String(q.answer ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        question = {
          id: `n${Date.now()}`,
          type: 'identification',
          prompt,
          accepted: accepted.length > 0 ? accepted : ['answer']
        };
      }
      quiz.questions.push(question);
      return structuredClone(question);
    },
    deleteQuestion(quizId, qid) {
      const quiz = quizzes.find((x) => x.id === quizId);
      if (!quiz) throw Object.assign(new Error('Quiz not found.'), { status: 404 });
      quiz.questions = quiz.questions.filter((x) => x.id !== qid);
    },
    updateSettings(quizId, { timePerQ, pass } = {}) {
      const quiz = quizzes.find((x) => x.id === quizId);
      if (!quiz) throw Object.assign(new Error('Quiz not found.'), { status: 404 });
      if (timePerQ !== undefined) quiz.timePerQ = Math.min(300, Math.max(5, Number(timePerQ) || 45));
      if (pass !== undefined) quiz.pass = Math.min(100, Math.max(0, Number(pass) || 80));
      return structuredClone(quiz);
    },
    resetQuizzes() {
      quizzes = quizzes0();
    },

    analytics(scope = 'ALL') {
      const rows = scope === 'ALL' ? roster : roster.filter((r) => r.scope === scope);
      const scored = rows.filter((r) => r.score != null);
      const mean = scored.length ? Math.round((scored.reduce((n, r) => n + r.score, 0) / scored.length) * 10) / 10 : null;
      const passing = scored.filter((r) => r.score >= PASS_MARK).length;
      const tiers = ['Perfect Score', 'High Distinction', 'Pass with Merit', 'Passing Baseline'].map((tier) => ({ tier, count: rows.filter((r) => r.tier === tier).length }));
      const cs = (scope === 'ALL' ? cohorts : cohorts.filter((c) => c.scope === scope));
      return {
        scope,
        active: rows.length,
        passRate: rows.length ? Math.round((passing / rows.length) * 100) : 0,
        mean,
        velocity: '3m 48s',
        remediation: rows.filter((r) => r.score == null || r.score < PASS_MARK),
        tiers,
        orgs: cs.map((c) => ({ id: c.id, org: c.org, rate: Math.round((c.certified / c.enrolled) * 100), certified: c.certified, enrolled: c.enrolled })),
        benchmarks,
      };
    },
  };
}
