import React, { useState } from 'react';
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

  // Assigned Quizzes (Inspired directly by Wayground / Quizizz screenshot)
  const assignedActivities = [
    {
      id: 'act-1',
      title: 'ISO/IEC 27001 Security Audit Challenge',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '15 Qs',
      accuracy: '94% accuracy',
      headerColor: '#1368ce', // Blue
      category: 'Information Security',
      completed: true,
      score: 94
    },
    {
      id: 'act-2',
      title: 'CP-ABE Attribute Policies & Decryption',
      instructor: 'Dr. Sarah Jenkins',
      questionsCount: '10 Qs',
      accuracy: '100% accuracy',
      headerColor: '#06d6a0', // Teal / Green
      category: 'Cryptography',
      completed: true,
      score: 100
    },
    {
      id: 'act-3',
      title: 'Privacy Impact Assessment (PIA) Simulation',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '20 Qs',
      accuracy: '88% accuracy',
      headerColor: '#e21b3c', // Red
      category: 'ISO/IEC 27701',
      completed: true,
      score: 88
    },
    {
      id: 'act-4',
      title: 'PostgreSQL RLS & Cross-Client Isolation',
      instructor: 'Prof. Roel Traballo',
      questionsCount: '12 Qs',
      accuracy: 'Assigned (Due in 3d)',
      headerColor: '#772ce8', // Purple
      category: 'Database Security',
      completed: false,
      score: null
    }
  ];

  const earnedBadges = [
    { id: 'first_step', name: 'First Step', icon: '🚀', desc: 'Completed orientation modules', tier: 'Bronze' },
    { id: 'sec_champ', name: 'Security Champion', icon: '🛡️', desc: 'Aced ISO/IEC 27001 Assessment', tier: 'Gold' },
    { id: 'streak_master', name: '7-Day Streak', icon: '🔥', desc: 'Active training 7 consecutive days', tier: 'Ruby' },
    { id: 'crypto_knight', name: 'CP-ABE Decoder', icon: '⚡', desc: 'Verified policy attribute satisfaction', tier: 'Diamond' }
  ];

  const certificates = [
    {
      id: 'cert-01',
      title: 'ISO/IEC 27001 Lead Implementer',
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

  const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];

  const handleTileClick = (index) => {
    if (answeredState !== null) return; // Prevent multiple clicks

    setSelectedAnswer(index);
    const isCorrect = index === currentQ.answer;

    if (isCorrect) {
      setAnsweredState('correct');
      setQuizScore(prev => prev + 1);
      setPoints(prev => prev + 150);
    } else {
      setAnsweredState('wrong');
    }

    setTimeout(() => {
      if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setAnsweredState(null);
      } else {
        setQuizCompleted(true);
      }
    }, 1200);
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnsweredState(null);
    setQuizScore(0);
    setQuizCompleted(false);
    setActiveQuizRunning(true);
  };

  return (
    <div className="gamified-dashboard-container">
      {/* 1. TOP HERO: WAYGROUND / QUIZIZZ STYLE QUICK JOIN PIN BANNER */}
      {(activeSubView === 'trainee_quest' || !activeSubView) && (
        <>
          <div className="wayground-hero-card">
            <div className="hero-pattern-overlay" />
            <div className="wayground-hero-content">
              <div className="hero-logo-box">
                <span className="hero-title-main">CROSSQUEST</span>
                <span className="hero-title-sub">Gamified Security Training Arena</span>
              </div>

              {/* Pin Code Bar (Quizizz / Kahoot style) */}
              <div className="pin-join-bar">
                <input
                  type="text"
                  placeholder="Enter training quest code..."
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="pin-input"
                />
                <button 
                  className="btn-tactile btn-tactile-magenta pin-join-btn"
                  onClick={() => setActiveQuizRunning(true)}
                >
                  Join Quest
                </button>
                <div className="coin-sack-pill">
                  <Coins size={22} className="text-gold" />
                  <span className="coin-val">{points} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Activities & Quests Grid (Direct Wayground Reference) */}
          <div className="assigned-activities-section">
            <div className="section-title-row">
              <h3>Assigned Activities & Security Challenges</h3>
              <a href="#see-all" className="see-all-link">See all &gt;</a>
            </div>

            <div className="activity-cards-scroller">
              {/* Special Quest Booster Card */}
              <div className="special-quest-card" onClick={() => setActiveQuizRunning(true)}>
                <div className="quest-card-content">
                  <span className="quest-mini-label">EARN 1,000+ XP</span>
                  <div className="quest-big-title">CP-ABE QUESTS</div>
                  <div className="quest-coins-badge">
                    <Coins size={18} className="text-gold" />
                    <span>Daily XP Boost</span>
                  </div>
                  <button className="quest-cta-btn">
                    <span>Let's go!</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Activity Cards with Colorful Banners */}
              {assignedActivities.map((act) => (
                <div key={act.id} className="quizizz-activity-card">
                  <div className="card-top-color-band" style={{ backgroundColor: act.headerColor }}>
                    <div className="band-badge-row">
                      <span className="band-status-pill">{act.completed ? 'Completed' : 'Assigned'}</span>
                      <span className="band-qs-pill">{act.questionsCount}</span>
                    </div>
                    <div className="band-category-icon">
                      <Shield size={28} color="rgba(255,255,255,0.85)" />
                    </div>
                  </div>

                  <div className="activity-card-body">
                    <h4 className="activity-title">{act.title}</h4>
                    <p className="activity-instructor">{act.instructor}</p>

                    <div className="activity-card-footer">
                      <span className={`accuracy-pill ${act.completed ? 'acc-green' : 'acc-purple'}`}>
                        {act.accuracy}
                      </span>
                      <button 
                        className="btn-tactile btn-tactile-purple btn-play-activity"
                        onClick={() => setActiveQuizRunning(true)}
                      >
                        <Play size={13} /> Play
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 2. KAHOOT-STYLE INTERACTIVE QUIZ MODAL / VIEW */}
      {(activeSubView === 'trainee_quiz' || activeQuizRunning) && (
        <div className="kahoot-quiz-experience card-gamified">
          {!quizCompleted ? (
            <div className="kahoot-quiz-wrapper">
              {/* Question Header Bar */}
              <div className="kahoot-header-bar">
                <div className="kahoot-q-count">
                  <span>Question {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}</span>
                </div>
                <div className="kahoot-streak-badge">
                  <Flame size={18} className="text-amber" />
                  <span>Streak Bonus Active!</span>
                </div>
                {activeQuizRunning && (
                  <button className="btn-tactile btn-tactile-ghost btn-sm" onClick={() => setActiveQuizRunning(false)}>
                    Exit Arena
                  </button>
                )}
              </div>

              {/* Question Box */}
              <div className="kahoot-question-box">
                <h2>{currentQ.question}</h2>
              </div>

              {/* Instant Feedback Notice */}
              {answeredState && (
                <div className={`answer-feedback-banner ${answeredState}`}>
                  {answeredState === 'correct' ? (
                    <div className="flex-align gap-8">
                      <CheckCircle2 size={24} />
                      <span>CORRECT! +150 XP AWARDED</span>
                    </div>
                  ) : (
                    <div className="flex-align gap-8">
                      <AlertCircle size={24} />
                      <span>INCORRECT! Reviewing Annex A Controls</span>
                    </div>
                  )}
                </div>
              )}

              {/* Kahoot 4-Tile Answer Choices Grid (Iconic Red, Blue, Yellow, Green) */}
              <div className="kahoot-tiles-grid">
                {currentQ.options.map((optionText, idx) => {
                  const tile = kahootTiles[idx];
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === currentQ.answer;

                  return (
                    <button
                      key={idx}
                      className={`kahoot-tile-button ${tile.colorClass} ${isSelected ? 'tile-selected' : ''}`}
                      onClick={() => handleTileClick(idx)}
                      disabled={answeredState !== null}
                    >
                      <div className="tile-symbol">{tile.symbol}</div>
                      <div className="tile-text">{optionText}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Celebration Screen when Quiz Completed */
            <div className="kahoot-celebration-screen">
              <div className="celebration-confetti-badge">
                <Trophy size={64} className="text-gold" />
              </div>
              <h2 className="celebration-title">PODIUM FINISH!</h2>
              <p className="celebration-sub">
                You mastered the challenge with <strong>{quizScore} / {QUIZ_QUESTIONS.length}</strong> correct answers!
              </p>

              <div className="reward-xp-pill">
                <Coins size={24} className="text-gold" />
                <span>+{quizScore * 150} Total XP Earned</span>
              </div>

              <div className="flex-align gap-12 mt-16">
                <button className="btn-tactile btn-tactile-gold" onClick={handleRestartQuiz}>
                  <RotateCcw size={16} /> Play Again
                </button>
                <button className="btn-tactile btn-tactile-purple" onClick={() => setActiveQuizRunning(false)}>
                  Back to Quest Hub
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. EARNED BADGES SHOWCASE */}
      {activeSubView === 'trainee_badges' && (
        <div className="card-gamified p-24">
          <div className="section-title-row mb-16">
            <div>
              <h3>Earned Badges & Quest Achievements</h3>
              <p className="text-muted text-xs">Unlock shiny badges by proving your knowledge in CP-ABE and ISO controls.</p>
            </div>
          </div>

          <div className="badges-hex-grid">
            {earnedBadges.map((b) => (
              <div key={b.id} className="gamified-badge-tile">
                <div className="badge-tier-ribbon">{b.tier}</div>
                <div className="badge-big-icon">{b.icon}</div>
                <h4 className="badge-title">{b.name}</h4>
                <p className="badge-info">{b.desc}</p>
                <div className="badge-unlocked-tag">
                  <Check size={12} /> Unlocked
                </div>
              </div>
            ))}
            <div className="gamified-badge-tile locked">
              <div className="badge-big-icon">🔒</div>
              <h4 className="badge-title">Policy Grandmaster</h4>
              <p className="badge-info">Satisfy 5 complex multi-authority CP-ABE decryption challenges</p>
              <div className="badge-locked-tag">Locked</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CERTIFICATIONS & RENEWAL WATCH */}
      {activeSubView === 'trainee_certs' && (
        <div className="card-gamified p-24">
          <div className="section-title-row mb-16">
            <div>
              <h3>Verifiable Certificates & Renewal Alerts</h3>
              <p className="text-muted text-xs">Cryptographically signed credentials issued by Crossworks Corp.</p>
            </div>
          </div>

          <div className="client-cards-grid">
            {certificates.map((cert) => (
              <div key={cert.id} className="card-gamified p-20 cert-gamified-card">
                <div className="cert-top-bar">
                  <div className="flex-align gap-8">
                    <Award size={22} className="text-gold" />
                    <h4>{cert.title}</h4>
                  </div>
                  <span className={`badge-gamified ${cert.isRenewalApproaching ? 'badge-gold' : 'badge-green'}`}>
                    {cert.isRenewalApproaching ? 'Renewal Approaching' : 'Verified'}
                  </span>
                </div>

                <div className="cert-body-meta">
                  <div className="meta-line">
                    <span>Issued to:</span>
                    <strong>{currentUser.name}</strong>
                  </div>
                  <div className="meta-line">
                    <span>Organization:</span>
                    <strong>{cert.clientCompany}</strong>
                  </div>
                  <div className="meta-line">
                    <span>Valid Until:</span>
                    <strong>{cert.expiresOn} ({cert.daysUntilExpiry} days left)</strong>
                  </div>
                  <div className="meta-line">
                    <span>Digital Proof:</span>
                    <code>{cert.hash}</code>
                  </div>
                </div>

                {cert.isRenewalApproaching && (
                  <div className="renewal-warning-box">
                    <AlertCircle size={16} className="text-gold" />
                    <span>Recertification window is open! Complete the renewal quest to extend.</span>
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
