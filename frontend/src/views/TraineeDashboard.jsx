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
  Shield
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';

export default function TraineeDashboard({ activeSubView }) {
  const { currentUser } = useAuth();
  const [points, setPoints] = useState(380);
  const [level, setLevel] = useState(4);
  const [streakDays, setStreakDays] = useState(7);
  const [earnedBadges, setEarnedBadges] = useState([
    { id: 'first_step', name: 'First Step', icon: '🚀', desc: 'Completed orientation modules', date: 'Earned Sep 2026' },
    { id: 'sec_champ', name: 'Security Champion', icon: '🛡️', desc: 'Aced ISO/IEC 27001 Assessment', date: 'Earned Oct 2026' }
  ]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const certificates = [
    {
      id: 'cert-01',
      title: 'ISO/IEC 27001 Information Security Lead Implementer',
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
    }
  ];

  const handleSelectOption = (index) => {
    setSelectedAnswer(index);
  };

  const handleNextQuestion = () => {
    const isCorrect = selectedAnswer === QUIZ_QUESTIONS[currentQuestionIndex].answer;
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }

    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      const finalScore = isCorrect ? quizScore + 1 : quizScore;
      const earnedXP = finalScore * 50;
      setPoints(prev => prev + earnedXP);
      setLevel(Math.floor((points + earnedXP) / 100) + 1);

      if (finalScore === QUIZ_QUESTIONS.length && !earnedBadges.some(b => b.id === 'quiz_master')) {
        setEarnedBadges(prev => [
          ...prev,
          { id: 'quiz_master', name: 'Quiz Master', icon: '👑', desc: 'Achieved 100% on Security Assessment', date: 'Earned Just Now' }
        ]);
      }
      setQuizCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];
  const currentLevelXP = points % 100;

  return (
    <div className="dashboard-content-layout">
      {/* 1. QUEST & PROGRESS SUB-VIEW */}
      {(activeSubView === 'trainee_quest' || !activeSubView) && (
        <>
          <div className="card trainee-hero">
            <div className="trainee-profile-info">
              <div className="trainee-avatar">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="flex-align gap-8">
                  <h2 className="trainee-title">{currentUser.name}</h2>
                  <span className="badge badge-blue">Lvl {level} Analyst</span>
                </div>
                <p className="text-secondary text-xs">
                  Company Affiliation: <strong>{currentUser.organization}</strong>
                </p>
              </div>
            </div>

            <div className="trainee-xp-stats">
              <div className="stat-pill">
                <Flame size={16} className="text-amber" />
                <div>
                  <div className="stat-value">{streakDays} Days</div>
                  <div className="stat-sub">Study Streak</div>
                </div>
              </div>

              <div className="stat-pill">
                <Trophy size={16} className="text-cyan" />
                <div>
                  <div className="stat-value">{points} XP</div>
                  <div className="stat-sub">Total Quest XP</div>
                </div>
              </div>
            </div>

            <div className="level-progress-box">
              <div className="level-progress-labels">
                <span>Progress to Level {level + 1}</span>
                <span>{currentLevelXP} / 100 XP</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${currentLevelXP}%` }} />
              </div>
            </div>
          </div>

          <div className="dual-grid-section">
            <div className="card section-card">
              <div className="card-header-bar">
                <h3 className="card-title">Enrolled Course Curriculum</h3>
              </div>
              <div className="p-20">
                <div className="course-progress-item">
                  <div className="flex-between mb-8">
                    <strong>ISO/IEC 27001 Information Security Management</strong>
                    <span className="badge badge-green">Completed (94.5%)</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }} /></div>
                </div>

                <div className="course-progress-item mt-16">
                  <div className="flex-between mb-8">
                    <strong>DevSecOps Pipeline Security & CI/CD Guardrails</strong>
                    <span className="badge badge-green">Completed (98.0%)</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: '100%' }} /></div>
                </div>

                <div className="course-progress-item mt-16">
                  <div className="flex-between mb-8">
                    <strong>Corporate Threat Modeling & Incident Handling</strong>
                    <span className="badge badge-amber">In Progress (65%)</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: '65%' }} /></div>
                </div>
              </div>
            </div>

            <div className="card section-card">
              <div className="card-header-bar">
                <h3 className="card-title">Upcoming Renewal Deadlines</h3>
              </div>
              <div className="p-20">
                <div className="cert-card nearing-renewal">
                  <div className="cert-top">
                    <h4>ISO/IEC 27001 Lead Implementer</h4>
                    <span className="badge badge-amber">Renewal Window Open</span>
                  </div>
                  <div className="text-secondary text-xs mt-8">
                    Expires in <strong>38 days</strong>. Schedule recertification module with Crossworks.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. QUIZ QUEST SUB-VIEW */}
      {activeSubView === 'trainee_quiz' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Security & CP-ABE Knowledge Quest</h3>
              <p className="card-subtitle">
                Test your understanding of attribute-based access control and ISO standards.
              </p>
            </div>
            {!quizCompleted && (
              <span className="badge badge-blue">Question {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}</span>
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
              <p className="text-secondary">
                You scored <strong>{quizScore} / {QUIZ_QUESTIONS.length}</strong>!
              </p>
              <div className="xp-award-badge">
                +{quizScore * 50} XP Awarded
              </div>
              <button className="btn btn-secondary mt-16" onClick={handleRestart}>
                <RotateCcw size={14} /> Retry Quest
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. BADGES SUB-VIEW */}
      {activeSubView === 'trainee_badges' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Earned Competency Badges</h3>
              <p className="card-subtitle">
                Verified achievements issued for training milestones.
              </p>
            </div>
          </div>

          <div className="badges-gallery">
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="badge-item">
                <div className="badge-icon-emoji">{badge.icon}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-desc">{badge.desc}</div>
                <span className="text-xs text-secondary mt-4">{badge.date}</span>
              </div>
            ))}
            <div className="badge-item locked">
              <div className="badge-icon-emoji">🔒</div>
              <div className="badge-name">Policy Architect</div>
              <div className="badge-desc">Pass all 5 advanced encryption scenarios</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CERTS SUB-VIEW */}
      {activeSubView === 'trainee_certs' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">My Professional Certifications</h3>
              <p className="card-subtitle">
                Official credentials issued by Crossworks Training and Consulting.
              </p>
            </div>
          </div>

          <div className="certs-grid p-24">
            {certificates.map((cert) => (
              <div key={cert.id} className={`cert-card ${cert.isRenewalApproaching ? 'nearing-renewal' : ''}`}>
                <div className="cert-top">
                  <div className="cert-title-group">
                    <BookOpen size={16} className="text-cyan" />
                    <h4>{cert.title}</h4>
                  </div>
                  <span className={`badge ${cert.isRenewalApproaching ? 'badge-amber' : 'badge-green'}`}>
                    {cert.isRenewalApproaching ? 'Renewal Approaching' : 'Active'}
                  </span>
                </div>

                <div className="cert-company text-xs text-secondary">
                  Organization at Completion: <strong>{cert.clientCompany}</strong>
                </div>

                <div className="cert-dates">
                  <div>
                    <span className="text-secondary text-xs">Issued</span>
                    <div>{cert.issuedOn}</div>
                  </div>
                  <div>
                    <span className="text-secondary text-xs">Expires</span>
                    <div>{cert.expiresOn}</div>
                  </div>
                  <div>
                    <span className="text-secondary text-xs">Remaining</span>
                    <div className={cert.isRenewalApproaching ? 'text-amber font-bold' : ''}>
                      {cert.daysUntilExpiry} days
                    </div>
                  </div>
                </div>

                {cert.isRenewalApproaching && (
                  <div className="renewal-alert-bar">
                    <AlertCircle size={14} />
                    <span>Renewal Deadline Approaching: Recertify before expiry.</span>
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
