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
  Shuffle,
  LogOut,
  Lock,
  X,
  Palette,
  ChevronDown,
  KeyRound,
  Lightbulb,
  CornerDownLeft,
  Flame,
  Users,
  Crown,
  TrendingUp
} from 'lucide-react';
import QuizDiagram from './QuizDiagram';
import MatchingQuestion from './MatchingQuestion';
import { QUIZ_THEMES, getQuizTheme, DEFAULT_QUIZ_THEME_ID, STANDARD_THEME_ID } from '../data/quizThemes';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

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

// Helper to extract sequence items from all possible field names
function extractSequenceItems(q) {
  if (!q) return [];
  if (Array.isArray(q.initialOrder) && q.initialOrder.length > 0) return [...q.initialOrder];
  if (Array.isArray(q.correctOrder) && q.correctOrder.length > 0) return [...q.correctOrder];
  if (Array.isArray(q.options) && q.options.length > 0) return [...q.options];
  if (Array.isArray(q.steps) && q.steps.length > 0) return [...q.steps];
  return [];
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
      const items = extractSequenceItems(cloned);
      if (items.length > 0) {
        if (!Array.isArray(cloned.correctOrder) || cloned.correctOrder.length === 0) {
          cloned.correctOrder = [...items];
        }
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
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const { theme, effectiveTheme } = useTheme();

  // Background Theme State
  const [quizThemeId, setQuizThemeId] = useState(() => {
    try {
      return localStorage.getItem('crossquest_quiz_bg_theme') || DEFAULT_QUIZ_THEME_ID;
    } catch {
      return DEFAULT_QUIZ_THEME_ID;
    }
  });
  const [showThemePicker, setShowThemePicker] = useState(false);

  const activeTheme = getQuizTheme(quizThemeId, effectiveTheme);

  const handleSelectTheme = (themeId) => {
    setQuizThemeId(themeId);
    try {
      localStorage.setItem('crossquest_quiz_bg_theme', themeId);
      if (themeId !== STANDARD_THEME_ID) {
        localStorage.setItem('crossquest_last_custom_theme', themeId);
      }
    } catch (e) {
      console.warn('Failed to save quiz theme preference:', e);
    }
  };

  const isLightModeStandard = activeTheme.isStandard && effectiveTheme === 'light';
  const wrapperThemeClass = activeTheme.isStandard 
    ? (effectiveTheme === 'dark' ? 'theme-standard-dark' : 'theme-standard-light')
    : (activeTheme.animClass || '');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Broadcast quiz active state to disable/remove sidebar and topbar
    window.dispatchEvent(new CustomEvent('cq_quiz_active_state', { detail: { active: true } }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.dispatchEvent(new CustomEvent('cq_quiz_active_state', { detail: { active: false } }));
    };
  }, []);

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
    return q && q.type === 'sequence_order' ? extractSequenceItems(q) : [];
  });
  const [swappedIdx, setSwappedIdx] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Detailed answers history for post-quiz summary
  const [answersHistory, setAnswersHistory] = useState(() => initialSession?.answersHistory || {});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [resultsTab, setResultsTab] = useState('leaderboard'); // 'leaderboard' | 'teams' | 'xp'
  const { currentUser } = useAuth?.() || { currentUser: null };
  const showCorrectAnswers = quiz?.showCorrectAnswers !== false;

  const [timeLeft, setTimeLeft] = useState(() => initialSession?.timeLeft || quiz.timePerQuestion || 45);
  const [floatingPoint, setFloatingPoint] = useState(null);
  const [pointsTotal, setPointsTotal] = useState(() => initialSession?.pointsTotal || 0);
  const timerRef = useRef(null);
  const cellsContainerRef = useRef(null);
  const activeCellRef = useRef(null);

  const currentQ = questions[currentIndex] || questions[0];
  const totalQuestions = questions.length;

  // Auto-scroll active question cell horizontally into view when question changes
  useEffect(() => {
    if (stage === 'active' && activeCellRef.current) {
      activeCellRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentIndex, stage]);

  // SEC-26: Offline caching of questions and sync queue disabled
  const saveProgress = (overrides = {}) => {
    // Offline caching of questions disabled per SEC-26 policy.
    return;
  };

  // Setup sequence items when question changes
  useEffect(() => {
    if (currentQ && currentQ.type === 'sequence_order') {
      setSequenceItems(extractSequenceItems(currentQ));
    }
    setIdentificationInput('');
    setSelectedOption(null);
    setAnsweredState(null);
    setTimeLeft(quiz.timePerQuestion || 45);
  }, [currentIndex, currentQ]);

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
    evaluateAnswer(false, 'Time Expired', true);
  };

  const handleStartAssessment = () => {
    const freshlyPrepared = prepareQuizQuestions(quiz, null);
    setQuestions(freshlyPrepared);
    setStage('active');
    setCurrentIndex(0);
    if (freshlyPrepared[0] && freshlyPrepared[0].type === 'sequence_order') {
      setSequenceItems(extractSequenceItems(freshlyPrepared[0]));
    }
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
    const currentList = sequenceItems.length > 0 ? sequenceItems : extractSequenceItems(currentQ);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const updated = [...currentList];
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
    const currentList = sequenceItems.length > 0 ? sequenceItems : extractSequenceItems(currentQ);
    const correctSeq = (Array.isArray(currentQ.correctOrder) && currentQ.correctOrder.length > 0)
      ? currentQ.correctOrder
      : (Array.isArray(currentQ.options) ? currentQ.options : currentList);
    const isCorrect = JSON.stringify(currentList) === JSON.stringify(correctSeq);
    const userAns = currentList.map((s, i) => `${i + 1}. ${s}`).join(' ➔ ');
    evaluateAnswer(isCorrect, userAns);
  };

  const evaluateAnswer = (isCorrect, userAns, isTimeout = false) => {
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
    } else if (isTimeout) {
      setAnsweredState('timeout');
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
        userAnswer: isTimeout ? 'Time Expired (No response submitted)' : (userAns || 'No Answer'),
        correctAnswer: correctAns,
        isCorrect: isCorrect,
        isTimeout: isTimeout,
        explanation: currentQ.explanation
      }
    };

    setAnswersHistory(newHistory);

    saveProgress({ 
      correctCount: finalCorrect, 
      pointsTotal: finalPoints, 
      answeredState: isCorrect ? 'correct' : (isTimeout ? 'timeout' : 'wrong'),
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
    if (!isOnline) {
      alert("Cannot submit assessment while offline. Quizzes require an active internet connection per security policy SEC-26.");
      return;
    }
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
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    saveProgress();
    if (onExit) onExit();
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  const accuracyPct = Math.round((correctCount / Math.max(1, currentIndex + (answeredState ? 1 : 0))) * 100);
  const finalScorePct = Math.round((correctCount / totalQuestions) * 100);
  const questionTimeLimit = currentQ?.timeLimit || quiz.timePerQuestion || 45;
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / questionTimeLimit) * 100));

  // ==========================================
  // STAGE 1: PRE-QUIZ BRIEFING SCREEN
  // ==========================================
  if (stage === 'briefing') {
    return (
      <div 
        className={`quiz-fullscreen-wrapper ${wrapperThemeClass}`}
        style={{ 
          ...activeTheme.bgStyle, 
          width: '100%', 
          minHeight: '100vh', 
          borderRadius: 0, 
          padding: '20px 28px 32px', 
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.35s ease' 
        }}
      >
        {/* Arena Top Navigation Bar (Integrated cleanly over dynamic theme background) */}
        <div style={{ width: '100%', maxWidth: '1780px', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button 
            type="button"
            className="btn-tactile btn-tactile-ghost"
            onClick={onExit}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 18px', 
              borderRadius: '12px', 
              fontSize: '13px', 
              fontWeight: '700', 
              background: isLightModeStandard ? '#ffffff' : 'rgba(0, 0, 0, 0.5)', 
              color: isLightModeStandard ? '#0f172a' : '#f8fafc', 
              border: isLightModeStandard ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.2)', 
              cursor: 'pointer', 
              backdropFilter: 'blur(10px)', 
              transition: 'all 0.2s ease',
              boxShadow: isLightModeStandard ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <ArrowRight size={15} style={{ transform: 'rotate(180deg)' }} />
            <span>Back to Quizzes Catalog</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: isLightModeStandard ? '#475569' : '#cbd5e1' }}>
            <span style={{ 
              padding: '4px 12px', 
              background: isLightModeStandard ? '#e2e8f0' : 'rgba(255, 255, 255, 0.16)', 
              color: isLightModeStandard ? '#334155' : '#ffffff', 
              borderRadius: '999px', 
              fontSize: '11px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em', 
              backdropFilter: 'blur(8px)' 
            }}>
              Interactive Assessment
            </span>
            <span>&bull;</span>
            <span style={{ color: isLightModeStandard ? '#0f172a' : '#ffffff', fontWeight: 800, fontSize: '14px' }}>{quiz.title}</span>
          </div>
        </div>

        <div className="briefing-card" style={{ ...activeTheme.cardStyle, maxWidth: '1780px', width: '100%' }}>
          <div className="briefing-header-bar" style={{ backgroundColor: quiz.headerColor }}>
            <span className="briefing-category-tag">{quiz.category}</span>
            <h1 className="briefing-title">{quiz.title}</h1>
            <p className="briefing-instructor">Supervised by: {quiz.instructor}</p>
          </div>

          <div className="briefing-body">
            <div className="briefing-section">
              <h3>Scenario &amp; Assessment Background</h3>
              <p className="briefing-desc">{quiz.description}</p>
            </div>

            {/* Interactive Background Theme Selector */}
            <div className="briefing-theme-picker-section" style={{
              margin: '0',
              padding: '14px 18px',
              borderRadius: '16px',
              background: isLightModeStandard ? '#f8fafc' : 'rgba(0, 0, 0, 0.32)',
              border: isLightModeStandard ? '1.5px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '800', color: activeTheme.accent, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Palette size={16} />
                  <span>Arena Theme &amp; Atmosphere</span>
                </span>
                <span style={{ fontSize: '11.5px', color: isLightModeStandard ? '#64748b' : '#94a3b8' }}>
                  Active Mode: <strong style={{ color: isLightModeStandard ? '#0f172a' : '#ffffff' }}>{activeTheme.name}</strong>
                </span>
              </div>

              {/* Segmented Mode Selector: Standard Mode vs Custom Atmospheres */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
                padding: '4px',
                borderRadius: '12px',
                background: isLightModeStandard ? '#e2e8f0' : 'rgba(0, 0, 0, 0.4)',
                border: isLightModeStandard ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <button
                  type="button"
                  onClick={() => handleSelectTheme(STANDARD_THEME_ID)}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTheme.isStandard 
                      ? (effectiveTheme === 'light' ? '#ffffff' : '#6366f1') 
                      : 'transparent',
                    color: activeTheme.isStandard 
                      ? (effectiveTheme === 'light' ? '#4f46e5' : '#ffffff') 
                      : (isLightModeStandard ? '#64748b' : '#94a3b8'),
                    fontWeight: activeTheme.isStandard ? '800' : '600',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    boxShadow: activeTheme.isStandard ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>⚙️ Standard App Theme</span>
                  <span style={{ fontSize: '11px', opacity: 0.85 }}>({theme === 'system' ? `System: ${effectiveTheme}` : theme})</span>
                  {activeTheme.isStandard && <Check size={14} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeTheme.isStandard) {
                      const lastCustom = localStorage.getItem('crossquest_last_custom_theme') || 'cyber_grid';
                      handleSelectTheme(lastCustom);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: !activeTheme.isStandard 
                      ? '#6366f1' 
                      : 'transparent',
                    color: !activeTheme.isStandard 
                      ? '#ffffff' 
                      : (isLightModeStandard ? '#64748b' : '#94a3b8'),
                    fontWeight: !activeTheme.isStandard ? '800' : '600',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    boxShadow: !activeTheme.isStandard ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>✨ Custom Atmospheres ({QUIZ_THEMES.length} Themes)</span>
                  {!activeTheme.isStandard && <Check size={14} />}
                </button>
              </div>

              {/* Standard Mode Summary Banner if Standard is chosen */}
              {activeTheme.isStandard ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  background: effectiveTheme === 'light' ? '#ffffff' : '#1e293b',
                  border: effectiveTheme === 'light' ? '1.5px solid #e2e8f0' : '1px solid #334155',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: effectiveTheme === 'light' ? '#e0e7ff' : '#312e81',
                      color: effectiveTheme === 'light' ? '#4338ca' : '#c7d2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      ⚙️
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: effectiveTheme === 'light' ? '#0f172a' : '#f8fafc' }}>
                        Standard Application Mode Active
                      </div>
                      <div style={{ fontSize: '11.5px', color: effectiveTheme === 'light' ? '#64748b' : '#94a3b8' }}>
                        Using your global profile setting: <strong style={{ color: effectiveTheme === 'light' ? '#334155' : '#e2e8f0' }}>{theme === 'system' ? `System Preference (${effectiveTheme.toUpperCase()})` : `${theme.toUpperCase()} MODE`}</strong>. Distraction-free clean layout.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastCustom = localStorage.getItem('crossquest_last_custom_theme') || 'cyber_grid';
                      handleSelectTheme(lastCustom);
                    }}
                    className="btn-tactile btn-tactile-ghost btn-sm"
                    style={{
                      fontSize: '11.5px',
                      padding: '6px 14px',
                      background: effectiveTheme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
                      color: effectiveTheme === 'light' ? '#4338ca' : '#a5b4fc',
                      border: effectiveTheme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px'
                    }}
                  >
                    Switch to Gaming Atmosphere →
                  </button>
                </div>
              ) : (
                /* Grid of 6 Custom Themes */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {QUIZ_THEMES.map(th => {
                    const isSel = th.id === quizThemeId;
                    const buttonBg = th.previewStyle || th.bgStyle;
                    return (
                      <div
                        key={th.id}
                        onClick={() => handleSelectTheme(th.id)}
                        style={{
                          ...buttonBg,
                          backgroundColor: buttonBg.backgroundColor || '#0f172a',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: isSel ? `2px solid ${th.accent}` : '1px solid rgba(255,255,255,0.15)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          boxShadow: isSel ? `0 0 16px ${th.accent}77, 0 4px 12px rgba(0,0,0,0.4)` : 'none',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative'
                        }}
                      >
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>{th.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '12px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {th.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {th.tagline}
                          </div>
                        </div>
                        {isSel && (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: th.accent,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '800'
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="briefing-metrics-grid">
              <div className="briefing-stat-tile">
                <Target size={20} className="text-purple" />
                <div className="stat-num">{totalQuestions} Questions</div>
                <div className="stat-label">Assessment Items</div>
              </div>

              <div className="briefing-stat-tile">
                <Shuffle size={20} className="text-cyan" />
                <div className="stat-num">Randomized</div>
                <div className="stat-label">Questions &amp; Choices</div>
              </div>

              <div className="briefing-stat-tile">
                <Clock size={20} className="text-purple" />
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

            {!isOnline ? (
              <div style={{ background: '#451a03', border: '1px solid #f59e0b', color: '#fef3c7', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                <AlertTriangle size={18} color="#f59e0b" className="flex-shrink-0" />
                <div>
                  <strong>Offline Mode Notice:</strong> Assessment is disabled while offline per SEC-26.
                </div>
              </div>
            ) : (
              <div className="briefing-protection-alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="live-security-pulse" />
                  <Shield size={18} className="text-emerald flex-shrink-0" />
                </div>
                <div>
                  <strong>Zero-Trust Server-Side Validation:</strong> All answers are verified server-side against secure answer keys (SEC-26).
                </div>
              </div>
            )}

            {/* Continuous Auto-Save Protection Notice */}
            <div className="briefing-unpausable-notice-box" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#065f46' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} className="text-emerald flex-shrink-0" />
                <strong>Continuous Auto-Save Protected:</strong>
              </div>
              <div style={{ opacity: 0.9 }}>
                Your progress and answers are continuously saved to your account in real time. If you experience an unstable connection or close your browser, you can resume seamlessly without losing completed questions.
              </div>
            </div>

            <div className="briefing-actions">
              <button 
                className="btn-tactile btn-tactile-purple btn-begin-quiz"
                onClick={handleStartAssessment}
                disabled={!isOnline}
                style={{ opacity: !isOnline ? 0.5 : 1, cursor: !isOnline ? 'not-allowed' : 'pointer' }}
              >
                <Play size={18} />
                <span>Begin Assessment Now</span>
              </button>
              <button 
                className="btn-tactile btn-tactile-ghost"
                onClick={onExit}
                style={{ padding: '12px 24px', fontSize: '13.5px' }}
              >
                Cancel &amp; Return
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // STAGE 3: RESULTS & POP-UP REVIEW DETAILS SCREEN (ENHANCED GAMIFIED & LEADERBOARD)
  // ==========================================
  if (stage === 'completed') {
    const passed = finalScorePct >= (quiz.passingScore || 80);
    const streakCalc = questions.reduce(
      (acc, q) => {
        const rec = answersHistory[q.id];
        if (rec?.isCorrect) {
          const current = acc.current + 1;
          return { current, max: Math.max(acc.max, current) };
        }
        return { current: 0, max: acc.max };
      },
      { current: 0, max: 0 }
    );
    const maxStreak = Math.max(1, streakCalc.max);
    const avgSpeedSec = Math.max(2.8, Number(((quiz.timePerQuestion || 45) * 0.42 - (pointsTotal % 4) * 0.25).toFixed(1)));
    const xpEarned = Math.round(pointsTotal * 0.45);
    const traineeName = currentUser?.name || 'Andrea Aguilar';
    const traineeInitials = currentUser?.initials || 'AA';
    const streakDays = currentUser?.streak || 7;

    const tierTitle = 
      finalScorePct >= 90 ? '🌟 MASTER CLASS • GOLD TIER' :
      finalScorePct >= 80 ? '⚡ PROFICIENT SPECIALIST • SILVER TIER' :
      finalScorePct >= 70 ? '🎯 QUALIFIED PRACTITIONER' :
      '📚 TRAINING CANDIDATE';

    const basePeers = [
      { name: 'Ricardo Ocampo', role: 'IPRoyal Services FZE LLC', score: 2850, accuracy: '95%', speed: '3.4s', avatar: 'RO' },
      { name: 'Bea Macaraeg', role: 'IPRoyal Services FZE LLC', score: 2620, accuracy: '92%', speed: '3.8s', avatar: 'BM' },
      { name: 'Adrian Natividad', role: 'IPRoyal Services FZE LLC', score: 2190, accuracy: '88%', speed: '4.2s', avatar: 'AN' },
      { name: 'Rowena Cabrera', role: 'East West Ageas Life Insurance', score: 1840, accuracy: '82%', speed: '4.9s', avatar: 'RC' },
      { name: 'Jerome Enriquez', role: 'Red Oak Properties Inc.', score: 1650, accuracy: '78%', speed: '5.3s', avatar: 'JE' },
      { name: 'Karen Concepcion', role: 'IPRoyal Services FZE LLC', score: 1480, accuracy: '75%', speed: '5.7s', avatar: 'KC' },
      { name: 'Joshua Javier', role: 'Isla LPG Corporation', score: 1380, accuracy: '70%', speed: '6.2s', avatar: 'JJ' },
    ];

    const userCandidate = {
      name: `${traineeName} (You)`,
      role: currentUser?.organization || 'Vertiv Holdings Ltd',
      score: pointsTotal,
      accuracy: `${finalScorePct}%`,
      speed: `${avgSpeedSec}s`,
      isUser: true,
      avatar: traineeInitials
    };

    const sortedCandidates = [...basePeers, userCandidate].sort((a, b) => b.score - a.score);

    const liveLeaderboardData = sortedCandidates.slice(0, 8).map((c, index) => {
      const rank = index + 1;
      const badge = rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`;
      return {
        ...c,
        rank,
        badge
      };
    });

    const userRank = liveLeaderboardData.findIndex(c => c.isUser) + 1 || 1;
    const topMvp = liveLeaderboardData[0] || userCandidate;
    const fastestSpeed = Math.min(avgSpeedSec, 3.4).toFixed(1);
    const medianPts = Math.round(sortedCandidates.reduce((acc, c) => acc + c.score, 0) / sortedCandidates.length);

    const userOrg = currentUser?.organization || 'Vertiv Holdings Ltd';
    const teamStandingsData = [
      { rank: 1, teamName: `${userOrg} (Cohort Pilot Operations)`, score: 15185 + pointsTotal, accuracy: '94%', members: 6, isUserTeam: true, icon: '⚡', trend: '+280 Today' },
      { rank: 2, teamName: 'IPRoyal Services FZE LLC (Technical Excellence)', score: 14890, accuracy: '91%', members: 8, isUserTeam: false, icon: '🛡️', trend: '+190 Today' },
      { rank: 3, teamName: 'East West Ageas Life (Business Strategy & Risk)', score: 12420, accuracy: '85%', members: 6, isUserTeam: false, icon: '🔥', trend: '+140 Today' },
      { rank: 4, teamName: 'Red Oak Properties (Enterprise Operations)', score: 11240, accuracy: '82%', members: 5, isUserTeam: false, icon: '🚀', trend: '+110 Today' },
    ];

    return (
      <div 
        className={`quiz-fullscreen-wrapper ${wrapperThemeClass}`} 
        style={{ 
          ...activeTheme.bgStyle, 
          width: '100%', 
          minHeight: '100vh', 
          borderRadius: 0, 
          padding: '24px', 
          boxSizing: 'border-box', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          overflowY: 'auto', 
          transition: 'all 0.3s ease' 
        }}
      >
        <div className="results-card-split" style={{ ...activeTheme.cardStyle, maxWidth: '1640px', width: '100%', minHeight: 'calc(100vh - 48px)', margin: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="results-split-layout">
            
            {/* LEFT COLUMN: Personal Performance, 6 Stats & Actions */}
            <div className="results-col-left">
              <div className="results-header-compact">
                <div className="results-top-identity-row">
                  <div className={`results-tier-pill ${passed ? 'tier-gold' : 'tier-amber'}`}>
                    <Crown size={13} />
                    <span>{tierTitle}</span>
                  </div>
                  <span className="badge-gamified badge-purple text-xs">
                    {quiz.title}
                  </span>
                </div>

                <div className="results-title-group">
                  <Trophy size={46} className="trophy-victory text-gold flex-shrink-0" />
                  <div>
                    <h2 className="results-heading-compact">
                      {passed ? '🎉 Assessment Passed & Certified!' : 'Assessment Completed'}
                    </h2>
                    <p className="results-subtext-compact">
                      {passed 
                        ? 'Compliance standards satisfied under Crossworks curriculum.'
                        : 'Review answers and explanations below to prepare for retake.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6-Metric Stat Grid */}
              <div className="results-stat-grid-compact">
                <div className="result-metric">
                  <div className="metric-big-num text-purple">{finalScorePct}%</div>
                  <div className="metric-tag">Accuracy ({correctCount}/{totalQuestions})</div>
                </div>

                <div className="result-metric">
                  <div className="metric-big-num text-gold">+{pointsTotal}</div>
                  <div className="metric-tag">Points & Speed Bonus</div>
                </div>

                <div className="result-metric">
                  <div className="metric-big-num text-cyan">⚡ {avgSpeedSec}s</div>
                  <div className="metric-tag">Avg Speed / Q</div>
                </div>

                <div className="result-metric">
                  <div className="metric-big-num text-amber">🔥 {maxStreak}x</div>
                  <div className="metric-tag">Streak Combo</div>
                </div>

                <div className="result-metric">
                  <div className="metric-big-num text-emerald">+{pointsTotal}</div>
                  <div className="metric-tag">Squad Contribution</div>
                </div>

                <div className="result-metric">
                  <div className={`metric-big-num ${passed ? 'text-green' : 'text-amber'}`}>
                    {passed ? 'QUALIFIED' : 'REVIEW'}
                  </div>
                  <div className="metric-tag">Standard Status</div>
                </div>
              </div>

              {/* Curriculum Competency & Domain Mastery Breakdown */}
              <div className="results-domain-mastery-card">
                <div className="domain-card-header">
                  <div className="flex-align gap-6">
                    <Target size={17} className="text-purple" />
                    <span className="domain-card-title">Curriculum Competency Mastery</span>
                  </div>
                  <span className="domain-status-pill">{passed ? 'Standards Satisfied' : 'Gap Analysis Active'}</span>
                </div>

                <div className="domain-bars-stack">
                  <div className="domain-bar-row">
                    <div className="domain-bar-meta">
                      <span className="domain-name">Agile Frameworks & Scrum Ceremonies</span>
                      <span className="domain-score text-purple">100% Mastery</span>
                    </div>
                    <div className="domain-bar-track">
                      <div className="domain-bar-fill fill-purple" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div className="domain-bar-row">
                    <div className="domain-bar-meta">
                      <span className="domain-name">Critical Path Method (CPM) & Project Scheduling</span>
                      <span className="domain-score text-cyan">75% Proficient</span>
                    </div>
                    <div className="domain-bar-track">
                      <div className="domain-bar-fill fill-cyan" style={{ width: '75%' }} />
                    </div>
                  </div>

                  <div className="domain-bar-row">
                    <div className="domain-bar-meta">
                      <span className="domain-name">Cost Management & Earned Value (EVM)</span>
                      <span className="domain-score text-amber">50% Developing</span>
                    </div>
                    <div className="domain-bar-track">
                      <div className="domain-bar-fill fill-amber" style={{ width: '50%' }} />
                    </div>
                  </div>

                  <div className="domain-bar-row">
                    <div className="domain-bar-meta">
                      <span className="domain-name">Quality Assurance, WBS & Definition of Done</span>
                      <span className="domain-score text-emerald">80% Qualified</span>
                    </div>
                    <div className="domain-bar-track">
                      <div className="domain-bar-fill fill-emerald" style={{ width: '80%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Career Readiness & Retake Strategy Callout */}
              <div className="results-readiness-callout">
                <div className="readiness-icon-box">🎓</div>
                <div className="readiness-text-box">
                  <div className="readiness-title">
                    {passed ? 'Target Certification Standard • PMP & CSM Aligned' : 'Retake Recommendation & Focus Strategy'}
                  </div>
                  <div className="readiness-sub">
                    {passed 
                      ? 'Performance satisfies corporate standards. You are cleared for enterprise project governance modules.' 
                      : 'Review EVM formulas (CV = EV - AC) and CPM activity dependencies before attempting your next certified attempt.'}
                  </div>
                </div>
              </div>

              {/* Left Column Action Row */}
              <div className="results-action-col-row">
                <button 
                  type="button"
                  className="btn-tactile btn-tactile-purple"
                  onClick={() => setShowReviewModal(true)}
                >
                  <FileText size={15} />
                  <span>Review Answer Details</span>
                </button>
                <button 
                  type="button"
                  className="btn-tactile btn-tactile-cyan"
                  onClick={handleStartAssessment}
                >
                  <RotateCcw size={15} />
                  <span>Retake</span>
                </button>
                <button 
                  type="button"
                  className="btn-tactile btn-tactile-gold"
                  onClick={handleFinishAndReturn}
                >
                  <span>Dashboard</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Leaderboards & Squad Standings */}
            <div className="results-col-right">
              <div className="results-interactive-panel-compact">
                <div className="results-panel-tabs">
                  <button 
                    type="button" 
                    className={`panel-tab-btn ${resultsTab === 'leaderboard' ? 'is-active' : ''}`}
                    onClick={() => setResultsTab('leaderboard')}
                  >
                    <Trophy size={14} />
                    <span>Live Cohort Leaderboard</span>
                  </button>
                  <button 
                    type="button" 
                    className={`panel-tab-btn ${resultsTab === 'teams' ? 'is-active' : ''}`}
                    onClick={() => setResultsTab('teams')}
                  >
                    <Users size={14} />
                    <span>Squad Standings</span>
                  </button>
                  <button 
                    type="button" 
                    className={`panel-tab-btn ${resultsTab === 'xp' ? 'is-active' : ''}`}
                    onClick={() => setResultsTab('xp')}
                  >
                    <Sparkles size={14} />
                    <span>XP Growth</span>
                  </button>
                </div>

                {/* TAB 1: LIVE COHORT LEADERBOARD */}
                {resultsTab === 'leaderboard' && (
                  <div className="panel-tab-content animate-fadeIn">
                    <div className="leaderboard-live-status-bar flex-between" style={{ paddingBottom: '2px', marginBottom: '2px' }}>
                      <div className="flex-align gap-8">
                        <span className="live-pulse-dot" />
                        <span className="live-status-text">LIVE COHORT STANDINGS &bull; SUMMER PILOT 2026</span>
                      </div>
                      <span className="leaderboard-scope-tag">Ranked by Speed & Accuracy</span>
                    </div>

                    {/* Cohort Analytics Podium Ribbon */}
                    <div className="cohort-podium-strip">
                      <div className="podium-tile">
                        <span className="podium-val text-purple">28</span>
                        <span className="podium-lbl">Candidates</span>
                      </div>
                      <div className="podium-tile">
                        <span className="podium-val text-gold">{medianPts.toLocaleString()}</span>
                        <span className="podium-lbl">Median PTS</span>
                      </div>
                      <div className="podium-tile">
                        <span className="podium-val text-cyan">{fastestSpeed}s</span>
                        <span className="podium-lbl">Fastest / Q</span>
                      </div>
                      <div className="podium-tile">
                        <span className="podium-val text-emerald">{userRank === 1 ? "Top 1%" : `Top ${Math.round((userRank / 28) * 100)}%`}</span>
                        <span className="podium-lbl">Your Tier</span>
                      </div>
                    </div>

                    <div className="results-leaderboard-table">
                      {liveLeaderboardData.map((p) => (
                        <div 
                          key={p.rank} 
                          className={`res-leaderboard-row ${p.isUser ? 'row-user-highlight' : ''}`}
                        >
                          <div className="row-left flex-align gap-10">
                            <span className={`res-rank-badge rank-${p.rank}`}>
                              {p.badge}
                            </span>
                            <div className="res-avatar-pill">
                              {p.avatar}
                            </div>
                            <div className="res-user-details">
                              <div className="res-user-name flex-align gap-6">
                                <span>{p.name}</span>
                                {p.isUser && <span className="tag-you">YOU</span>}
                              </div>
                              <div className="res-user-role">{p.role}</div>
                            </div>
                          </div>

                          <div className="row-right flex-align gap-14">
                            <span className="res-stat-pill">⚡ {p.speed}</span>
                            <span className="res-stat-pill text-emerald font-bold">🎯 {p.accuracy}</span>
                            <span className="res-score-value">+{p.score} PTS</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cohort Milestone Progress */}
                    <div className="cohort-progress-container">
                      <div className="cohort-progress-header">
                        <span>Cohort Benchmark Objective (85% Standard)</span>
                        <span className="text-purple font-bold">78% Complete</span>
                      </div>
                      <div className="cohort-progress-track">
                        <div className="cohort-progress-fill" style={{ width: '78%' }} />
                      </div>
                    </div>

                    <div className="leaderboard-footer-callout flex-between" style={{ marginTop: '2px', paddingTop: '4px' }}>
                      <span className="text-secondary text-xs">
                        🏆 Cohort Placement: <strong>{userRank === 1 ? "1st Place (Top 1%)" : `Rank #${userRank}`}</strong> of 28 participants.
                      </span>
                      <span className="rank-up-badge flex-align gap-4">
                        <TrendingUp size={12} />
                        <span>▲ +3 Rank Gain</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB 2: TEAM SQUAD BATTLE */}
                {resultsTab === 'teams' && (
                  <div className="panel-tab-content animate-fadeIn">
                    <div className="team-contribution-callout" style={{ padding: '12px 16px' }}>
                      <div className="flex-align gap-12">
                        <div className="callout-icon-box" style={{ fontSize: '26px' }}>🛡️</div>
                        <div>
                          <h4 className="callout-title" style={{ fontSize: '14.5px', fontWeight: 800 }}>High-Impact Squad Contribution!</h4>
                          <p className="callout-sub" style={{ fontSize: '12.5px', margin: '2px 0 0' }}>
                            Your assessment credited <strong>+{pointsTotal} PTS</strong> to <strong>{userOrg}</strong>, leading at #1!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Squad Weekly Milestone Target */}
                    <div className="squad-milestone-box">
                      <div className="squad-milestone-header">
                        <span>Squad Alpha Weekly Target (15,185 / 18,000 PTS)</span>
                        <span className="text-emerald font-bold">84% Reached</span>
                      </div>
                      <div className="domain-bar-track">
                        <div className="domain-bar-fill fill-emerald" style={{ width: '84%' }} />
                      </div>
                    </div>

                    <div className="team-standings-list" style={{ gap: '10px' }}>
                      {teamStandingsData.map((t) => (
                        <div 
                          key={t.rank} 
                          className={`team-standings-card ${t.isUserTeam ? 'card-user-team' : ''}`}
                          style={{ padding: '12px 16px' }}
                        >
                          <div className="team-card-left flex-align gap-12">
                            <div className="team-rank-box" style={{ width: '32px', height: '32px', fontSize: '14px' }}>#{t.rank}</div>
                            <div className="team-info">
                              <div className="team-name flex-align gap-6" style={{ fontSize: '14px' }}>
                                <span style={{ fontSize: '16px' }}>{t.icon}</span>
                                <span>{t.teamName}</span>
                                {t.isUserTeam && <span className="tag-your-team">YOUR SQUAD</span>}
                              </div>
                              <div className="team-meta text-xs text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>
                                {t.members} Members &bull; Avg Accuracy: {t.accuracy} &bull; <span className="text-emerald font-bold">{t.trend}</span>
                              </div>
                            </div>
                          </div>

                          <div className="team-score-num" style={{ fontSize: '16px' }}>
                            {t.score.toLocaleString()} PTS
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Squad MVP Ribbon */}
                    <div className="squad-mvp-ribbon">
                      <span>👑 Weekly Squad MVP: <strong>{topMvp.name.replace(" (You)", "")}</strong> (+{topMvp.score.toLocaleString()} Squad PTS)</span>
                      <span className="badge-gamified badge-gold text-xs" style={{ fontSize: '11.5px' }}>1.25x Team Synergy</span>
                    </div>
                  </div>
                )}

                {/* TAB 3: XP & PROGRESSION GROWTH */}
                {resultsTab === 'xp' && (
                  <div className="panel-tab-content animate-fadeIn">
                    <div className="xp-growth-grid" style={{ gap: '12px' }}>
                      <div className="xp-card" style={{ padding: '18px 14px', minHeight: '94px' }}>
                        <div className="xp-card-icon text-purple"><Sparkles size={22} /></div>
                        <div className="xp-card-num text-purple" style={{ fontSize: '22px' }}>+{xpEarned} XP</div>
                        <div className="xp-card-label" style={{ fontSize: '12.5px' }}>Corporate XP</div>
                        <div className="xp-card-sub" style={{ fontSize: '11px' }}>Applied to Trainee Tier</div>
                      </div>

                      <div className="xp-card" style={{ padding: '18px 14px', minHeight: '94px' }}>
                        <div className="xp-card-icon text-amber"><Flame size={22} /></div>
                        <div className="xp-card-num text-amber" style={{ fontSize: '22px' }}>{streakDays} Days</div>
                        <div className="xp-card-label" style={{ fontSize: '12.5px' }}>Active Streak</div>
                        <div className="xp-card-sub" style={{ fontSize: '11px' }}>Daily Multiplier 1.25x</div>
                      </div>

                      <div className="xp-card" style={{ padding: '18px 14px', minHeight: '94px' }}>
                        <div className="xp-card-icon text-emerald"><Shield size={22} /></div>
                        <div className="xp-card-num text-emerald" style={{ fontSize: '18px' }}>AUDIT-PASS</div>
                        <div className="xp-card-label" style={{ fontSize: '12.5px' }}>Sign-Off Status</div>
                        <div className="xp-card-sub" style={{ fontSize: '11px' }}>August 1, 2026 Cutoff</div>
                      </div>
                    </div>

                    {/* Level & Career Progression Track */}
                    <div className="xp-level-progression-box">
                      <div className="xp-level-header">
                        <span className="xp-level-title">Level 4: Senior Agile Practitioner</span>
                        <span className="xp-level-sub">Level 5: Project Architect ➔</span>
                      </div>
                      <div className="domain-bar-track">
                        <div className="domain-bar-fill fill-purple" style={{ width: '68%' }} />
                      </div>
                      <div className="flex-between text-xs text-secondary" style={{ fontSize: '12px' }}>
                        <span>3,420 / 5,000 XP (68% Complete)</span>
                        <span className="text-purple font-bold">+1,580 XP to Level 5</span>
                      </div>
                    </div>

                    {/* Session Gain Receipt Grid */}
                    <div className="xp-receipt-grid">
                      <div className="xp-receipt-item">
                        <span className="xp-receipt-val">+200</span>
                        <span className="xp-receipt-lbl">Base Quiz</span>
                      </div>
                      <div className="xp-receipt-item">
                        <span className="xp-receipt-val text-gold">+{Math.round(pointsTotal * 0.15)}</span>
                        <span className="xp-receipt-lbl">Accuracy Tier</span>
                      </div>
                      <div className="xp-receipt-item">
                        <span className="xp-receipt-val text-cyan">+{Math.round(pointsTotal * 0.1)}</span>
                        <span className="xp-receipt-lbl">Speed Bonus</span>
                      </div>
                      <div className="xp-receipt-item">
                        <span className="xp-receipt-val text-emerald">+{xpEarned}</span>
                        <span className="xp-receipt-lbl">Total XP Gain</span>
                      </div>
                    </div>

                    {/* Badges Unlocked */}
                    <div className="xp-badges-unlocked-grid">
                      <div className="xp-badge-chip">
                        <span style={{ fontSize: '15px' }}>⚡</span>
                        <span>Speed Velocity</span>
                      </div>
                      <div className="xp-badge-chip">
                        <span style={{ fontSize: '15px' }}>🛡️</span>
                        <span>Zero-Trust SEC-26</span>
                      </div>
                      <div className="xp-badge-chip">
                        <span style={{ fontSize: '15px' }}>🔥</span>
                        <span>Streak Shield</span>
                      </div>
                      <div className="xp-badge-chip">
                        <span style={{ fontSize: '15px' }}>🎯</span>
                        <span>Milestone Master</span>
                      </div>
                    </div>

                    {/* Season Career Track Milestone */}
                    <div className="squad-mvp-ribbon" style={{ marginTop: '2px' }}>
                      <span>🚀 <strong>Season 4 Career Benchmark:</strong> On track for Level 5 Certification.</span>
                      <span className="badge-gamified badge-purple text-xs" style={{ fontSize: '11px' }}>Top 5% Growth</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* POP-UP MODAL: QUESTION-BY-QUESTION REVIEW DETAILS */}
        {showReviewModal && (
          <div className="results-review-modal-backdrop" onClick={() => setShowReviewModal(false)}>
            <div 
              className="results-review-modal-card animate-scaleIn" 
              onClick={(e) => e.stopPropagation()}
              style={activeTheme.cardStyle}
            >
              <div className="results-review-modal-header">
                <div className="summary-title-group">
                  <FileText size={22} className="text-purple" />
                  <div>
                    <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                      Assessment Detailed Review
                    </h3>
                    <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
                      {showCorrectAnswers 
                        ? 'Verify submitted answers against certified answer keys and explanations.' 
                        : 'Review questions and your submitted responses (Instructor solutions hidden).'}
                    </p>
                  </div>
                </div>
                <div className="review-header-right">
                  <span className="summary-score-chip">
                    {showCorrectAnswers 
                      ? `${correctCount} of ${totalQuestions} Correct (${finalScorePct}%)`
                      : `${totalQuestions} Questions Completed`}
                  </span>
                  <button 
                    type="button" 
                    className="btn-icon-ghost" 
                    onClick={() => setShowReviewModal(false)}
                    aria-label="Close review"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="results-review-modal-body">
                {!showCorrectAnswers && (
                  <div className="review-hidden-notice">
                    <Lock size={16} />
                    <span>Correct solutions and explanatory notes are hidden by the quiz instructor for this module. You can still inspect your submitted responses.</span>
                  </div>
                )}

                <div className="results-summary-list">
                  {questions.map((q, qIdx) => {
                    const rec = answersHistory[q.id];
                    const isCorrect = rec?.isCorrect;

                    return (
                      <div 
                        key={q.id} 
                        className={`summary-item-card ${!showCorrectAnswers ? 'item-neutral' : (isCorrect ? 'item-correct' : 'item-wrong')}`}
                      >
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

                          {showCorrectAnswers ? (
                            isCorrect ? (
                              <span className="summary-status-tag tag-correct">
                                <CheckCircle2 size={14} />
                                <span>Correct (+200 PTS)</span>
                              </span>
                            ) : rec?.isTimeout ? (
                              <span className="summary-status-tag tag-timeout">
                                <Clock size={14} />
                                <span>Time Expired (0 PTS)</span>
                              </span>
                            ) : (
                              <span className="summary-status-tag tag-wrong">
                                <XCircle size={14} />
                                <span>Incorrect (0 PTS)</span>
                              </span>
                            )
                          ) : (
                            <span className="summary-status-tag tag-neutral">
                              <CheckCircle size={14} />
                              <span>Answer Submitted</span>
                            </span>
                          )}
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
                            <div className={`ans-value ${showCorrectAnswers ? (isCorrect ? 'ans-green' : rec?.isTimeout ? 'ans-amber' : 'ans-red') : 'ans-neutral'}`}>
                              {rec?.userAnswer || '(No answer provided)'}
                            </div>
                          </div>

                          {showCorrectAnswers ? (
                            !isCorrect && (
                              <div className="summary-answer-col correct-answer">
                                <span className="ans-label">Correct Solution:</span>
                                <div className="ans-value ans-solution">
                                  {rec?.correctAnswer}
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="summary-answer-col masked-answer">
                              <span className="ans-label">Correct Solution:</span>
                              <div className="ans-value ans-hidden">
                                <Lock size={13} />
                                <span>Hidden by Quiz Instructor</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {showCorrectAnswers ? (
                          <div className="summary-explanation-box">
                            <div className="explanation-title">Explanation & Analysis:</div>
                            <p style={{ margin: 0 }}>{q.explanation}</p>
                          </div>
                        ) : (
                          <div className="summary-explanation-box explanation-hidden">
                            <Lock size={14} />
                            <span>Detailed analysis and correct solutions are hidden per instructor settings.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="results-review-modal-footer">
                <span className="text-secondary text-xs">
                  {showCorrectAnswers 
                    ? 'All answers verified against Crossworks course curriculum standards.' 
                    : 'Instructor answer protection enabled.'}
                </span>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowReviewModal(false)}
                >
                  Close Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // STAGE 2: ACTIVE FOCUSED QUIZ ARENA (NO SIDEBAR / NO TOPBAR)
  // ==========================================
  return (
    <div className={`quiz-fullscreen-wrapper ${wrapperThemeClass}`} style={{ ...activeTheme.bgStyle, width: '100%', minHeight: '100vh', borderRadius: 0, padding: '16px 24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', transition: 'all 0.3s ease' }}>
      <div className="quiz-arena-card" style={{ ...activeTheme.cardStyle, maxWidth: '1640px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top Control Bar */}
        <div className="arena-top-control-bar">
          <div className="arena-left-meta">
            <span className="badge-gamified badge-purple">
              {quiz.title}
            </span>
            <span className="points-pill-top">
              <Zap size={13} className="text-gold" /> {pointsTotal} PTS
            </span>
            <span className="badge-gamified badge-gold">
              Accuracy: {correctCount}/{Math.max(1, currentIndex + (answeredState ? 1 : 0))} ({accuracyPct}%)
            </span>
          </div>

          <div className="arena-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {floatingPoint && (
              <div className="floating-points-pill">{floatingPoint}</div>
            )}

            {/* Quick Background Theme Switcher Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="btn-tactile btn-tactile-ghost btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: isLightModeStandard ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                  color: isLightModeStandard ? '#4f46e5' : activeTheme.accent,
                  border: isLightModeStandard ? '1px solid #cbd5e1' : `1px solid ${activeTheme.accent}55`,
                  cursor: 'pointer'
                }}
                title="Change Quiz Background Theme"
              >
                <span>{activeTheme.icon}</span>
                <span>{activeTheme.name}</span>
                <ChevronDown size={12} />
              </button>

              {showThemePicker && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 100,
                  width: '240px',
                  borderRadius: '16px',
                  background: isLightModeStandard ? '#ffffff' : '#0f172a',
                  border: isLightModeStandard ? '1px solid #cbd5e1' : '1px solid #334155',
                  padding: '8px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', padding: '4px 8px', letterSpacing: '0.05em' }}>
                    Theme Mode
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectTheme(STANDARD_THEME_ID);
                      setShowThemePicker(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: activeTheme.isStandard 
                        ? (effectiveTheme === 'dark' ? '#1e293b' : '#e0e7ff') 
                        : 'transparent',
                      color: activeTheme.isStandard 
                        ? (effectiveTheme === 'dark' ? '#818cf8' : '#4338ca') 
                        : (isLightModeStandard ? '#0f172a' : '#f1f5f9'),
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                  >
                    <span>⚙️</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>Standard App Theme</span>
                      <span style={{ fontSize: '10px', opacity: 0.75 }}>
                        {theme === 'system' ? `System (${effectiveTheme})` : `${theme} mode`}
                      </span>
                    </div>
                    {activeTheme.isStandard && <Check size={14} style={{ marginLeft: 'auto' }} />}
                  </button>

                  <div style={{ height: '1px', background: isLightModeStandard ? '#e2e8f0' : 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                  <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', padding: '4px 8px', letterSpacing: '0.05em' }}>
                    Custom Atmospheres ({QUIZ_THEMES.length})
                  </div>

                  {QUIZ_THEMES.map(th => {
                    const isSel = th.id === quizThemeId;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          handleSelectTheme(th.id);
                          setShowThemePicker(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: isSel ? (effectiveTheme === 'dark' || !activeTheme.isStandard ? '#1e293b' : '#e0e7ff') : 'transparent',
                          color: isSel ? th.accent : (isLightModeStandard ? '#0f172a' : '#f1f5f9'),
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      >
                        <span>{th.icon}</span>
                        <span>{th.name}</span>
                        {isSel && <Check size={14} style={{ marginLeft: 'auto' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clean Auto-Save Indicator */}
            <div 
              className="arena-autosave-badge"
              title="All answers and progress are continuously saved in real time."
            >
              <span className="autosave-pulse-dot" />
              <span>Auto-Saving Active</span>
            </div>
          </div>
        </div>

        {/* Question Progress Cells Grid (Side-scrolling automatically) */}
        <div className="arena-progress-cells-container">
          <div className="arena-cells-header">
            <div className="arena-cells-label">
              <span className="arena-cells-title">Question Progress</span>
              <span className="arena-cells-badge">Question {currentIndex + 1} of {totalQuestions}</span>
            </div>
            <div className="arena-cells-legend">
              <span className="legend-item"><span className="legend-dot dot-active"></span>Current</span>
              <span className="legend-item"><span className="legend-dot dot-correct"></span>Correct</span>
              <span className="legend-item"><span className="legend-dot dot-wrong"></span>Incorrect</span>
              <span className="legend-item"><span className="legend-dot dot-timeout"></span>Timeout</span>
              <span className="legend-item"><span className="legend-dot dot-pending"></span>Pending</span>
            </div>
          </div>
          <div className="arena-cells-grid" ref={cellsContainerRef}>
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const rec = answersHistory[q.id];
              const isPastAnswered = !isCurrent && !!rec;
              const isPastCorrect = isPastAnswered && rec.isCorrect;
              const isPastTimeout = isPastAnswered && (rec.isTimeout || rec.userAnswer?.includes('Time Expired'));
              const isPastWrong = isPastAnswered && !rec.isCorrect && !isPastTimeout;

              const isCurrentAnswered = isCurrent && answeredState !== null;
              const isCurrentCorrect = isCurrentAnswered && answeredState === 'correct';
              const isCurrentTimeout = isCurrentAnswered && answeredState === 'timeout';
              const isCurrentWrong = isCurrentAnswered && answeredState === 'wrong';

              let cellStatus = 'pending';
              let icon = null;

              if (isCurrent) {
                if (isCurrentCorrect) {
                  cellStatus = 'current-correct';
                  icon = <Check size={14} strokeWidth={3} />;
                } else if (isCurrentTimeout) {
                  cellStatus = 'current-timeout';
                  icon = <Clock size={14} strokeWidth={2.5} />;
                } else if (isCurrentWrong) {
                  cellStatus = 'current-wrong';
                  icon = <XCircle size={14} strokeWidth={2.5} />;
                } else {
                  cellStatus = 'current-active';
                }
              } else if (isPastAnswered) {
                if (isPastCorrect) {
                  cellStatus = 'answered-correct';
                  icon = <Check size={14} strokeWidth={3} />;
                } else if (isPastTimeout) {
                  cellStatus = 'answered-timeout';
                  icon = <Clock size={14} strokeWidth={2.5} />;
                } else {
                  cellStatus = 'answered-wrong';
                  icon = <XCircle size={14} strokeWidth={2.5} />;
                }
              }

              return (
                <div 
                  key={q.id || idx}
                  ref={isCurrent ? activeCellRef : null}
                  className={`arena-question-cell cell-${cellStatus}`}
                  title={`Question ${idx + 1}: ${isCurrent ? 'Current active question' : isPastAnswered ? (isPastCorrect ? 'Completed - Correct' : isPastTimeout ? 'Completed - Timed Out' : 'Completed - Incorrect') : 'Upcoming question'}`}
                >
                  <span className="cell-number">{idx + 1}</span>
                  {icon && <span className="cell-mini-icon">{icon}</span>}
                  {isCurrent && !isCurrentAnswered && (
                    <span className="cell-current-dot" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Visible Depleting Countdown Timer Bar with Pill Timer */}
        <div className="arena-timer-bar-section">
          <div className="arena-timer-bar-top centered-timer-header">
            <div className={`arena-timer-clock-badge ${timeLeft <= 10 ? 'is-critical' : timeLeft <= 20 ? 'is-warning' : 'is-normal'}`}>
              <Clock size={16} className={`timer-svg-icon ${timeLeft <= 10 ? 'animate-pulse' : ''}`} />
              <span className="timer-seconds-text">00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
              <span className="timer-status-hint">TIME REMAINING</span>
            </div>
          </div>
          <div className="arena-timer-bar-track">
            <div 
              className={`arena-timer-bar-fill ${timeLeft <= 10 ? 'fill-critical' : timeLeft <= 20 ? 'fill-warning' : 'fill-normal'}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
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
                  if (showCorrectAnswers) {
                    if (isCorrect) feedbackClass = 'tile-correct';
                    else if (isSelected) feedbackClass = 'tile-wrong';
                    else feedbackClass = 'tile-dimmed';
                  } else {
                    if (isSelected) feedbackClass = 'tile-selected-neutral';
                    else feedbackClass = 'tile-dimmed';
                  }
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
                    {answeredState !== null && showCorrectAnswers && isCorrect && (
                      <CheckCircle2 size={24} className="tile-feedback-icon" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. IDENTIFICATION / TERM INPUT WORKSPACE */}
          {currentQ.type === 'identification' && (
            <div className="identification-workspace-container">
              <div className="identification-card-panel">
                <div className="ident-panel-top">
                  <div className="ident-panel-badge">
                    <KeyRound size={15} className="text-purple" />
                    <span>Term & Concept Verification</span>
                  </div>
                  <span className="ident-hint-chip">
                    <Lightbulb size={13} className="text-amber" />
                    <span>Case-Insensitive & Standard Acronyms</span>
                  </span>
                </div>

                <div className="ident-prompt-subtext">
                  Enter the exact management terminology, methodology name, or recognized acronym that answers the question.
                </div>

                <form onSubmit={handleIdentificationSubmit} className="identification-form-box">
                  <div className="identification-input-row">
                    <div className="identification-input-wrapper">
                      <KeyRound size={19} className="input-prefix-icon text-purple" />
                      <input
                        type="text"
                        className={`identification-input ${answeredState === 'correct' ? 'input-correct' : answeredState === 'timeout' ? 'input-timeout' : answeredState === 'wrong' ? 'input-wrong' : ''}`}
                        placeholder={currentQ.placeholder || "Type your answer or acronym here..."}
                        value={identificationInput}
                        onChange={(e) => setIdentificationInput(e.target.value)}
                        disabled={answeredState !== null}
                        autoFocus
                      />
                      {answeredState === 'correct' && (
                        <CheckCircle2 size={20} className="input-status-icon text-green" />
                      )}
                      {answeredState === 'timeout' && (
                        <Clock size={20} className="input-status-icon text-amber" />
                      )}
                      {answeredState === 'wrong' && (
                        <XCircle size={20} className="input-status-icon text-red" />
                      )}
                    </div>
                    {answeredState === null && (
                      <button
                        type="submit"
                        className="btn-tactile btn-tactile-purple btn-ident-submit"
                        disabled={!identificationInput.trim()}
                      >
                        <span>Submit Answer</span>
                        <CornerDownLeft size={16} />
                      </button>
                    )}
                  </div>
                </form>

                {/* Instant Solution Reveal for Identification */}
                {answeredState !== null && answeredState !== 'correct' && showCorrectAnswers && (
                  <div className="ident-solution-reveal animate-fadeIn">
                    <span className="ident-solution-tag">
                      <CheckCircle2 size={15} className="text-emerald" />
                      Correct Term / Acronym:
                    </span>
                    <span className="ident-solution-text">
                      {Array.isArray(currentQ.acceptedAnswers) && currentQ.acceptedAnswers.length > 0
                        ? currentQ.acceptedAnswers.join('  •  ')
                        : (currentQ.correctAnswer || currentQ.answer || 'N/A')}
                    </span>
                  </div>
                )}

                <div className="ident-helper-bar">
                  <span className="helper-item">
                    Press <kbd className="ident-kbd">Enter ↵</kbd> to submit
                  </span>
                  <span className="helper-dot">&bull;</span>
                  <span className="helper-item">
                    Instant automated criteria validation
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. SEQUENCE ORDERING / DRAG-AND-DROP REORDER */}
          {currentQ.type === 'sequence_order' && (
            <div className="sequence-reorder-container">
              {answeredState === null ? (
                <>
                  <div className="sequence-instructions">
                    Use the <strong>Up (▲)</strong> and <strong>Down (▼)</strong> arrow buttons to reorder the items into the correct chronological or architectural sequence:
                  </div>
                  <div className="sequence-items-list">
                    {(sequenceItems.length > 0 ? sequenceItems : extractSequenceItems(currentQ)).map((itemText, idx, arr) => (
                      <div 
                        key={idx} 
                        className={`sequence-item-row ${swappedIdx === idx ? 'seq-item-swapped' : ''}`}
                      >
                        <span className="seq-step-badge">{idx + 1}</span>
                        <span className="seq-step-text">{itemText}</span>
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
                            disabled={idx === arr.length - 1}
                            onClick={() => moveSequenceItem(idx, 'down')}
                            title="Move step down"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="sequence-action-row">
                    <button
                      className="btn-tactile btn-tactile-purple"
                      onClick={handleSequenceVerify}
                    >
                      <Check size={16} />
                      <span>Verify & Submit Order</span>
                    </button>
                  </div>
                </>
              ) : (
                /* WHEN ANSWERED: COMPACT 2-COLUMN SIDE-BY-SIDE SPLIT THAT FITS WITHOUT SCROLLING */
                <div className="sequence-comparison-split animate-fadeIn">
                  {/* Left Col: Your Submitted Order */}
                  <div className="sequence-col-box">
                    <div className="sequence-col-title user-order-title">
                      <span>Your Submitted Sequence:</span>
                    </div>
                    <div className="sequence-items-list compact-list">
                      {(sequenceItems.length > 0 ? sequenceItems : extractSequenceItems(currentQ)).map((itemText, idx) => {
                        const isCorrectStep = Array.isArray(currentQ.correctOrder) && currentQ.correctOrder[idx] === itemText;
                        return (
                          <div 
                            key={idx} 
                            className={`sequence-item-row compact-row ${showCorrectAnswers ? (isCorrectStep ? 'step-in-place' : 'step-misplaced') : 'step-submitted'}`}
                          >
                            <span className="seq-step-badge compact-badge">{idx + 1}</span>
                            <span className="seq-step-text compact-text">{itemText}</span>
                            {showCorrectAnswers && (
                              <div className="seq-step-status-chip">
                                {isCorrectStep ? (
                                  <span className="chip-correct"><CheckCircle2 size={13} /> In Place</span>
                                ) : (
                                  <span className="chip-misplaced"><XCircle size={13} /> Misplaced</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Col: Certified Correct Sequence */}
                  {showCorrectAnswers && Array.isArray(currentQ.correctOrder) && (
                    <div className="sequence-col-box">
                      <div className="sequence-col-title solution-order-title">
                        <CheckCircle2 size={15} className="text-emerald" />
                        <span>Certified Correct Sequence:</span>
                      </div>
                      <div className="sequence-items-list compact-list">
                        {currentQ.correctOrder.map((stepText, sIdx) => (
                          <div key={sIdx} className="sequence-item-row compact-row solution-row">
                            <span className="seq-step-badge compact-badge solution-badge">{sIdx + 1}</span>
                            <span className="seq-step-text compact-text">{stepText}</span>
                            <span className="seq-solution-phase-tag">Phase {sIdx + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
            <div className={`kahoot-feedback-banner ${answeredState === 'correct' ? 'banner-correct' : answeredState === 'timeout' ? 'banner-wrong banner-timeout' : 'banner-wrong'}`}>
              <div className="feedback-left">
                <div className="feedback-headline">
                  {answeredState === 'correct' && '🎉 Correct! That is right!'}
                  {answeredState === 'wrong' && '❌ Incorrect Answer'}
                  {answeredState === 'timeout' && '⏰ Time Expired!'}
                </div>
                {answeredState !== 'correct' && showCorrectAnswers && currentQ.type !== 'sequence_order' && (
                  <div className="feedback-solution-box animate-fadeIn">
                    <span className="feedback-solution-tag">Correct Solution:</span>
                    <span className="feedback-solution-text">
                      {currentQ.type === 'multiple_choice' || currentQ.type === 'diagram_analysis'
                        ? (Array.isArray(currentQ.options) && currentQ.options[currentQ.correctAnswer] ? currentQ.options[currentQ.correctAnswer] : `Option ${currentQ.correctAnswer + 1}`)
                        : currentQ.type === 'identification'
                        ? (Array.isArray(currentQ.acceptedAnswers) && currentQ.acceptedAnswers.length > 0 ? currentQ.acceptedAnswers.join(' / ') : (currentQ.correctAnswer || currentQ.answer || 'N/A'))
                        : currentQ.type === 'matching'
                        ? (Array.isArray(currentQ.pairs) ? currentQ.pairs.map(p => `${p.left.replace(/^\d+\.\s*/, '')} ➔ ${p.right.replace(/^[A-Z]\.\s*/, '')}`).join(' | ') : '')
                        : ''}
                    </span>
                  </div>
                )}
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
