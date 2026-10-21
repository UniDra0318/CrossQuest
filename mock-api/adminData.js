// Single source of mock data for the admin console.
// Used by the Express mock server (mock-api/server.js) and, in mock mode,
// directly by the React app (src/api/admin.js). Replace with real services.

export const admin = {
  name: 'Dr. Sarah Jenkins',
  initials: 'SJ',
  role: 'System Administrator',
  org: 'Crossworks Training & Consulting',
};

export const overview = {
  postureScore: 98.4,
  postureNote: 'Security & Compliance Baseline Met',
  isolation: 'Data Isolation Active',
  isolationNote: 'Multi-tenant row filtering enabled',
  architecture: {
    scheme: 'Attribute-Based & Role-Based Access Control',
    encryption: 'AES-256 + 4096-bit RSA & ECDSA',
    authority: 'Single Crossworks Master Authority',
    publicKey: 'PUBKEY_SHA256: 8a4f91b...34e2',
    defense: 'Multi-Tenant Row-Level Security',
  },
};

// tone: blue | green | amber | purple | orange
export const clients = ['CORP_ALPHA', 'FINTECH_BETA', 'RETAIL_GAMMA'];

export const staff = [
  { id: 'u-1', name: 'Dr. Sarah Jenkins', initials: 'SJ', email: 'admin@crossworks.ph', role: 'ADMIN', level: 3, clients: ['CORP_ALPHA', 'FINTECH_BETA', 'RETAIL_GAMMA'], tone: 'purple' },
  { id: 'u-2', name: 'Marcus Reyes', initials: 'MR', email: 'marcus.reyes@crossworks.ph', role: 'CROSSWORKS STAFF', level: 2, clients: ['CORP_ALPHA'], tone: 'orange' },
  { id: 'u-3', name: 'David Lim', initials: 'DL', email: 'david.lim@crossworks.ph', role: 'TRAINER', level: 1, clients: ['CORP_ALPHA', 'FINTECH_BETA'], tone: 'green' },
  { id: 'u-4', name: 'Patricia Santos', initials: 'PS', email: 'patricia.hr@alpha-corp.ph', role: 'COMPANY STAFF', level: 1, clients: ['CORP_ALPHA'], tone: 'blue' },
  { id: 'u-5', name: 'Juan Dela Cruz', initials: 'JD', email: 'juan.delacruz@alpha-corp.ph', role: 'TRAINEE', level: 1, clients: ['CORP_ALPHA'], tone: 'amber' },
];

// type: OUT_OF_SCOPE | OFF_HOURS | FAILED_ATTEMPTS ; status: UNREVIEWED | RESOLVED
export const anomalies = [
  { id: 'an-1', type: 'OUT_OF_SCOPE', name: 'Marcus Reyes', email: 'marcus.am@crossworks.ph', message: "Account Manager (Alpha) attempted to decrypt training records belonging to 'FINTECH_BETA'.", at: '2026-10-03 14:18:22', status: 'UNREVIEWED' },
  { id: 'an-2', type: 'OFF_HOURS', name: 'David Lim', email: 'david.trainer@crossworks.ph', message: 'Decryption request dispatched outside authorized operating window (23:44 UTC).', at: '2026-10-02 23:44:11', status: 'UNREVIEWED' },
  { id: 'an-3', type: 'FAILED_ATTEMPTS', name: 'Elena Santos', email: 'elena.am@crossworks.ph', message: '3 consecutive access authorization rejections detected within 4 minutes.', at: '2026-10-01 19:12:05', status: 'RESOLVED' },
];

const AM = (c) => `(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:${c})`;
// status: COMPLETED | IN_PROGRESS
export const records = [
  { id: 'rec-101', trainee: 'Juan Dela Cruz', email: 'juan.delacruz@alpha-corp.ph', org: 'SAN MIGUEL CONGLOMERATE HOLDINGS', course: 'Information Security Management & Governance', policy: AM('CORP_ALPHA'), status: 'COMPLETED' },
  { id: 'rec-102', trainee: 'Maria Clara', email: 'maria.clara@maya-fintech.ph', org: 'MAYA FINTECH DIGITAL INNOVATIONS', course: 'Privacy Information Management & GDPR', policy: AM('FINTECH_BETA'), status: 'COMPLETED' },
  { id: 'rec-103', trainee: 'Gabriel Ramos', email: 'g.ramos@ayala-retail.ph', org: 'AYALA RETAIL OMNICHANNEL CORP', course: 'Corporate Threat Modeling & Incident Handling', policy: AM('RETAIL_GAMMA'), status: 'IN_PROGRESS' },
  { id: 'rec-104', trainee: 'Beatrice Tan', email: 'beatrice.tan@alpha-corp.ph', org: 'SAN MIGUEL CONGLOMERATE HOLDINGS', course: 'DevSecOps Pipeline Security & CI/CD Guardrails', policy: AM('CORP_ALPHA'), status: 'COMPLETED' },
];

export const settings = {
  accessControl: {
    cryptoScheme: 'AES-256 Symmetric + Asymmetric RSA',
    provider: 'HARDWARE-ISOLATED SECURITY PROVIDER',
    keyAuthority: 'Single-Authority (Crossworks Corp)',
  },
  anomaly: {
    window: { start: '08:00', end: '19:00', tz: 'UTC', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
    failedAttempts: { count: 3, minutes: 15 },
    burstVolume: { records: 25, minutes: 15 },
  },
};
