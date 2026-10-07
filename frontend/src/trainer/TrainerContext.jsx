import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getTrainerMe,
  getCohorts,
  getRoster,
  gradeTrainee,
  getQuizzes,
  createQuiz,
  addQuestion,
  deleteQuestion,
  updateQuizSettings,
  resetQuizzes,
  getAnalytics,
  downloadCsv,
  RUBRIC,
  PASS_MARK,
  tierFor,
} from '../api/trainer';

const TrainerContext = createContext(null);

export function TrainerProvider({ children }) {
  const [me, setMe] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [roster, setRoster] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedTraineeId, setSelectedTraineeId] = useState(null);
  const [gradeResult, setGradeResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c, r, q, a] = await Promise.all([
        getTrainerMe(),
        getCohorts(),
        getRoster(),
        getQuizzes(),
        getAnalytics(selectedScope),
      ]);
      setMe(u);
      setCohorts(c);
      setRoster(r);
      setQuizzes(q);
      setAnalytics(a);
      if (!selectedTraineeId && r.length > 0) {
        setSelectedTraineeId(r[0].id);
      }
    } catch (err) {
      console.warn('Failed to load trainer data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedScope, selectedTraineeId]);

  useEffect(() => {
    loadData();
  }, [selectedScope]);

  const refreshRoster = async () => {
    const updated = await getRoster();
    setRoster(updated);
    const updatedAnalytics = await getAnalytics(selectedScope);
    setAnalytics(updatedAnalytics);
  };

  const handleGrade = async (id, data) => {
    const res = await gradeTrainee(id, data);
    setGradeResult(res);
    await refreshRoster();
    return res;
  };

  const handleCreateQuiz = async (title) => {
    const created = await createQuiz(title);
    const updated = await getQuizzes();
    setQuizzes(updated);
    return created;
  };

  const handleAddQuestion = async (quizId, q) => {
    await addQuestion(quizId, q);
    const updated = await getQuizzes();
    setQuizzes(updated);
  };

  const handleDeleteQuestion = async (quizId, qid) => {
    await deleteQuestion(quizId, qid);
    const updated = await getQuizzes();
    setQuizzes(updated);
  };

  const handleUpdateSettings = async (quizId, settings) => {
    await updateQuizSettings(quizId, settings);
    const updated = await getQuizzes();
    setQuizzes(updated);
  };

  const handleResetQuizzes = async () => {
    await resetQuizzes();
    const updated = await getQuizzes();
    setQuizzes(updated);
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
        quizzes,
        analytics,
        selectedScope,
        setSelectedScope,
        selectedTraineeId,
        setSelectedTraineeId,
        gradeResult,
        setGradeResult,
        loading,
        loadData,
        handleGrade,
        handleCreateQuiz,
        handleAddQuestion,
        handleDeleteQuestion,
        handleUpdateSettings,
        handleResetQuizzes,
        exportRosterCsv,
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
