// Mock data for the Crossworks Staff (Account Manager) portal.
// Used by frontend/src/api/staff.js.
import { records as allRecords } from './adminData.js';

export const me = {
  name: 'Marcus Reyes',
  initials: 'MR',
  role: 'Client Account Manager',
  badge: 'ACCOUNT MANAGER',
  email: 'marcus.reyes@crossworks.ph',
  org: 'Crossworks Training & Consulting',
  scopes: ['CORP_ALPHA'], // client accounts this account manager is authorized for
};

export const portfolios = [
  { scope: 'CORP_ALPHA', name: 'San Miguel Conglomerate Holdings', industry: 'Conglomerate & Industrial', trainees: 142, status: 'Active Agreement' },
  { scope: 'FINTECH_BETA', name: 'Maya FinTech Digital Innovations', industry: 'Financial Services & Banking', trainees: 98, status: 'Active Agreement' },
  { scope: 'RETAIL_GAMMA', name: 'Ayala Retail Omnichannel Corp', industry: 'Retail & Supply Chain', trainees: 64, status: 'Active Agreement' },
];

const scoreById = { 'rec-101': 94.5, 'rec-104': 98 };
const scopeOf = (r) => {
  const match = /COMPANY:(\w+)/.exec(r.policy);
  return match ? match[1] : 'CORP_ALPHA';
};

export const records = allRecords.map((r) => {
  const s = scopeOf(r);
  return {
    id: r.id,
    trainee: r.trainee,
    email: r.email,
    org: r.org,
    course: r.course,
    status: r.status,
    scope: s,
    policy: `${s} Staff & Admins`,
    score: scoreById[r.id] ?? null,
  };
});

/** Shared by the mock API and the Express server so both compute reports the same way. */
export function buildReport(scope) {
  const portfolio = portfolios.find((p) => p.scope === scope);
  if (!portfolio) return null;
  const rows = records.filter((r) => r.scope === scope && r.status === 'COMPLETED');
  const scored = rows.filter((r) => r.score != null);
  const mine = records.filter((r) => r.scope === scope);
  return {
    scope,
    org: portfolio.name,
    totalTrainees: mine.length,
    completionRate: mine.length ? Math.round((rows.length / mine.length) * 100) : 0,
    averageScore: scored.length ? Math.round((scored.reduce((a, r) => a + r.score, 0) / scored.length) * 10) / 10 : null,
    rows: rows.map(({ id, trainee, course, status, score }) => ({ id, trainee, course, status, score })),
  };
}

/** What a successful decrypt returns. Your real server would return the decrypted record. */
export function decryptedView(record) {
  return {
    id: record.id,
    certificateId: `CQ-2026-${record.id.slice(-3)}-${record.scope.slice(0, 3)}`,
    issuedTo: record.trainee,
    course: record.course,
    status: record.status,
    score: record.score,
    decryptedAt: new Date().toISOString(),
  };
}
