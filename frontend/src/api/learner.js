import { badges, leaderboard, learner, quests, week } from '../data/mock.js';

const resolve = (value) => new Promise((done) => setTimeout(() => done(value), 0));

/**
 * Everything the learner dashboard needs.
 * Swap the mock for your Node.js endpoint, e.g.:
 *
 *   const res = await fetch('/api/learner/dashboard', { credentials: 'include' });
 *   if (!res.ok) throw new Error('Failed to load dashboard');
 *   return res.json();
 *
 * (vite.config.js already proxies /api to http://localhost:3000.)
 */
export async function getDashboard() {
  return resolve({ learner, quests, badges, week, leaderboard });
}

/**
 * Join a live quest with a Game PIN / quest code.
 *
 *   const res = await fetch('/api/quests/join', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ pin }),
 *   });
 */
export async function joinQuest(pin) {
  return resolve({ ok: true, pin });
}
