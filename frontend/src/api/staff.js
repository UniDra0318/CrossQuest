import { authFetch, fetchCompanies, fetchRecords, decryptRecordApi } from '../services/api.js';
import { me as mockMe, portfolios as mockPortfolios, records as mockRecords } from '../data/staffData.js';

const API_BASE = 'http://localhost:8000/api/v1';

const withAuth = (r, scopes, role) => ({
  ...r,
  authorized: (scopes || ['CORP_ALPHA']).includes(r.scope) || role === 'ADMIN'
});

/** GET /api/v1/users/me -> Current Account Manager profile with fallback */
export async function getStaffMe() {
  try {
    const res = await authFetch(`${API_BASE}/users/me`);
    if (res.ok) {
      const u = await res.json();
      return {
        id: u.id,
        name: u.full_name || u.name || mockMe.name,
        initials: (u.full_name || mockMe.name).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        email: u.email,
        role: (u.role || 'account_manager').replace(/_/g, ' ').toUpperCase(),
        badge: (u.role || 'account_manager').replace(/_/g, ' ').toUpperCase(),
        scopes: (u.assigned_client_accounts && u.assigned_client_accounts.length > 0) ? u.assigned_client_accounts : mockMe.scopes
      };
    }
  } catch (err) {
    console.warn('Could not fetch staff profile:', err);
  }
  return mockMe;
}

/** GET /api/v1/trainees/companies -> Assigned and restricted portfolios */
export async function getPortfolios() {
  try {
    const [companies, records, me] = await Promise.all([
      fetchCompanies(),
      fetchRecords(),
      getStaffMe()
    ]);

    const userScopes = me.scopes || ['CORP_ALPHA'];

    if (companies && companies.length > 0) {
      return companies.map((c) => {
        const compRecords = (records || []).filter(
          (r) => r.company_code === c.code || r.encryption_policy?.includes(c.code)
        );
        const traineeCount = compRecords.length || 8;
        const isAssigned = userScopes.includes(c.code);

        return {
          id: c.id,
          scope: c.code,
          name: c.name,
          industry: c.industry || 'Corporate Enterprise',
          trainees: traineeCount,
          status: 'Active Training Agreement',
          assigned: isAssigned
        };
      });
    }
  } catch (err) {
    console.warn('Could not fetch real portfolios from DB:', err);
  }

  const me = await getStaffMe();
  return mockPortfolios.map(p => ({
    ...p,
    assigned: (me.scopes || ['CORP_ALPHA']).includes(p.scope)
  }));
}

/** GET /api/v1/records/ -> Scoped training records from PostgreSQL with RLS and fallback */
export async function getStaffRecords() {
  try {
    const [records, me] = await Promise.all([
      fetchRecords(),
      getStaffMe()
    ]);

    const userScopes = me.scopes || ['CORP_ALPHA'];

    if (records && records.length > 0) {
      return records.map((r) => {
        const scope = r.company_code || (
          r.encryption_policy?.includes('FINTECH_BETA') ? 'FINTECH_BETA' :
          r.encryption_policy?.includes('RETAIL_GAMMA') ? 'RETAIL_GAMMA' :
          r.encryption_policy?.includes('BANK_DELTA') ? 'BANK_DELTA' :
          r.encryption_policy?.includes('TELCO_EPSILON') ? 'TELCO_EPSILON' : 'CORP_ALPHA'
        );
        const isAuthorized = userScopes.includes(scope) || me.role === 'ADMIN';

        return {
          id: r.id,
          trainee_id: r.trainee_id,
          company_id: r.company_at_completion_id,
          trainee: r.trainee_name || 'Andrea Aguilar',
          email: r.trainee_email || `trainee@${scope.toLowerCase().replace(/_/g, '-')}.com`,
          org: r.company_name || scope,
          course: r.course_name,
          status: r.status,
          scope: scope,
          policy: r.encryption_policy || `${scope} Staff & Admins`,
          authorized: isAuthorized,
          score: r.score
        };
      });
    }
  } catch (err) {
    console.warn('Could not fetch real staff records from DB:', err);
  }

  // Graceful fallback to initial records dataset if backend is offline or empty
  const me = await getStaffMe();
  return mockRecords.map(r => withAuth(r, me.scopes, me.role));
}

/**
 * POST /api/v1/records/:id/decrypt -> Real CP-ABE decryption on server.
 * Returns decrypted evaluation if authorized, or 403 and triggers anomaly alert if out of scope.
 */
export async function decryptRecord(id) {
  const result = await decryptRecordApi(id);
  if (!result || !result.ok || !result.data) {
    const errorMsg = result?.error || 'CP-ABE Decryption failed: Cryptographic policy unsatisfied or server error.';
    const err = new Error(errorMsg);
    err.status = result?.status || 500;
    throw err;
  }

  const dec = result.data;
  return {
    id: dec.record_id,
    trainee: dec.trainee_name,
    email: dec.trainee_email,
    org: dec.company_name || dec.company_code,
    course: dec.course_name,
    status: dec.status,
    score: dec.score,
    completionDate: dec.completion_date,
    assessmentNotes: dec.decrypted_content?.assessment_notes || 'Official Crossworks training assessment record.',
    practicalLab: dec.decrypted_content?.practical_lab || 'Distinction',
    certificateRef: dec.decrypted_content?.certificate_reference || `CERT-${dec.record_id?.substring(0, 8)}`,
    decryptedAt: new Date().toLocaleTimeString(),
    policySatisfied: true
  };
}

/** GET /api/v1/reports/company/:scope -> Real executive company report */
export async function getReport(scope) {
  const res = await authFetch(`${API_BASE}/reports/company/${encodeURIComponent(scope)}`);
  if (res.ok) {
    return await res.json();
  }
  const errData = await res.json().catch(() => ({}));
  throw Object.assign(new Error(errData.detail || 'Not in your authorized scope.'), { status: res.status });
}

/** "Export PDF Summary" */
export async function exportReportPdf() {
  window.print();
}

/** GET /api/v1/records/sessions -> List all training sessions */
export async function getTrainingSessions() {
  try {
    const res = await authFetch(`${API_BASE}/records/sessions`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch training sessions:', err);
  }
  return [];
}

/** POST /api/v1/records/sessions -> Create a new training session */
export async function createTrainingSession(payload) {
  const res = await authFetch(`${API_BASE}/records/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create training session');
  }
  return await res.json();
}

/** PUT /api/v1/records/:id -> Update participant attendance and progress */
export async function updateParticipantAttendance(recordId, payload) {
  const res = await authFetch(`${API_BASE}/records/${recordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update attendance');
  }
  return await res.json();
}
