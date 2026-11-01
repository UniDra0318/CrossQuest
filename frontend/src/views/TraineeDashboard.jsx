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
  Zap, 
  Target,
  Clock,
  Layers,
  AlertTriangle,
  RotateCw,
  FileQuestion,
  ChevronRight
} from 'lucide-react';
import { QUIZ_DATABASE, getActiveQuizDatabase } from '../data/quizDatabase';
import QuizArena from '../components/QuizArena';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeaderboard, fetchTraineeGamification, submitQuizScore } from '../services/api';
import mascotRobot from '../assets/mascot-robot.png';
import Mascot from '../components/Mascot';
import IsoCube from '../components/IsoCube';
import BadgeCoin from '../components/BadgeCoin';
import Podium from '../components/Podium';
import { TRACKS } from '../data/tracks';
import { badges as designBadges, leaderboard as designLeaderboard } from '../data/mock';
import { 
  IsometricCube3D, 
  IsometricLock3D, 
  IsometricSphere3D, 
  IsometricDatabase3D 
} from '../components/IsometricIcons';

export default function TraineeDashboard({ activeSubView, setActiveView }) {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(12877);
  const [level, setLevel] = useState(4);
  const [streakDays, setStreakDays] = useState(7);

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
    }
    loadGamification();
  }, [currentUser?.id]);

  // Quizzes list aligned with QUIZ_DATABASE and TRACKS
  const assignedActivities = [
    {
      id: 'act-1',
      title: 'Enterprise Security Audit Challenge',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.infosec.color,
      category: TRACKS.infosec.name,
      track: TRACKS.infosec,
      progressSegments: [true, true, true, false],
      completed: quizScoreStatus['act-1']?.completed,
      score: quizScoreStatus['act-1']?.score,
      accuracy: quizScoreStatus['act-1']?.completed ? `${quizScoreStatus['act-1'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-2',
      title: 'Role-Based Access & Policy Verification',
      instructor: 'Dr. Sarah Jenkins',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.access.color,
      category: TRACKS.access.name,
      track: TRACKS.access,
      progressSegments: [true, true, true, true],
      completed: quizScoreStatus['act-2']?.completed,
      score: quizScoreStatus['act-2']?.score,
      accuracy: quizScoreStatus['act-2']?.completed ? `${quizScoreStatus['act-2'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-3',
      title: 'Privacy Impact Assessment (PIA) Simulation',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.privacy.color,
      category: TRACKS.privacy.name,
      track: TRACKS.privacy,
      progressSegments: [true, true, true, false],
      completed: quizScoreStatus['act-3']?.completed,
      score: quizScoreStatus['act-3']?.score,
      accuracy: quizScoreStatus['act-3']?.completed ? `${quizScoreStatus['act-3'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-4',
      title: 'Multi-Tenant Data Isolation & Security',
      instructor: 'Prof. Roel Traballo',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.database.color,
      category: TRACKS.database.name,
      track: TRACKS.database,
      progressSegments: [false, false, false, false],
      completed: quizScoreStatus['act-4']?.completed,
      score: quizScoreStatus['act-4']?.score,
      accuracy: quizScoreStatus['act-4']?.completed ? `${quizScoreStatus['act-4'].score}% accuracy` : 'Assigned · Due in 3d'
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

    setPoints(prev => prev + (resultData.pointsEarned || 250));
    localStorage.removeItem('crossquest_quiz_session');
    setSavedSession(null);
    setActiveQuiz(null);
  };

  // Quiz exit / save handler
  const handleQuizExit = () => {
    setActiveQuiz(null);
    try {
      const raw = localStorage.getItem('crossquest_quiz_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.stage !== 'completed') {
          setSavedSession(parsed);
        } else {
          setSavedSession(null);
        }
      }
    } catch (e) {}
  };

  // =========================================================================
  // FULLSCREEN DISTRACTION-FREE QUIZ ARENA TAKEOVER
  // When inside a quiz, sidebar, topbar, and dashboard are completely obscured
  // =========================================================================
  if (activeQuiz) {
    return (
      <QuizArena 
        quiz={activeQuiz}
        initialSession={savedSession?.quizId === activeQuiz.id ? savedSession : null}
        onFinish={handleQuizFinish}
        onExit={handleQuizExit}
      />
    );
  }

  return (
    <div className="dashboard-content-layout">
      {/* OUTAGE / DISRUPTION RECOVERY BANNER */}
      {savedSession && (
        <div className="quiz-recovery-banner">
          <div className="recovery-left">
            <div className="recovery-icon-circle">
              <RotateCw className="spin-slow text-amber" size={20} />
            </div>
            <div className="recovery-text-group">
              <div className="recovery-title">
                Unfinished Assessment Detected
              </div>
              <div className="recovery-desc">
                Your progress in <strong>"{savedSession.quizTitle || 'Assigned Assessment'}"</strong> was saved at <strong>Question {savedSession.currentIndex + 1}</strong>. You can resume immediately without penalty.
              </div>
            </div>
          </div>
          <div className="recovery-actions">
            <button 
              className="btn-tactile btn-tactile-gold btn-sm"
              onClick={() => handleResumeSession(savedSession)}
            >
              <Play size={14} />
              <span>Resume Assessment Now</span>
            </button>
            <button 
              className="btn-tactile btn-tactile-ghost btn-sm"
              onClick={handleDiscardSession}
            >
              <span>Discard</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. MAIN TRAINEE QUEST VIEW */}
      {(activeSubView === 'trainee_quest' || !activeSubView || !['trainee_quiz', 'trainee_badges', 'trainee_certs'].includes(activeSubView)) && (
        <>
          {/* 1. HERO BANNER WITH 3D MASCOT */}
          <div className="template-hero-banner">
            <div className="template-hero-left">
              <div className="template-hero-badge">
                <Sparkles size={13} className="text-gold" />
                <span>CROSSQUEST GAMIFIED LEARNING</span>
              </div>
              <h1 className="template-hero-title">Welcome back, {currentUser?.name}!</h1>
              <p className="template-hero-subtitle">
                Complete today's interactive quest to extend your <strong>7-day streak</strong> and climb the corporate leaderboard.
              </p>

              {/* Enterprise Learning Action Buttons (No PIN) */}
              <div className="template-hero-actions">
                <button 
                  className="template-cta-btn template-cta-btn--primary"
                  onClick={() => handleStartQuizById('act-1')}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Start Assigned Quest</span>
                </button>
                <button 
                  className="template-cta-btn template-cta-btn--secondary"
                  onClick={() => {
                    const el = document.getElementById('assigned-activities-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <BookOpen size={15} />
                  <span>View All Modules</span>
                </button>
              </div>
            </div>

            <div className="template-hero-right">
              {/* Floating streak pill */}
              <div className="template-hero-streak-badge">
                <div className="streak-flame-circle">
                  <Flame size={16} className="text-orange" fill="#ff6a00" />
                </div>
                <div className="streak-text-group">
                  <span className="streak-val">{streakDays} Days</span>
                  <span className="streak-lbl">ACTIVE STREAK</span>
                </div>
              </div>

              {/* Pure CSS 3D Quest Bot Mascot */}
              <div className="template-mascot-container">
                <Mascot />
              </div>
            </div>
          </div>

          {/* 2. ASSIGNED COURSE ACTIVITIES (4 CARDS WITH 3D ISOMETRIC GRAPHICS) */}
          <div id="assigned-activities-section" className="template-section-block">
            <div className="template-section-header">
              <div className="template-section-title-wrap">
                <h3>Assigned Course Activities</h3>
              </div>
              <span className="template-section-instructor-tag">ASSIGNED BY CROSSWORKS INSTRUCTORS</span>
            </div>

            <div className="template-activities-grid">
              {assignedActivities.map((act) => {
                const isSavedThis = savedSession?.quizId === act.id;

                return (
                  <div key={act.id} className="template-activity-card">
                    {/* Top Colored Banner with 3D Graphic */}
                    <div className="activity-card-banner" style={{ backgroundColor: act.headerColor }}>
                      <div className="activity-banner-left">
                        <span className="activity-q-pill">{act.questionsCount}</span>
                        <h4 className="activity-category-title">{act.category}</h4>
                      </div>
                      <div className="activity-banner-icon-slot">
                        <IsoCube 
                          size={46} 
                          color={act.track.color} 
                          top={act.track.top} 
                          right={act.track.right} 
                          label={act.track.face.label} 
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="activity-card-body">
                      <h4 className="activity-title">{act.title}</h4>
                      <p className="activity-instructor">{act.instructor}</p>

                      {/* Segmented Progress Indicator (4 pills) */}
                      <div className="activity-segmented-bar">
                        {act.progressSegments.map((isFilled, idx) => (
                          <div 
                            key={idx} 
                            className={`activity-segment-pill ${isFilled ? 'filled' : 'empty'}`}
                            style={{ backgroundColor: isFilled ? act.headerColor : '#e2e8f0' }}
                          />
                        ))}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="activity-card-footer">
                        {act.completed ? (
                          <>
                            <span className="activity-accuracy-pill">
                              <Check size={12} strokeWidth={3} />
                              <span>{act.score}% accuracy</span>
                            </span>
                            <button
                              className="activity-btn-replay"
                              onClick={() => handleStartQuizById(act.id)}
                            >
                              <span>Replay</span>
                              <ArrowRight size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="activity-pending-pill">
                              <span>Assigned · Due in 3d</span>
                            </span>
                            <button
                              className="activity-btn-play"
                              onClick={() => handleStartQuizById(act.id)}
                            >
                              <span>{isSavedThis ? 'Resume' : 'Play Quest'}</span>
                              <Play size={12} fill="currentColor" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. LOWER SPLIT SECTION: BADGES SHOWCASE + RIGHT WIDGETS */}
          <div className="template-lower-split">
            {/* Left: Your Earned Badges */}
            <div className="template-badges-container">
              <div className="template-section-header mb-16">
                <div className="template-section-title-wrap">
                  <h3>Your Earned Badges</h3>
                </div>
                <button 
                  className="template-view-all-link"
                  onClick={() => setActiveView && setActiveView('trainee_badges')}
                >
                  View All ({earnedBadges.length})
                </button>
              </div>

              <div className="template-badges-grid">
                {earnedBadges.map((badge) => (
                  <div key={badge.id} className="template-badge-card">
                    <BadgeCoin badge={badge} />
                    <div className="template-badge-name" style={{ marginTop: '16px' }}>{badge.title}</div>
                    <div className="template-badge-desc">{badge.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Streak This Week + Corporate Leaderboard */}
            <div className="template-right-widgets">
              {/* This Week Streak Tracker */}
              <div className="template-this-week-card">
                <div className="this-week-header flex-between">
                  <h4>This week</h4>
                  <span className="this-week-counter">7 / 7 DAYS</span>
                </div>
                <div className="this-week-days-row">
                  {[
                    { day: 'M', active: true },
                    { day: 'T', active: true },
                    { day: 'W', active: true },
                    { day: 'T', active: true },
                    { day: 'F', active: true },
                    { day: 'S', active: true },
                    { day: 'S', active: true }
                  ].map((item, idx) => (
                    <div key={idx} className="this-week-day-item">
                      <div className={`day-flame-circle ${item.active ? 'active' : ''}`}>
                        <Flame size={14} fill="#ea580c" className="text-orange" />
                      </div>
                      <span className="day-label">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Corporate Leaderboard Podium Card */}
              <div className="template-leaderboard-card">
                <div className="leaderboard-card-title">Corporate leaderboard</div>
                
                {/* 3D Podium Graphic */}
                <div style={{ marginBottom: '20px' }}>
                  <Podium top={designLeaderboard.top} small={true} />
                </div>

                {/* Bottom User Pill */}
                <div className="leaderboard-user-pill">
                  <div className="user-pill-left flex-align gap-8">
                    <div className="leaderboard-avatar-circle">
                      {currentUser?.initials || 'JD'}
                    </div>
                    <span className="leaderboard-user-name">
                      You · {currentUser?.name || 'Juan Dela Cruz'}
                    </span>
                  </div>
                  <span className="leaderboard-rank-badge">RANK [#1]</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. DEDICATED KNOWLEDGE QUIZZES CATALOG VIEW (When clicking Quizzes tab) */}
      {activeSubView === 'trainee_quiz' && (
        <div className="quizzes-catalog-view">
          <div className="catalog-header-banner">
            <div>
              <div className="catalog-badge-pill">
                <FileQuestion size={14} className="text-cyan" />
                <span>OFFICIAL EVALUATIONS</span>
              </div>
              <h2>Enterprise Knowledge Quizzes</h2>
              <p className="catalog-subtitle">
                Select an assessment to enter the dedicated distraction-free testing arena. Each quiz includes interactive Kahoot-style questions, sequence ordering, term identification, and architecture diagrams.
              </p>
            </div>
          </div>

          <div className="quizzes-catalog-grid">
            {Object.values(getActiveQuizDatabase()).map((quizItem) => {
              const status = quizScoreStatus[quizItem.id];
              const isSaved = savedSession?.quizId === quizItem.id;

              return (
                <div key={quizItem.id} className="quiz-catalog-card card-gamified">
                  <div className="catalog-card-top" style={{ borderTop: `4px solid ${quizItem.headerColor}` }}>
                    <div className="flex-between">
                      <span className="catalog-category-tag" style={{ color: quizItem.headerColor }}>
                        {quizItem.category}
                      </span>
                      <span className="catalog-time-tag">
                        <Clock size={12} /> {quizItem.timePerQuestion}s / Q
                      </span>
                    </div>
                    <h3 className="catalog-card-title">{quizItem.title}</h3>
                    <p className="catalog-instructor-tag">Instructor: {quizItem.instructor}</p>
                  </div>

                  <div className="catalog-card-body">
                    <p className="catalog-quiz-desc">{quizItem.description}</p>

                    <div className="catalog-types-row">
                      <span className="qtype-badge">Kahoot 4-Choice</span>
                      <span className="qtype-badge">Identification</span>
                      <span className="qtype-badge">Sequence Order</span>
                      <span className="qtype-badge">Diagram Analysis</span>
                    </div>

                    <div className="catalog-meta-row">
                      <div className="catalog-meta-item">
                        <span className="meta-k">Passing Grade:</span>
                        <span className="meta-v">{quizItem.passingScore}%</span>
                      </div>
                      <div className="catalog-meta-item">
                        <span className="meta-k">Items:</span>
                        <span className="meta-v">{quizItem.questions.length} Questions</span>
                      </div>
                      <div className="catalog-meta-item">
                        <span className="meta-k">Status:</span>
                        <span className={`meta-v ${status?.completed ? 'text-emerald' : 'text-amber'}`}>
                          {status?.completed ? `${status.score}% Passed` : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="catalog-card-actions">
                    <button
                      className={`btn-tactile ${isSaved ? 'btn-tactile-gold' : 'btn-tactile-purple'} w-full`}
                      onClick={() => handleStartQuizById(quizItem.id)}
                    >
                      <Play size={15} />
                      <span>{isSaved ? 'Resume In-Progress Assessment' : (status?.completed ? 'Retake Assessment' : 'Start Assessment')}</span>
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
        <div className="card section-card p-24" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div className="card-header-bar mb-16" style={{ padding: '0 0 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e1b4b', marginBottom: '4px' }}>
                Badge Showcase & Achievements
              </h3>
              <p className="text-muted text-xs" style={{ color: '#64748b' }}>
                Unlock shiny 3D collectible badges by proving your knowledge across security frameworks and policy access controls.
              </p>
            </div>
          </div>

          <div className="badges-full-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginTop: '16px' }}>
            {earnedBadges.map((badge) => {
              const tierName = badge.tier || (badge.id === 'seven-day-streak' ? 'Legendary' : badge.id === 'security-champion' ? 'Master' : 'Adept');
              const tierClass = tierName.toLowerCase();
              return (
                <div key={badge.id} className="badge-detail-card card-gamified" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ marginBottom: '16px', transform: 'scale(1.1)' }}>
                    <BadgeCoin badge={badge} />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{badge.title || badge.name}</h4>
                  <p className="badge-desc" style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', flex: 1, lineHeight: '1.4' }}>{badge.description || badge.desc}</p>
                  <div className="badge-footer flex-between" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <span className={`tier-chip tier-${tierClass}`} style={{ fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '999px', background: tierClass === 'legendary' ? '#fef3c7' : tierClass === 'master' ? '#dbeafe' : '#e0e7ff', color: tierClass === 'legendary' ? '#b45309' : tierClass === 'master' ? '#1d4ed8' : '#4338ca' }}>
                      {tierName.toUpperCase()}
                    </span>
                    <span className="badge-check flex-align gap-4 text-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#059669' }}>
                      <Check size={14} /> Unlocked
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. CERTIFICATIONS SUB-VIEW */}
      {activeSubView === 'trainee_certs' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">My Verified Certifications</h3>
              <p className="card-subtitle">
                Official course completion certificates with cryptographic validation.
              </p>
            </div>
          </div>

          <div className="p-24 certs-list-grid">
            {certificates.map((cert) => (
              <div key={cert.id} className="card-gamified certificate-card">
                <div className="cert-top-row flex-between">
                  <div className="flex-align gap-8">
                    <Shield size={22} className="text-gold" />
                    <div>
                      <h4>{cert.title}</h4>
                      <div className="text-secondary text-xs">{cert.clientCompany}</div>
                    </div>
                  </div>
                  <span className="badge-gamified badge-green">Active Credential</span>
                </div>

                <div className="cert-meta-body">
                  <div className="cert-meta-item">
                    <span className="meta-label">Issued On:</span>
                    <span className="meta-val">{cert.issuedOn}</span>
                  </div>
                  <div className="cert-meta-item">
                    <span className="meta-label">Valid Until:</span>
                    <span className="meta-val">{cert.expiresOn}</span>
                  </div>
                  <div className="cert-meta-item">
                    <span className="meta-label">Digital Hash:</span>
                    <code className="text-xs text-cyan">{cert.hash}</code>
                  </div>
                </div>

                {cert.isRenewalApproaching && (
                  <div className="renewal-alert-strip">
                    <AlertCircle size={14} className="text-gold" />
                    <span>Annual renewal recommended in <strong>{cert.daysUntilExpiry} days</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
