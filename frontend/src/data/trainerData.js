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
  { id: 'q-acc', category: 'Access Control', title: 'Role-Based Access & Policy Verification', timePerQ: 45, pass: 80, questions: [] },
  { id: 'q-prv', category: 'Privacy Management', title: 'PIA Simulation', timePerQ: 45, pass: 80, questions: [] },
  { id: 'q-db', category: 'Database Security', title: 'Multi-Tenant Data Isolation & Security', timePerQ: 45, pass: 80, questions: [] },
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
      const question = { id: `n${Date.now()}`, type: 'identification', prompt, accepted: [String(q.answer ?? '').trim().toLowerCase()].filter(Boolean) };
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
