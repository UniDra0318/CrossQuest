import { createStore, me, RUBRIC, PASS_MARK, tierFor } from '../data/trainerData.js';

/**
 * Data access for the Trainer portal.
 *
 * MODE
 *   mock (default) : in-memory store from ../data/trainerData.js, no server needed.
 *   live           : calls the Node.js API (mock-api/server.js, or your own).
 * Switch with VITE_API_MODE=live in a .env file. Vite proxies /api to :3000.
 *
 * SECURITY: grading, certification and tiers are decided by the SERVER. `tierFor` below
 * is used only to preview the tier while the trainer drags the slider.
 */
const LIVE = import.meta.env.VITE_API_MODE === 'live';
const store = createStore();
const later = (fn) =>
  new Promise((done, fail) =>
    setTimeout(() => {
      try {
        done(structuredClone(fn()));
      } catch (e) {
        fail(e);
      }
    }, 0)
  );

async function json(path, options) {
  const res = await fetch(`/api/trainer${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.message || `Request failed (${res.status})`), { status: res.status });
  return body;
}
const send = (method, body) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export { RUBRIC, PASS_MARK, tierFor };

/** GET /api/trainer/me */
export const getTrainerMe = () => (LIVE ? json('/me') : later(() => me));

/** GET /api/trainer/cohorts */
export const getCohorts = () => (LIVE ? json('/cohorts') : later(() => store.cohorts()));

/** GET /api/trainer/roster -> [{ id, name, scope, cohort, score, tier, state }] */
export const getRoster = () => (LIVE ? json('/roster') : later(() => store.roster()));

/** POST /api/trainer/roster/:id/grade { score, rubric:[indexes], remarks } -> { trainee, envelope } */
export const gradeTrainee = (id, body) =>
  LIVE ? json(`/roster/${id}/grade`, send('POST', body)) : later(() => store.grade(id, body));

/** GET /api/trainer/quizzes */
export const getQuizzes = () => (LIVE ? json('/quizzes') : later(() => store.quizzes()));
/** POST /api/trainer/quizzes { title } */
export const createQuiz = (title) => (LIVE ? json('/quizzes', send('POST', { title })) : later(() => store.createQuiz(title)));
/** POST /api/trainer/quizzes/:id/questions { prompt, answer } */
export const addQuestion = (quizId, q) =>
  LIVE ? json(`/quizzes/${quizId}/questions`, send('POST', q)) : later(() => store.addQuestion(quizId, q));
/** DELETE /api/trainer/quizzes/:id/questions/:qid */
export const deleteQuestion = (quizId, qid) =>
  LIVE ? json(`/quizzes/${quizId}/questions/${qid}`, send('DELETE')) : later(() => store.deleteQuestion(quizId, qid) ?? {});
/** PATCH /api/trainer/quizzes/:id { timePerQ, pass } */
export const updateQuizSettings = (quizId, s) =>
  LIVE ? json(`/quizzes/${quizId}`, send('PATCH', s)) : later(() => store.updateSettings(quizId, s));
/** POST /api/trainer/quizzes/reset */
export const resetQuizzes = () => (LIVE ? json('/quizzes/reset', send('POST')) : later(() => (store.resetQuizzes(), {})));

/** GET /api/trainer/analytics?scope=ALL|CORP_ALPHA|... */
export const getAnalytics = (scope = 'ALL') =>
  LIVE ? json(`/analytics?scope=${encodeURIComponent(scope)}`) : later(() => store.analytics(scope));

/** Client-side CSV download for the roster / analytics (swap for a server export if you prefer). */
export function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
  URL.revokeObjectURL(a.href);
}
