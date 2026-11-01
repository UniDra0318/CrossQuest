import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Flame, 
  Sparkles, 
  Check, 
  ArrowRight, 
  BookOpen, 
  AlertCircle, 
  Shield, 
  Play, 
  Clock, 
  GraduationCap, 
  AlertTriangle,
  FileQuestion,
  ChevronRight
} from 'lucide-react';
import { getActiveQuizDatabase } from '../data/quizDatabase';
import QuizArena from '../components/QuizArena';
import { useAuth } from '../contexts/AuthContext';
import { fetchTraineeGamification, submitQuizScore, toggleLeaderboardOptOut, fetchCompanyLeaderboard } from '../services/api';
import Mascot from '../components/Mascot';
import IsoCube from '../components/IsoCube';
import BadgeCoin from '../components/BadgeCoin';
import Podium from '../components/Podium';
import { TRACKS } from '../data/tracks';
import { badges as designBadges, leaderboard as designLeaderboard } from '../data/mock';

export default function TraineeDashboard({ activeSubView, setActiveView, onStreakLoad }) {
  const { currentUser, token } = useAuth();
  const [points, setPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [level, setLevel] = useState(null);
  const [streakDays, setStreakDays] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [gamLoading, setGamLoading] = useState(true);

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizScoreStatus, setQuizScoreStatus] = useState({
    'act-1': { completed: false, score: null },
    'act-2': { completed: false, score: null },
    'act-3': { completed: false, score: null },
    'act-4': { completed: false, score: null }
  });

  // Track online status (SEC-26: Offline quizzes disabled)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync with backend gamification data & real-time streak
  useEffect(() => {
    async function loadGamification() {
      setGamLoading(true);
      if (currentUser?.id) {
        const gam = await fetchTraineeGamification(currentUser.id);
        if (gam) {
          setPoints(gam.points ?? 0);
          setLevel(gam.level ?? 1);
          const streak = gam.streak ?? gam.current_streak ?? 0;
          setStreakDays(streak);
          if (onStreakLoad) onStreakLoad(streak);
        }
      }
      setGamLoading(false);
    }
    loadGamification();
  }, [currentUser?.id, onStreakLoad]);

  // Sync company leaderboard
  useEffect(() => {
    async function loadLeaderboard() {
      const data = await fetchCompanyLeaderboard(token);
      if (data && data.length > 0) {
        setLeaderboard(data);
      }
    }
    loadLeaderboard();
  }, [token]);

  const handleToggleOptOut = async () => {
    const nextVal = !leaderboardOptOut;
    setLeaderboardOptOut(nextVal);
    await toggleLeaderboardOptOut(nextVal);
  };

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
      accuracy: quizScoreStatus['act-4']?.completed ? `${quizScoreStatus['act-4'].score}% accuracy` : 'Assigned - Due in 3d'
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
    if (!isOnline) return; // SEC-26: block offline quiz launch
    const db = getActiveQuizDatabase();
    const q = db[quizId] || db['act-1'];
    setActiveQuiz(q);
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

    setPoints(prev => (prev ?? 0) + (resultData.pointsEarned || 250));
    setActiveQuiz(null);
  };

  // Quiz exit handler (no session save - SEC-26)
  const handleQuizExit = () => {
    setActiveQuiz(null);
  };

  // Trainee in-page tab options
  const currentTab = ['trainee_quiz', 'trainee_badges', 'trainee_certs'].includes(activeSubView) 
    ? activeSubView 
    : 'trainee_quest';

  const traineeTabs = [
    { id: 'trainee_quest', label: 'Quest & Progress', icon: Flame },
    { id: 'trainee_quiz', label: 'Knowledge Quizzes', icon: GraduationCap },
    { id: 'trainee_badges', label: 'Earned Badges', icon: Award },
    { id: 'trainee_certs', label: 'My Certifications', icon: BookOpen }
  ];

  // =========================================================================
  // FULLSCREEN DISTRACTION-FREE QUIZ ARENA TAKEOVER
  // When inside a quiz, sidebar, topbar, and dashboard are completely obscured
  // =========================================================================
  if (activeQuiz) {
    return (
      <QuizArena 
        quiz={activeQuiz}
        initialSession={null}
        onFinish={handleQuizFinish}
        onExit={handleQuizExit}
      />
    );
  }

  return (
    <div className="dashboard-content-layout">
      {/* OFFLINE CONNECTIVITY NOTICE BANNER (SEC-26) */}
      {!isOnline && (
        <div style={{ background: '#451a03', border: '1px solid #f59e0b', color: '#fef3c7', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={22} color="#f59e0b" className="flex-shrink-0" />
          <div>
            <strong>Offline Mode Notice:</strong> Live quizzes, assessments, and score synchronization require an active network connection per security policy (SEC-26). Offline caching and submissions are disabled.
          </div>
        </div>
      )}

      {/* IN-PAGE TRAINEE WORKSPACE TAB STRIP */}
      <nav className="trainee-nav-tabs" aria-label="Trainee Sections" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '10px'
      }}>
        {traineeTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView && setActiveView(tab.id)}
              className={`trainee-tab-pill ${isActive ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#4338ca' : '#64748b',
                background: isActive ? '#eef2ff' : '#ffffff',
                border: isActive ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 3px rgba(67, 56, 202, 0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} color={isActive ? '#4f46e5' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 1. MAIN TRAINEE QUEST VIEW */}
      {(currentTab === 'trainee_quest') && (
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
                Complete today's interactive quest to extend your <strong>{streakDays !== null ? `${streakDays}-day` : '...'} streak</strong> and climb the corporate leaderboard.
              </p>

              {/* Enterprise Learning Action Buttons */}
              <div className="template-hero-actions">
                <button 
                  className={`template-cta-btn template-cta-btn--primary${!isOnline ? ' btn-disabled' : ''}`}
                  onClick={() => handleStartQuizById('act-1')}
                  disabled={!isOnline}
                  title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
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
              {/* Badges container on right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {/* Floating streak pill - live from backend */}
                <div className="template-hero-streak-badge">
                  <div className="streak-flame-circle">
                    <Flame size={16} className="text-orange" fill="#ff6a00" />
                  </div>
                  <div className="streak-text-group">
                    <span className="streak-val">
                      {gamLoading ? '...' : `${streakDays ?? 0} Days`}
                    </span>
                    <span className="streak-lbl">ACTIVE STREAK</span>
                  </div>
                </div>

                {/* Level & Points Pill */}
                <div className="template-hero-streak-badge">
                  <div className="streak-flame-circle" style={{ background: '#ecfdf5' }}>
                    <Award size={16} color="#059669" />
                  </div>
                  <div className="streak-text-group">
                    <span className="streak-val">
                      {gamLoading ? '...' : `Level ${level ?? 1}`}
                    </span>
                    <span className="streak-lbl">{gamLoading ? '...' : `${(points ?? 0).toLocaleString()} XP`}</span>
                  </div>
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
                              disabled={!isOnline}
                              title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
                            >
                              <span>Replay</span>
                              <ArrowRight size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="activity-pending-pill">
                              <span>Assigned - Due in 3d</span>
                            </span>
                            <button
                              className="activity-btn-play"
                              onClick={() => handleStartQuizById(act.id)}
                              disabled={!isOnline}
                              title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
                            >
                              <span>Play Quest</span>
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
              {/* This Week Streak Tracker - live from backend */}
              <div className="template-this-week-card">
                <div className="this-week-header flex-between">
                  <h4>This week</h4>
                  <span className="this-week-counter">
                    {gamLoading ? '...' : `${Math.min(streakDays ?? 0, 7)} / 7 DAYS`}
                  </span>
                </div>
                <div className="this-week-days-row">
                  {['M','T','W','T','F','S','S'].map((day, idx) => {
                    const activeCount = Math.min(streakDays ?? 0, 7);
                    const isActive = !gamLoading && idx < activeCount;
                    return (
                      <div key={idx} className="this-week-day-item">
                        <div className={`day-flame-circle ${isActive ? 'active' : ''}`}>
                          <Flame size={14} fill={isActive ? '#ea580c' : 'none'} className="text-orange" />
                        </div>
                        <span className="day-label">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corporate Leaderboard Podium Card */}
              <div className="template-leaderboard-card">
                <div className="leaderboard-card-header flex-between" style={{ marginBottom: '12px' }}>
                  <div className="leaderboard-card-title">Corporate leaderboard</div>
                  {/* Opt-out toggle */}
                  <label className="leaderboard-optout-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={leaderboardOptOut}
                      onChange={handleToggleOptOut}
                      style={{ cursor: 'pointer' }}
                    />
                    Hide my rank
                  </label>
                </div>
                
                {/* 3D Podium Graphic */}
                <div style={{ marginBottom: '20px' }}>
                  <Podium top={designLeaderboard.top} small={true} />
                </div>

                {/* Bottom User Pill */}
                {!leaderboardOptOut && (
                  <div className="leaderboard-user-pill">
                    <div className="user-pill-left flex-align gap-8">
                      <div className="leaderboard-avatar-circle">
                        {currentUser?.initials || 'JD'}
                      </div>
                      <span className="leaderboard-user-name">
                        You - {currentUser?.name || 'Juan Dela Cruz'}
                      </span>
                    </div>
                    <span className="leaderboard-rank-badge">RANK [#1]</span>
                  </div>
                )}
                {leaderboardOptOut && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '8px 0' }}>
                    Your rank is hidden from the leaderboard.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. DEDICATED KNOWLEDGE QUIZZES CATALOG VIEW (When clicking Quizzes tab) */}
      {currentTab === 'trainee_quiz' && (
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
                      className={`btn-tactile btn-tactile-purple w-full`}
                      onClick={() => handleStartQuizById(quizItem.id)}
                      disabled={!isOnline}
                      title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
                    >
                      <Play size={15} />
                      <span>{status?.completed ? 'Retake Assessment' : 'Start Assessment'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EARNED BADGES SUB-VIEW */}
      {currentTab === 'trainee_badges' && (
        <div className="card section-card p-24" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div className="card-header-bar mb-16" style={{ padding: '0 0 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e1b4b', marginBottom: '4px' }}>
                Badge Showcase &amp; Achievements
              </h3>
              <p className="text-muted text-xs" style={{ color: '#64748b' }}>
                Unlock shiny 3D collectible badges by proving your knowledge across security frameworks and policy access controls.
              </p>
            </div>
          </div>

          {earnedBadges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
              <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <h4 style={{ fontWeight: '700', marginBottom: '8px', color: '#64748b' }}>No badges earned yet</h4>
              <p style={{ fontSize: '14px' }}>Complete a quest to unlock your first badge!</p>
            </div>
          ) : (
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
          )}
        </div>
      )}

      {/* 4. CERTIFICATIONS SUB-VIEW */}
      {currentTab === 'trainee_certs' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">My Verified Certifications</h3>
              <p className="card-subtitle">
                Official course completion certificates with cryptographic validation.
              </p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
              <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <h4 style={{ fontWeight: '700', marginBottom: '8px', color: '#64748b' }}>No certifications yet</h4>
              <p style={{ fontSize: '14px' }}>Complete a training program to earn your first certificate!</p>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
