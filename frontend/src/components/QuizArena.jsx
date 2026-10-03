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
  Trophy,
  CheckCircle,
  FileText,
  Shuffle
} from 'lucide-react';
import QuizDiagram from './QuizDiagram';
import MatchingQuestion from './MatchingQuestion';

const KAHOOT_TILES = [
  { key: 0, symbol: '▲', colorClass: 'tile-red', bg: '#e21b3c', shadow: '#a1122a' },
  { key: 1, symbol: '◆', colorClass: 'tile-blue', bg: '#1368ce', shadow: '#0c478f' },
  { key: 2, symbol: '●', colorClass: 'tile-yellow', bg: '#d89e00', shadow: '#9e7300' },
  { key: 3, symbol: '■', colorClass: 'tile-green', bg: '#26890c', shadow: '#185a08' }
];

// Fisher-Yates array shuffle utility
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate randomized question sequence and randomized item choices
function prepareQuizQuestions(quiz, initialSession) {
  // If active session was restored from localStorage, retain its exact prepared questions array
  if (initialSession && Array.isArray(initialSession.preparedQuestions) && initialSession.preparedQuestions.length > 0) {
    return initialSession.preparedQuestions;
  }

  // 1. Shuffle overall question sequence
  const shuffled = shuffleArray(quiz.questions || []);

  // 2. Randomize items / choices within each question
  return shuffled.map((q) => {
    const cloned = JSON.parse(JSON.stringify(q));

    // Multiple choice or Diagram analysis: shuffle options and remap correctAnswer index
    if (cloned.type === 'multiple_choice' || cloned.type === 'diagram_analysis') {
      if (Array.isArray(cloned.options) && typeof cloned.correctAnswer === 'number') {
        const correctText = cloned.options[cloned.correctAnswer];
        cloned.options = shuffleArray(cloned.options);
        cloned.correctAnswer = cloned.options.indexOf(correctText);
      }
    }
    // Sequence order: dynamically scramble initialOrder ensuring it doesn't match solved state
    else if (cloned.type === 'sequence_order') {
      if (Array.isArray(cloned.correctOrder)) {
        let scrambled = shuffleArray(cloned.correctOrder);
        let tries = 0;
        while (tries < 5 && scrambled.every((item, idx) => item === cloned.correctOrder[idx])) {
          scrambled = shuffleArray(cloned.correctOrder);
          tries++;
        }
        cloned.initialOrder = scrambled;
      }
    }
    return cloned;
  });
}

export default function QuizArena({ quiz, initialSession, onFinish, onExit }) {
  // Prepared questions with randomized question order & randomized choices
  const [questions, setQuestions] = useState(() => prepareQuizQuestions(quiz, initialSession));

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
  
  // Interactive sequence ordering state & swap animation tracking
  const [sequenceItems, setSequenceItems] = useState(() => {
    const q = questions[currentIndex] || questions[0];
    return q && q.type === 'sequence_order' ? [...(q.initialOrder || q.correctOrder)] : [];
  });
  const [swappedIdx, setSwappedIdx] = useState(null);

  // Detailed answers history for post-quiz summary
  const [answersHistory, setAnswersHistory] = useState(() => initialSession?.answersHistory || {});

  const [timeLeft, setTimeLeft] = useState(() => initialSession?.timeLeft || quiz.timePerQuestion || 45);
  const [floatingPoint, setFloatingPoint] = useState(null);
  const [pointsTotal, setPointsTotal] = useState(() => initialSession?.pointsTotal || 0);
  const timerRef = useRef(null);

  const currentQ = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length;

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
      answersHistory,
      preparedQuestions: questions,
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
    evaluateAnswer(false, 'Time Expired');
  };

  const handleStartAssessment = () => {
    const freshlyPrepared = prepareQuizQuestions(quiz, null);
    setQuestions(freshlyPrepared);
    setStage('active');
    setCurrentIndex(0);
    setCorrectCount(0);
    setPointsTotal(0);
    setAnswersHistory({});
    saveProgress({ 
      stage: 'active', 
      currentIndex: 0, 
      correctCount: 0, 
      pointsTotal: 0, 
      answersHistory: {},
      preparedQuestions: freshlyPrepared
    });
  };

  const handleMultipleChoiceSelect = (optionIdx) => {
    if (answeredState !== null) return;
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === currentQ.correctAnswer;
    const userAns = currentQ.options[optionIdx];
    evaluateAnswer(isCorrect, userAns);
  };

  const handleIdentificationSubmit = (e) => {
    e.preventDefault();
    if (answeredState !== null || !identificationInput.trim()) return;

    const normalized = identificationInput.trim().toLowerCase();
    const isCorrect = (currentQ.acceptedAnswers || []).some(ans => 
      normalized === ans.toLowerCase() || normalized.includes(ans.toLowerCase())
    );

    evaluateAnswer(isCorrect, identificationInput.trim());
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

    // Trigger visual swap highlight animation
    setSwappedIdx(targetIdx);
    setTimeout(() => setSwappedIdx(null), 450);
  };

  const handleSequenceVerify = () => {
    if (answeredState !== null) return;
    const isCorrect = JSON.stringify(sequenceItems) === JSON.stringify(currentQ.correctOrder);
    const userAns = sequenceItems.map((s, i) => `${i + 1}. ${s}`).join(' ➔ ');
    evaluateAnswer(isCorrect, userAns);
  };

  const evaluateAnswer = (isCorrect, userAns) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let finalCorrect = correctCount;
    let finalPoints = pointsTotal;

    if (isCorrect) {
      setAnsweredState('correct');
      const timeBonus = Math.max(0, timeLeft * 5);
      const questionPoints = 200 + timeBonus;
      finalCorrect = correctCount + 1;
      finalPoints = pointsTotal + questionPoints;

      setCorrectCount(finalCorrect);
      setPointsTotal(finalPoints);
      setFloatingPoint(`+${questionPoints} PTS!`);
      setTimeout(() => setFloatingPoint(null), 1200);
    } else {
      setAnsweredState('wrong');
    }

    // Record question submission in answers history
    const correctAns = currentQ.type === 'multiple_choice' || currentQ.type === 'diagram_analysis'
      ? currentQ.options[currentQ.correctAnswer]
      : currentQ.type === 'identification'
      ? currentQ.acceptedAnswers[0]
      : currentQ.type === 'matching'
      ? currentQ.pairs.map((p, i) => `${i + 1}. ${p.left.replace(/^\d+\.\s*/, '')} ➔ ${p.right.replace(/^[A-Z]\.\s*/, '')}`).join(' | ')
      : currentQ.correctOrder.map((s, i) => `${i + 1}. ${s}`).join(' ➔ ');

    const newHistory = {
      ...answersHistory,
      [currentQ.id]: {
        questionId: currentQ.id,
        questionIndex: currentIndex + 1,
        questionText: currentQ.question,
        questionType: currentQ.type,
        userAnswer: userAns || 'No Answer',
        correctAnswer: correctAns,
        isCorrect: isCorrect,
        explanation: currentQ.explanation
      }
    };

    setAnswersHistory(newHistory);

    saveProgress({ 
      correctCount: finalCorrect, 
      pointsTotal: finalPoints, 
      answeredState: isCorrect ? 'correct' : 'wrong',
      answersHistory: newHistory
    });
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < totalQuestions) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      saveProgress({ currentIndex: nextIdx, answeredState: null });
    } else {
      // Quiz Finished! Transition to results stage within QuizArena
      // Keep trainee on results screen so they can review their score and full question summary
      setStage('completed');
      localStorage.removeItem('crossquest_quiz_session');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinishAndReturn = () => {
    const finalAccuracy = Math.round((correctCount / totalQuestions) * 100);
    if (onFinish) {
      onFinish({
        quizId: quiz.id,
        scorePercentage: finalAccuracy,
        accuracy: finalAccuracy,
        correctCount,
        totalQuestions,
        pointsEarned: pointsTotal,
        passed: finalAccuracy >= (quiz.passingScore || 80)
      });
    } else if (onExit) {
      onExit();
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
        <div className="briefing-card">
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
                <Target size={22} className="text-purple" />
                <div className="stat-num">{totalQuestions} Questions</div>
                <div className="stat-label">Assessment Items</div>
              </div>

              <div className="briefing-stat-tile">
                <Shuffle size={22} className="text-cyan" />
                <div className="stat-num">Randomized</div>
                <div className="stat-label">Questions & Choices</div>
              </div>

              <div className="briefing-stat-tile">
                <Clock size={22} className="text-purple" />
                <div className="stat-num">{quiz.timePerQuestion}s / Item</div>
                <div className="stat-label">Countdown Timer</div>
              </div>

              <div className="briefing-stat-tile">
                <Award size={22} className="text-gold" />
                <div className="stat-num">{quiz.passingScore}% Needed</div>
                <div className="stat-label">Passing Standard</div>
              </div>

              <div className="briefing-stat-tile">
                <Shield size={22} className="text-green" />
                <div className="stat-num">Zero-Trust</div>
                <div className="stat-label">Security Focus</div>
              </div>
            </div>

            <div className="briefing-protection-alert">
              <Sparkles size={18} className="text-emerald flex-shrink-0" />
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
  // STAGE 3: RESULTS & DETAILED SUMMARY SCREEN
  // ==========================================
  if (stage === 'completed') {
    const passed = finalScorePct >= (quiz.passingScore || 80);
    const historyList = Object.values(answersHistory);

    return (
      <div className="quiz-fullscreen-wrapper">
        <div className="results-card">
          <Trophy size={64} className="trophy-victory text-gold" />
          <h2 className="results-heading">
            {passed ? '🎉 Assessment Passed & Certified!' : 'Assessment Completed'}
          </h2>
          <p className="results-subtext">
            {passed 
              ? 'Congratulations! You have satisfied corporate compliance criteria and verified key competencies.'
              : 'You have completed the module. Review your answers and explanations below to prepare for retake.'}
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

          {/* QUESTION-BY-QUESTION REVIEW SUMMARY */}
          <div className="results-summary-section">
            <div className="results-summary-header">
              <div className="summary-title-group">
                <FileText size={20} className="text-purple" />
                <h3>Question-by-Question Assessment Summary</h3>
              </div>
              <span className="summary-score-chip">
                {correctCount} of {totalQuestions} Correct ({finalScorePct}%)
              </span>
            </div>

            <div className="results-summary-list">
              {questions.map((q, qIdx) => {
                const rec = answersHistory[q.id];
                const isCorrect = rec?.isCorrect;

                return (
                  <div key={q.id} className={`summary-item-card ${isCorrect ? 'item-correct' : 'item-wrong'}`}>
                    <div className="summary-item-top">
                      <div className="summary-q-meta">
                        <span className="summary-q-num">Q{qIdx + 1}</span>
                        <span className="summary-q-type-badge">
                          {q.type === 'multiple_choice' && 'Multiple Choice'}
                          {q.type === 'identification' && 'Identification'}
                          {q.type === 'sequence_order' && 'Sequence Reordering'}
                          {q.type === 'diagram_analysis' && 'Diagram Analysis'}
                          {q.type === 'matching' && 'Matching Pairs'}
                        </span>
                      </div>
                      <span className={`summary-status-tag ${isCorrect ? 'tag-correct' : 'tag-wrong'}`}>
                        {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span>{isCorrect ? 'Correct (+200 PTS)' : 'Incorrect (0 PTS)'}</span>
                      </span>
                    </div>

                    <div className="summary-q-text">{q.question}</div>

                    {q.imageUrl && (
                      <div className="summary-image-thumbnail-box">
                        <img src={q.imageUrl} alt="Reference Diagram" className="summary-thumbnail-img" />
                        {q.imageCaption && <span className="summary-thumbnail-caption">{q.imageCaption}</span>}
                      </div>
                    )}

                    <div className="summary-answers-grid">
                      <div className="summary-answer-col user-answer">
                        <span className="ans-label">Your Submitted Answer:</span>
                        <div className={`ans-value ${isCorrect ? 'ans-green' : 'ans-red'}`}>
                          {rec?.userAnswer || '(No answer provided)'}
                        </div>
                      </div>

                      {!isCorrect && (
                        <div className="summary-answer-col correct-answer">
                          <span className="ans-label">Correct Solution:</span>
                          <div className="ans-value ans-solution">
                            {rec?.correctAnswer}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="summary-explanation-box">
                      <div className="explanation-title">Explanation & Analysis:</div>
                      <p>{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="results-action-row">
            <button 
              className="btn-tactile btn-tactile-purple"
              onClick={handleStartAssessment}
            >
              <RotateCcw size={16} />
              <span>Retake Assessment</span>
            </button>
            <button 
              className="btn-tactile btn-tactile-gold"
              onClick={handleFinishAndReturn}
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
      <div className="quiz-arena-card">
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
            {currentQ.type === 'matching' && <span className="type-tag tag-matching">Connect Matching Pairs (Column A ➔ Column B)</span>}
          </div>

          {/* Diagram render if applicable */}
          {currentQ.type === 'diagram_analysis' && (
            <QuizDiagram 
              type={currentQ.diagramType} 
              customNodes={currentQ.customNodes}
              customTitle={currentQ.customTitle}
              imageUrl={currentQ.imageUrl || currentQ.diagramImage}
              imageCaption={currentQ.imageCaption}
            />
          )}

          {/* Attached Reference Image for Multiple Choice & other questions */}
          {currentQ.imageUrl && currentQ.type !== 'diagram_analysis' && (
            <div className="question-attached-image-wrapper">
              <div className="attached-image-frame">
                <img 
                  src={currentQ.imageUrl} 
                  alt={currentQ.imageCaption || 'Question Reference Graphic'} 
                  className="question-reference-img" 
                />
                {currentQ.imageCaption && (
                  <div className="question-image-caption">
                    <Sparkles size={12} className="text-purple flex-shrink-0" />
                    <span>{currentQ.imageCaption}</span>
                  </div>
                )}
              </div>
            </div>
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
              <div className="sequence-instructions">
                Use the <strong>Up (▲)</strong> and <strong>Down (▼)</strong> arrow buttons to reorder the items into the correct chronological or architectural sequence:
              </div>
              <div className="sequence-items-list">
                {sequenceItems.map((itemText, idx) => (
                  <div 
                    key={idx} 
                    className={`sequence-item-row ${swappedIdx === idx ? 'seq-item-swapped' : ''}`}
                  >
                    <span className="seq-step-badge">{idx + 1}</span>
                    <span className="seq-step-text">{itemText}</span>
                    {answeredState === null && (
                      <div className="seq-controls">
                        <button 
                          type="button"
                          className="seq-arrow-btn"
                          disabled={idx === 0}
                          onClick={() => moveSequenceItem(idx, 'up')}
                          title="Move step up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button 
                          type="button"
                          className="seq-arrow-btn"
                          disabled={idx === sequenceItems.length - 1}
                          onClick={() => moveSequenceItem(idx, 'down')}
                          title="Move step down"
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

          {/* 4. MATCHING PAIRS (COLUMN A TO COLUMN B) */}
          {currentQ.type === 'matching' && (
            <MatchingQuestion
              question={currentQ}
              answeredState={answeredState}
              onSubmitMatches={(userMatches, isCorrect, submissionSummary) => {
                evaluateAnswer(isCorrect, submissionSummary);
              }}
            />
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
                <span>{currentIndex + 1 < totalQuestions ? 'Next Question' : 'View Final Summary & Results'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
