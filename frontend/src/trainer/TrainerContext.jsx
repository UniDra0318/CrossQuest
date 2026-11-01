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
import { fetchTrainerSessions, submitTrainerSignOff } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TrainerContext = createContext(null);

const FALLBACK_SESSIONS = [
  {
    id: "sess-seed-01",
    session_code: "SESS-2026-08A",
    course_name: "ISO 27001 Information Security Lead Implementer",
    start_date: "2026-08-15T09:00:00",
    end_date: "2026-08-18T17:00:00",
    delivery_type: "Dedicated - San Miguel Corporation",
    trainer_signed_off: true,
    trainer_sign_off_at: "2026-08-18T17:30:00",
    trainer_sign_off_notes: "All trainees successfully demonstrated compliance with ISO 27001 controls.",
    is_future_dated: false,
    attendees_count: 2,
    completed_count: 2,
    records: [
      {
        record_id: "rec-101",
        trainee_id: "trn-001",
        trainee_code: "TRN-9021",
        trainee_name: "Juan Dela Cruz",
        trainee_email: "juan.delacruz@sanmiguel.com.ph",
        company_name: "San Miguel Corporation",
        company_code: "SMC",
        status: "Completed",
        attendance_status: "Present",
        score: 92.5,
        certificate_serial: "SMC20260818-01"
      },
      {
        record_id: "rec-102",
        trainee_id: "trn-002",
        trainee_code: "TRN-9022",
        trainee_name: "Beatrice Aquino",
        trainee_email: "beatrice.aquino@sanmiguel.com.ph",
        company_name: "San Miguel Corporation",
        company_code: "SMC",
        status: "Completed",
        attendance_status: "Present",
        score: 88.0,
        certificate_serial: "SMC20260818-02"
      }
    ]
  },
  {
    id: "sess-seed-02",
    session_code: "SESS-2026-10B",
    course_name: "Enterprise Privacy Impact Assessment (PIA)",
    start_date: "2026-10-25T09:00:00",
    end_date: "2026-10-28T17:00:00",
    delivery_type: "Public Cohort",
    trainer_signed_off: false,
    trainer_sign_off_at: null,
    trainer_sign_off_notes: null,
    is_future_dated: false,
    attendees_count: 3,
    completed_count: 0,
    records: [
      {
        record_id: "rec-105",
        trainee_id: "trn-005",
        trainee_code: "TRN-9025",
        trainee_name: "Gabriel Santos",
        trainee_email: "gabriel.santos@ayala.com.ph",
        company_name: "Ayala Corporation",
        company_code: "AYL",
        status: "In progress",
        attendance_status: "Present",
        score: 86.0,
        certificate_serial: null
      },
      {
        record_id: "rec-106",
        trainee_id: "trn-006",
        trainee_code: "TRN-9026",
        trainee_name: "Chloe Reyes",
        trainee_email: "chloe.reyes@ayala.com.ph",
        company_name: "Ayala Corporation",
        company_code: "AYL",
        status: "In progress",
        attendance_status: "Present",
        score: 89.5,
        certificate_serial: null
      },
      {
        record_id: "rec-107",
        trainee_id: "trn-007",
        trainee_code: "TRN-9027",
        trainee_name: "Dante Valenzuela",
        trainee_email: "dante.valenzuela@fintechbeta.ph",
        company_name: "FinTech Beta Philippines",
        company_code: "FTB",
        status: "In progress",
        attendance_status: "Present",
        score: 72.0,
        certificate_serial: null
      }
    ]
  },
  {
    id: "sess-seed-03",
    session_code: "SESS-2026-11C",
    course_name: "Advanced Cryptography & CP-ABE Hands-on Defense",
    start_date: "2026-11-20T09:00:00",
    end_date: "2026-11-24T17:00:00",
    delivery_type: "Dedicated - BDO Unibank",
    trainer_signed_off: false,
    trainer_sign_off_at: null,
    trainer_sign_off_notes: null,
    is_future_dated: true,
    attendees_count: 2,
    completed_count: 0,
    records: [
      {
        record_id: "rec-108",
        trainee_id: "trn-008",
        trainee_code: "TRN-9028",
        trainee_name: "Elena Bautista",
        trainee_email: "elena.bautista@bdo.com.ph",
        company_name: "BDO Unibank Inc.",
        company_code: "BDO",
        status: "In progress",
        attendance_status: "Present",
        score: 91.0,
        certificate_serial: null
      }
    ]
  }
];

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c, r, q, a, s] = await Promise.all([
        getTrainerMe(),
        getCohorts(),
        getRoster(),
        getQuizzes(),
        getAnalytics(selectedScope),
        fetchTrainerSessions(token),
      ]);
      setMe(u);
      setCohorts(c);
      setRoster(r);
      setQuizzes(q);
      setAnalytics(a);

      const activeSessions = (s && s.length > 0) ? s : FALLBACK_SESSIONS;
      setSessions(activeSessions);
      if (!selectedSessionId && activeSessions.length > 0) {
        // Prefer pending session if available
        const pending = activeSessions.find(item => !item.trainer_signed_off && !item.is_future_dated);
        setSelectedSessionId(pending ? pending.id : activeSessions[0].id);
      }

      if (!selectedTraineeId && r.length > 0) {
        setSelectedTraineeId(r[0].id);
      }
    } catch (err) {
      console.warn('Failed to load trainer data:', err);
      setSessions(FALLBACK_SESSIONS);
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
