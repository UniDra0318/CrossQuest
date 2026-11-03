import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { TableEmptyRow } from '../../components/TableEmptyState';
import { useTrainer } from '../TrainerContext';

export default function Grade() {
  const {
    sessions,
    selectedSessionId,
    setSelectedSessionId,
    handleSignOffSession,
    roster,
    selectedTraineeId,
    setSelectedTraineeId,
    handleGrade,
    RUBRIC,
    PASS_MARK,
    tierFor,
    loading,
  } = useTrainer();

  // Active session
  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  // Local state for pending sign-off edits
  const [completions, setCompletions] = useState({});
  const [signOffNotes, setSignOffNotes] = useState('');
  const [signingOff, setSigningOff] = useState(false);
  const [signOffResult, setSignOffResult] = useState(null);
  const [signOffError, setSignOffError] = useState(null);

  // Initialize/sync completions from current session records
  useEffect(() => {
    if (currentSession && currentSession.records) {
      const initial = {};
      currentSession.records.forEach((rec) => {
        initial[rec.record_id] = {
          status: rec.status === 'Completed' ? 'Completed' : 'Completed', // default to Completed for review
          score: rec.score ?? 85,
        };
      });
      setCompletions(initial);
      setSignOffNotes(currentSession.trainer_sign_off_notes || 'All enrolled cohort trainees demonstrated practical competency and fulfilled curriculum standards.');
      setSignOffResult(null);
      setSignOffError(null);
    }
  }, [currentSession?.id]);

  // Individual evaluation trainee
  const currentTrainee = roster.find((r) => r.id === selectedTraineeId) || roster[0];
  const [score, setScore] = useState(currentTrainee?.score ?? 85);
  const [rubric, setRubric] = useState([0, 1, 2, 3]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [indivNotification, setIndivNotification] = useState(null);

  useEffect(() => {
    if (currentTrainee) {
      setScore(currentTrainee.score ?? 85);
      setRemarks('');
      setIndivNotification(null);
    }
  }, [selectedTraineeId]);

  if (loading && (!sessions || sessions.length === 0)) {
    return <div className="adm-state">Loading training session workbench...</div>;
  }

  // Toggle completion decision for a specific attendee in session roster
  const toggleAttendeeStatus = (recordId, newStatus) => {
    setCompletions((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { score: 85 }),
        status: newStatus,
      },
    }));
  };

  const handleAttendeeScoreChange = (recordId, newScore) => {
    const val = Math.min(100, Math.max(0, Number(newScore) || 0));
    setCompletions((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || { status: 'Completed' }),
        score: val,
      },
    }));
  };

  // Submit session-level sign-off
  const onExecuteSignOff = async (e) => {
    e.preventDefault();
    if (!currentSession) return;
    if (currentSession.is_future_dated) {
      setSignOffError('Future-dated sessions cannot be signed off before the scheduled training date (Asia/Manila timezone).');
      return;
    }

    setSigningOff(true);
    setSignOffError(null);
    setSignOffResult(null);

    try {
      const payload = {
        notes: signOffNotes,
        completions: Object.entries(completions).map(([recordId, data]) => ({
          record_id: recordId,
          status: data.status,
          score: data.score,
        })),
      };

      const res = await handleSignOffSession(currentSession.id, payload);
      setSignOffResult({
        sessionCode: currentSession.session_code,
        certificatesIssued: res.certificates_issued ?? res.participants_updated ?? 1,
        participantsUpdated: res.participants_updated ?? 1,
        message: 'Training session officially signed off! Official certificates with verifiable serial IDs (AAAYYYYMMDD-01) have been generated.',
      });
    } catch (err) {
      setSignOffError(err.message || 'Failed to sign off training session.');
    } finally {
      setSigningOff(false);
    }
  };

  // Individual evaluation submission
  const onIndividualSubmit = async (e) => {
    e.preventDefault();
    if (!currentTrainee) return;
    setSubmitting(true);
    setIndivNotification(null);
    try {
      await handleGrade(currentTrainee.id, {
        score: Number(score),
        rubric,
        remarks,
      });
      setIndivNotification({
        type: 'success',
        msg: `Saved evaluation grade for ${currentTrainee.name}! Official certificate generation is unlocked upon single session-level sign-off.`,
      });
    } catch (err) {
      setIndivNotification({
        type: 'error',
        msg: err.message || 'Failed to submit grade.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentTier = tierFor(score);

  return (
    <>
      {/* =========================================================================
          MODULE 1: TRAINER SESSION SIGN-OFF & COMPLETION GATE (FR-13, FR-16, DAT-04, U-17)
          ========================================================================= */}
      <div className="adm-panel" style={{ marginTop: '20px', borderLeft: '4px solid #6366f1' }}>
        <div className="adm-panel__head" style={{ borderBottom: '1px solid var(--cq-line, #eee)', padding: '16px 20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="adm-label" style={{ color: '#6366f1', fontWeight: 800 }}>
                TRAINER SESSION SIGN-OFF & COMPLETION GATE
              </span>
              <span className="adm-chip adm-chip--amber">FR-13 / FR-16 COMPLIANT</span>
              <span className="adm-chip adm-chip--blue">ASIA/MANILA (UTC+8)</span>
            </div>
            <h2 style={{ margin: '6px 0 2px', fontSize: '18px', fontWeight: 800 }}>
              Cohort Roster Review & Batch Certificate Issuance
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cq-sub, #64748b)' }}>
              Trainers sign off once per training session to confirm each participant's completion status. Confirmed participants transition to <strong>Completed</strong> and receive official certificates (AAAYYYYMMDD-01).
            </p>
          </div>
        </div>

        {/* Session Selector Strip */}
        <div style={{ padding: '14px 20px', background: 'rgba(99, 102, 241, 0.04)', borderBottom: '1px solid var(--cq-line, #eee)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            SELECT ASSIGNED TRAINING SESSION:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {sessions.map((sess) => {
              const isSelected = currentSession?.id === sess.id;
              return (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => setSelectedSessionId(sess.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #6366f1' : '1px solid #cbd5e1',
                    background: isSelected ? '#ffffff' : '#f8fafc',
                    boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: isSelected ? '#6366f1' : '#1e293b' }}>
                      {sess.session_code}
                    </strong>
                    {sess.is_future_dated ? (
                      <span className="adm-chip adm-chip--orange" style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                        LOCK: FUTURE
                      </span>
                    ) : sess.trainer_signed_off ? (
                      <span className="adm-chip adm-chip--green" style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                        SIGNED OFF
                      </span>
                    ) : (
                      <span className="adm-chip adm-chip--amber" style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                        PENDING SIGN-OFF
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sess.course_name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Session Details Banner */}
        {currentSession && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--cq-line, #eee)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="adm-label" style={{ fontSize: '10px', color: '#64748b' }}>COURSE & COHORT</span>
                <h3 style={{ margin: '2px 0', fontSize: '16px', fontWeight: 800 }}>{currentSession.course_name}</h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  <span>Code: <strong>{currentSession.session_code}</strong></span>
                  <span>Schedule: <strong>{new Date(currentSession.start_date).toLocaleDateString()} &mdash; {new Date(currentSession.end_date).toLocaleDateString()}</strong></span>
                  <span>Type: <strong>{currentSession.delivery_type}</strong></span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="adm-label" style={{ fontSize: '10px', color: '#64748b' }}>ROSTER SUMMARY</span>
                <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
                  {currentSession.records?.length || 0} Enrolled Attendees
                </div>
                <div style={{ fontSize: '12px', color: currentSession.trainer_signed_off ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                  {currentSession.completed_count || 0} Certified / Completed
                </div>
              </div>
            </div>

            {/* TC-DAT-17 / TC-CRT-11 Future-Date Protection Alert */}
            {currentSession.is_future_dated && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1.5px solid #f59e0b',
                  color: '#92400e',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>&#128274;</span>
                <div>
                  <strong>TC-DAT-17 & TC-CRT-11 Future-Date Protection (Asia/Manila):</strong>
                  <span> This training session is scheduled for a future date ({new Date(currentSession.start_date).toLocaleDateString()}). Per Chapter III specification, session-level sign-off and certificate generation are locked until the training date.</span>
                </div>
              </div>
            )}

            {/* Signed-Off Confirmation Banner */}
            {currentSession.trainer_signed_off && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1.5px solid #10b981',
                  color: '#065f46',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '18px' }}>&#9989;</span>
                <div>
                  <strong>Session Signed Off on {new Date(currentSession.trainer_sign_off_at).toLocaleString()}:</strong>
                  <span> All passing attendees have been certified. Trainer Notes: "{currentSession.trainer_sign_off_notes || 'All requirements completed.'}"</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Alerts */}
        {signOffResult && (
          <div style={{ margin: '14px 20px', padding: '12px 16px', background: '#ecfdf5', border: '1.5px solid #10b981', borderRadius: '8px', color: '#065f46' }}>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>&#10004; {signOffResult.message}</div>
            <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
              Session: <strong>{signOffResult.sessionCode}</strong> &bull; Certificates Issued: <strong>{signOffResult.certificatesIssued}</strong> &bull; Participants Updated: <strong>{signOffResult.participantsUpdated}</strong>
            </div>
          </div>
        )}

        {signOffError && (
          <div style={{ margin: '14px 20px', padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: '8px', color: '#991b1b' }}>
            <strong>&#9888; Sign-Off Error:</strong> {signOffError}
          </div>
        )}

        {/* Enrolled Trainees Roster Table */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
              Cohort Trainee Attendance & Completion Roster
            </h4>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Review each participant before single session sign-off
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px 14px' }}>TRAINEE</th>
                  <th style={{ padding: '10px 14px' }}>CLIENT ORGANIZATION</th>
                  <th style={{ padding: '10px 14px' }}>ATTENDANCE</th>
                  <th style={{ padding: '10px 14px' }}>COMPLETION DECISION</th>
                  <th style={{ padding: '10px 14px', width: '120px' }}>SCORE (0-100)</th>
                  <th style={{ padding: '10px 14px' }}>OFFICIAL CERTIFICATE</th>
                </tr>
              </thead>
              <tbody>
                {currentSession?.records && currentSession.records.length > 0 ? (
                  currentSession.records.map((rec) => {
                    const comp = completions[rec.record_id] || { status: rec.status, score: rec.score ?? 85 };
                    const isSessionDone = currentSession.trainer_signed_off;
                    const isFuture = currentSession.is_future_dated;

                    return (
                      <tr key={rec.record_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{rec.trainee_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                            {rec.trainee_code} &bull; {rec.trainee_email}
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{rec.company_name}</span>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>Scope: {rec.company_code}</div>
                        </td>

                        <td style={{ padding: '12px 14px' }}>
                          <span className="adm-chip adm-chip--green" style={{ fontSize: '10px', padding: '2px 8px' }}>
                            {rec.attendance_status || 'Present'}
                          </span>
                        </td>

                        {/* Completion Toggle */}
                        <td style={{ padding: '12px 14px' }}>
                          {isSessionDone ? (
                            <span
                              className={`adm-chip ${
                                rec.status === 'Completed' ? 'adm-chip--green' : 'adm-chip--red'
                              }`}
                              style={{ fontSize: '11px', fontWeight: 700 }}
                            >
                              {rec.status === 'Completed' ? '&#10004; Completed' : '&#10006; Not completed'}
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                              <button
                                type="button"
                                disabled={isFuture}
                                onClick={() => toggleAttendeeStatus(rec.record_id, 'Completed')}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: isFuture ? 'not-allowed' : 'pointer',
                                  background: comp.status === 'Completed' ? '#10b981' : '#f8fafc',
                                  color: comp.status === 'Completed' ? '#ffffff' : '#64748b',
                                }}
                              >
                                &#10004; Completed
                              </button>
                              <button
                                type="button"
                                disabled={isFuture}
                                onClick={() => toggleAttendeeStatus(rec.record_id, 'Not completed')}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: isFuture ? 'not-allowed' : 'pointer',
                                  background: comp.status === 'Not completed' ? '#ef4444' : '#f8fafc',
                                  color: comp.status === 'Not completed' ? '#ffffff' : '#64748b',
                                }}
                              >
                                &#10006; Not completed
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Score Input */}
                        <td style={{ padding: '12px 14px' }}>
                          {isSessionDone ? (
                            <span style={{ fontWeight: 800, fontSize: '13px' }}>
                              {rec.score != null ? `${rec.score}%` : 'N/A'}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              disabled={isFuture}
                              value={comp.score}
                              onChange={(e) => handleAttendeeScoreChange(rec.record_id, e.target.value)}
                              style={{
                                width: '70px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                textAlign: 'right',
                                fontWeight: 700,
                              }}
                            />
                          )}
                        </td>

                        {/* Certificate Serial */}
                        <td style={{ padding: '12px 14px' }}>
                          {rec.certificate_serial ? (
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: '#16a34a',
                                background: '#f0fdf4',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid #bbf7d0',
                                fontSize: '11px',
                              }}
                            >
                              {rec.certificate_serial}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                              Auto-generated on sign-off
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <TableEmptyRow
                    colSpan={6}
                    icon={Users}
                    title="No Trainees Enrolled"
                    subtitle="No participant records are enrolled for this training session."
                  />
                )}
              </tbody>
            </table>
          </div>

          {/* Sign-off Form Controls (Only when session not yet signed off) */}
          {!currentSession?.trainer_signed_off && (
            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                TRAINER SESSION SIGN-OFF NOTES (AUDIT TRAIL):
              </label>
              <textarea
                rows="2"
                disabled={currentSession?.is_future_dated}
                value={signOffNotes}
                onChange={(e) => setSignOffNotes(e.target.value)}
                placeholder="Enter practical exam observations, rubric verification notes, or curriculum completion citations..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Execution triggers immutable cryptographic certificate generation for all passing participants.
                </span>

                <button
                  type="button"
                  disabled={currentSession?.is_future_dated || signingOff}
                  onClick={onExecuteSignOff}
                  style={{
                    background: currentSession?.is_future_dated ? '#94a3b8' : '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: currentSession?.is_future_dated ? 'not-allowed' : 'pointer',
                    boxShadow: currentSession?.is_future_dated ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {signingOff ? 'Processing Sign-Off...' : currentSession?.is_future_dated ? '&#128274; Sign-off Locked (Future Session)' : '&#9989; Execute Session Sign-Off & Issue Certificates'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODULE 2: INDIVIDUAL TRAINEE DETAILED EVALUATION & DISTINCTION TIERS
          ========================================================================= */}
      <div className="adm-panel" style={{ marginTop: '28px' }}>
        <div className="adm-panel__head" style={{ borderBottom: '1px solid var(--cq-line, #eee)', padding: '16px 20px' }}>
          <div>
            <span className="adm-label" style={{ color: 'var(--cq-purple, #6b46c1)' }}>EVALUATION WORKBENCH</span>
            <h2 style={{ margin: '2px 0', fontSize: '16px', fontWeight: 800 }}>
              Individual Trainee Competency & Distinction Assessment
            </h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              Evaluate individual trainee rubric compliance, compute distinction tiers, and log citation remarks.
            </p>
          </div>
        </div>

        {/* Trainee Quick Selector Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {roster.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`adm-btn ${selectedTraineeId === t.id ? 'adm-btn-solid cq-btn--purple' : 'adm-btn--light'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setSelectedTraineeId(t.id)}
            >
              {t.name} ({t.scope})
            </button>
          ))}
        </div>

        {indivNotification && (
          <div
            className={`adm-alert ${indivNotification.type === 'success' ? 'adm-alert--purple' : 'adm-alert--red'}`}
            style={{ margin: '14px 20px' }}
          >
            <div className="adm-alert__body">
              <strong>{indivNotification.type === 'success' ? '&#10004; Evaluation Saved' : '&#9888; Error'}</strong>
              <p style={{ margin: '2px 0 0' }}>{indivNotification.msg}</p>
            </div>
          </div>
        )}

        {/* Split Workbench */}
        <div className="trn-split" style={{ padding: '20px' }}>
          {/* Left: Form */}
          <div className="adm-panel trn-pad">
            <div className="adm-panel__head" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--cq-line)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>{currentTrainee?.name}</h3>
                <span className="adm-mono" style={{ fontSize: '11px', color: '#64748b' }}>
                  {currentTrainee?.id} &bull; {currentTrainee?.cohort} &bull; {currentTrainee?.scope}
                </span>
              </div>
              <span className={`adm-chip ${currentTrainee?.state === 'CERTIFIED' ? 'adm-chip--green' : 'adm-chip--amber'}`}>
                STATUS: {currentTrainee?.state}
              </span>
            </div>

            <form onSubmit={onIndividualSubmit} style={{ marginTop: '16px' }}>
              <div>
                <label className="adm-label">EVALUATION SCORE (0 - 100)</label>
                <div className="trn-scorebox">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={score}
                    onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={score}
                    onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  />
                </div>

                <div className="trn-presets">
                  <button type="button" onClick={() => setScore(98)}>98 (Perfect)</button>
                  <button type="button" onClick={() => setScore(92)}>92 (Distinction)</button>
                  <button type="button" onClick={() => setScore(85)}>85 (Merit)</button>
                  <button type="button" onClick={() => setScore(75)}>75 (Baseline)</button>
                  <button type="button" onClick={() => setScore(65)}>65 (Remediation)</button>
                  <span className="adm-soft">Pass Mark: {PASS_MARK}%</span>
                </div>
              </div>

              <div
                className="trn-tier"
                style={{
                  marginTop: '16px',
                  borderColor: score >= PASS_MARK ? 'var(--cq-purple, #6b46c1)' : '#d12a43',
                }}
              >
                <div>
                  <span className="adm-label">CALCULATED DISTINCTION TIER</span>
                  <div style={{ marginTop: '4px', fontSize: '14px' }}>
                    <b>{currentTier}</b>
                  </div>
                </div>
                <span className={`adm-chip ${score >= PASS_MARK ? 'adm-chip--green' : 'adm-chip--red'}`}>
                  {score >= PASS_MARK ? 'MEETS CERTIFICATION' : 'REQUIRES REMEDIATION'}
                </span>
              </div>

              <div style={{ marginTop: '20px' }}>
                <span className="adm-label">VERIFIED COMPETENCY RUBRICS</span>
                <ul className="trn-rubric" style={{ listStyle: 'none', padding: 0, marginTop: '8px' }}>
                  {RUBRIC.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
                        <input
                          type="checkbox"
                          checked={rubric.includes(idx)}
                          onChange={() => {
                            if (rubric.includes(idx)) setRubric(rubric.filter((i) => i !== idx));
                            else setRubric([...rubric, idx].sort());
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label className="adm-label">EVALUATOR REMARKS & CITATIONS</label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Specific trainee observations or practical defense lab remarks..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    marginTop: '4px',
                  }}
                />
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="adm-btn adm-btn-solid cq-btn--purple"
                  style={{ padding: '8px 18px', fontSize: '12.5px' }}
                >
                  {submitting ? 'Saving...' : 'Save Trainee Evaluation'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Summary Card */}
          <div className="adm-panel trn-pad">
            <span className="adm-label">TRAINEE COMPLIANCE PROFILE</span>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>EVALUATION TARGET</div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>{currentTrainee?.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {currentTrainee?.id}</div>
              </div>

              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>ORGANIZATION SCOPE</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{currentTrainee?.scope}</div>
              </div>

              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>COHORT CURRICULUM</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{currentTrainee?.cohort}</div>
              </div>

              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>CERTIFICATION ISSUANCE RULE</div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                  Per Section 3.5.3 (FR-16), individual grading saves the evaluation record, but official certificate generation is strictly batch-triggered when the assigned Lead Trainer executes <strong>Cohort Session Sign-Off</strong> above.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
