import { admin, overview, staff as staffSeed, clients, anomalies as anomalySeed, records, settings } from '../data/adminData.js';

const LIVE = import.meta.env.VITE_API_MODE === 'live';
const http = (path, options) => fetch(`/api/admin${path}`, options);
const json = (path, options) => http(path, options).then((res) => res.json());
const later = (val) => new Promise((resolve) => setTimeout(() => resolve(val), 50));

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
