import React, { useState } from 'react';
import { useTrainer } from '../TrainerContext';

export default function Quiz() {
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
    if (!newQuestionPrompt.trim() || !newQuestionAnswer.trim() || !activeQuiz) return;
    await handleAddQuestion(activeQuiz.id, {
      prompt: newQuestionPrompt.trim(),
      answer: newQuestionAnswer.trim(),
    });
    setNewQuestionPrompt('');
    setNewQuestionAnswer('');
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
                border: '1px solid var(--cq-line)',
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', margin: '20px 0', padding: '16px', background: 'var(--cq-lav-2)', borderRadius: '16px' }}>
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

            {/* Add question form */}
            <form onSubmit={onAddQuestion} className="trn-draft">
              <label>
                QUESTION PROMPT
                <input
                  type="text"
                  placeholder="e.g. Which layer protects cross-tenant records?"
                  value={newQuestionPrompt}
                  onChange={(e) => setNewQuestionPrompt(e.target.value)}
                />
              </label>

              <label>
                ACCEPTED ANSWER
                <input
                  type="text"
                  placeholder="e.g. cp-abe or zero trust"
                  value={newQuestionAnswer}
                  onChange={(e) => setNewQuestionAnswer(e.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={!newQuestionPrompt.trim() || !newQuestionAnswer.trim()}
                className="adm-btn adm-btn-solid cq-btn--purple"
                style={{ fontSize: '12px', padding: '10px 16px' }}
              >
                + Add Question
              </button>
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
