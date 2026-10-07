// Standalone Node.js mock API for the admin console.
//   cd mock-api && npm install && npm start      -> http://localhost:3000
// vite.config.js already proxies /api to port 3000.
import express from 'express';
import { admin, overview, staff, clients, anomalies, records, settings } from './adminData.js';
import * as staffPortal from './staffData.js';
import * as trainerPortal from './trainerData.js';

const app = express();
app.use(express.json());

// In-memory copies so edits persist while the server runs.
const state = {
  staff: structuredClone(staff),
  anomalies: structuredClone(anomalies),
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/admin/me', (_req, res) => res.json(admin));
app.get('/api/admin/overview', (_req, res) => res.json(overview));

app.get('/api/admin/staff', (_req, res) => res.json({ staff: state.staff, clients }));
app.patch('/api/admin/staff/:id', (req, res) => {
  const user = state.staff.find((s) => s.id === req.params.id);
  if (!user) return res.status(404).json({ ok: false, message: 'Staff member not found.' });
  const { role, level, clients: assigned } = req.body ?? {};
  if (role !== undefined) user.role = String(role);
  if (level !== undefined) user.level = Math.min(3, Math.max(1, Number(level) || 1));
  if (Array.isArray(assigned)) user.clients = assigned.filter((c) => clients.includes(c));
  res.json(user);
});

app.get('/api/admin/anomalies', (_req, res) => res.json(state.anomalies));
app.post('/api/admin/anomalies/:id/resolve', (req, res) => {
  const item = state.anomalies.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ ok: false, message: 'Event not found.' });
  item.status = 'RESOLVED';
  res.json(item);
});

app.get('/api/admin/records', (_req, res) => res.json(records));
app.get('/api/admin/records/export', (_req, res) => {
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const rows = [['record_id', 'trainee', 'email', 'client_organization', 'course', 'access_policy', 'status']].concat(
    records.map((r) => [r.id, r.trainee, r.email, r.org, r.course, r.policy, r.status])
  );
  res.type('text/csv').attachment('master-audit-logs.csv').send(rows.map((r) => r.map(esc).join(',')).join('\n'));
});

app.get('/api/admin/settings', (_req, res) => res.json(settings));

// ---------- Crossworks Staff portal (/api/staff/*) ----------
// DEMO ONLY: the signed-in staff member is fixed. In your real server, take the user and
// their authorized client scopes from the session / token, never from the request body.
const me = staffPortal.me;
const authorized = (rec) => me.scopes.includes(rec.scope);

app.get('/api/staff/me', (_req, res) => res.json(me));
app.get('/api/staff/portfolios', (_req, res) =>
  res.json(staffPortal.portfolios.map((p) => ({ ...p, assigned: me.scopes.includes(p.scope) })))
);
app.get('/api/staff/records', (_req, res) =>
  res.json(staffPortal.records.map((r) => ({ ...r, authorized: authorized(r) })))
);
app.post('/api/staff/records/:id/decrypt', (req, res) => {
  const rec = staffPortal.records.find((r) => r.id === req.params.id);
  if (!rec) return res.status(404).json({ ok: false, message: 'Record not found.' });
  if (!authorized(rec)) {
    // Block it AND log it for the Anomaly Monitor.
    state.anomalies.unshift({
      id: `an-${Date.now()}`,
      type: 'OUT_OF_SCOPE',
      name: me.name,
      email: me.email,
      message: `Account Manager attempted to decrypt training records belonging to '${rec.scope}'.`,
      at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'UNREVIEWED',
    });
    return res.status(403).json({ ok: false, message: 'Access denied. This attempt was logged for the administrator.' });
  }
  res.json(staffPortal.decryptedView(rec));
});
app.get('/api/staff/reports/:scope', (req, res) => {
  if (!me.scopes.includes(req.params.scope)) return res.status(403).json({ ok: false, message: 'Not in your scope.' });
  const report = staffPortal.buildReport(req.params.scope);
  if (!report) return res.status(404).json({ ok: false, message: 'Client not found.' });
  res.json(report);
});

// ---------- Trainer portal (/api/trainer/*) ----------
// DEMO ONLY: the signed-in trainer is fixed. In your real server, derive the trainer and the
// cohorts they may grade from the session, and check that on EVERY route below.
const trainerStore = trainerPortal.createStore();
const guard = (fn) => (req, res) => {
  try {
    res.json(fn(req) ?? { ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, message: e.status ? e.message : 'Server error.' });
  }
};
app.get('/api/trainer/me', (_req, res) => res.json(trainerPortal.me));
app.get('/api/trainer/cohorts', guard(() => trainerStore.cohorts()));
app.get('/api/trainer/roster', guard(() => trainerStore.roster()));
app.post('/api/trainer/roster/:id/grade', guard((req) => trainerStore.grade(req.params.id, req.body)));
app.get('/api/trainer/quizzes', guard(() => trainerStore.quizzes()));
app.post('/api/trainer/quizzes/reset', guard(() => trainerStore.resetQuizzes()));
app.post('/api/trainer/quizzes', guard((req) => trainerStore.createQuiz(req.body?.title)));
app.post('/api/trainer/quizzes/:id/questions', guard((req) => trainerStore.addQuestion(req.params.id, req.body)));
app.delete('/api/trainer/quizzes/:id/questions/:qid', guard((req) => trainerStore.deleteQuestion(req.params.id, req.params.qid)));
app.patch('/api/trainer/quizzes/:id', guard((req) => trainerStore.updateSettings(req.params.id, req.body)));
app.get('/api/trainer/analytics', guard((req) => trainerStore.analytics(String(req.query.scope || 'ALL'))));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CrossQuest mock API on http://localhost:${PORT}`));
