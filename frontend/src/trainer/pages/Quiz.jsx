import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTrainer } from '../TrainerContext';

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

  const [activeQuizId, setActiveQuizId] = useState(quizzes[0]?.id || 'q-sec');
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [newQuestionAnswer, setNewQuestionAnswer] = useState('');
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  // Multi-type question builder state
  const [questionType, setQuestionType] = useState('kahoot'); // 'kahoot' | 'identification' | 'sequence' | 'hotspot'
  const [kahootOptions, setKahootOptions] = useState(['', '', '', '']);
  const [kahootCorrectIdx, setKahootCorrectIdx] = useState(0);
  const [sequenceSteps, setSequenceSteps] = useState(['', '', '', '']);
  const [hotspotTarget, setHotspotTarget] = useState('');

  const activeQuiz = quizzes.find((q) => q.id === activeQuizId) || quizzes[0];

  if (loading && (!quizzes || quizzes.length === 0)) {
    return <div className="adm-state">Loading quiz studio...</div>;
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
      prompt: newQuestionPrompt.trim()
    };

    if (questionType === 'kahoot') {
      const validOpts = kahootOptions.map(o => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        alert('Please provide at least 2 options for multiple choice.');
        return;
      }
      payload.options = kahootOptions.map((o, idx) => o.trim() || `Option ${String.fromCharCode(65 + idx)}`);
      payload.answer = kahootCorrectIdx;
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
    setNewQuestionAnswer('');
    setKahootOptions(['', '', '', '']);
    setSequenceSteps(['', '', '', '']);
    setHotspotTarget('');
  };

  return (
    <div className="trn-split trn-split--quiz" style={{ marginTop: '24px' }}>
      {/* Left Column: Quiz Selector & Creation */}
      <div className="adm-panel trn-pad">
        <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
          <h2>Assessments ({quizzes.length})</h2>
          <button
            type="button"
            className="trn-link"
            style={{ fontSize: '11px' }}
            onClick={handleResetQuizzes}
            title="Reset quizzes to original defaults"
          >
            Reset Defaults
          </button>
        </div>

        <div className="trn-quizlist" style={{ marginTop: '16px' }}>
          {quizzes.map((q) => (
            <button
              key={q.id}
              type="button"
              className={q.id === activeQuiz?.id ? 'on' : ''}
              onClick={() => setActiveQuizId(q.id)}
            >
              <strong>{q.title}</strong>
              <small>{q.category} · {q.questions.length} questions</small>
            </button>
          ))}
        </div>

        {/* Create new quiz form */}
        <form onSubmit={onCreateQuiz} style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--cq-line)' }}>
          <label className="adm-label">CREATE NEW ASSESSMENT</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="Quiz title..."
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
              }}
            />
            <button
              type="submit"
              disabled={creatingQuiz || !newQuizTitle.trim()}
              className="adm-btn adm-btn-solid cq-btn--purple"
              style={{ padding: '10px 14px', fontSize: '12px' }}
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Active Quiz Details & Question List */}
      <div className="adm-panel trn-pad">
        {activeQuiz ? (
          <>
            <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
              <div>
                <h2>{activeQuiz.title}</h2>
                <span className="adm-mono">{activeQuiz.category} · ID: {activeQuiz.id}</span>
              </div>
              <span className="adm-chip adm-chip--green">
                {activeQuiz.questions.length} QUESTIONS
              </span>
            </div>

            {/* Assessment settings sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', margin: '20px 0', padding: '16px', background: isDark ? '#111827' : 'var(--cq-lav-2)', borderRadius: '16px', border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : 'none' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <span>TIME PER QUESTION</span>
                  <span>{activeQuiz.timePerQ}s</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={activeQuiz.timePerQ}
                  onChange={(e) => handleUpdateSettings(activeQuiz.id, { timePerQ: e.target.value })}
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <span>PASSING THRESHOLD</span>
                  <span>{activeQuiz.pass}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={activeQuiz.pass}
                  onChange={(e) => handleUpdateSettings(activeQuiz.id, { pass: e.target.value })}
                  style={{ width: '100%', marginTop: '6px' }}
                />
              </div>
            </div>

            {/* Questions header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 10px' }}>
              <span className="adm-label">QUESTION ROSTER</span>
            </div>

            {/* Add question form with Multi-Format Question Type Selector */}
            <form onSubmit={onAddQuestion} className="trn-draft" style={{ background: isDark ? '#111827' : '#f8fafc', border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Question Format:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'kahoot', label: 'Kahoot 4-Tile', icon: '🎴' },
                    { id: 'identification', label: 'Identification', icon: '✍️' },
                    { id: 'sequence', label: 'Sequence Order', icon: '🔢' },
                    { id: 'hotspot', label: 'Diagram Hotspot', icon: '🎯' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQuestionType(t.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: questionType === t.id ? '2px solid #7c3aed' : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                        background: questionType === t.id ? (isDark ? '#2e1065' : '#f5f3ff') : (isDark ? '#0b0f19' : '#ffffff'),
                        color: questionType === t.id ? (isDark ? '#c4b5fd' : '#6d28d9') : (isDark ? '#94a3b8' : '#475569'),
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569' }}>
                QUESTION PROMPT
                <input
                  type="text"
                  placeholder="e.g. Which control enforces 'never trust, always verify' on every request?"
                  value={newQuestionPrompt}
                  onChange={(e) => setNewQuestionPrompt(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1', background: isDark ? '#0b0f19' : '#ffffff', color: isDark ? '#f8fafc' : '#1e293b', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </label>

              {/* Dynamic Question Type Fields */}
              {questionType === 'kahoot' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                    4 MULTIPLE CHOICE OPTIONS (SELECT RADIO TO MARK CORRECT ANSWER):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {['A', 'B', 'C', 'D'].map((letter, idx) => (
                      <div 
                        key={letter} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '8px 12px', 
                          borderRadius: '10px', 
                          border: kahootCorrectIdx === idx ? '2px solid #10b981' : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1'),
                          background: kahootCorrectIdx === idx ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#0b0f19' : '#ffffff')
                        }}
                      >
                        <input
                          type="radio"
                          name="kahootCorrect"
                          checked={kahootCorrectIdx === idx}
                          onChange={() => setKahootCorrectIdx(idx)}
                          style={{ accentColor: '#10b981', cursor: 'pointer' }}
                        />
                        <strong style={{ fontSize: '12px', color: kahootCorrectIdx === idx ? (isDark ? '#6ee7b7' : '#059669') : (isDark ? '#94a3b8' : '#64748b') }}>{letter}.</strong>
                        <input
                          type="text"
                          placeholder={`Option ${letter}...`}
                          value={kahootOptions[idx]}
                          onChange={(e) => {
                            const next = [...kahootOptions];
                            next[idx] = e.target.value;
                            setKahootOptions(next);
                          }}
                          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', color: isDark ? '#f8fafc' : '#1e293b' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questionType === 'identification' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569' }}>
                  ACCEPTED ANSWER(S) (COMMA-SEPARATED FOR VARIANTS)
                  <input
                    type="text"
                    placeholder="e.g. zero trust, zta, zero-trust architecture"
                    value={newQuestionAnswer}
                    onChange={(e) => setNewQuestionAnswer(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1', background: isDark ? '#0b0f19' : '#ffffff', color: isDark ? '#f8fafc' : '#1e293b', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </label>
              )}

              {questionType === 'sequence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569' }}>
                    ORDERED SEQUENCE STEPS (CHRONOLOGICAL 1 &rarr; 4):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[1, 2, 3, 4].map((stepNum, idx) => (
                      <div key={stepNum} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1', background: isDark ? '#0b0f19' : '#ffffff' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: isDark ? '#2e1065' : '#ede9fe', color: isDark ? '#c4b5fd' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
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

              {questionType === 'hotspot' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569' }}>
                  TARGET SECURITY COMPONENT LABEL (HOTSPOT ANSWER)
                  <input
                    type="text"
                    placeholder="e.g. CP-ABE Payload Encryption with Cryptographic Isolation"
                    value={hotspotTarget}
                    onChange={(e) => setHotspotTarget(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', border: isDark ? '1.5px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #cbd5e1', background: isDark ? '#0b0f19' : '#ffffff', color: isDark ? '#f8fafc' : '#1e293b', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="submit"
                  disabled={!newQuestionPrompt.trim()}
                  className="adm-btn adm-btn-solid cq-btn--purple"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: !newQuestionPrompt.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)'
                  }}
                >
                  + Add {questionType === 'kahoot' ? 'Kahoot Question' : questionType === 'sequence' ? 'Sequence Question' : questionType === 'hotspot' ? 'Diagram Hotspot' : 'Identification Question'}
                </button>
              </div>
            </form>

            {/* Question cards */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {activeQuiz.questions.length === 0 ? (
                <div className="adm-state" style={{ padding: '24px 0' }}>
                  No questions currently in this challenge. Add questions using the form above.
                </div>
              ) : (
                activeQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="trn-q">
                    <div className="trn-q__top">
                      <span className="trn-q__n">#{idx + 1}</span>
                      <span className="adm-chip adm-chip--violet">{q.type.toUpperCase()}</span>
                      <button
                        type="button"
                        className="trn-link"
                        style={{ marginLeft: 'auto', color: '#d12a43', fontSize: '12px' }}
                        onClick={() => handleDeleteQuestion(activeQuiz.id, q.id)}
                      >
                        Delete
                      </button>
                    </div>

                    <h3>{q.prompt}</h3>

                    {q.options && (
                      <ul className="trn-tiles">
                        {q.options.map((opt, oi) => (
                          <li key={oi} className={oi === q.answer ? 'ok' : ''}>
                            <span>{String.fromCharCode(65 + oi)}.</span>
                            <span>{opt}</span>
                            {oi === q.answer && <span style={{ marginLeft: 'auto' }}>✓</span>}
                          </li>
                        ))}
                      </ul>
                    )}

                    {q.accepted && (
                      <div style={{ fontSize: '13px' }}>
                        <span className="adm-soft">Accepted answers: </span>
                        <strong>{q.accepted.join(', ')}</strong>
                      </div>
                    )}

                    {q.steps && (
                      <ol className="trn-steps">
                        {q.steps.map((s, si) => (
                          <li key={si}>{s}</li>
                        ))}
                      </ol>
                    )}

                    {q.answerLabel && (
                      <div style={{ fontSize: '13px' }}>
                        <span className="adm-soft">Correct Target: </span>
                        <strong>{q.answerLabel}</strong>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="adm-state">Select an assessment from the left panel.</div>
        )}
      </div>
    </div>
  );
}
