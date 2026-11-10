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
  { id: 'u-1', name: "Joselito 'Joey' Mallari Jr.", initials: 'JM', email: 'joey.mallari@xworks.ph', role: 'ADMIN', level: 3, clients: ['CORP_ALPHA', 'FINTECH_BETA', 'RETAIL_GAMMA', 'BANK_DELTA', 'TELCO_EPSILON'], tone: 'purple' },
  { id: 'u-2', name: 'Len Mallari', initials: 'LM', email: 'len.mallari@xworks.ph', role: 'ADMIN', level: 3, clients: ['CORP_ALPHA', 'FINTECH_BETA', 'RETAIL_GAMMA', 'BANK_DELTA', 'TELCO_EPSILON'], tone: 'purple' },
  { id: 'u-3', name: 'Erika Bana', initials: 'EB', email: 'erika.bana@crossworks.ph', role: 'ACCOUNT MANAGER', level: 2, clients: ['CORP_ALPHA', 'BANK_DELTA'], tone: 'orange' },
  { id: 'u-4', name: 'Sharon De Vera', initials: 'SD', email: 'sharon.devera@crossworks.ph', role: 'ACCOUNT MANAGER', level: 2, clients: ['FINTECH_BETA', 'RETAIL_GAMMA'], tone: 'orange' },
  { id: 'u-5', name: 'Brian Mendoza', initials: 'BM', email: 'brian.mendoza@crossworks.ph', role: 'ACCOUNT MANAGER', level: 2, clients: ['TELCO_EPSILON'], tone: 'orange' },
  { id: 'u-6', name: 'Elena Santos', initials: 'ES', email: 'elena.santos@crossworks.ph', role: 'FINANCE', level: 2, clients: ['CORP_ALPHA', 'FINTECH_BETA', 'RETAIL_GAMMA', 'BANK_DELTA', 'TELCO_EPSILON'], tone: 'orange' },
  { id: 'u-7', name: 'Jordan Ramos', initials: 'JR', email: 'jordan.ramos@crossworks.ph', role: 'TRAINER', level: 1, clients: ['CORP_ALPHA', 'FINTECH_BETA', 'RETAIL_GAMMA', 'BANK_DELTA', 'TELCO_EPSILON'], tone: 'green' },
  { id: 'u-trn-1', name: 'Andrea Aguilar', initials: 'AA', email: 'andrea.aguilar@vertiv.com', role: 'TRAINEE', level: 1, clients: ['VHL_2'], tone: 'blue' },
  { id: 'u-trn-2', name: 'Ricardo Ocampo', initials: 'RO', email: 'ricardo.ocampo@iproyal.com', role: 'TRAINEE', level: 1, clients: ['IPROY_SERVI_2'], tone: 'blue' },
  { id: 'u-trn-3', name: 'Bea Macaraeg', initials: 'BM', email: 'bea.macaraeg@iproyal.com', role: 'TRAINEE', level: 1, clients: ['IPROY_SERVI_2'], tone: 'blue' },
  { id: 'u-trn-4', name: 'Rafael Dizon', initials: 'RD', email: 'rafael.dizon@amihansolutions.com', role: 'TRAINEE', level: 1, clients: ['AMIHAN_SOLUTI_2'], tone: 'blue' },
  { id: 'u-trn-5', name: 'Rowena Cabrera', initials: 'RC', email: 'rowena.cabrera@ewageas.com', role: 'TRAINEE', level: 1, clients: ['EWALIC_2'], tone: 'blue' },
  { id: 'u-trn-6', name: 'Joshua Javier', initials: 'JJ', email: 'jjavier@islalpg.com', role: 'TRAINEE', level: 1, clients: ['ISLA_LPG_CORPOR'], tone: 'blue' },
  { id: 'u-trn-7', name: 'Arvin Natividad', initials: 'AN', email: 'arvin.natividad@urc.com.ph', role: 'TRAINEE', level: 1, clients: ['UNIVER_ROBINA_CORPOR_3'], tone: 'blue' },
  { id: 'u-trn-8', name: 'Camille Morales', initials: 'CM', email: 'camille.morales@boehringer-ingelheim.com', role: 'TRAINEE', level: 1, clients: ['BIBSP_2'], tone: 'blue' },
  { id: 'u-trn-9', name: 'Vincent Santos', initials: 'VS', email: 'santos.vincent@ayalaland.com.ph', role: 'TRAINEE', level: 1, clients: ['AYALA_LAND_INC_2'], tone: 'blue' }
];

// type: OUT_OF_SCOPE | OFF_HOURS | FAILED_ATTEMPTS ; status: UNREVIEWED | RESOLVED
export const anomalies = [
  { id: 'an-1', type: 'OUT_OF_SCOPE', name: 'Erika Bana', email: 'erika.bana@crossworks.ph', message: "Account Manager attempted to decrypt training records belonging to 'FINTECH_BETA'.", at: '2026-10-03 14:18:22', status: 'UNREVIEWED' },
  { id: 'an-2', type: 'OFF_HOURS', name: 'Jordan Ramos', email: 'jordan.ramos@crossworks.ph', message: 'Decryption request dispatched outside authorized operating window (23:44 UTC).', at: '2026-10-02 23:44:11', status: 'UNREVIEWED' },
  { id: 'an-3', type: 'FAILED_ATTEMPTS', name: 'Elena Santos', email: 'elena.santos@crossworks.ph', message: '3 consecutive access authorization rejections detected within 4 minutes.', at: '2026-10-01 19:12:05', status: 'RESOLVED' },
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
