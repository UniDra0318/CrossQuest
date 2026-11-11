import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getTrainerMe,
  deriveCohorts,
  deriveRoster,
  gradeTrainee,
  getQuizzes,
  createQuiz,
  addQuestion,
  deleteQuestion,
  updateQuestion,
  updateQuizSettings,
  resetQuizzes,
  getAnalytics,
  downloadCsv,
  RUBRIC,
  PASS_MARK,
  tierFor,
} from '../api/trainer';
import {
  fetchTrainerSessions,
  submitTrainerSignOff,
  fetchSessionTeams,
  createSessionTeam,
  assignTraineeToTeam
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TrainerContext = createContext(null);

export function TrainerProvider({ children }) {
  const { token } = useAuth();
  const [me, setMe] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedTraineeId, setSelectedTraineeId] = useState(null);
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const s = await fetchTrainerSessions(token); // ONE call to /records/sessions/assigned
      if (s === null) throw new Error('Could not load assigned sessions. Check the backend and retry.');

      const [meR, qR, teamsR] = await Promise.allSettled([
        getTrainerMe(),
        getQuizzes(token),
        Promise.all(s.map(sess => fetchSessionTeams(sess.id, token))),
      ]);
      const u = meR.status === 'fulfilled' && meR.value ? meR.value : { name: 'Trainer', email: '', role: 'Trainer', initials: 'TR', scopes: [] };
      const q = qR.status === 'fulfilled' && Array.isArray(qR.value) ? qR.value : [];

      let r = deriveRoster(s);
      if (teamsR.status === 'fulfilled') {
        const memberTeamMap = {};
        teamsR.value.forEach(list => (Array.isArray(list) ? list : []).forEach(team =>
          (team.members || []).forEach(m => { if (m.trainee_id) memberTeamMap[m.trainee_id] = team.team_name; })));
        r = r.map(item => ({ ...item, team: memberTeamMap[item.traineeId] || item.team || null }));
      }
      const a = await getAnalytics(selectedScope, token, s);

      setMe(u); setSessions(s); setCohorts(deriveCohorts(s)); setRoster(r); setQuizzes(q); setAnalytics(a);
      if (!selectedSessionId && s.length > 0) {
        const pending = s.find(item => !item.trainer_signed_off && !item.is_future_dated);
        setSelectedSessionId(pending ? pending.id : s[0].id);
      }
      if (!selectedTraineeId && r.length > 0) setSelectedTraineeId(r[0].id);
    } catch (err) {
      console.warn('Failed to load trainer data:', err);
      setLoadError(err.message || 'Failed to load trainer data.');
      setSessions([]); setCohorts([]); setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [selectedScope, selectedTraineeId, selectedSessionId, token]);

  useEffect(() => {
    loadData();
  }, [selectedScope]);

  const refreshSessions = async () => {
    try {
      const s = await fetchTrainerSessions(token);
      if (s && s.length > 0) {
        setSessions(s);
      }
    } catch (err) {
      console.warn('Could not refresh sessions:', err);
    }
  };

  const handleSignOffSession = async (sessionId, payload) => {
    const res = await submitTrainerSignOff(sessionId, payload, token);
    await refreshSessions();
    await refreshRoster();
    return res;
  };

  const refreshRoster = async () => { await loadData(); };

  const handleGrade = async (id, data) => {
    const res = await gradeTrainee(id, data);
    setGradeResult(res);
    await refreshRoster();
    return res;
  };

  const handleCreateQuiz = async (title, sessionId) => {
    const created = await createQuiz(title, sessionId, token);
    setQuizzes(await getQuizzes(token));
    return created;
  };

  const handleAddQuestion = async (quizId, q) => {
    await addQuestion(quizId, q, token);
    const updated = await getQuizzes(token);
    setQuizzes(updated);
  };

  const handleUpdateQuestion = async (quizId, qid, q) => {
    await updateQuestion(quizId, qid, q, token);
    const updated = await getQuizzes(token);
    setQuizzes(updated);
  };

  const handleDeleteQuestion = async (quizId, qid) => {
    await deleteQuestion(quizId, qid, token);
    const updated = await getQuizzes(token);
    setQuizzes(updated);
  };

  const handleUpdateSettings = async (quizId, settings) => {
    await updateQuizSettings(quizId, settings);
    const updated = await getQuizzes(token);
    setQuizzes(updated);
  };

  const handleResetQuizzes = async () => {
    await resetQuizzes();
    const updated = await getQuizzes(token);
    setQuizzes(updated);
  };

  const handleAssignTeam = async (traineeId, teamName) => {
    // 1. Validate trainee and session identity (no fallbacks to unassociated sessions)
    const traineeItem = roster.find(t => t.id === traineeId || t.traineeId === traineeId);
    if (!traineeItem) {
      throw new Error("Trainee could not be found in active cohort roster.");
    }
    const sessionId = traineeItem.sessionId;
    if (!sessionId) {
      throw new Error(`Trainee "${traineeItem.name}" is not associated with an active training session.`);
    }
    const actualTraineeId = traineeItem.traineeId || traineeId;

    // 2. Await server persistence via GAM-03 endpoints
    if (teamName) {
      const currentTeams = await fetchSessionTeams(sessionId, token);
      let targetTeam = (currentTeams || []).find(tm => tm.team_name.toLowerCase() === teamName.toLowerCase());
      if (!targetTeam) {
        targetTeam = await createSessionTeam(sessionId, teamName, token);
      }
      if (!targetTeam || !targetTeam.id) {
        throw new Error(`Failed to initialize breakout team "${teamName}" on server.`);
      }
      await assignTraineeToTeam(targetTeam.id, actualTraineeId, token);
    } else {
      // Remove from team if cleared
      const currentTeams = await fetchSessionTeams(sessionId, token);
      for (const tm of (currentTeams || [])) {
        const mem = (tm.members || []).find(m => m.trainee_id === actualTraineeId);
        if (mem) {
          await removeTraineeFromTeam(tm.id, actualTraineeId, token);
        }
      }
    }

    // 3. Only update local state AFTER server confirms success (no fake-save)
    setRoster(prev => prev.map(t => (t.id === traineeId || t.traineeId === traineeId) ? { ...t, team: teamName || null } : t));
    return { success: true, teamName };
  };

  const exportRosterCsv = () => {
    const rows = [
      ['ID', 'Name', 'Organization Scope', 'Cohort', 'Score', 'Tier', 'State'],
      ...roster.map((r) => [r.id, r.name, r.scope, r.cohort, r.score ?? 'N/A', r.tier, r.state]),
    ];
    downloadCsv(`trainer-roster-${Date.now()}.csv`, rows);
  };

  return (
    <TrainerContext.Provider
      value={{
        me,
        cohorts,
        roster,
        sessions,
        selectedSessionId,
        setSelectedSessionId,
        refreshSessions,
        handleSignOffSession,
        quizzes,
        analytics,
        selectedScope,
        setSelectedScope,
        selectedTraineeId,
        setSelectedTraineeId,
        gradeResult,
        setGradeResult,
        loading,
        loadError,
        loadData,
        handleGrade,
        handleCreateQuiz,
        handleAddQuestion,
        handleUpdateQuestion,
        handleDeleteQuestion,
        handleUpdateSettings,
        handleResetQuizzes,
        exportRosterCsv,
        handleAssignTeam,
        RUBRIC,
        PASS_MARK,
        tierFor,
      }}
    >
      {children}
    </TrainerContext.Provider>
  );
}

export function useTrainer() {
  const ctx = useContext(TrainerContext);
  if (!ctx) {
    throw new Error('useTrainer must be used within a TrainerProvider');
  }
  return ctx;
}
