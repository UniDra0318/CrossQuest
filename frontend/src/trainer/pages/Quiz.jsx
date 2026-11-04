import React, { useState } from 'react';
import {
  Layers,
  Link2,
  FileText,
  ListOrdered,
  Eye,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Sparkles,
  HelpCircle,
  Clock,
  Award,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTrainer } from '../TrainerContext';

const QUESTION_FORMATS = [
  { id: 'kahoot', label: 'Kahoot 4-Tile', icon: Layers, iconChar: '🎴', tagColor: 'violet', desc: 'Single-choice question with 4 colored option cards' },
  { id: 'matching', label: 'Matching Pairs', icon: Link2, iconChar: '🔗', tagColor: 'blue', desc: 'Connect Column A concepts to Column B definitions' },
  { id: 'identification', label: 'Identification', icon: FileText, iconChar: '✍️', tagColor: 'amber', desc: 'Direct term input with accepted variant matching' },
  { id: 'sequence', label: 'Sequence Order', icon: ListOrdered, iconChar: '🔢', tagColor: 'green', desc: 'Arrange operational steps in correct chronological order' },
  { id: 'hotspot', label: 'Diagram Hotspot', icon: Eye, iconChar: '🎯', tagColor: 'orange', desc: 'Identify target security component in architecture diagrams' }
];

export default function Quiz() {
  const { isDark } = useTheme();
  const {
    quizzes,
    handleCreateQuiz,
    handleAddQuestion,
    handleDeleteQuestion,
    handleUpdateSettings,
    handleResetQuizzes,
    loading,
  } = useTrainer();

  const [activeQuizId, setActiveQuizId] = useState(null);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [newQuestionExplanation, setNewQuestionExplanation] = useState('');
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  // Multi-type question builder state
  const [questionType, setQuestionType] = useState('kahoot'); // 'kahoot' | 'matching' | 'identification' | 'sequence' | 'hotspot'
  const [kahootOptions, setKahootOptions] = useState(['', '', '', '']);
  const [kahootCorrectIdx, setKahootCorrectIdx] = useState(0);
  const [matchingPairs, setMatchingPairs] = useState([
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' }
  ]);
  const [newQuestionAnswer, setNewQuestionAnswer] = useState('');
  const [sequenceSteps, setSequenceSteps] = useState(['', '', '', '']);
  const [hotspotTarget, setHotspotTarget] = useState('');

  // Fallback active quiz selection
  const activeQuiz = (quizzes && quizzes.length > 0)
    ? (quizzes.find((q) => q.id === activeQuizId) || quizzes[0])
    : null;

  if (loading && (!quizzes || quizzes.length === 0)) {
    return <div className="adm-state">Loading quiz assessment studio...</div>;
  }

  const onCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;
    setCreatingQuiz(true);
    try {
      const created = await handleCreateQuiz(newQuizTitle.trim());
      setNewQuizTitle('');
      if (created) setActiveQuizId(created.id);
    } finally {
      setCreatingQuiz(false);
    }
  };

  const onAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionPrompt.trim() || !activeQuiz) return;

    let payload = {
      type: questionType,
      prompt: newQuestionPrompt.trim(),
      explanation: newQuestionExplanation.trim() || 'Standard curriculum competency benchmark.'
    };

    if (questionType === 'kahoot') {
      const validOpts = kahootOptions.map(o => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        alert('Please provide at least 2 options for multiple choice.');
        return;
      }
      payload.options = kahootOptions.map((o, idx) => o.trim() || `Option ${String.fromCharCode(65 + idx)}`);
      payload.answer = kahootCorrectIdx;
    } else if (questionType === 'matching') {
      const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
      if (validPairs.length < 2) {
        alert('Please provide at least 2 matching pairs (Column A ➔ Column B).');
        return;
      }
      payload.pairs = validPairs.map((p, idx) => ({
        id: `p-${idx + 1}`,
        left: p.left.trim(),
        right: p.right.trim()
      }));
    } else if (questionType === 'sequence') {
      const validSteps = sequenceSteps.map(s => s.trim()).filter(Boolean);
      if (validSteps.length < 2) {
        alert('Please provide at least 2 ordered sequence steps.');
        return;
      }
      payload.steps = validSteps;
    } else if (questionType === 'hotspot') {
      if (!hotspotTarget.trim()) {
        alert('Please specify the target component label for the hotspot.');
        return;
      }
      payload.answerLabel = hotspotTarget.trim();
    } else {
      if (!newQuestionAnswer.trim()) {
        alert('Please provide accepted answer term(s).');
        return;
      }
      payload.accepted = newQuestionAnswer.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      payload.answer = newQuestionAnswer.trim();
    }

    await handleAddQuestion(activeQuiz.id, payload);
    setNewQuestionPrompt('');
    setNewQuestionExplanation('');
    setNewQuestionAnswer('');
    setKahootOptions(['', '', '', '']);
    setMatchingPairs([
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' }
    ]);
    setSequenceSteps(['', '', '', '']);
    setHotspotTarget('');
  };

  const getFormatBadge = (type) => {
    switch (type) {
      case 'kahoot':
      case 'multiple_choice':
        return { label: 'KAHOOT 4-TILE', chip: 'adm-chip--violet' };
      case 'matching':
        return { label: 'MATCHING PAIRS', chip: 'adm-chip--blue' };
      case 'identification':
        return { label: 'IDENTIFICATION', chip: 'adm-chip--amber' };
      case 'sequence':
      case 'sequence_order':
        return { label: 'SEQUENCE ORDER', chip: 'adm-chip--green' };
      case 'hotspot':
      case 'diagram_analysis':
        return { label: 'DIAGRAM HOTSPOT', chip: 'adm-chip--orange' };
      default:
        return { label: (type || 'QUESTION').toUpperCase(), chip: 'adm-chip--solid' };
    }
  };

  return (
    <div className="trn-split trn-split--quiz" style={{ marginTop: '24px' }}>
      {/* =========================================================================
          LEFT COLUMN: ASSESSMENTS CATALOG & CREATION
          ========================================================================= */}
      <div className="adm-panel trn-pad">
        <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Assessments ({quizzes.length})</h2>
            <span className="adm-mono" style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>Curriculum Knowledge Challenges</span>
          </div>
          <button
            type="button"
            className="trn-link"
            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            onClick={async () => {
              if (window.confirm('Reset all assessment questions to original enterprise defaults?')) {
                await handleResetQuizzes();
              }
            }}
            title="Reset quizzes to original defaults"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Assessment Items List */}
        <div className="trn-quizlist" style={{ marginTop: '16px' }}>
          {quizzes.map((q) => {
            const isSelected = activeQuiz && activeQuiz.id === q.id;
            const qCount = q.questions ? q.questions.length : (q.questionsCount || 0);
            return (
              <button
                key={q.id}
                type="button"
                className={isSelected ? 'on' : ''}
                onClick={() => setActiveQuizId(q.id)}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: isSelected
                    ? '2px solid #8b5cf6'
                    : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #cbd5e1'),
                  background: isSelected
                    ? (isDark ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(30, 27, 75, 0.8) 100%)' : '#f5f3ff')
                    : (isDark ? '#111827' : '#ffffff'),
                  boxShadow: isSelected ? '0 8px 24px rgba(139, 92, 246, 0.25)' : 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <strong style={{ fontSize: '14px', lineHeight: 1.3, color: isSelected ? '#a5b4fc' : (isDark ? '#f8fafc' : '#1e293b') }}>
                    {q.title}
                  </strong>
                  <span
                    className={`adm-chip ${qCount > 0 ? 'adm-chip--green' : 'adm-chip--amber'}`}
                    style={{ fontSize: '10px', padding: '2px 8px', flexShrink: 0 }}
                  >
                    {qCount} Qs
                  </span>
                </div>
                <small style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {q.category}
                </small>
              </button>
            );
          })}
        </div>

        {/* Create new quiz form */}
        <form onSubmit={onCreateQuiz} style={{ marginTop: '20px', paddingTop: '16px', borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)' }}>
          <label className="adm-label" style={{ fontSize: '10.5px', color: isDark ? '#cbd5e1' : '#475569' }}>
            CREATE NEW ASSESSMENT
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="e.g. Threat Intelligence & MITRE ATT&CK"
              value={newQuizTitle}
              onChange={(e) => setNewQuizTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--cq-line)',
                background: isDark ? '#0b0f19' : '#ffffff',
                color: isDark ? '#f8fafc' : '#1e293b',
                borderRadius: '10px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={creatingQuiz || !newQuizTitle.trim()}
              className="adm-btn adm-btn-solid cq-btn--purple"
              style={{ padding: '10px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: ACTIVE ASSESSMENT DETAILS & QUESTION BUILDER
          ========================================================================= */}
      <div className="adm-panel trn-pad">
        {activeQuiz ? (
          <>
            {/* Header */}
            <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{activeQuiz.title}</h2>
                <span className="adm-mono" style={{ fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  {activeQuiz.category} · ID: {activeQuiz.id}
                </span>
              </div>
              <span className="adm-chip adm-chip--green" style={{ fontSize: '11.5px', padding: '4px 12px' }}>
                {activeQuiz.questions.length} QUESTIONS
              </span>
            </div>

            {/* Assessment settings sliders */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                margin: '20px 0',
                padding: '18px 20px',
                background: isDark ? '#111827' : 'var(--cq-lav-2)',
                borderRadius: '16px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    <Clock size={14} color="#6366f1" /> TIME PER QUESTION
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 800 }}>
                    {activeQuiz.timePerQ}s
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={activeQuiz.timePerQ}
                  onChange={(e) => handleUpdateSettings(activeQuiz.id, { timePerQ: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '10px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: isDark ? '#cbd5e1' : '#475569' }}>
                    <Award size={14} color="#10b981" /> PASSING THRESHOLD
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 800 }}>
                    {activeQuiz.pass}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={activeQuiz.pass}
                  onChange={(e) => handleUpdateSettings(activeQuiz.id, { pass: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '10px', accentColor: '#10b981', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* =========================================================================
                POLISHED QUESTION BUILDER CARD (All 5 Question Formats)
                ========================================================================= */}
            <form
              onSubmit={onAddQuestion}
              style={{
                background: isDark ? '#111827' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                boxShadow: isDark ? '0 12px 30px rgba(0, 0, 0, 0.3)' : '0 6px 18px rgba(0, 0, 0, 0.04)'
              }}
            >
              {/* Card Title & Format Selector */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#8b5cf6" /> Question Format Studio
                  </span>
                  <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    {QUESTION_FORMATS.find(f => f.id === questionType)?.desc}
                  </span>
                </div>

                {/* 5 Format Selection Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {QUESTION_FORMATS.map((f) => {
                    const isSelected = questionType === f.id;
                    const IconComp = f.icon;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setQuestionType(f.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid #8b5cf6'
                            : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                          background: isSelected
                            ? (isDark ? '#2e1065' : '#f5f3ff')
                            : (isDark ? '#0b0f19' : '#ffffff'),
                          color: isSelected
                            ? (isDark ? '#c4b5fd' : '#6d28d9')
                            : (isDark ? '#cbd5e1' : '#475569'),
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 4px 12px rgba(139, 92, 246, 0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <IconComp size={14} />
                        <span>{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full-width Question Prompt */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  QUESTION PROMPT:
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Which cryptographic protocol allows fine-grained boolean policy trees to be evaluated over encrypted records?"
                  value={newQuestionPrompt}
                  onChange={(e) => setNewQuestionPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                    background: isDark ? '#0b0f19' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#1e293b',
                    borderRadius: '10px',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* =========================================================================
                  DYNAMIC FORMAT CONTROLS (5 Types)
                  ========================================================================= */}

              {/* 1. KAHOOT 4-TILE */}
              {questionType === 'kahoot' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                    4 Multiple Choice Options (Select radio to designate correct answer):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {['A', 'B', 'C', 'D'].map((letter, idx) => {
                      const isCorrect = kahootCorrectIdx === idx;
                      return (
                        <div
                          key={letter}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isCorrect
                              ? '2px solid #10b981'
                              : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                            background: isCorrect
                              ? (isDark ? '#064e3b' : '#ecfdf5')
                              : (isDark ? '#0b0f19' : '#ffffff'),
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="radio"
                            name="kahootCorrect"
                            checked={isCorrect}
                            onChange={() => setKahootCorrectIdx(idx)}
                            style={{ accentColor: '#10b981', cursor: 'pointer', transform: 'scale(1.15)' }}
                          />
                          <strong style={{ fontSize: '13px', color: isCorrect ? '#34d399' : (isDark ? '#94a3b8' : '#64748b'), minWidth: '18px' }}>
                            {letter}.
                          </strong>
                          <input
                            type="text"
                            placeholder={`Option ${letter}...`}
                            value={kahootOptions[idx]}
                            onChange={(e) => {
                              const next = [...kahootOptions];
                              next[idx] = e.target.value;
                              setKahootOptions(next);
                            }}
                            style={{
                              flex: 1,
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              fontSize: '13px',
                              color: isDark ? '#f8fafc' : '#1e293b'
                            }}
                          />
                          {isCorrect && <Check size={16} color="#10b981" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. MATCHING PAIRS */}
              {questionType === 'matching' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                      Matching Control Pairs (Column A Term ➔ Column B Definition):
                    </span>
                    <span style={{ fontSize: '11px', color: '#8b5cf6' }}>Minimum 2 pairs required</span>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: isDark ? '#0b0f19' : '#ffffff',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                          borderRadius: '10px'
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#a5b4fc' : '#6366f1', minWidth: '24px' }}>
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder={`Column A Term ${idx + 1}...`}
                          value={matchingPairs[idx].left}
                          onChange={(e) => {
                            const next = [...matchingPairs];
                            next[idx] = { ...next[idx], left: e.target.value };
                            setMatchingPairs(next);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: isDark ? '#111827' : '#f8fafc',
                            color: isDark ? '#f8fafc' : '#1e293b',
                            fontSize: '12.5px',
                            outline: 'none'
                          }}
                        />
                        <span style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '16px' }}>➔</span>
                        <input
                          type="text"
                          placeholder={`Column B Definition ${idx + 1}...`}
                          value={matchingPairs[idx].right}
                          onChange={(e) => {
                            const next = [...matchingPairs];
                            next[idx] = { ...next[idx], right: e.target.value };
                            setMatchingPairs(next);
                          }}
                          style={{
                            flex: 1.4,
                            padding: '6px 10px',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: isDark ? '#111827' : '#f8fafc',
                            color: isDark ? '#f8fafc' : '#1e293b',
                            fontSize: '12.5px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. IDENTIFICATION */}
              {questionType === 'identification' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                    Accepted Answer(s) (Comma-separated for acceptable spelling / acronyms):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. zero trust, zta, zero-trust architecture"
                    value={newQuestionAnswer}
                    onChange={(e) => setNewQuestionAnswer(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? '#0b0f19' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#1e293b',
                      borderRadius: '10px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* 4. SEQUENCE ORDER */}
              {questionType === 'sequence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                    Ordered Sequence Steps (Chronological Order 1 ➔ 4):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[1, 2, 3, 4].map((stepNum, idx) => (
                      <div
                        key={stepNum}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1',
                          background: isDark ? '#0b0f19' : '#ffffff'
                        }}
                      >
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: isDark ? '#2e1065' : '#ede9fe', color: isDark ? '#c4b5fd' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
                          {stepNum}
                        </span>
                        <input
                          type="text"
                          placeholder={`Step ${stepNum}...`}
                          value={sequenceSteps[idx]}
                          onChange={(e) => {
                            const next = [...sequenceSteps];
                            next[idx] = e.target.value;
                            setSequenceSteps(next);
                          }}
                          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: isDark ? '#f8fafc' : '#1e293b' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. DIAGRAM HOTSPOT */}
              {questionType === 'hotspot' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase' }}>
                    Target Security Component Label (Correct Hotspot Component):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CP-ABE Policy Engine or Encrypted Vault"
                    value={hotspotTarget}
                    onChange={(e) => setHotspotTarget(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1',
                      background: isDark ? '#0b0f19' : '#ffffff',
                      color: isDark ? '#f8fafc' : '#1e293b',
                      borderRadius: '10px',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Explanation Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                  Optional Explanation / Rubric Citation (Revealed upon quiz completion):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Evaluated per Section 4.2 of NPC Circular 16-03 guidelines."
                  value={newQuestionExplanation}
                  onChange={(e) => setNewQuestionExplanation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                    background: isDark ? '#0b0f19' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#1e293b',
                    borderRadius: '8px',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={!newQuestionPrompt.trim()}
                  className="adm-btn adm-btn-solid cq-btn--purple"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: !newQuestionPrompt.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  <span>Add Question to Assessment</span>
                </button>
              </div>
            </form>

            {/* =========================================================================
                QUESTION ROSTER LIST (Below Form)
                ========================================================================= */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 14px' }}>
              <span className="adm-label" style={{ fontSize: '12px', color: isDark ? '#cbd5e1' : '#334155' }}>
                QUESTION ROSTER ({activeQuiz.questions.length})
              </span>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              {activeQuiz.questions.length === 0 ? (
                <div
                  className="adm-state"
                  style={{
                    padding: '36px 20px',
                    background: isDark ? '#111827' : '#f8fafc',
                    borderRadius: '16px',
                    border: isDark ? '1px dashed rgba(255, 255, 255, 0.12)' : '1px dashed #cbd5e1'
                  }}
                >
                  <HelpCircle size={32} color="#8b5cf6" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <strong>No questions currently in this challenge.</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    Choose a question format above and click "Add Question to Assessment" to build out the roster.
                  </p>
                </div>
              ) : (
                activeQuiz.questions.map((q, idx) => {
                  const formatInfo = getFormatBadge(q.type);
                  return (
                    <div
                      key={q.id || idx}
                      className="trn-q"
                      style={{
                        background: isDark ? '#111827' : '#ffffff',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--cq-line)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      <div className="trn-q__top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="trn-q__n" style={{ color: '#8b5cf6', fontWeight: 800 }}>
                          #{idx + 1}
                        </span>
                        <span className={`adm-chip ${formatInfo.chip}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                          {formatInfo.label}
                        </span>
                        <button
                          type="button"
                          className="trn-link"
                          style={{ marginLeft: 'auto', color: '#ef4444', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            if (window.confirm('Delete this question from assessment?')) {
                              handleDeleteQuestion(activeQuiz.id, q.id);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>

                      <h3 style={{ margin: '10px 0 12px', fontSize: '15px', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b', lineHeight: 1.4 }}>
                        {q.prompt}
                      </h3>

                      {/* Kahoot 4-Tile Multiple Choice Options */}
                      {(q.type === 'kahoot' || q.type === 'multiple_choice') && q.options && (
                        <ul className="trn-tiles" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {q.options.map((opt, oi) => {
                            const isCorrect = oi === q.answer;
                            return (
                              <li
                                key={oi}
                                className={isCorrect ? 'ok' : ''}
                                style={{
                                  background: isCorrect
                                    ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5')
                                    : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
                                  color: isCorrect
                                    ? (isDark ? '#34d399' : '#065f46')
                                    : (isDark ? '#cbd5e1' : '#334155'),
                                  border: isCorrect
                                    ? '1px solid rgba(16, 185, 129, 0.4)'
                                    : (isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0'),
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '12.5px',
                                  fontWeight: 600
                                }}
                              >
                                <span>{String.fromCharCode(65 + oi)}.</span>
                                <span style={{ flex: 1 }}>{opt}</span>
                                {isCorrect && <Check size={14} color="#10b981" />}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Matching Pairs */}
                      {q.type === 'matching' && q.pairs && (
                        <div style={{ display: 'grid', gap: '6px', marginTop: '8px' }}>
                          {q.pairs.map((pair, pi) => (
                            <div
                              key={pi}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                                borderRadius: '8px',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                                fontSize: '12.5px'
                              }}
                            >
                              <span style={{ fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7', minWidth: '180px' }}>
                                {pair.left}
                              </span>
                              <span style={{ color: '#8b5cf6', fontWeight: 800 }}>➔</span>
                              <span style={{ color: isDark ? '#e2e8f0' : '#334155', flex: 1 }}>
                                {pair.right}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Identification */}
                      {q.accepted && (
                        <div style={{ fontSize: '13px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="adm-soft" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                            Accepted Answers:
                          </span>
                          <span style={{ fontWeight: 700, color: isDark ? '#fcd34d' : '#d97706', background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                            {q.accepted.join(' · ')}
                          </span>
                        </div>
                      )}

                      {/* Sequence Order */}
                      {q.steps && (
                        <ol className="trn-steps" style={{ margin: '8px 0 0', paddingLeft: '20px', display: 'grid', gap: '4px', fontSize: '13px', color: isDark ? '#cbd5e1' : '#334155' }}>
                          {q.steps.map((s, si) => (
                            <li key={si} style={{ fontWeight: 500 }}>{s}</li>
                          ))}
                        </ol>
                      )}

                      {/* Diagram Hotspot */}
                      {q.answerLabel && (
                        <div style={{ fontSize: '13px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="adm-soft" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                            Correct Target Component:
                          </span>
                          <span style={{ fontWeight: 700, color: isDark ? '#fb923c' : '#ea580c', background: isDark ? 'rgba(234, 88, 12, 0.15)' : '#ffedd5', padding: '2px 8px', borderRadius: '6px' }}>
                            {q.answerLabel}
                          </span>
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div style={{ marginTop: '10px', fontSize: '11.5px', color: isDark ? '#94a3b8' : '#64748b', fontStyle: 'italic', borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9', paddingTop: '8px' }}>
                          💡 <strong>Citation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="adm-state">Select an assessment from the left panel to edit its question roster.</div>
        )}
      </div>
    </div>
  );
}
