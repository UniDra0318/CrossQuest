import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Clock, 
  Target, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  AlertTriangle, 
  Layers, 
  Award, 
  Play, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  HelpCircle, 
  Zap, 
  Sparkles,
  Trophy
} from 'lucide-react';
import QuizDiagram from './QuizDiagram';

const KAHOOT_TILES = [
  { key: 0, symbol: '▲', colorClass: 'tile-red', bg: '#e21b3c', shadow: '#a1122a' },
  { key: 1, symbol: '◆', colorClass: 'tile-blue', bg: '#1368ce', shadow: '#0c478f' },
  { key: 2, symbol: '●', colorClass: 'tile-yellow', bg: '#d89e00', shadow: '#9e7300' },
  { key: 3, symbol: '■', colorClass: 'tile-green', bg: '#26890c', shadow: '#185a08' }
];

export default function QuizArena({ quiz, initialSession, onFinish, onExit }) {
  // State: 'briefing' | 'active' | 'completed'
  const [stage, setStage] = useState(() => {
    if (initialSession && initialSession.stage) return initialSession.stage;
    return 'briefing';
  });

  const [currentIndex, setCurrentIndex] = useState(() => initialSession?.currentIndex || 0);
  const [correctCount, setCorrectCount] = useState(() => initialSession?.correctCount || 0);
  const [answeredState, setAnsweredState] = useState(null); // 'correct' | 'wrong' | null
  const [selectedOption, setSelectedOption] = useState(null);
  const [identificationInput, setIdentificationInput] = useState('');
  
  // Interactive sequence ordering state
  const [sequenceItems, setSequenceItems] = useState(() => {
    const q = quiz.questions[currentIndex];
    return q && q.type === 'sequence_order' ? [...(q.initialOrder || q.correctOrder)] : [];
  });

  const [timeLeft, setTimeLeft] = useState(() => initialSession?.timeLeft || quiz.timePerQuestion || 45);
  const [floatingPoint, setFloatingPoint] = useState(null);
  const [pointsTotal, setPointsTotal] = useState(() => initialSession?.pointsTotal || 0);
  const timerRef = useRef(null);

  const currentQ = quiz.questions[currentIndex] || quiz.questions[0];
  const totalQuestions = quiz.questions.length;

  // Auto-save session progress to localStorage on any state change
  const saveProgress = (overrides = {}) => {
    const session = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      stage,
      currentIndex,
      correctCount,
      timeLeft,
      pointsTotal,
      savedAt: Date.now(),
      ...overrides
    };
    try {
      localStorage.setItem('crossquest_quiz_session', JSON.stringify(session));
    } catch (e) {
      console.warn("Could not save quiz session to localStorage:", e);
    }
  };

  // Setup sequence items when question changes
  useEffect(() => {
    if (currentQ && currentQ.type === 'sequence_order') {
      setSequenceItems([...(currentQ.initialOrder || currentQ.correctOrder)]);
    }
    setIdentificationInput('');
    setSelectedOption(null);
    setAnsweredState(null);
    setTimeLeft(quiz.timePerQuestion || 45);
  }, [currentIndex]);

  // Countdown Timer
  useEffect(() => {
    if (stage !== 'active' || answeredState !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [stage, currentIndex, answeredState]);

  const handleTimeExpire = () => {
    if (answeredState !== null) return;
    setAnsweredState('wrong');
    saveProgress({ answeredState: 'wrong', timeLeft: 0 });
  };

  const handleStartAssessment = () => {
    setStage('active');
    setCurrentIndex(0);
    setCorrectCount(0);
    setPointsTotal(0);
    saveProgress({ stage: 'active', currentIndex: 0, correctCount: 0, pointsTotal: 0 });
  };

  const handleMultipleChoiceSelect = (optionIdx) => {
    if (answeredState !== null) return;
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === currentQ.correctAnswer;
    evaluateAnswer(isCorrect);
  };

  const handleIdentificationSubmit = (e) => {
    e.preventDefault();
    if (answeredState !== null || !identificationInput.trim()) return;

    const normalized = identificationInput.trim().toLowerCase();
    const isCorrect = (currentQ.acceptedAnswers || []).some(ans => 
      normalized === ans.toLowerCase() || normalized.includes(ans.toLowerCase())
    );

    evaluateAnswer(isCorrect);
  };

  const moveSequenceItem = (index, direction) => {
    if (answeredState !== null) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sequenceItems.length) return;

    const updated = [...sequenceItems];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSequenceItems(updated);
  };

  const handleSequenceVerify = () => {
    if (answeredState !== null) return;
    const isCorrect = JSON.stringify(sequenceItems) === JSON.stringify(currentQ.correctOrder);
    evaluateAnswer(isCorrect);
  };

  const evaluateAnswer = (isCorrect) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (isCorrect) {
      setAnsweredState('correct');
      const timeBonus = Math.max(0, timeLeft * 5);
      const questionPoints = 200 + timeBonus;
      const nextCorrect = correctCount + 1;
      const nextPoints = pointsTotal + questionPoints;

      setCorrectCount(nextCorrect);
      setPointsTotal(nextPoints);
      setFloatingPoint(`+${questionPoints} PTS!`);
      setTimeout(() => setFloatingPoint(null), 1200);

      saveProgress({ 
        correctCount: nextCorrect, 
        pointsTotal: nextPoints, 
        answeredState: 'correct' 
      });
    } else {
      setAnsweredState('wrong');
      saveProgress({ answeredState: 'wrong' });
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < totalQuestions) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      saveProgress({ currentIndex: nextIdx, answeredState: null });
    } else {
      // Quiz Finished!
      setStage('completed');
      localStorage.removeItem('crossquest_quiz_session');
      const finalAccuracy = Math.round((correctCount / totalQuestions) * 100);
      if (onFinish) {
        onFinish({
          quizId: quiz.id,
          accuracy: finalAccuracy,
          correctCount,
          totalQuestions,
          pointsEarned: pointsTotal,
          passed: finalAccuracy >= (quiz.passingScore || 80)
        });
      }
    }
  };

  const handleAbandon = () => {
    if (window.confirm("Do you want to pause and exit? Your progress is saved so you can resume right where you left off.")) {
      saveProgress();
      if (onExit) onExit();
    }
  };

  const accuracyPct = Math.round((correctCount / Math.max(1, currentIndex + (answeredState ? 1 : 0))) * 100);
  const finalScorePct = Math.round((correctCount / totalQuestions) * 100);

  // ==========================================
  // STAGE 1: PRE-QUIZ BRIEFING SCREEN
  // ==========================================
  if (stage === 'briefing') {
    return (
      <div className="quiz-fullscreen-wrapper">
        <div className="quiz-briefing-modal card-gamified">
          <div className="briefing-header-bar" style={{ backgroundColor: quiz.headerColor }}>
            <span className="briefing-category-tag">{quiz.category}</span>
            <h1 className="briefing-title">{quiz.title}</h1>
            <p className="briefing-instructor">Supervised by: {quiz.instructor}</p>
          </div>

          <div className="briefing-body">
            <div className="briefing-section">
              <h3>Scenario & Assessment Background</h3>
              <p className="briefing-desc">{quiz.description}</p>
            </div>

            <div className="briefing-metrics-grid">
              <div className="briefing-stat-tile">
                <Target size={20} className="text-purple" />
                <div className="stat-num">{totalQuestions} Questions</div>
                <div className="stat-label">Assessment Items</div>
              </div>

              <div className="briefing-stat-tile">
                <Clock size={20} className="text-cyan" />
                <div className="stat-num">{quiz.timePerQuestion}s / Item</div>
                <div className="stat-label">Countdown Timer</div>
              </div>

              <div className="briefing-stat-tile">
                <Award size={20} className="text-gold" />
                <div className="stat-num">{quiz.passingScore}% Needed</div>
                <div className="stat-label">Passing Standard</div>
              </div>

              <div className="briefing-stat-tile">
                <Shield size={20} className="text-green" />
                <div className="stat-num">Zero-Trust</div>
                <div className="stat-label">Security Focus</div>
              </div>
            </div>

            <div className="briefing-protection-alert">
              <Sparkles size={16} className="text-gold" />
              <div>
                <strong>Auto-Save Disruption Protection:</strong> If you experience a lost connection, power cut, or accidental browser closure, your answers and question progress are saved automatically so you can resume immediately without penalty.
              </div>
            </div>

            <div className="briefing-actions">
              <button 
                className="btn-tactile btn-tactile-purple btn-begin-quiz"
                onClick={handleStartAssessment}
              >
                <Play size={18} />
                <span>Begin Assessment Now</span>
              </button>
              <button 
                className="btn-tactile btn-tactile-ghost"
                onClick={onExit}
              >
                Cancel & Return
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STAGE 3: RESULTS / COMPLETION SCREEN
  // ==========================================
  if (stage === 'completed') {
    const passed = finalScorePct >= (quiz.passingScore || 80);

    return (
      <div className="quiz-fullscreen-wrapper">
        <div className="quiz-results-modal card-gamified">
          <Trophy size={64} className="trophy-victory text-gold" />
          <h2 className="results-heading">
            {passed ? '🎉 Assessment Passed & Certified!' : 'Assessment Completed'}
          </h2>
          <p className="results-subtext">
            {passed 
              ? 'Congratulations! You have satisfied corporate compliance criteria and earned training credit.'
              : 'You have completed the module. Review the explanations below to improve your score standard.'}
          </p>

          <div className="results-stat-band">
            <div className="result-metric">
              <div className="metric-big-num text-purple">{finalScorePct}%</div>
              <div className="metric-tag">Final Accuracy ({correctCount}/{totalQuestions})</div>
            </div>

            <div className="result-metric">
              <div className="metric-big-num text-gold">+{pointsTotal}</div>
              <div className="metric-tag">Points & Speed Bonus</div>
            </div>

            <div className="result-metric">
              <div className={`metric-big-num ${passed ? 'text-green' : 'text-amber'}`}>
                {passed ? 'QUALIFIED' : 'REVIEW'}
              </div>
              <div className="metric-tag">Requirement Standard</div>
            </div>
          </div>

          <div className="flex-align gap-14 mt-20">
            <button 
              className="btn-tactile btn-tactile-purple"
              onClick={handleStartAssessment}
            >
              <RotateCcw size={16} />
              <span>Retake Assessment</span>
            </button>
            <button 
              className="btn-tactile btn-tactile-gold"
              onClick={onExit}
            >
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STAGE 2: ACTIVE FOCUSED QUIZ ARENA (NO SIDEBAR / NO TOPBAR)
  // ==========================================
  return (
    <div className="quiz-fullscreen-wrapper">
      <div className="quiz-focused-arena card-gamified">
        {/* Top Control Bar */}
        <div className="arena-top-control-bar">
          <div className="arena-left-meta">
            <span className="badge-gamified badge-purple">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="badge-gamified badge-gold">
              Accuracy: {correctCount} / {Math.max(1, currentIndex + (answeredState ? 1 : 0))} ({accuracyPct}%)
            </span>
            <span className="points-pill-top">
              <Zap size={13} className="text-gold" /> {pointsTotal} PTS
            </span>
          </div>

          {/* Real-time Countdown Timer */}
          <div className="arena-center-timer">
            <div className={`countdown-timer-chip ${timeLeft <= 10 ? 'timer-critical' : ''}`}>
              <Clock size={16} />
              <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
            </div>
          </div>

          <div className="arena-right-actions">
            {floatingPoint && (
              <div className="floating-points-pill">{floatingPoint}</div>
            )}
            <button 
              className="btn-tactile btn-tactile-ghost btn-sm"
              onClick={handleAbandon}
              title="Pause and save current progress"
            >
              Pause & Exit
            </button>
          </div>
        </div>

        {/* Progress Bar Line */}
        <div className="arena-progress-track">
          <div 
            className="arena-progress-fill" 
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Question Area Box */}
        <div className="arena-question-container">
          {/* Question Type Tag */}
          <div className="question-type-indicator">
            {currentQ.type === 'multiple_choice' && <span className="type-tag tag-choice">Multiple Choice (Select 1 of 4)</span>}
            {currentQ.type === 'identification' && <span className="type-tag tag-input">Identification (Type the term)</span>}
            {currentQ.type === 'sequence_order' && <span className="type-tag tag-sequence">Interactive Sequence Ordering</span>}
            {currentQ.type === 'diagram_analysis' && <span className="type-tag tag-diagram">Architecture Diagram Analysis</span>}
          </div>

          {/* Diagram render if applicable */}
          {currentQ.type === 'diagram_analysis' && currentQ.diagramType && (
            <QuizDiagram type={currentQ.diagramType} />
          )}

          <div className="arena-question-heading">
            <h2>{currentQ.question}</h2>
          </div>

          {/* 1. MULTIPLE CHOICE OR DIAGRAM CHOICES */}
          {(currentQ.type === 'multiple_choice' || currentQ.type === 'diagram_analysis') && (
            <div className="kahoot-tiles-grid">
              {currentQ.options.map((opt, idx) => {
                const tileStyle = KAHOOT_TILES[idx % 4];
                const isSelected = selectedOption === idx;
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
                    onClick={() => handleMultipleChoiceSelect(idx)}
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
          )}

          {/* 2. IDENTIFICATION / TERM INPUT */}
          {currentQ.type === 'identification' && (
            <form onSubmit={handleIdentificationSubmit} className="identification-form-box">
              <div className="identification-input-row">
                <input
                  type="text"
                  className="identification-input"
                  placeholder={currentQ.placeholder || "Enter your answer here..."}
                  value={identificationInput}
                  onChange={(e) => setIdentificationInput(e.target.value)}
                  disabled={answeredState !== null}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn-tactile btn-tactile-purple btn-ident-submit"
                  disabled={answeredState !== null || !identificationInput.trim()}
                >
                  <span>Submit Answer</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* 3. SEQUENCE ORDERING / DRAG-AND-DROP REORDER */}
          {currentQ.type === 'sequence_order' && (
            <div className="sequence-reorder-container">
              <div className="sequence-items-list">
                {sequenceItems.map((itemText, idx) => (
                  <div key={idx} className="sequence-item-row">
                    <span className="seq-step-badge">{idx + 1}</span>
                    <span className="seq-step-text">{itemText}</span>
                    {answeredState === null && (
                      <div className="seq-controls">
                        <button 
                          className="seq-arrow-btn"
                          disabled={idx === 0}
                          onClick={() => moveSequenceItem(idx, 'up')}
                          title="Move up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button 
                          className="seq-arrow-btn"
                          disabled={idx === sequenceItems.length - 1}
                          onClick={() => moveSequenceItem(idx, 'down')}
                          title="Move down"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {answeredState === null && (
                <div className="sequence-action-row">
                  <button
                    className="btn-tactile btn-tactile-purple"
                    onClick={handleSequenceVerify}
                  >
                    <Check size={16} />
                    <span>Verify & Submit Order</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Feedback Drawer */}
          {answeredState !== null && (
            <div className={`kahoot-feedback-banner ${answeredState === 'correct' ? 'banner-correct' : 'banner-wrong'}`}>
              <div className="feedback-left">
                <div className="feedback-headline">
                  {answeredState === 'correct' 
                    ? '🎉 Correct! That is right!' 
                    : '❌ Incorrect or Time Expired'}
                </div>
                <div className="feedback-explanation">
                  {currentQ.explanation}
                </div>
              </div>

              <button
                className="btn-tactile btn-tactile-gold btn-next-q"
                onClick={handleNextQuestion}
              >
                <span>{currentIndex + 1 < totalQuestions ? 'Next Question' : 'View Final Results'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
