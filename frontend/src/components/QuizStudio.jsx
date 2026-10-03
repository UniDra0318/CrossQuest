import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Award, 
  Layers, 
  BookOpen, 
  HelpCircle, 
  Link2, 
  Check, 
  ArrowRight,
  ListOrdered,
  FileQuestion,
  FileText,
  Eye
} from 'lucide-react';
import { 
  getActiveQuizDatabase, 
  saveQuizToStorage, 
  addQuestionToQuizStorage, 
  deleteQuestionFromQuizStorage, 
  resetQuizDatabaseToDefaults 
} from '../data/quizDatabase';

const QUESTION_TYPES = [
  { id: 'multiple_choice', label: 'Kahoot 4-Tile Choices', icon: Layers, badgeClass: 'tag-choice' },
  { id: 'matching', label: 'Matching Pairs (Column A ➔ B)', icon: Link2, badgeClass: 'tag-matching' },
  { id: 'identification', label: 'Identification (Direct Term)', icon: FileText, badgeClass: 'tag-input' },
  { id: 'sequence_order', label: 'Sequence Reordering', icon: ListOrdered, badgeClass: 'tag-sequence' },
  { id: 'diagram_analysis', label: 'Diagram Hotspot Analysis', icon: Eye, badgeClass: 'tag-diagram' }
];

export default function QuizStudio() {
  const [quizDb, setQuizDb] = useState(() => getActiveQuizDatabase());
  const [selectedQuizId, setSelectedQuizId] = useState('act-1');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewQuizModal, setShowNewQuizModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // New question form state
  const [qType, setQType] = useState('multiple_choice');
  const [qPrompt, setQPrompt] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  
  // For multiple_choice & diagram_analysis
  const [mcOptions, setMcOptions] = useState(['', '', '', '']);
  const [mcCorrectIdx, setMcCorrectIdx] = useState(0);
  const [diagramType, setDiagramType] = useState('security_pipeline');

  // For identification
  const [identAnswers, setIdentAnswers] = useState('');
  const [identPlaceholder, setIdentPlaceholder] = useState('');

  // For sequence_order
  const [seqSteps, setSeqSteps] = useState(['', '', '', '']);

  // For matching
  const [matchingPairs, setMatchingPairs] = useState([
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' }
  ]);

  // New Quiz state
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizCategory, setNewQuizCategory] = useState('Enterprise Security');
  const [newQuizDesc, setNewQuizDesc] = useState('');
  const [newQuizTime, setNewQuizTime] = useState(45);
  const [newQuizPassing, setNewQuizPassing] = useState(80);
  const [newQuizColor, setNewQuizColor] = useState('#772ce8');

  const selectedQuiz = quizDb[selectedQuizId] || Object.values(quizDb)[0];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectQuiz = (quizId) => {
    setSelectedQuizId(quizId);
  };

  // Delete question
  const handleDeleteQuestion = (questionId) => {
    if (window.confirm("Are you sure you want to remove this question from the assessment pool?")) {
      const updatedQuiz = deleteQuestionFromQuizStorage(selectedQuizId, questionId);
      if (updatedQuiz) {
        setQuizDb(getActiveQuizDatabase());
        showToast("Question deleted from assessment pool.");
      }
    }
  };

  // Reset all to defaults
  const handleResetDefaults = () => {
    if (window.confirm("Reset all course quizzes and questions back to the default certified curriculum? Custom authored questions will be removed.")) {
      const defaults = resetQuizDatabaseToDefaults();
      setQuizDb(defaults);
      showToast("Quiz database restored to verified default syllabus.");
    }
  };

  // Add question submission
  const handleCreateQuestionSubmit = (e) => {
    e.preventDefault();
    if (!qPrompt.trim()) {
      alert("Please provide the question prompt.");
      return;
    }

    const uniqueId = `q-${Date.now().toString(36)}`;
    let questionObj = {
      id: uniqueId,
      type: qType,
      question: qPrompt.trim(),
      explanation: qExplanation.trim() || 'Verified by Lead Course Instructor.'
    };

    if (qType === 'multiple_choice') {
      const filtered = mcOptions.map(o => o.trim()).filter(Boolean);
      if (filtered.length < 2) {
        alert("Please provide at least 2 choice options.");
        return;
      }
      questionObj.options = filtered;
      questionObj.correctAnswer = Math.min(mcCorrectIdx, filtered.length - 1);
    } else if (qType === 'diagram_analysis') {
      const filtered = mcOptions.map(o => o.trim()).filter(Boolean);
      if (filtered.length < 2) {
        alert("Please provide at least 2 choice options.");
        return;
      }
      questionObj.diagramType = diagramType;
      questionObj.options = filtered;
      questionObj.correctAnswer = Math.min(mcCorrectIdx, filtered.length - 1);
    } else if (qType === 'identification') {
      const answersList = identAnswers
        .split(',')
        .map(a => a.trim().toLowerCase())
        .filter(Boolean);

      if (answersList.length === 0) {
        alert("Please enter at least one accepted answer.");
        return;
      }
      questionObj.acceptedAnswers = answersList;
      questionObj.placeholder = identPlaceholder.trim() || 'Type your answer here...';
    } else if (qType === 'sequence_order') {
      const filteredSteps = seqSteps.map(s => s.trim()).filter(Boolean);
      if (filteredSteps.length < 2) {
        alert("Please enter at least 2 chronological sequence steps.");
        return;
      }
      questionObj.correctOrder = filteredSteps;
      questionObj.initialOrder = [...filteredSteps].sort(() => 0.5 - Math.random());
    } else if (qType === 'matching') {
      const validPairs = matchingPairs
        .filter(p => p.left.trim() && p.right.trim())
        .map((p, pIdx) => ({
          id: `m-cust-${pIdx}-${Date.now().toString(36)}`,
          left: p.left.trim(),
          right: p.right.trim()
        }));

      if (validPairs.length < 2) {
        alert("Please provide at least 2 complete pairs for Column A and Column B.");
        return;
      }
      questionObj.pairs = validPairs;
    }

    addQuestionToQuizStorage(selectedQuizId, questionObj);
    setQuizDb(getActiveQuizDatabase());
    setShowAddModal(false);
    showToast(`Added new ${qType} question to ${selectedQuiz.title}!`);

    // Reset inputs
    setQPrompt('');
    setQExplanation('');
    setMcOptions(['', '', '', '']);
    setIdentAnswers('');
    setSeqSteps(['', '', '', '']);
    setMatchingPairs([
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' }
    ]);
  };

  // Create New Quiz
  const handleCreateNewQuiz = (e) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) {
      alert("Please enter a quiz title.");
      return;
    }

    const newId = `quiz-${Date.now().toString(36)}`;
    const newQuizObj = {
      id: newId,
      title: newQuizTitle.trim(),
      instructor: 'Lead Trainer David Lim',
      category: newQuizCategory.trim(),
      headerColor: newQuizColor,
      timePerQuestion: parseInt(newQuizTime) || 45,
      passingScore: parseInt(newQuizPassing) || 80,
      badgeAwarded: 'crypto_knight',
      description: newQuizDesc.trim() || 'Custom enterprise training module published by Lead Course Instructor.',
      learningObjectives: [
        'Master essential zero-trust compliance standards',
        'Verify enterprise cryptographic isolation policies',
        'Evaluate access anomaly detection indicators'
      ],
      questions: []
    };

    saveQuizToStorage(newQuizObj);
    setQuizDb(getActiveQuizDatabase());
    setSelectedQuizId(newId);
    setShowNewQuizModal(false);
    showToast(`Created new assessment: "${newQuizObj.title}"`);
    
    // Reset form
    setNewQuizTitle('');
    setNewQuizDesc('');
  };

  return (
    <div className="quiz-studio-layout">
      {toastMessage && (
        <div className="card notice-box mb-16 flex-between animate-fadeIn">
          <div className="flex-align gap-8">
            <CheckCircle2 size={16} className="text-emerald" />
            <span className="font-semibold text-sm">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* TOP ACTION HEADER */}
      <div className="studio-top-bar flex-between mb-20">
        <div>
          <h2 className="studio-main-title flex-align gap-10">
            <Sparkles className="text-purple" size={24} />
            <span>Quiz & Assessment Creator Studio</span>
          </h2>
          <p className="studio-subtitle text-secondary text-sm">
            Author custom quizzes, add questions across 5 interactive types (Matching, Kahoot tiles, Identification, etc.), and calibrate scoring.
          </p>
        </div>

        <div className="flex-align gap-10">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleResetDefaults}
            title="Restore syllabus default question bank"
          >
            <RotateCcw size={14} />
            <span>Reset to Defaults</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewQuizModal(true)}
          >
            <Plus size={15} />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>

      <div className="studio-grid-container">
        {/* LEFT PANE: QUIZ SELECTOR ROSTER */}
        <div className="studio-sidebar-pane">
          <div className="pane-header flex-between mb-12">
            <span className="pane-title text-xs font-bold text-secondary uppercase tracking-wider">
              Course Assessments ({Object.keys(quizDb).length})
            </span>
          </div>

          <div className="quiz-selection-list">
            {Object.values(quizDb).map((q) => {
              const isSelected = q.id === selectedQuizId;
              const qCount = q.questions ? q.questions.length : 0;

              return (
                <div
                  key={q.id}
                  className={`quiz-selector-card ${isSelected ? 'selected-quiz-card' : ''}`}
                  onClick={() => handleSelectQuiz(q.id)}
                  style={{ borderLeftColor: q.headerColor || '#772ce8' }}
                >
                  <div className="flex-between mb-6">
                    <span className="quiz-category-chip" style={{ color: q.headerColor || '#772ce8' }}>
                      {q.category}
                    </span>
                    <span className="quiz-count-pill">{qCount} Qs</span>
                  </div>

                  <h4 className="quiz-card-title">{q.title}</h4>

                  <div className="quiz-card-footer flex-between mt-8 text-xs text-secondary">
                    <span className="flex-align gap-4">
                      <Clock size={11} /> {q.timePerQuestion}s/Q
                    </span>
                    <span className="flex-align gap-4">
                      <Award size={11} /> Pass: {q.passingScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: ACTIVE ASSESSMENT DETAILS & QUESTIONS POOL */}
        <div className="studio-main-pane">
          {selectedQuiz && (
            <>
              {/* QUIZ BANNER & STATS */}
              <div className="quiz-banner-card card mb-20" style={{ borderTop: `4px solid ${selectedQuiz.headerColor || '#772ce8'}` }}>
                <div className="flex-between mb-8">
                  <div className="flex-align gap-8">
                    <span className="badge badge-purple">{selectedQuiz.category}</span>
                    <span className="badge badge-blue">Supervised by: {selectedQuiz.instructor}</span>
                  </div>
                  <span className="badge badge-green font-bold">
                    {selectedQuiz.questions ? selectedQuiz.questions.length : 0} Questions Live in Bank
                  </span>
                </div>

                <h3 className="quiz-banner-heading">{selectedQuiz.title}</h3>
                <p className="text-secondary text-sm mb-16">{selectedQuiz.description}</p>

                <div className="quiz-metrics-bar flex-between pt-12 border-top">
                  <div className="flex-align gap-16 text-xs text-secondary">
                    <span className="flex-align gap-6">
                      <Clock size={13} className="text-purple" />
                      <strong>Time Limit:</strong> {selectedQuiz.timePerQuestion} seconds / Question
                    </span>
                    <span className="flex-align gap-6">
                      <Award size={13} className="text-gold" />
                      <strong>Passing Threshold:</strong> {selectedQuiz.passingScore}%
                    </span>
                  </div>

                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm flex-align gap-6"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={15} />
                    <span>Add Question to Assessment</span>
                  </button>
                </div>
              </div>

              {/* QUESTIONS POOL LIST */}
              <div className="questions-pool-container">
                <div className="flex-between mb-12">
                  <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">
                    Question Items Pool ({selectedQuiz.questions ? selectedQuiz.questions.length : 0})
                  </h4>
                  <span className="text-xs text-secondary">Randomized order applied during trainee attempts</span>
                </div>

                {(!selectedQuiz.questions || selectedQuiz.questions.length === 0) ? (
                  <div className="card text-center p-32 text-secondary">
                    <FileQuestion size={40} className="mx-auto mb-12 text-secondary opacity-50" />
                    <h4>No Questions Yet</h4>
                    <p className="text-sm mb-16">Click "Add Question to Assessment" above to create the first question item.</p>
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Plus size={14} /> Add First Question
                    </button>
                  </div>
                ) : (
                  <div className="questions-stack">
                    {selectedQuiz.questions.map((q, idx) => {
                      const typeConfig = QUESTION_TYPES.find(t => t.id === q.type) || QUESTION_TYPES[0];
                      const TypeIcon = typeConfig.icon;

                      return (
                        <div key={q.id || idx} className="card question-pool-card mb-12">
                          <div className="flex-between mb-8">
                            <div className="flex-align gap-8">
                              <span className="question-seq-num">#{idx + 1}</span>
                              <span className={`type-tag ${typeConfig.badgeClass}`}>
                                <TypeIcon size={12} />
                                <span>{typeConfig.label}</span>
                              </span>
                            </div>

                            <button 
                              type="button" 
                              className="btn-icon-danger"
                              onClick={() => handleDeleteQuestion(q.id)}
                              title="Delete question from quiz"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="question-prompt-text font-semibold text-sm mb-12 text-slate-800">
                            {q.question}
                          </div>

                          {/* Preview Details Based on Type */}
                          {q.type === 'multiple_choice' && Array.isArray(q.options) && (
                            <div className="grid-2-col gap-8 mb-10 text-xs">
                              {q.options.map((opt, oIdx) => (
                                <div 
                                  key={oIdx} 
                                  className={`p-6 rounded border flex-between ${oIdx === q.correctAnswer ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : 'bg-slate-50 text-slate-600'}`}
                                >
                                  <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                  {oIdx === q.correctAnswer && <Check size={12} className="text-emerald" />}
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'matching' && Array.isArray(q.pairs) && (
                            <div className="matching-preview-pairs mb-10 text-xs">
                              {q.pairs.map((p, pIdx) => (
                                <div key={p.id || pIdx} className="matching-pair-row flex-align gap-8 p-6 bg-slate-50 rounded mb-4">
                                  <span className="font-semibold text-purple">{pIdx + 1}. {p.left}</span>
                                  <span className="text-secondary font-bold">➔</span>
                                  <span className="font-semibold text-cyan">[{String.fromCharCode(65 + pIdx)}] {p.right}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'identification' && (
                            <div className="ident-preview-box mb-10 text-xs p-8 bg-slate-50 rounded">
                              <span className="text-secondary">Accepted Answers: </span>
                              <strong className="text-purple">{(q.acceptedAnswers || []).join(' | ')}</strong>
                            </div>
                          )}

                          {q.type === 'sequence_order' && Array.isArray(q.correctOrder) && (
                            <div className="seq-preview-steps mb-10 text-xs">
                              {q.correctOrder.map((step, sIdx) => (
                                <div key={sIdx} className="seq-preview-item flex-align gap-6 p-4 text-slate-700">
                                  <span className="step-num-pill">{sIdx + 1}</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'diagram_analysis' && (
                            <div className="diagram-preview-box mb-10 text-xs p-6 bg-slate-50 rounded flex-between">
                              <span className="text-secondary">Diagram Type: <strong>{q.diagramType || 'security_pipeline'}</strong></span>
                              <span className="text-emerald font-semibold">Correct: {q.options ? q.options[q.correctAnswer] : ''}</span>
                            </div>
                          )}

                          {/* Explanation footer */}
                          {q.explanation && (
                            <div className="question-explanation-text text-xs text-secondary pt-8 border-top flex-align gap-6">
                              <HelpCircle size={12} className="text-purple flex-shrink-0" />
                              <span>{q.explanation}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD QUESTION BUILDER
          ========================================================================= */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-lg animate-scaleIn">
            <div className="modal-header flex-between">
              <div>
                <h3 className="modal-title flex-align gap-8">
                  <Sparkles size={18} className="text-purple" />
                  <span>Add Question to {selectedQuiz?.title}</span>
                </h3>
                <p className="text-secondary text-xs">
                  Choose an interactive question mechanism and define answers.
                </p>
              </div>
              <button 
                type="button" 
                className="btn-icon-ghost"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuestionSubmit} className="modal-form-body p-20">
              {/* 1. QUESTION TYPE SELECTOR */}
              <div className="form-group mb-16">
                <label className="field-label mb-8 font-bold text-xs uppercase tracking-wider text-secondary">
                  1. Select Question Mechanism / Format
                </label>
                <div className="grid-3-col gap-10">
                  {QUESTION_TYPES.map(t => {
                    const isTypeSelected = qType === t.id;
                    const Icon = t.icon;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`qtype-select-btn ${isTypeSelected ? 'qtype-active' : ''}`}
                        onClick={() => setQType(t.id)}
                      >
                        <Icon size={16} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. QUESTION PROMPT */}
              <div className="form-group mb-16">
                <label className="field-label mb-6 font-bold text-xs uppercase tracking-wider text-secondary">
                  2. Question Prompt / Scenario
                </label>
                <textarea
                  className="clean-input w-full"
                  rows={2}
                  required
                  placeholder="e.g. Match each Security Architecture Component in Column A with its exact Enterprise Function in Column B:"
                  value={qPrompt}
                  onChange={(e) => setQPrompt(e.target.value)}
                />
              </div>

              {/* 3. DYNAMIC TYPE FIELDS */}

              {/* CASE A: MATCHING QUESTION BUILDER */}
              {qType === 'matching' && (
                <div className="form-group mb-16 bg-slate-50 p-14 rounded-lg border border-slate-200">
                  <div className="flex-between mb-10">
                    <label className="font-bold text-xs uppercase tracking-wider text-purple flex-align gap-6">
                      <Link2 size={14} />
                      <span>Configure Column A and Column B Pairs</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs flex-align gap-4"
                      onClick={() => setMatchingPairs([...matchingPairs, { left: '', right: '' }])}
                      disabled={matchingPairs.length >= 6}
                    >
                      <Plus size={12} /> Add Pair
                    </button>
                  </div>
                  <p className="text-xs text-secondary mb-12">
                    Enter the term/component on the left, and its matching definition/function on the right. Both columns will be randomly scrambled for trainees.
                  </p>

                  <div className="matching-builder-stack">
                    {matchingPairs.map((pair, pIdx) => (
                      <div key={pIdx} className="matching-pair-input-row flex-align gap-8 mb-8">
                        <span className="badge badge-purple flex-shrink-0 font-bold">{pIdx + 1}</span>
                        <input
                          type="text"
                          className="clean-input flex-1"
                          placeholder={`Column A #${pIdx + 1} (e.g. CP-ABE Ciphertext Encryption)`}
                          value={pair.left}
                          onChange={(e) => {
                            const updated = [...matchingPairs];
                            updated[pIdx].left = e.target.value;
                            setMatchingPairs(updated);
                          }}
                          required
                        />
                        <span className="text-secondary font-bold">➔</span>
                        <input
                          type="text"
                          className="clean-input flex-1"
                          placeholder={`Column B [${String.fromCharCode(65 + pIdx)}] (e.g. Cryptographic policy tree bound to payload)`}
                          value={pair.right}
                          onChange={(e) => {
                            const updated = [...matchingPairs];
                            updated[pIdx].right = e.target.value;
                            setMatchingPairs(updated);
                          }}
                          required
                        />
                        {matchingPairs.length > 2 && (
                          <button
                            type="button"
                            className="btn-icon-danger flex-shrink-0"
                            onClick={() => {
                              const updated = matchingPairs.filter((_, idx) => idx !== pIdx);
                              setMatchingPairs(updated);
                            }}
                            title="Remove pair"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CASE B: MULTIPLE CHOICE 4-TILE BUILDER */}
              {(qType === 'multiple_choice' || qType === 'diagram_analysis') && (
                <div className="form-group mb-16 bg-slate-50 p-14 rounded-lg border border-slate-200">
                  {qType === 'diagram_analysis' && (
                    <div className="mb-12">
                      <label className="field-label text-xs font-bold text-secondary mb-4">
                        Architectural Diagram Focus
                      </label>
                      <select 
                        className="clean-input w-full"
                        value={diagramType}
                        onChange={(e) => setDiagramType(e.target.value)}
                      >
                        <option value="security_pipeline">Zero-Trust Pipeline (Network ➔ CP-ABE ➔ Database)</option>
                        <option value="access_hierarchy">Authority Key Hierarchy (Master Key ➔ Staff Clearance)</option>
                        <option value="tenant_partition">Multi-Tenant Partition (Tenant Isolation & RLS Boundary)</option>
                      </select>
                    </div>
                  )}

                  <label className="font-bold text-xs uppercase tracking-wider text-blue mb-8 block">
                    Choice Options (Select Radio for the Correct Answer)
                  </label>

                  <div className="grid-2-col gap-10">
                    {mcOptions.map((opt, oIdx) => {
                      const colors = [
                        { label: 'Red ▲', color: '#e21b3c' },
                        { label: 'Blue ◆', color: '#1368ce' },
                        { label: 'Yellow ●', color: '#d89e00' },
                        { label: 'Green ■', color: '#26890c' }
                      ];

                      return (
                        <div key={oIdx} className="choice-option-input-box p-8 bg-white rounded border flex-align gap-8">
                          <input
                            type="radio"
                            name="mc_correct_choice"
                            checked={mcCorrectIdx === oIdx}
                            onChange={() => setMcCorrectIdx(oIdx)}
                            className="radio-accent"
                            title="Mark as correct answer"
                          />
                          <span className="font-bold text-xs flex-shrink-0" style={{ color: colors[oIdx].color }}>
                            {colors[oIdx].label}:
                          </span>
                          <input
                            type="text"
                            className="clean-input flex-1"
                            placeholder={`Option ${oIdx + 1}...`}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...mcOptions];
                              updated[oIdx] = e.target.value;
                              setMcOptions(updated);
                            }}
                            required
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CASE C: IDENTIFICATION BUILDER */}
              {qType === 'identification' && (
                <div className="form-group mb-16 bg-slate-50 p-14 rounded-lg border border-slate-200">
                  <label className="font-bold text-xs uppercase tracking-wider text-purple mb-8 block">
                    Accepted Answers & Input Hint
                  </label>
                  <div className="mb-8">
                    <label className="field-label text-xs mb-2">Accepted Answers (Comma-separated variations)</label>
                    <input
                      type="text"
                      className="clean-input w-full"
                      placeholder="e.g. zero trust, zta, zero-trust architecture"
                      value={identAnswers}
                      onChange={(e) => setIdentAnswers(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label text-xs mb-2">Input Field Placeholder / Hint</label>
                    <input
                      type="text"
                      className="clean-input w-full"
                      placeholder="e.g. Type the security model name..."
                      value={identPlaceholder}
                      onChange={(e) => setIdentPlaceholder(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* CASE D: SEQUENCE ORDERING BUILDER */}
              {qType === 'sequence_order' && (
                <div className="form-group mb-16 bg-slate-50 p-14 rounded-lg border border-slate-200">
                  <div className="flex-between mb-8">
                    <label className="font-bold text-xs uppercase tracking-wider text-green flex-align gap-6">
                      <ListOrdered size={14} />
                      <span>Enter Steps in Correct Chronological Order</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs flex-align gap-4"
                      onClick={() => setSeqSteps([...seqSteps, ''])}
                      disabled={seqSteps.length >= 6}
                    >
                      <Plus size={12} /> Add Step
                    </button>
                  </div>
                  <p className="text-xs text-secondary mb-10">
                    Define the steps in solved order. The system will automatically scramble them when presenting to trainees.
                  </p>
                  <div className="seq-builder-stack">
                    {seqSteps.map((step, sIdx) => (
                      <div key={sIdx} className="seq-step-input-row flex-align gap-8 mb-6">
                        <span className="step-num-pill">{sIdx + 1}</span>
                        <input
                          type="text"
                          className="clean-input flex-1"
                          placeholder={`Step #${sIdx + 1} description...`}
                          value={step}
                          onChange={(e) => {
                            const updated = [...seqSteps];
                            updated[sIdx] = e.target.value;
                            setSeqSteps(updated);
                          }}
                          required
                        />
                        {seqSteps.length > 2 && (
                          <button
                            type="button"
                            className="btn-icon-danger flex-shrink-0"
                            onClick={() => {
                              const updated = seqSteps.filter((_, idx) => idx !== sIdx);
                              setSeqSteps(updated);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. EXPLANATION & ANALYSIS */}
              <div className="form-group mb-20">
                <label className="field-label mb-6 font-bold text-xs uppercase tracking-wider text-secondary">
                  4. Solution Explanation & Technical Analysis
                </label>
                <textarea
                  className="clean-input w-full"
                  rows={2}
                  placeholder="Explain why this answer is correct, referencing cryptographic policy, zero-trust principles, or DPA compliance..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                />
              </div>

              {/* MODAL ACTIONS */}
              <div className="modal-actions flex-between pt-16 border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-align gap-6"
                >
                  <Save size={15} />
                  <span>Save Question to Assessment Pool</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CREATE NEW QUIZ
          ========================================================================= */}
      {showNewQuizModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-md animate-scaleIn">
            <div className="modal-header flex-between">
              <div>
                <h3 className="modal-title flex-align gap-8">
                  <BookOpen size={18} className="text-purple" />
                  <span>Create New Course Assessment</span>
                </h3>
                <p className="text-secondary text-xs">
                  Create a new certified module curriculum for client cohorts.
                </p>
              </div>
              <button 
                type="button" 
                className="btn-icon-ghost"
                onClick={() => setShowNewQuizModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewQuiz} className="modal-form-body p-20">
              <div className="form-group mb-12">
                <label className="field-label text-xs mb-4 font-bold text-secondary uppercase">
                  Assessment Title
                </label>
                <input
                  type="text"
                  className="clean-input w-full"
                  required
                  placeholder="e.g. Advanced Incident Containment & Forensics"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                />
              </div>

              <div className="grid-2-col gap-12 mb-12">
                <div>
                  <label className="field-label text-xs mb-4 font-bold text-secondary uppercase">
                    Category
                  </label>
                  <input
                    type="text"
                    className="clean-input w-full"
                    placeholder="e.g. Incident Response"
                    value={newQuizCategory}
                    onChange={(e) => setNewQuizCategory(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label text-xs mb-4 font-bold text-secondary uppercase">
                    Header Color Theme
                  </label>
                  <select 
                    className="clean-input w-full"
                    value={newQuizColor}
                    onChange={(e) => setNewQuizColor(e.target.value)}
                  >
                    <option value="#772ce8">Purple (Security & Cryptography)</option>
                    <option value="#1368ce">Blue (Enterprise Audit)</option>
                    <option value="#06d6a0">Emerald (Access Control)</option>
                    <option value="#e21b3c">Crimson (Privacy Management)</option>
                    <option value="#d89e00">Gold (Compliance Standard)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2-col gap-12 mb-12">
                <div>
                  <label className="field-label text-xs mb-4 font-bold text-secondary uppercase">
                    Time Per Question (Seconds)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    className="clean-input w-full"
                    value={newQuizTime}
                    onChange={(e) => setNewQuizTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label text-xs mb-4 font-bold text-secondary uppercase">
                    Passing Score Standard (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    className="clean-input w-full"
                    value={newQuizPassing}
                    onChange={(e) => setNewQuizPassing(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group mb-16">
                <label className="field-label text-xs mb-4 font-bold text-secondary uppercase">
                  Assessment Background & Objectives
                </label>
                <textarea
                  className="clean-input w-full"
                  rows={3}
                  placeholder="Outline the scenario, threat landscape, and target security capabilities tested in this assessment..."
                  value={newQuizDesc}
                  onChange={(e) => setNewQuizDesc(e.target.value)}
                />
              </div>

              <div className="modal-actions flex-between pt-16 border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewQuizModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-align gap-6"
                >
                  <Save size={15} />
                  <span>Publish Assessment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
