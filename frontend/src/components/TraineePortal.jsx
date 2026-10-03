import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Star, 
  CheckCircle, 
  Calendar, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  BookOpen,
  Check,
  Flame
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/mockData';

export default function TraineePortal() {
  // Gamification state
  const [points, setPoints] = useState(380);
  const [level, setLevel] = useState(4);
  const [streakDays, setStreakDays] = useState(7);
  const [earnedBadges, setEarnedBadges] = useState([
    { id: 'first_step', name: 'First Step', icon: '🚀', desc: 'Completed orientation modules' },
    { id: 'sec_champ', name: 'Security Champion', icon: '🛡️', desc: 'Aced ISO/IEC 27001 Assessment' }
  ]);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answersList, setAnswersList] = useState([]);

  // Certification lifecycle state
  const [certificates, setCertificates] = useState([
    {
      id: 'cert-01',
      title: 'ISO/IEC 27001 Lead Implementer',
      clientCompany: 'San Miguel Conglomerate Holdings',
      issuedOn: '2025-11-10',
      expiresOn: '2026-11-10',
      daysUntilExpiry: 38,
      isRenewalApproaching: true,
      status: 'active'
    },
    {
      id: 'cert-02',
      title: 'DevSecOps & Supply Chain Defense',
      clientCompany: 'San Miguel Conglomerate Holdings',
      issuedOn: '2026-04-15',
      expiresOn: '2027-04-15',
      daysUntilExpiry: 194,
      isRenewalApproaching: false,
      status: 'active'
    },
    {
      id: 'cert-03',
      title: 'Corporate Privacy Impact Assessment (PIA)',
      clientCompany: 'Maya FinTech Digital Innovations',
      issuedOn: '2024-02-01',
      expiresOn: '2025-02-01',
      daysUntilExpiry: -60,
      isRenewalApproaching: false,
      status: 'expired'
    }
  ]);

  // Handle quiz answer selection
  const handleSelectOption = (index) => {
    if (quizSubmitted) return;
    setSelectedAnswer(index);
  };

  const handleNextQuestion = () => {
    const isCorrect = selectedAnswer === QUIZ_QUESTIONS[currentQuestionIndex].answer;
    const newAnswers = [...answersList, { qIndex: currentQuestionIndex, selected: selectedAnswer, isCorrect }];
    setAnswersList(newAnswers);

    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }

    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setQuizSubmitted(false);
    } else {
      // Quiz finished
      const finalScore = (isCorrect ? quizScore + 1 : quizScore);
      const earnedXP = finalScore * 50;
      setPoints(prev => prev + earnedXP);
      setLevel(Math.floor((points + earnedXP) / 100) + 1);

      // Award badge if high score
      if (finalScore === QUIZ_QUESTIONS.length && !earnedBadges.some(b => b.id === 'quiz_master')) {
        setEarnedBadges(prev => [
          ...prev, 
          { id: 'quiz_master', name: 'Quiz Master', icon: '👑', desc: 'Achieved 100% on Security Assessment' }
        ]);
      }
      setQuizCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizCompleted(false);
    setAnswersList([]);
  };

  const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];
  const nextLevelXP = level * 100;
  const currentLevelXP = points % 100;

  return (
    <div className="trainee-portal-layout">
      {/* Gamification Hero Bar */}
      <div className="glass-panel trainee-hero">
        <div className="trainee-profile-info">
          <div className="trainee-avatar-wrap">
            <div className="trainee-avatar">JD</div>
            <div className="level-badge">Lvl {level}</div>
          </div>
          <div>
            <div className="flex-align gap-8">
              <h2 className="trainee-title">Juan Dela Cruz</h2>
              <span className="badge badge-cyan">Cybersecurity Specialist</span>
            </div>
            <p className="text-muted text-sm">
              Current Affiliation: <strong>San Miguel Conglomerate Holdings</strong> (Historical records preserved)
            </p>
          </div>
        </div>

        {/* XP & Streak Stats */}
        <div className="trainee-xp-stats">
          <div className="stat-pill">
            <Flame className="text-amber" size={18} />
            <div>
              <div className="stat-value">{streakDays} Days</div>
              <div className="stat-sub">Study Streak</div>
            </div>
          </div>

          <div className="stat-pill">
            <Trophy className="text-cyan" size={18} />
            <div>
              <div className="stat-value">{points} XP</div>
              <div className="stat-sub">Total Quest XP</div>
            </div>
          </div>
        </div>

        {/* Progress to Next Level */}
        <div className="level-progress-box">
          <div className="level-progress-labels">
            <span>Level {level} Explorer</span>
            <span>{currentLevelXP} / 100 XP to Level {level + 1}</span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ width: `${currentLevelXP}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Grid: Badges Showcase & Interactive Quiz */}
      <div className="trainee-grid">
        {/* Badges Gallery */}
        <div className="glass-panel badges-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <Award size={18} className="text-purple" /> Earned Quest Badges
              </h3>
              <p className="section-desc">Milestone badges earned across Crossworks training engagements.</p>
            </div>
          </div>

          <div className="badges-gallery">
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="badge-item pulse-glow">
                <div className="badge-icon-emoji">{badge.icon}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-desc">{badge.desc}</div>
              </div>
            ))}
            <div className="badge-item locked">
              <div className="badge-icon-emoji">🔒</div>
              <div className="badge-name">Policy Architect</div>
              <div className="badge-desc">Pass all 5 advanced encryption scenarios</div>
            </div>
          </div>
        </div>

        {/* Interactive Knowledge Quest Quiz */}
        <div className="glass-panel quiz-card">
          <div className="section-header">
            <div>
              <h3 className="section-title">
                <Sparkles size={18} className="text-cyan" /> Training Knowledge Quest
              </h3>
              <p className="section-desc">Verify your understanding of CP-ABE, RLS, and Information Security.</p>
            </div>
            {!quizCompleted && (
              <span className="badge badge-cyan">
                Q {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}
              </span>
            )}
          </div>

          {!quizCompleted ? (
            <div className="quiz-content">
              <h4 className="quiz-question">{currentQ.question}</h4>
              <div className="quiz-options">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`quiz-option-btn ${selectedAnswer === i ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(i)}
                  >
                    <span className="option-index">{String.fromCharCode(65 + i)}</span>
                    <span className="option-text">{opt}</span>
                    {selectedAnswer === i && <Check size={16} className="text-cyan" />}
                  </button>
                ))}
              </div>

              <div className="quiz-actions">
                <button
                  className="btn btn-primary"
                  disabled={selectedAnswer === null}
                  onClick={handleNextQuestion}
                >
                  <span>{currentQuestionIndex === QUIZ_QUESTIONS.length - 1 ? 'Finish Quest' : 'Next Question'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="quiz-results-card">
              <Trophy size={48} className="text-amber" />
              <h3>Quest Complete!</h3>
              <p className="text-muted">
                You scored <strong>{quizScore} / {QUIZ_QUESTIONS.length}</strong>!
              </p>
              <div className="xp-award-badge">
                +{quizScore * 50} XP Awarded
              </div>
              <button className="btn btn-secondary mt-16" onClick={handleRestartQuiz}>
                <RotateCcw size={14} /> Retry Quest
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Certification Lifecycle Tracking Section */}
      <section className="glass-panel cert-lifecycle-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">
              <Calendar size={18} className="text-emerald" /> Certification Lifecycle & Renewal Monitoring
            </h3>
            <p className="section-desc">
              CrossQuest monitors issuance, expiry, and flags credentials nearing their renewal window.
            </p>
          </div>
        </div>

        <div className="certs-grid">
          {certificates.map((cert) => (
            <div 
              key={cert.id} 
              className={`cert-card ${cert.isRenewalApproaching ? 'nearing-renewal' : ''}`}
            >
              <div className="cert-top">
                <div className="cert-title-group">
                  <BookOpen size={16} className="text-cyan" />
                  <h4>{cert.title}</h4>
                </div>
                <span className={`badge ${
                  cert.status === 'expired' 
                    ? 'badge-rose' 
                    : cert.isRenewalApproaching 
                    ? 'badge-amber' 
                    : 'badge-emerald'
                }`}>
                  {cert.status === 'expired' ? 'Expired' : cert.isRenewalApproaching ? 'Renewal Approaching' : 'Active'}
                </span>
              </div>

              <div className="cert-company text-sm text-dim">
                Organization at Issuance: <strong>{cert.clientCompany}</strong>
              </div>

              <div className="cert-dates">
                <div>
                  <span className="text-dim text-xs">Issued On</span>
                  <div>{cert.issuedOn}</div>
                </div>
                <div>
                  <span className="text-dim text-xs">Expires On</span>
                  <div>{cert.expiresOn}</div>
                </div>
                <div>
                  <span className="text-dim text-xs">Days Remaining</span>
                  <div className={cert.isRenewalApproaching ? 'text-amber font-bold' : ''}>
                    {cert.daysUntilExpiry > 0 ? `${cert.daysUntilExpiry} days` : '0 days'}
                  </div>
                </div>
              </div>

              {cert.isRenewalApproaching && (
                <div className="renewal-alert-bar">
                  <AlertCircle size={14} />
                  <span>Renewal Window Open: Schedule recertification module with Crossworks.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
