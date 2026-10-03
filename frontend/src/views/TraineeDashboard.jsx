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
import { QUIZ_DATABASE } from '../data/quizDatabase';
import QuizArena from '../components/QuizArena';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeaderboard, fetchTraineeGamification, submitQuizScore } from '../services/api';

export default function TraineeDashboard({ activeSubView, setActiveView }) {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(12877);
  const [level, setLevel] = useState(4);
  const [streakDays, setStreakDays] = useState(7);
  const [pinCode, setPinCode] = useState('');

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

  // Quizzes list aligned with QUIZ_DATABASE
  const assignedActivities = [
    {
      id: 'act-1',
      title: 'Enterprise Security Audit Challenge',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '5 Questions',
      headerColor: '#1368ce',
      category: 'Information Security',
      completed: quizScoreStatus['act-1']?.completed,
      score: quizScoreStatus['act-1']?.score,
      accuracy: quizScoreStatus['act-1']?.completed ? `${quizScoreStatus['act-1'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-2',
      title: 'Role-Based Access & Policy Verification',
      instructor: 'Dr. Sarah Jenkins',
      questionsCount: '5 Questions',
      headerColor: '#06d6a0',
      category: 'Access Control',
      completed: quizScoreStatus['act-2']?.completed,
      score: quizScoreStatus['act-2']?.score,
      accuracy: quizScoreStatus['act-2']?.completed ? `${quizScoreStatus['act-2'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-3',
      title: 'Privacy Impact Assessment (PIA) Simulation',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '5 Questions',
      headerColor: '#e21b3c',
      category: 'Privacy Management',
      completed: quizScoreStatus['act-3']?.completed,
      score: quizScoreStatus['act-3']?.score,
      accuracy: quizScoreStatus['act-3']?.completed ? `${quizScoreStatus['act-3'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-4',
      title: 'Multi-Tenant Data Isolation & Security',
      instructor: 'Prof. Roel Traballo',
      questionsCount: '5 Questions',
      headerColor: '#772ce8',
      category: 'Database Security',
      completed: quizScoreStatus['act-4']?.completed,
      score: quizScoreStatus['act-4']?.score,
      accuracy: quizScoreStatus['act-4']?.completed ? `${quizScoreStatus['act-4'].score}% accuracy` : 'Assigned (Due in 3d)'
    }
  ];

  const earnedBadges = [
    { id: 'first_step', name: 'First Step', icon: '🚀', desc: 'Completed orientation modules', tier: 'Bronze' },
    { id: 'sec_champ', name: 'Security Champion', icon: '🛡️', desc: 'Aced Security & Compliance Assessment', tier: 'Gold' },
    { id: 'streak_master', name: '7-Day Streak', icon: '🔥', desc: 'Active training 7 consecutive days', tier: 'Ruby' },
    { id: 'crypto_knight', name: 'Security Decoder', icon: '⚡', desc: 'Verified policy attribute satisfaction', tier: 'Diamond' }
  ];

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
    const q = QUIZ_DATABASE[quizId] || QUIZ_DATABASE['act-1'];
    setActiveQuiz(q);
  };

  // Resume saved interrupted session
  const handleResumeSession = (session) => {
    const q = QUIZ_DATABASE[session.quizId] || QUIZ_DATABASE['act-1'];
    setActiveQuiz(q);
  };

  // Discard saved session
  const handleDiscardSession = () => {
    localStorage.removeItem('crossquest_quiz_session');
    setSavedSession(null);
  };

  // Pin Code Join
  const handleJoinPin = () => {
    let targetId = 'act-1';
    if (pinCode.includes('2')) targetId = 'act-2';
    else if (pinCode.includes('3')) targetId = 'act-3';
    else if (pinCode.includes('4')) targetId = 'act-4';
    handleStartQuizById(targetId);
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
      {(activeSubView === 'trainee_quest' || !activeSubView) && (
        <>
          {/* Top Banner with Quizizz Purple & Kahoot Play Input */}
          <div className="wayground-hero-banner">
            <div className="banner-left-content">
              <div className="hero-badge-tag">
                <Sparkles size={14} className="text-gold" />
                <span>CROSSQUEST GAMIFIED LEARNING</span>
              </div>
              <h1>Welcome back, {currentUser?.name}!</h1>
              <p className="hero-subtext">
                Complete today's interactive quest to extend your <strong>7-Day Streak</strong> and climb the corporate leaderboard.
              </p>

              {/* Pin Code Joiner (Kahoot Style) */}
              <div className="kahoot-join-bar">
                <input
                  type="text"
                  placeholder="Enter Game PIN / Quest Code..."
                  className="kahoot-pin-input"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinPin();
                  }}
                />
                <button 
                  className="btn-tactile btn-tactile-purple btn-pin-enter"
                  onClick={handleJoinPin}
                >
                  <Play size={16} />
                  <span>Join Quest</span>
                </button>
              </div>
            </div>

            <div className="banner-right-stats">
              <div className="hero-stat-card streak-card">
                <Flame size={32} className="flame-pulse" />
                <div className="hero-stat-info">
                  <div className="hero-stat-value">{streakDays} Days</div>
                  <div className="hero-stat-label">ACTIVE STREAK</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Assigned Activities (Wayground Style Cards with colored header tabs) */}
          <div className="wayground-section-block">
            <div className="section-title-row">
              <div className="section-title-left">
                <Target size={20} className="text-magenta" />
                <h3>Assigned Course Activities</h3>
              </div>
              <span className="text-secondary text-xs">Assigned by Crossworks Instructors</span>
            </div>

            <div className="activity-cards-scroller">
              {assignedActivities.map((act) => {
                const isSavedThis = savedSession?.quizId === act.id;
                return (
                  <div key={act.id} className="card-gamified wayground-activity-card">
                    {/* Top Colored Bar with Category Icon */}
                    <div className="activity-card-header-bar" style={{ backgroundColor: act.headerColor }}>
                      <span className="activity-header-label">{act.category}</span>
                      <span className="activity-q-count">{act.questionsCount}</span>
                    </div>

                    <div className="activity-card-body">
                      <h4 className="activity-title">{act.title}</h4>
                      <p className="activity-instructor">{act.instructor}</p>

                      <div className="activity-card-footer">
                        <span className={`accuracy-pill ${act.completed ? 'completed' : 'pending'}`}>
                          {act.completed ? <CheckCircle2 size={13} /> : <Zap size={13} />}
                          {act.accuracy}
                        </span>

                        <button
                          className={`btn-tactile ${isSavedThis ? 'btn-tactile-gold' : 'btn-tactile-purple'} btn-sm`}
                          onClick={() => handleStartQuizById(act.id)}
                        >
                          <span>{isSavedThis ? 'Resume Quest' : (act.completed ? 'Replay' : 'Play Quest')}</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Badges Showcase */}
          <div className="wayground-section-block">
            <div className="section-title-row">
              <div className="section-title-left">
                <Trophy size={20} className="text-gold" />
                <h3>Your Earned Badges</h3>
              </div>
              <button 
                className="view-all-link" 
                onClick={() => setActiveView && setActiveView('trainee_badges')}
              >
                View All ({earnedBadges.length})
              </button>
            </div>

            <div className="badges-showcase-row">
              {earnedBadges.map((badge) => (
                <div key={badge.id} className="badge-trophy-card card-gamified">
                  <div className="badge-emoji-container">
                    <span className="badge-large-emoji">{badge.icon}</span>
                  </div>
                  <div className="badge-name">{badge.name}</div>
                  <div className="badge-desc">{badge.desc}</div>
                  <span className={`tier-chip tier-${badge.tier.toLowerCase()}`}>{badge.tier}</span>
                </div>
              ))}
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
            {Object.values(QUIZ_DATABASE).map((quizItem) => {
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
        <div className="card section-card p-24">
          <div className="card-header-bar mb-16" style={{ padding: 0 }}>
            <div>
              <h3 className="card-title">Badge Showcase & Achievements</h3>
              <p className="text-muted text-xs">Unlock shiny badges by proving your knowledge in security and access controls.</p>
            </div>
          </div>

          <div className="badges-full-grid">
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="badge-detail-card card-gamified">
                <div className="badge-icon-bubble">{badge.icon}</div>
                <h4>{badge.name}</h4>
                <p className="badge-desc">{badge.desc}</p>
                <div className="badge-footer flex-between">
                  <span className={`tier-chip tier-${badge.tier.toLowerCase()}`}>{badge.tier}</span>
                  <span className="badge-check flex-align gap-4 text-emerald">
                    <Check size={14} /> Unlocked
                  </span>
                </div>
              </div>
            ))}
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
