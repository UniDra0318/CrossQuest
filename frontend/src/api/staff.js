import { reportAnomalyMock } from './admin.js';
import { buildReport, decryptedView, me, portfolios, records } from '../data/staffData.js';

/**
 * Data access for the Crossworks Staff portal (account managers).
 *
 * MODE
 *   mock (default) : data from frontend/src/data/staffData.js, no server needed.
 *   live           : calls the Node.js API (mock-api/server.js, or your own).
 * Switch with VITE_API_MODE=live in a .env file. Vite proxies /api to :3000.
 *
 * SECURITY: authorization MUST be enforced on the server. The client only shows
 * `authorized` to pick a button style; the server decides who may decrypt.
 */
const LIVE = import.meta.env.VITE_API_MODE === 'live';
const later = (value) => new Promise((done) => setTimeout(() => done(structuredClone(value)), 0));

async function json(path, options) {
  const res = await fetch(`/api/staff${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.message || `Request failed (${res.status})`), { status: res.status });
  return body;
}

const withAuth = (r) => ({ ...r, authorized: me.scopes.includes(r.scope) });

/** GET /api/staff/me */
export const getStaffMe = () => (LIVE ? json('/me') : later(me));

/** GET /api/staff/portfolios -> [{ scope, name, industry, trainees, status, assigned }] */
export const getPortfolios = () =>
  LIVE ? json('/portfolios') : later(portfolios.map((p) => ({ ...p, assigned: me.scopes.includes(p.scope) })));

/** GET /api/staff/records -> [{ id, trainee, email, org, course, status, scope, policy, authorized }] */
export const getStaffRecords = () => (LIVE ? json('/records') : later(records.map(withAuth)));

/**
 * POST /api/staff/records/:id/decrypt
 * 200 -> decrypted record view. 403 -> { message }; the server also logs an
 * OUT_OF_SCOPE anomaly for the administrator.
 */
export async function decryptRecord(id) {
  if (LIVE) return json(`/records/${id}/decrypt`, { method: 'POST' });
  const rec = records.find((r) => r.id === id);
  if (!rec) throw new Error('Record not found.');
  if (!me.scopes.includes(rec.scope)) {
    reportAnomalyMock({
      type: 'OUT_OF_SCOPE',
      name: me.name,
      email: me.email,
      message: `Account Manager attempted to decrypt training records belonging to '${rec.scope}'.`,
    });
    throw Object.assign(new Error('Access denied. This attempt was logged for the administrator.'), { status: 403 });
  }
  return later(decryptedView(rec));
}

/** GET /api/staff/reports/:scope -> { scope, org, totalTrainees, completionRate, averageScore, rows } */
export async function getReport(scope) {
  if (LIVE) return json(`/reports/${scope}`);
  if (!me.scopes.includes(scope)) throw Object.assign(new Error('Not in your scope.'), { status: 403 });
  return later(buildReport(scope));
}

/**
 * "Export PDF Summary". Mock: opens the browser print dialog (choose Save as PDF).
 * Live: swap for a server-generated file.
 */
export async function exportReportPdf() {
  window.print();
}
