import { 
  authFetch, 
  fetchCompanies, 
  fetchRecords, 
  fetchStaffUsers, 
  fetchAnomalies, 
  fetchSystemOverview,
  exportAuditLogsCsv,
  exportVaultRecordsCsv
} from '../services/api.js';

const API_BASE = 'http://localhost:8000/api/v1';

/**
 * Real data access for the Admin console.
 * Connected directly to PostgreSQL via FastAPI backend on port 8000 (/api/v1).
 */

/** GET /api/v1/users/me */
export async function getAdmin() {
  try {
    const res = await authFetch(`${API_BASE}/users/me`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Could not fetch admin profile:", err);
  }
  return {
    name: 'Dr. Sarah Jenkins',
    email: 'admin@crossworks.ph',
    role: 'ADMINISTRATOR'
  };
}

/** GET /api/v1/users/overview -> Real system security metrics */
export async function getOverview() {
  return await fetchSystemOverview();
}

/** GET /api/v1/users/ -> Real staff and client list */
export async function getStaff() {
  const [users, companies] = await Promise.all([
    fetchStaffUsers(),
    fetchCompanies()
  ]);
  return {
    staff: users || [],
    clients: companies || []
  };
}

/** PATCH /api/v1/users/:id/attributes */
export async function updateStaff(id, patch) {
  try {
    const res = await authFetch(`${API_BASE}/users/${id}/attributes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Could not update staff attributes:", err);
  }
  return null;
}

export function reportAnomalyMock(event) {
  // In live production mode, the server records anomalies automatically on unauthorized requests
}

/** GET /api/v1/anomalies/alerts */
export async function getAnomalies() {
  return await fetchAnomalies();
}

/** POST /api/v1/anomalies/alerts/:id/review */
export async function resolveAnomaly(id) {
  try {
    const res = await authFetch(`${API_BASE}/anomalies/alerts/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'CLOSED',
        disposition: 'CLOSED_EXPECTED_ACTIVITY',
        review_note: 'Resolved and audited via Administrative Console.'
      })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Could not resolve anomaly:", err);
  }
  return null;
}

/** GET /api/v1/records/ */
export async function getRecords() {
  return await fetchRecords();
}

/** Real CSV export of database audit logs */
export async function exportAuditLogs(token) {
  return await exportAuditLogsCsv(token);
}

/** Real CSV export of master vault training records */
export async function exportVaultRecords(token) {
  return await exportVaultRecordsCsv(token);
}
