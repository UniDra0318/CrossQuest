import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTrainerMe,
  deriveCohorts,
  deriveRoster,
  gradeTrainee,
  getQuizzes,
  getQuizQuestions,
  getQuizAttempts,
  getQuizCourses,
  createQuiz,
  addQuestion,
  deleteQuestion,
  updateQuestion,
  updateQuizSettings,
  resetQuizzes,
  computeAnalytics,
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

let sessionsCache = { key: null, at: 0, data: null };
const CACHE_MS = 60000;

export function TrainerProvider({ children }) {
  const { token, currentUser } = useAuth();
  const [me, setMe] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [quizCourses, setQuizCourses] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [questionsLoadingId, setQuestionsLoadingId] = useState(null);
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedTraineeId, setSelectedTraineeId] = useState(null);
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [quizzesLoading, setQuizzesLoading] = useState(false);

  const analytics = useMemo(() => computeAnalytics(selectedScope, sessions), [selectedScope, sessions]);

  const applySessions = (s) => {
    const r = deriveRoster(s);
    setSessions(s); setCohorts(deriveCohorts(s)); setRoster(r);
    setSelectedSessionId(prev => prev || (s.find(x => !x.trainer_signed_off && !x.is_future_dated) || s[0])?.id || null);
    setSelectedTraineeId(prev => prev || r[0]?.id || null);
  };

  const loadData = useCallback(async (force = false) => {
    const key = currentUser?.id || 'anon';
    if (!force && sessionsCache.key === key && Date.now() - sessionsCache.at < CACHE_MS) {
      applySessions(sessionsCache.data); setLoading(false); return;
    }
    setLoading(true); setLoadError(null);
    const s = await fetchTrainerSessions(token);   // the ONLY request needed for Sessions/Results
    if (s === null) {
      setLoadError('Could not load assigned sessions. Check the backend and retry.');
      setLoading(false); return;
    }
    sessionsCache = { key, at: Date.now(), data: s };
    applySessions(s);
    setLoading(false);
    getTrainerMe().then(setMe).catch(() => {});
    getQuizAttempts(token).then(setQuizAttempts).catch(() => {});
  }, [token, currentUser?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadQuizQuestions = useCallback(async (quizId, force = false) => {
    if (!quizId) return [];
    setQuestionsLoadingId(quizId);
    try {
      const loaded = await getQuizQuestions(quizId, token);
      setQuizzes(prev => prev.map(q => q.id === quizId ? {
        ...q,
        questions: loaded,
        questionsCount: loaded.length || q.questionsCount || 0,
        questionsLoaded: true,
      } : q));
      return loaded;
    } catch (e) {
      console.warn('Question load failed:', e);
      return [];
    } finally {
      setQuestionsLoadingId(prev => prev === quizId ? null : prev);
    }
  }, [token]);

  const loadQuizzes = useCallback(async () => {
    setQuizzesLoading(true);
    try {
      const [qs, cs, atts] = await Promise.all([getQuizzes(token), getQuizCourses(token), getQuizAttempts(token)]);
      setQuizzes(qs); setQuizCourses(cs); setQuizAttempts(atts || []);
      if (qs && qs.length > 0) {
        loadQuizQuestions(qs[0].id);
      }
    } catch (e) { console.warn('Quiz load failed:', e); }
    finally { setQuizzesLoading(false); }
  }, [token, loadQuizQuestions]);

  const refreshSessions = async () => {
    await loadData(true);
  };

  const handleSignOffSession = async (sessionId, payload) => {
    const res = await submitTrainerSignOff(sessionId, payload, token);
    await refreshSessions();
    await refreshRoster();
    return res;
  };

  const refreshRoster = async () => { await loadData(true); };

  const handleGrade = async (id, data) => {
    const res = await gradeTrainee(id, data);
    setGradeResult(res);
    await refreshRoster();
    return res;
  };

  const handleCreateQuiz = async (title, courseId) => {
    const created = await createQuiz(title, courseId, token);
    const qs = await getQuizzes(token);
    setQuizzes(qs.map(q => q.id === created.id ? { ...q, questions: [], questionsLoaded: true } : q));
    return created;
  };

  const handleAddQuestion = async (quizId, q) => {
    await addQuestion(quizId, q, token);
    await loadQuizQuestions(quizId, true);
  };

  const handleUpdateQuestion = async (quizId, qid, q) => {
    await updateQuestion(quizId, qid, q, token);
    await loadQuizQuestions(quizId, true);
  };

  const handleDeleteQuestion = async (quizId, qid) => {
    await deleteQuestion(quizId, qid, token);
    await loadQuizQuestions(quizId, true);
  };

  const handleUpdateSettings = async (quizId, settings) => {
    await updateQuizSettings(quizId, settings);
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, ...settings } : q));
  };

  const handleResetQuizzes = async () => {
    await resetQuizzes();
    await loadQuizzes();
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
    sessionsCache.at = 0;
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
        quizCourses,
        quizAttempts,
        loadQuizQuestions,
        questionsLoadingId,
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
        loadQuizzes,
        quizzesLoading,
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
