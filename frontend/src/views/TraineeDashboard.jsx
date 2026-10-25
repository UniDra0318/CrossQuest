import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Flame, 
  Sparkles, 
  Check, 
  ArrowRight, 
  RotateCcw, 
  BookOpen, 
  Calendar, 
  AlertCircle, 
  Shield, 
  Play, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  RotateCw,
  FileQuestion,
  Lock
} from 'lucide-react';
import { QUIZ_DATABASE, getActiveQuizDatabase } from '../data/quizDatabase';
import QuizArena from '../components/QuizArena';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeaderboard, fetchTraineeGamification, submitQuizScore } from '../services/api';
import BadgeCoin from '../components/BadgeCoin';
import { TRACKS } from '../data/tracks';
import { badges as designBadges } from '../data/mock';

export default function TraineeDashboard({ activeSubView, setActiveView }) {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(12877);
  const [level, setLevel] = useState(4);
  const [streakDays, setStreakDays] = useState(7);
  const [boardUsers, setBoardUsers] = useState([]);

  // Active quiz & persistence session state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [savedSession, setSavedSession] = useState(null);
  const [quizScoreStatus, setQuizScoreStatus] = useState({
    'act-1': { completed: true, score: 94 },
    'act-2': { completed: true, score: 100 },
    'act-3': { completed: true, score: 88 },
    'act-4': { completed: false, score: null }
  });

  // Check for auto-saved quiz session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('crossquest_quiz_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.quizId && parsed.stage !== 'completed') {
          setSavedSession(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not retrieve saved quiz session:", e);
    }
  }, []);

  // Sync with backend gamification data
  useEffect(() => {
    async function loadGamification() {
      if (currentUser?.id) {
        const gam = await fetchTraineeGamification(currentUser.id);
        if (gam) {
          setPoints(gam.points || 12877);
          setLevel(gam.level || 4);
        }
      }
      try {
        const res = await fetchLeaderboard();
        if (Array.isArray(res) && res.length > 0) {
          setBoardUsers(res);
        }
      } catch (e) {
        console.warn("Leaderboard fetch error:", e);
      }
    }
    loadGamification();
  }, [currentUser?.id]);

  // Assigned course activities list
  const assignedActivities = [
    {
      id: 'act-1',
      title: 'Stakeholder Management Basics',
      instructor: 'Lead Trainer David Lim',
      category: 'Project Management',
      progressText: 'Project Management · 3 of 5 done',
      color: '#0284c7',
      actionType: 'resume',
      locked: false
    },
    {
      id: 'act-2',
      title: 'Design Thinking Essentials',
      instructor: 'Dr. Sarah Jenkins',
      category: 'Future-Proof Skills',
      progressText: 'Future-Proof · Not started',
      color: '#059669',
      actionType: 'start',
      locked: false
    },
    {
      id: 'act-3',
      title: 'Coaching Your Team',
      instructor: 'Lead Trainer David Lim',
      category: 'Leadership',
      progressText: 'Leadership · Unlocks after previous quest',
      color: '#f0605d',
      actionType: 'locked',
      locked: true
    },
    {
      id: 'act-4',
      title: 'Multi-Tenant Data Isolation & Security',
      instructor: 'Prof. Roel Traballo',
      category: 'Security & Compliance',
      progressText: 'Enterprise Security · 5 Questions · Assigned',
      color: '#07456b',
      actionType: 'start',
      locked: false
    }
  ];

  const earnedBadges = designBadges;

  const certificates = [
    {
      id: 'cert-01',
      title: 'Enterprise Security Lead Implementer',
      clientCompany: 'San Miguel Conglomerate Holdings',
      issuedOn: '2025-11-10',
      expiresOn: '2026-11-10',
      daysUntilExpiry: 38,
      isRenewalApproaching: true,
      hash: 'SHA256:e3b0c442...852b855'
    },
    {
      id: 'cert-02',
      title: 'DevSecOps & Supply Chain Defense',
      clientCompany: 'San Miguel Conglomerate Holdings',
      issuedOn: '2026-04-15',
      expiresOn: '2027-04-15',
      daysUntilExpiry: 194,
      isRenewalApproaching: false,
      hash: 'SHA256:d4735e3a...13ab35'
    }
  ];

  // Start quiz by ID (from assigned card or catalog)
  const handleStartQuizById = (quizId) => {
    const db = getActiveQuizDatabase();
    const q = db[quizId] || db['act-1'];
    setActiveQuiz(q);
  };

  // Resume saved interrupted session
  const handleResumeSession = (session) => {
    const db = getActiveQuizDatabase();
    const q = db[session.quizId] || db['act-1'];
    setActiveQuiz(q);
  };

  // Discard saved session
  const handleDiscardSession = () => {
    localStorage.removeItem('crossquest_quiz_session');
    setSavedSession(null);
  };

  // Quiz finish handler
  const handleQuizFinish = async (resultData) => {
    if (currentUser?.id) {
      await submitQuizScore(currentUser.id, resultData.scorePercentage);
    }

    setQuizScoreStatus(prev => ({
      ...prev,
      [resultData.quizId]: {
        completed: true,
        score: resultData.scorePercentage
      }
    }));

    if (resultData.scorePercentage >= 80) {
      setPoints(p => p + 150);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = currentUser?.name?.split(' ')[0] || 'Juan';

  return (
    <div style={{ width: '100%', minHeight: '100%', background: '#f4f7fa', boxSizing: 'border-box' }}>
      {/* 0. DISRUPTION RECOVERY BANNER */}
      {savedSession && (
        <div style={{ margin: '0 40px 24px', padding: '16px 20px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RotateCw className="spin-slow" size={20} style={{ color: '#d97706' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>Unfinished Assessment Detected</div>
              <div style={{ fontSize: '13px', color: '#b45309', marginTop: '2px' }}>
                Your progress in <strong>"{savedSession.quizTitle || 'Assigned Assessment'}"</strong> was saved at Question {savedSession.currentIndex + 1}.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              onClick={() => handleResumeSession(savedSession)}
              style={{ background: '#c93a37', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', font: '700 13px Montserrat', cursor: 'pointer' }}
            >
              Resume Now
            </button>
            <button 
              type="button"
              onClick={handleDiscardSession}
              style={{ background: 'transparent', color: '#92400e', border: '1px solid #fde68a', padding: '8px 14px', borderRadius: '8px', font: '600 13px Inter', cursor: 'pointer' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* 1. MAIN TRAINEE QUEST VIEW (Streamlined Redesign) */}
      {(activeSubView === 'trainee_quest' || !activeSubView || !['trainee_quiz', 'trainee_badges', 'trainee_certs'].includes(activeSubView)) && (
        <div style={{ padding: '36px 40px', boxSizing: 'border-box' }}>
          {/* Welcome & Teaser */}
          <div>
            <h1 style={{ fontSize: '28px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 800 }}>
              {getGreeting()}, {userName}
            </h1>
            <p style={{ marginTop: '4px', color: '#475569', fontSize: '15px' }}>
              You're 2 quizzes away from your next badge.
            </p>
          </div>

          {/* 3 Stat Tiles (Total XP, Level, Daily streak) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '28px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #dde6ee' }}>
              <div style={{ font: '500 13px Inter', color: '#475569' }}>Total XP</div>
              <div style={{ font: '800 32px Montserrat', color: '#00314d', marginTop: '6px' }}>
                {points.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #dde6ee' }}>
              <div style={{ font: '500 13px Inter', color: '#475569' }}>Level</div>
              <div style={{ font: '800 32px Montserrat', color: '#00314d', marginTop: '6px' }}>
                {level}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '22px', border: '1px solid #dde6ee' }}>
              <div style={{ font: '500 13px Inter', color: '#475569' }}>Daily streak</div>
              <div style={{ font: '800 32px Montserrat', color: '#b8322f', marginTop: '6px' }}>
                {streakDays} days
              </div>
            </div>
          </div>

          {/* 2-Column Split: Continue your quest (1.6fr) & Leaderboard (1fr) */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Left Card: Continue your quest */}
            <div style={{ flex: '1.6', minWidth: '320px', background: '#fff', borderRadius: '14px', padding: '26px', border: '1px solid #dde6ee', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 700 }}>
                  Continue your quest
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveView && setActiveView('trainee_quiz')}
                  style={{ background: 'none', border: 'none', font: '600 13px Inter', color: '#00314d', cursor: 'pointer', padding: 0 }}
                >
                  View all
                </button>
              </div>

              <div style={{ marginTop: '12px' }}>
                {assignedActivities.map((act, idx) => {
                  const isLast = idx === assignedActivities.length - 1;
                  return (
                    <div 
                      key={act.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px', 
                        padding: '16px 0', 
                        borderBottom: isLast ? 'none' : '1px solid #e9eff5' 
                      }}
                    >
                      <div style={{ width: '6px', height: '44px', borderRadius: '9px', background: act.color, flexShrink: 0 }}></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: '700 15px Montserrat', color: '#00314d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {act.title}
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                          {act.progressText}
                        </div>
                      </div>
                      
                      {act.actionType === 'resume' && (
                        <button
                          type="button"
                          onClick={() => handleStartQuizById(act.id)}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 18px', 
                            borderRadius: '10px', 
                            font: '700 13px Montserrat, sans-serif', 
                            background: '#c93a37', 
                            color: '#fff', 
                            border: 'none', 
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          Resume
                        </button>
                      )}

                      {act.actionType === 'start' && (
                        <button
                          type="button"
                          onClick={() => handleStartQuizById(act.id)}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 18px', 
                            borderRadius: '10px', 
                            font: '700 13px Montserrat, sans-serif', 
                            background: '#fff', 
                            color: '#00314d', 
                            border: '1.5px solid #00314d', 
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          Start
                        </button>
                      )}

                      {act.actionType === 'locked' && (
                        <span style={{ font: '600 13px Inter', color: '#64748b', padding: '10px 18px', flexShrink: 0 }}>
                          Locked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Card: Leaderboard */}
            <div style={{ flex: '1', minWidth: '280px', background: '#fff', borderRadius: '14px', padding: '26px', border: '1px solid #dde6ee', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 700 }}>
                  Leaderboard
                </h3>
                <span style={{ font: '500 12px Inter', color: '#475569' }}>Live Ranks</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', font: '500 14px Inter' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: '#e9eff5', color: '#00314d', fontWeight: 700 }}>
                  <span>1 · {currentUser?.name || 'Juan Dela Cruz'}</span>
                  <span>{points.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', color: '#1e3a4c' }}>
                  <span>2 · Maria Santos</span>
                  <span>11,402</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', color: '#1e3a4c' }}>
                  <span>3 · Paolo Reyes</span>
                  <span>10,950</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', color: '#1e3a4c' }}>
                  <span>4 · David Lim</span>
                  <span>9,820</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEDICATED QUIZZES CATALOG VIEW */}
      {activeSubView === 'trainee_quiz' && (
        <div style={{ padding: '36px 40px', boxSizing: 'border-box' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 800 }}>
              Knowledge Quizzes
            </h1>
            <p style={{ marginTop: '4px', color: '#475569', fontSize: '15px' }}>
              Official evaluations designed to reinforce learning and track verified progress.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '28px' }}>
            {Object.values(getActiveQuizDatabase()).map((quizItem) => {
              const status = quizScoreStatus[quizItem.id];
              const isSaved = savedSession?.quizId === quizItem.id;

              return (
                <div key={quizItem.id} style={{ background: '#fff', borderRadius: '14px', padding: '24px', border: '1px solid #dde6ee', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: '44px', height: '6px', borderRadius: '9px', background: quizItem.headerColor || '#0284c7', marginBottom: '16px' }}></div>
                  <div style={{ font: '600 12px Inter', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {quizItem.category} · {quizItem.questions?.length || 5} Questions
                  </div>
                  <h3 style={{ fontSize: '18px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 700, marginTop: '8px' }}>
                    {quizItem.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', lineHeight: '1.5', flex: 1 }}>
                    {quizItem.description}
                  </p>
                  
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e9eff5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                      Instructor: <strong>{quizItem.instructor?.split(' ')[0] || 'Trainer'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartQuizById(quizItem.id)}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '9px 18px', 
                        borderRadius: '10px', 
                        font: '700 13px Montserrat, sans-serif', 
                        background: '#c93a37', 
                        color: '#fff', 
                        border: 'none', 
                        cursor: 'pointer' 
                      }}
                    >
                      <span>{isSaved ? 'Resume' : (status?.completed ? 'Retake' : 'Start Quest')}</span>
                      <Play size={12} fill="currentColor" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EARNED BADGES SUB-VIEW */}
      {activeSubView === 'trainee_badges' && (
        <div style={{ padding: '36px 40px', boxSizing: 'border-box' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 800 }}>
              Earned Badges
            </h1>
            <p style={{ marginTop: '4px', color: '#475569', fontSize: '15px' }}>
              Badges and milestones unlocked by completing quests and mastering competency tracks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginTop: '28px' }}>
            {earnedBadges.map((badge) => (
              <div key={badge.id} style={{ background: '#fff', borderRadius: '14px', padding: '24px 20px', border: '1px solid #dde6ee', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ marginBottom: '16px', transform: 'scale(1.05)' }}>
                  <BadgeCoin badge={badge} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#00314d', marginBottom: '6px' }}>
                  {badge.title || badge.name}
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', flex: 1, lineHeight: '1.4' }}>
                  {badge.description || badge.desc}
                </p>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e9eff5' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: '#fef3c7', color: '#b45309' }}>
                    UNLOCKED
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                    <Check size={14} /> Earned
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CERTIFICATIONS SUB-VIEW */}
      {activeSubView === 'trainee_certs' && (
        <div style={{ padding: '36px 40px', boxSizing: 'border-box' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 800 }}>
              Certifications
            </h1>
            <p style={{ marginTop: '4px', color: '#475569', fontSize: '15px' }}>
              Official course completion credentials issued by Crossworks Training &amp; Consulting.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginTop: '28px' }}>
            {certificates.map((cert) => (
              <div key={cert.id} style={{ background: '#fff', borderRadius: '14px', padding: '24px', border: '1px solid #dde6ee', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontFamily: 'Montserrat, sans-serif', color: '#00314d', fontWeight: 700 }}>
                      {cert.title}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                      {cert.clientCompany}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: '#ecfdf5', color: '#059669' }}>
                    Active
                  </span>
                </div>

                <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Issued On:</span>
                    <span style={{ fontWeight: 600 }}>{cert.issuedOn}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Valid Until:</span>
                    <span style={{ fontWeight: 600 }}>{cert.expiresOn}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Verification:</span>
                    <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0284c7' }}>
                      {cert.hash.substring(0, 18)}...
                    </code>
                  </div>
                </div>

                {cert.isRenewalApproaching && (
                  <div style={{ marginTop: '16px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400e' }}>
                    <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                    <span>Annual renewal recommended in <strong>{cert.daysUntilExpiry} days</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE QUIZ ARENA (Full Assessment Experience) */}
      {activeQuiz && (
        <QuizArena 
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onFinish={handleQuizFinish}
          savedSession={savedSession?.quizId === activeQuiz.id ? savedSession : null}
        />
      )}
    </div>
  );
}
