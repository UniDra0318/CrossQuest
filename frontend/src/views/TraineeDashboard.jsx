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
  Coins, 
  Play, 
  CheckCircle2, 
  HelpCircle, 
  Zap, 
  Target 
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { fetchLeaderboard, fetchTraineeGamification, submitQuizScore } from '../services/api';

export default function TraineeDashboard({ activeSubView }) {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(12877);
  const [level, setLevel] = useState(4);
  const [streakDays, setStreakDays] = useState(7);
  const [pinCode, setPinCode] = useState('');

  // Active quiz state
  const [activeQuizRunning, setActiveQuizRunning] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answeredState, setAnsweredState] = useState(null); // 'correct' | 'wrong' | null
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Sync with real backend gamification data
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

  // Assigned Quizzes (Wayground / Quizizz style cards)
  const assignedActivities = [
    {
      id: 'act-1',
      title: 'Enterprise Security Audit Challenge',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '15 Qs',
      accuracy: '94% accuracy',
      headerColor: '#1368ce',
      category: 'Information Security',
      completed: true,
      score: 94
    },
    {
      id: 'act-2',
      title: 'Role-Based Access & Policy Verification',
      instructor: 'Dr. Sarah Jenkins',
      questionsCount: '10 Qs',
      accuracy: '100% accuracy',
      headerColor: '#06d6a0',
      category: 'Access Control',
      completed: true,
      score: 100
    },
    {
      id: 'act-3',
      title: 'Privacy Impact Assessment (PIA) Simulation',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '20 Qs',
      accuracy: '88% accuracy',
      headerColor: '#e21b3c',
      category: 'Privacy Management',
      completed: true,
      score: 88
    },
    {
      id: 'act-4',
      title: 'Multi-Tenant Data Isolation & Security',
      instructor: 'Prof. Roel Traballo',
      questionsCount: '12 Qs',
      accuracy: 'Assigned (Due in 3d)',
      headerColor: '#772ce8',
      category: 'Database Security',
      completed: false,
      score: null
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

  // Kahoot 4-tile choices styling
  const kahootTiles = [
    { key: 0, symbol: '▲', colorClass: 'tile-red', bg: '#e21b3c', shadow: '#a1122a' },
    { key: 1, symbol: '◆', colorClass: 'tile-blue', bg: '#1368ce', shadow: '#0c478f' },
    { key: 2, symbol: '●', colorClass: 'tile-yellow', bg: '#d89e00', shadow: '#9e7300' },
    { key: 3, symbol: '■', colorClass: 'tile-green', bg: '#26890c', shadow: '#185a08' }
  ];

  const currentQ = QUIZ_QUESTIONS[currentQuestionIndex] || QUIZ_QUESTIONS[0];

  const handleStartQuiz = () => {
    setActiveQuizRunning(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnsweredState(null);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  const handleAnswerSelect = (optionIndex) => {
    if (answeredState !== null) return;
    setSelectedAnswer(optionIndex);

    const isCorrect = optionIndex === currentQ.correctAnswer;
    setAnsweredState(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      setQuizScore(prev => prev + 100);
      setPoints(prev => prev + 100);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex + 1 < QUIZ_QUESTIONS.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setAnsweredState(null);
    } else {
      setQuizCompleted(true);
      if (currentUser?.id) {
        await submitQuizScore(currentUser.id, quizScore + (answeredState === 'correct' ? 100 : 0));
      }
    }
  };

  return (
    <div className="dashboard-content-layout">
      {/* 1. QUEST & RECENT ACTIVITIES (WAYGROUND / QUIZIZZ DASHBOARD) */}
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
                />
                <button 
                  className="btn-tactile btn-tactile-purple btn-pin-enter"
                  onClick={() => handleStartQuiz()}
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

              <div className="hero-stat-card points-card">
                <Coins size={32} className="coin-spin" />
                <div className="hero-stat-info">
                  <div className="hero-stat-value">{points.toLocaleString()}</div>
                  <div className="hero-stat-label">TOTAL XP COINS</div>
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
              {assignedActivities.map((act) => (
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
                        className="btn-tactile btn-tactile-purple btn-sm"
                        onClick={handleStartQuiz}
                      >
                        <span>{act.completed ? 'Replay' : 'Play Quest'}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Badges Showcase */}
          <div className="wayground-section-block">
            <div className="section-title-row">
              <div className="section-title-left">
                <Trophy size={20} className="text-gold" />
                <h3>Your Earned Badges</h3>
              </div>
              <button className="view-all-link" onClick={() => {}}>View All ({earnedBadges.length})</button>
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

      {/* 2. KAHOOT INTERACTIVE QUIZ MODAL / VIEW */}
      {(activeSubView === 'trainee_quiz' || activeQuizRunning) && (
        <div className="kahoot-quiz-experience">
          {!quizCompleted ? (
            <div className="kahoot-arena card-gamified">
              {/* Question Header & Points Bar */}
              <div className="kahoot-arena-top">
                <div className="arena-meta-left">
                  <span className="badge-gamified badge-purple">
                    Question {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}
                  </span>
                  <span className="badge-gamified badge-gold">
                    <Coins size={12} /> Score: {quizScore} XP
                  </span>
                </div>

                <button 
                  className="btn-tactile btn-tactile-ghost btn-sm"
                  onClick={() => setActiveQuizRunning(false)}
                >
                  Exit Quiz
                </button>
              </div>

              {/* Big Kahoot Question Card */}
              <div className="kahoot-question-box">
                <h2>{currentQ.question}</h2>
              </div>

              {/* 4 Colored Kahoot Answer Tiles */}
              <div className="kahoot-tiles-grid">
                {currentQ.options.map((opt, idx) => {
                  const tileStyle = kahootTiles[idx];
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === currentQ.correctAnswer;
                  let feedbackClass = '';
                  
                  if (answeredState !== null) {
                    if (isCorrect) feedbackClass = 'tile-correct';
                    else if (isSelected) feedbackClass = 'tile-wrong';
                    else feedbackClass = 'tile-dimmed';
                  }

                  return (
                    <button
                      key={idx}
                      className={`kahoot-tile-button ${tileStyle.colorClass} ${feedbackClass}`}
                      style={{ backgroundColor: tileStyle.bg }}
                      onClick={() => handleAnswerSelect(idx)}
                      disabled={answeredState !== null}
                    >
                      <span className="tile-symbol">{tileStyle.symbol}</span>
                      <span className="tile-text">{opt}</span>
                      {answeredState !== null && isCorrect && (
                        <CheckCircle2 size={24} className="tile-feedback-icon" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Drawer (Kahoot / Quizizz explanation) */}
              {answeredState !== null && (
                <div className={`kahoot-feedback-banner ${answeredState === 'correct' ? 'banner-correct' : 'banner-wrong'}`}>
                  <div className="feedback-left">
                    <div className="feedback-headline">
                      {answeredState === 'correct' ? '🎉 Awesome! That is Correct!' : '❌ Not quite right!'}
                    </div>
                    <div className="feedback-explanation">
                      {currentQ.explanation}
                    </div>
                  </div>

                  <button
                    className="btn-tactile btn-tactile-gold btn-next-q"
                    onClick={handleNextQuestion}
                  >
                    <span>{currentQuestionIndex + 1 < QUIZ_QUESTIONS.length ? 'Next Question' : 'View Results'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Quiz Completion Screen */
            <div className="kahoot-results-card card-gamified">
              <Trophy size={64} className="trophy-victory text-gold" />
              <h2>Quest Completed!</h2>
              <p className="text-secondary text-sm">
                You've mastered this knowledge challenge and earned XP coins.
              </p>

              <div className="results-xp-box">
                <div className="result-xp-value">+{quizScore} XP</div>
                <div className="result-xp-label">EXPERIENCE POINTS ADDED</div>
              </div>

              <div className="flex-align gap-12 mt-16">
                <button 
                  className="btn-tactile btn-tactile-purple"
                  onClick={handleStartQuiz}
                >
                  <RotateCcw size={16} />
                  <span>Play Again</span>
                </button>
                <button 
                  className="btn-tactile btn-tactile-gold"
                  onClick={() => setActiveQuizRunning(false)}
                >
                  <span>Back to Quests</span>
                </button>
              </div>
            </div>
          )}
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
