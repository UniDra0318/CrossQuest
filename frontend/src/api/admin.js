import {
  admin,
  anomalies as anomalySeed,
  clients,
  overview,
  records,
  settings,
  staff as staffSeed,
} from '../data/adminData.js';

/**
 * Data access for the admin console.
 *
 * MODE
 *   mock (default) : returns data from mock-api/adminData.js, no server needed.
 *   live           : calls the Node.js API (mock-api/server.js, or your own).
 * Switch with VITE_API_MODE=live in a .env file. Vite proxies /api to :3000.
 */
const LIVE = import.meta.env.VITE_API_MODE === 'live';

const later = (value) => new Promise((done) => setTimeout(() => done(structuredClone(value)), 0));

async function http(path, options) {
  const res = await fetch(`/api/admin${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res;
}
const json = async (path, options) => (await http(path, options)).json();

// Mock-mode state so edits survive page changes within one session.
const mem = { staff: structuredClone(staffSeed), anomalies: structuredClone(anomalySeed) };

/** GET /api/admin/me */
export const getAdmin = () => (LIVE ? json('/me') : later(admin));

/** GET /api/admin/overview */
export const getOverview = () => (LIVE ? json('/overview') : later(overview));

/** GET /api/admin/staff -> { staff, clients } */
export const getStaff = () => (LIVE ? json('/staff') : later({ staff: mem.staff, clients }));

/** PATCH /api/admin/staff/:id  body: { role?, level?, clients? } */
export async function updateStaff(id, patch) {
  if (LIVE) return json(`/staff/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  const user = mem.staff.find((s) => s.id === id);
  if (user) {
    Object.assign(user, patch);
  }
  return later(user);
}

/**
 * Mock mode only: lets the staff API log an out-of-scope attempt so it shows up in the
 * Anomaly Monitor. In live mode your server records the event itself (see mock-api/server.js).
 */
export function reportAnomalyMock(event) {
  mem.anomalies.unshift({
    id: `an-${Date.now()}`,
    status: 'UNREVIEWED',
    at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ...event,
  });
}

/** GET /api/admin/anomalies */
export const getAnomalies = () => (LIVE ? json('/anomalies') : later(mem.anomalies));

/** POST /api/admin/anomalies/:id/resolve */
export async function resolveAnomaly(id) {
  if (LIVE) return json(`/anomalies/${id}/resolve`, { method: 'POST' });
  const item = mem.anomalies.find((a) => a.id === id);
  if (item) {
    item.status = 'RESOLVED';
  }
  return later(item);
}

/** GET /api/admin/records */
export const getRecords = () => (LIVE ? json('/records') : later(records));

/** GET /api/admin/records/export -> CSV file download */
export async function exportAuditLogs() {
  let text;
  if (LIVE) {
    text = await (await http('/records/export')).text();
  } else {
    const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
    const head = ['record_id', 'trainee', 'email', 'client_organization', 'course', 'access_policy', 'status'];
    const rows = records.map((r) => [r.id, r.trainee, r.email, r.org, r.course, r.policy, r.status]);
    text = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'master-audit-logs.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

/** GET /api/admin/settings */
export const getSettings = () => (LIVE ? json('/settings') : later(settings));
