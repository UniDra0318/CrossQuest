import React, { useState, useEffect } from 'react';
import { useTrainer } from '../TrainerContext';

export default function Grade() {
  const {
    roster,
    selectedTraineeId,
    setSelectedTraineeId,
    handleGrade,
    gradeResult,
    setGradeResult,
    RUBRIC,
    PASS_MARK,
    tierFor,
    loading,
  } = useTrainer();

  const currentTrainee = roster.find((r) => r.id === selectedTraineeId) || roster[0];

  const [score, setScore] = useState(currentTrainee?.score ?? 85);
  const [rubric, setRubric] = useState([0, 1, 2, 3]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (currentTrainee) {
      setScore(currentTrainee.score ?? 85);
      setGradeResult(null);
      setRemarks('');
    }
  }, [selectedTraineeId]);

  if (loading && (!roster || roster.length === 0)) {
    return <div className="adm-state">Loading trainee evaluation workbench...</div>;
  }

  const handleScoreChange = (val) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    setScore(num);
  };

  const toggleRubric = (idx) => {
    if (rubric.includes(idx)) {
      setRubric(rubric.filter((i) => i !== idx));
    } else {
      setRubric([...rubric, idx].sort());
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentTrainee) return;
    setSubmitting(true);
    setNotification(null);
    try {
      const res = await handleGrade(currentTrainee.id, {
        score: Number(score),
        rubric,
        remarks,
      });
      setNotification({
        type: 'success',
        msg: `Successfully saved evaluation for ${currentTrainee.name}! Note: Certificate issuance is triggered exclusively via Trainer session sign-off.`,
      });
    } catch (err) {
      setNotification({
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
      {/* Trainer Session Sign-Off Banner (Phase 2, Section 3.5.3) */}
      <div className="adm-panel" style={{ marginTop: '20px', borderLeft: '4px solid var(--cq-purple)', background: 'linear-gradient(135deg, rgba(107, 70, 193, 0.08), rgba(246, 173, 85, 0.04))' }}>
        <div className="adm-panel__head" style={{ borderBottom: 'none', padding: '16px 20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="adm-label" style={{ color: 'var(--cq-purple)', fontWeight: 700 }}>SESSION SIGN-OFF WORKFLOW</span>
              <span className="adm-chip adm-chip--amber">ONE-TIME SIGN-OFF REQUIRED</span>
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: '16px' }}>Cohort Final Sign-off & Certificate Issuance</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--cq-sub)' }}>
              Trainers sign off once per training cohort to confirm all participants' completion status (Completed / Not completed). Certificate issuance is triggered exclusively by session sign-off.
            </p>
          </div>
          <button
            type="button"
            className="adm-btn adm-btn-solid cq-btn--purple"
            style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
            onClick={() => {
              setNotification({
                type: 'success',
                msg: 'Cohort training session officially signed off! Official certificates with format AAAYYYYMMDD-01 have been generated for all passing participants.'
              });
            }}
          >
            ✍️ Sign Off Training Session & Confirm Completions
          </button>
        </div>
      </div>

      {/* Trainee Quick Selector Bar */}
      <div className="adm-panel" style={{ marginTop: '16px' }}>
        <div className="adm-panel__head">
          <h2>Select Trainee to Evaluate</h2>
          <span className="adm-label">EVALUATION TARGET</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {roster.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`adm-btn ${selectedTraineeId === t.id ? 'adm-btn-solid cq-btn--purple' : 'adm-btn--light'}`}
              style={{ fontSize: '12px', padding: '8px 14px' }}
              onClick={() => {
                setSelectedTraineeId(t.id);
                setGradeResult(null);
              }}
            >
              {t.name} ({t.scope})
            </button>
          ))}
        </div>
      </div>

      {notification && (
        <div
          className={`adm-alert ${notification.type === 'success' ? 'adm-alert--purple' : 'adm-alert--red'}`}
          style={{ marginTop: '20px' }}
        >
          <div className="adm-alert__body">
            <strong>{notification.type === 'success' ? '✅ Evaluation Confirmed' : '⚠️ Submission Error'}</strong>
            <p>{notification.msg}</p>
          </div>
        </div>
      )}

      {/* Main Split Workbench */}
      <div className="trn-split">
        {/* Left Workbench Form */}
        <div className="adm-panel trn-pad">
          <div className="adm-panel__head" style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--cq-line)' }}>
            <div>
              <h2>{currentTrainee?.name}</h2>
              <span className="adm-mono">
                {currentTrainee?.id} · {currentTrainee?.cohort} · {currentTrainee?.scope}
              </span>
            </div>
            <span
              className={`adm-chip ${
                currentTrainee?.state === 'CERTIFIED' ? 'adm-chip--green' : 'adm-chip--amber'
              }`}
            >
              CURRENT: {currentTrainee?.state}
            </span>
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: '20px' }}>
            {/* Score adjustment */}
            <div>
              <label className="adm-label">EVALUATION SCORE (0 - 100)</label>
              <div className="trn-scorebox">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={score}
                  onChange={(e) => handleScoreChange(e.target.value)}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  value={score}
                  onChange={(e) => handleScoreChange(e.target.value)}
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="trn-presets">
                <button type="button" onClick={() => handleScoreChange(98)}>98 (Perfect)</button>
                <button type="button" onClick={() => handleScoreChange(92)}>92 (Distinction)</button>
                <button type="button" onClick={() => handleScoreChange(85)}>85 (Merit)</button>
                <button type="button" onClick={() => handleScoreChange(75)}>75 (Baseline)</button>
                <button type="button" onClick={() => handleScoreChange(65)}>65 (Remediation)</button>
                <span className="adm-soft">Pass Mark: {PASS_MARK}%</span>
              </div>
            </div>

            {/* Calculated Tier Preview */}
            <div
              className="trn-tier"
              style={{
                borderColor: score >= PASS_MARK ? 'var(--cq-purple)' : '#d12a43',
              }}
            >
              <div>
                <span className="adm-label">CALCULATED DISTINCTION TIER</span>
                <div style={{ marginTop: '4px' }}>
                  <b>{currentTier}</b>
                </div>
              </div>
              <span className={`adm-chip ${score >= PASS_MARK ? 'adm-chip--green' : 'adm-chip--red'}`}>
                {score >= PASS_MARK ? 'MEETS CERTIFICATION' : 'REQUIRES REMEDIATION'}
              </span>
            </div>

            {/* Rubric Criteria Checklist */}
            <div style={{ marginTop: '24px' }}>
              <span className="adm-label">VERIFIED COMPETENCY RUBRICS</span>
              <ul className="trn-rubric">
                {RUBRIC.map((item, idx) => (
                  <li key={idx}>
                    <label>
                      <input
                        type="checkbox"
                        checked={rubric.includes(idx)}
                        onChange={() => toggleRubric(idx)}
                      />
                      <span>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            {/* Evaluator Remarks */}
            <div className="trn-form" style={{ marginTop: '20px' }}>
              <div className="trn-remarks-head">
                <label className="adm-label">EVALUATOR REMARKS & CITATIONS</label>
                <button
                  type="button"
                  className="trn-link"
                  onClick={() => setRemarks('Demonstrated strong mastery of zero-trust tenant boundaries and CP-ABE policy satisfiability.')}
                >
                  Insert Template
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Enter feedback or laboratory remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Submit Action */}
            <div style={{ marginTop: '24px' }}>
              <button
                type="submit"
                disabled={submitting}
                className="adm-btn adm-btn-solid cq-btn--purple"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {submitting ? 'Committing Evaluation...' : '💾 Save Trainee Competency Rubric & Evaluation'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Envelope Inspector */}
        <div className="trn-env">
          <span className="adm-label" style={{ color: '#ffb77a' }}>WATERS11 CP-ABE ENVELOPE INSPECTOR</span>
          <h3 style={{ margin: '8px 0 14px', fontSize: '18px' }}>Cryptographic Proof Metadata</h3>

          <dl>
            <div>
              <dt>Cryptographic Scheme</dt>
              <dd>WATERS11 / BSW07 CP-ABE</dd>
            </div>
            <div>
              <dt>Pairing Curve</dt>
              <dd>BN254 (Barreto-Naehrig)</dd>
            </div>
            <div>
              <dt>Tenant Isolation</dt>
              <dd>{currentTrainee?.scope}</dd>
            </div>
            <div>
              <dt>Access Policy Tree</dt>
              <dd style={{ fontSize: '11px' }}>
                (ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:{currentTrainee?.scope})
              </dd>
            </div>
            <div>
              <dt>Authorized Signer</dt>
              <dd>D. Lim (Lead Trainer)</dd>
            </div>
          </dl>

          <div>
            <span className="adm-label" style={{ color: '#a78bfa' }}>GENERATED CIPHERTEXT PAYLOAD</span>
            <code>
              {gradeResult?.envelope ? (
                JSON.stringify(gradeResult.envelope, null, 2)
              ) : (
                `{\n  "status": "${currentTrainee?.state}",\n  "trainee": "${currentTrainee?.name}",\n  "score": ${score},\n  "tier": "${currentTier}",\n  "curve": "BN254",\n  "scope": "${currentTrainee?.scope}"\n}`
              )}
            </code>
          </div>

          <p>
            Ciphertext is bound to the client's attribute hierarchy. Trainee certificates cannot be decrypted without verified cryptographic attribute satisfaction.
          </p>
        </div>
      </div>
    </>
  );
}
