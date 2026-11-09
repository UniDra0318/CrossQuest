import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Shield, 
  Server, 
  Lock, 
  Sliders, 
  AlertTriangle, 
  Layers,
  X,
  CheckCircle2,
  Clock,
  Calendar,
  Save,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { batchUpdateAnomalyRules, fetchAnomalyRules } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function SystemSettings({ settings, liveRules = [], token, onRuleUpdated, onTuneRules }) {
  const { isDark } = useTheme();

  const currentSettings = settings || {
    accessControl: {
      cryptoScheme: 'Native Charm CP-ABE (BSW07)',
      provider: 'Zero-Trust Cryptographic Engine',
      keyAuthority: 'Decentralized Multi-Authority (DMA-ABE)'
    },
    anomaly: {
      window: { start: '09:00', end: '18:00', tz: 'Asia/Manila', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
      failedAttempts: { count: 5, minutes: 10 },
      burstVolume: { records: 5, minutes: 60 }
    }
  };

  const [currentRules, setCurrentRules] = useState(liveRules);
  const [isTuneModalOpen, setIsTuneModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [modalError, setModalError] = useState(null);

  // Modal form states
  const [modalStartHour, setModalStartHour] = useState(9);
  const [modalEndHour, setModalEndHour] = useState(18);
  const [modalTz, setModalTz] = useState('Asia/Manila');
  const [modalDays, setModalDays] = useState(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [modalFailedCount, setModalFailedCount] = useState(5);
  const [modalFailedMinutes, setModalFailedMinutes] = useState(10);
  const [modalBurstCount, setModalBurstCount] = useState(5);
  const [modalBurstMinutes, setModalBurstMinutes] = useState(60);
  // Table 13 Role-Based Record Access Thresholds (OI-08, Table 13: AM 25, Trainer 25, Finance 50, Admin 50, Trainee 15)
  const [modalAmAccessThreshold, setModalAmAccessThreshold] = useState(25);
  const [modalTrainerAccessThreshold, setModalTrainerAccessThreshold] = useState(25);
  const [modalFinanceAccessThreshold, setModalFinanceAccessThreshold] = useState(50);
  const [modalAdminAccessThreshold, setModalAdminAccessThreshold] = useState(50);
  const [modalTraineeAccessThreshold, setModalTraineeAccessThreshold] = useState(15);
  const [modalReason, setModalReason] = useState('');

  // Sync when liveRules prop updates or fetch if empty
  useEffect(() => {
    if (liveRules && liveRules.length > 0) {
      setCurrentRules(liveRules);
    } else if (token) {
      fetchAnomalyRules(token)
        .then(rules => {
          if (rules && rules.length > 0) setCurrentRules(rules);
        })
        .catch(() => {});
    }
  }, [liveRules, token]);

  // Find live rule objects (A4: match exact codes only, no cross-rule fallback)
  const rAfter = currentRules.find(r => r.rule_code === 'S1_AFTER_HOURS');
  const rFailed = currentRules.find(r => r.rule_code === 'R2_FAILED_LOGINS_ACCOUNT');
  const rBurst = currentRules.find(r => r.rule_code === 'R3_REPORT_BURSTS');

  const startHour = rAfter?.parameters?.start_hour !== undefined ? Number(rAfter.parameters.start_hour) : 9;
  const endHour = rAfter?.parameters?.end_hour !== undefined ? Number(rAfter.parameters.end_hour) : 18;
  const rawTz = rAfter?.parameters?.tz || 'Asia/Manila';
  const tz = rawTz === 'UTC+8' ? 'Asia/Manila' : rawTz;
  const activeDays = rAfter?.parameters?.days || ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  const failedThreshold = rFailed?.parameters?.threshold ?? currentSettings.anomaly.failedAttempts.count;
  const failedMinutes = rFailed?.parameters?.window_minutes ?? currentSettings.anomaly.failedAttempts.minutes;

  const burstThreshold = rBurst?.parameters?.threshold ?? currentSettings.anomaly.burstVolume.records;
  const burstMinutes = rBurst?.parameters?.window_minutes ?? currentSettings.anomaly.burstVolume.minutes;

  // Approval status model (A3: Check whether tuned thresholds are reviewed or pending)
  const isAfterReviewed = rAfter?.client_reviewed ?? true;
  const isFailedReviewed = rFailed?.client_reviewed ?? true;
  const isBurstReviewed = rBurst?.client_reviewed ?? true;
  const allReviewed = isAfterReviewed && isFailedReviewed && isBurstReviewed;
  const maxVersion = Math.max(rAfter?.version_no || 1, rFailed?.version_no || 1, rBurst?.version_no || 1);

  // Dynamic visual timeline bar positioning
  const leftPercent = Math.max(0, Math.min(100, (startHour / 24) * 100));
  const widthPercent = Math.max(0, Math.min(100 - leftPercent, ((endHour - startHour) / 24) * 100));

  // Open modal and pre-fill current active values (A2: audit reason starts EMPTY)
  const handleOpenModal = () => {
    const rHighAccess = currentRules.find(r => r.rule_code === 'R3_HIGH_RECORD_ACCESS');
    setModalStartHour(startHour);
    setModalEndHour(endHour);
    setModalTz(tz);
    setModalDays([...activeDays]);
    setModalFailedCount(failedThreshold);
    setModalFailedMinutes(failedMinutes);
    setModalBurstCount(burstThreshold);
    setModalBurstMinutes(burstMinutes);
    setModalAmAccessThreshold(rHighAccess?.parameters?.thresholds?.account_manager ?? 25);
    setModalTrainerAccessThreshold(rHighAccess?.parameters?.thresholds?.trainer ?? 25);
    setModalFinanceAccessThreshold(rHighAccess?.parameters?.thresholds?.finance ?? 50);
    setModalAdminAccessThreshold(rHighAccess?.parameters?.thresholds?.admin ?? 50);
    setModalTraineeAccessThreshold(rHighAccess?.parameters?.thresholds?.trainee ?? 15);
    setModalReason(''); // A2: Must start empty
    setModalError(null);
    setIsTuneModalOpen(true);
  };

  const handleToggleDay = (day) => {
    if (modalDays.includes(day)) {
      if (modalDays.length > 1) {
        setModalDays(modalDays.filter(d => d !== day));
      }
    } else {
      setModalDays([...modalDays, day]);
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    setModalError(null);

    // Validation A2: Mandatory audit reason must not be blank
    if (!modalReason || !modalReason.trim()) {
      setModalError('Mandatory audit reason is required when modifying anomaly detection thresholds (OI-08).');
      return;
    }

    // Validation A5: Boundary checks
    const parsedStart = parseInt(modalStartHour, 10);
    const parsedEnd = parseInt(modalEndHour, 10);
    if (isNaN(parsedStart) || parsedStart < 0 || parsedStart > 23 || isNaN(parsedEnd) || parsedEnd < 0 || parsedEnd > 23) {
      setModalError('Start hour and end hour must be valid integers between 0 and 23.');
      return;
    }
    if (parsedStart >= parsedEnd) {
      setModalError('Start hour must be strictly before end hour.');
      return;
    }

    const parsedFailedCount = parseInt(modalFailedCount, 10);
    const parsedFailedMinutes = parseInt(modalFailedMinutes, 10);
    if (isNaN(parsedFailedCount) || parsedFailedCount < 1 || parsedFailedCount > 1000) {
      setModalError('Failed login attempts threshold must be between 1 and 1,000.');
      return;
    }
    if (isNaN(parsedFailedMinutes) || parsedFailedMinutes < 1 || parsedFailedMinutes > 1440) {
      setModalError('Failed login evaluation window must be between 1 and 1,440 minutes.');
      return;
    }

    const parsedBurstCount = parseInt(modalBurstCount, 10);
    const parsedBurstMinutes = parseInt(modalBurstMinutes, 10);
    if (isNaN(parsedBurstCount) || parsedBurstCount < 1 || parsedBurstCount > 1000) {
      setModalError('Burst volume threshold must be between 1 and 1,000 operations.');
      return;
    }
    if (isNaN(parsedBurstMinutes) || parsedBurstMinutes < 1 || parsedBurstMinutes > 1440) {
      setModalError('Burst evaluation window must be between 1 and 1,440 minutes.');
      return;
    }

    // Table 13 Role Bounds Validation (1 to 1,000)
    const parsedAm = parseInt(modalAmAccessThreshold, 10);
    const parsedTrainer = parseInt(modalTrainerAccessThreshold, 10);
    const parsedFin = parseInt(modalFinanceAccessThreshold, 10);
    const parsedAdm = parseInt(modalAdminAccessThreshold, 10);
    const parsedTrainee = parseInt(modalTraineeAccessThreshold, 10);
    if (isNaN(parsedAm) || parsedAm < 1 || parsedAm > 1000) {
      setModalError('Account Manager record access threshold must be between 1 and 1,000 (Table 13).');
      return;
    }
    if (isNaN(parsedTrainer) || parsedTrainer < 1 || parsedTrainer > 1000) {
      setModalError('Trainer record access threshold must be between 1 and 1,000 (Table 13).');
      return;
    }
    if (isNaN(parsedFin) || parsedFin < 1 || parsedFin > 1000) {
      setModalError('Finance record access threshold must be between 1 and 1,000 (Table 13).');
      return;
    }
    if (isNaN(parsedAdm) || parsedAdm < 1 || parsedAdm > 1000) {
      setModalError('Administrator record access threshold must be between 1 and 1,000 (Table 13).');
      return;
    }
    if (isNaN(parsedTrainee) || parsedTrainee < 1 || parsedTrainee > 1000) {
      setModalError('Trainee record access threshold must be between 1 and 1,000 (Table 13).');
      return;
    }

    setIsSaving(true);
    const cleanReason = modalReason.trim();

    try {
      // A6: Atomic Batch Update - all 4 rules committed together
      const updatedRules = await batchUpdateAnomalyRules({
        rules: [
          {
            rule_code: 'S1_AFTER_HOURS',
            parameters: { 
              start_hour: parsedStart, 
              end_hour: parsedEnd, 
              tz: modalTz.trim() || 'Asia/Manila', 
              days: modalDays 
            }
          },
          {
            rule_code: 'R2_FAILED_LOGINS_ACCOUNT',
            parameters: { 
              ...(rFailed?.parameters || {}), 
              threshold: parsedFailedCount, 
              window_minutes: parsedFailedMinutes 
            }
          },
          {
            rule_code: 'R3_REPORT_BURSTS',
            parameters: { 
              ...(rBurst?.parameters || {}), 
              threshold: parsedBurstCount, 
              window_minutes: parsedBurstMinutes 
            }
          },
          {
            rule_code: 'R3_HIGH_RECORD_ACCESS',
            parameters: {
              thresholds: {
                account_manager: parsedAm,
                trainer: parsedTrainer,
                finance: parsedFin,
                admin: parsedAdm,
                trainee: parsedTrainee
              },
              window_minutes: 15
            }
          }
        ],
        reason: cleanReason
      }, token);

      // On successful atomic commit: update local state with genuine DB response
      setCurrentRules(prev => {
        const next = [...prev];
        updatedRules.forEach(updated => {
          const idx = next.findIndex(r => r.rule_code === updated.rule_code);
          if (idx >= 0) next[idx] = updated;
          else next.push(updated);
        });
        return next;
      });

      // Propagate to parent dashboard
      updatedRules.forEach(r => onRuleUpdated?.(r));

      setSaveSuccess(`Anomaly thresholds updated (Operating hours: ${String(parsedStart).padStart(2, '0')}:00 – ${String(parsedEnd).padStart(2, '0')}:00 ${modalTz.trim() || 'Asia/Manila'}). Status: Pending Crossworks Review.`);
      setIsTuneModalOpen(false);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err) {
      // A1: On failure, display error and keep old values untouched (NO local fallback)
      setModalError(err.message || 'Failed to update threshold parameters on server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Toast Alert */}
      {saveSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 20px',
          background: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5',
          border: isDark ? '1px solid rgba(5, 150, 105, 0.4)' : '1px solid #a7f3d0',
          borderRadius: '14px',
          color: isDark ? '#34d399' : '#065f46',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <div className="adm-cols">
        {/* Card 1: Access Control Engine */}
        <div className="adm-card">
          <div className="adm-ptitle">
            <span style={{ background: '#6a2bd9' }}>
              <Key size={22} />
            </span>
            <div>
              <h2>Access Control Engine</h2>
              <p>Cryptographic parameters & master authority specs</p>
            </div>
          </div>
          <div className="adm-field adm-field--mb">
            <div className="adm-field__icon">
              <Shield size={20} />
            </div>
            <div>
              <span className="adm-label">CRYPTOGRAPHIC SCHEME</span>
              <div className="adm-field__val">{currentSettings.accessControl.cryptoScheme}</div>
            </div>
          </div>
          <div className="adm-field adm-field--mb">
            <div className="adm-field__icon">
              <Server size={20} />
            </div>
            <div>
              <span className="adm-label">SECURITY PROVIDER</span>
              <div className="adm-field__val">{currentSettings.accessControl.provider}</div>
            </div>
          </div>
          <div className="adm-field">
            <div className="adm-field__icon">
              <Lock size={20} />
            </div>
            <div>
              <span className="adm-label">KEY AUTHORITY SCHEME</span>
              <div className="adm-field__val">{currentSettings.accessControl.keyAuthority}</div>
            </div>
          </div>
        </div>

        {/* Card 2: Anomaly Detection Thresholds */}
        <div className="adm-card">
          <div className="adm-ptitle adm-flex-between adm-w-full" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <div className="adm-flex-center adm-gap-14">
              <span style={{ background: '#ff7a1a' }}>
                <Sliders size={22} />
              </span>
              <div>
                <div className="adm-flex-center adm-gap-8" style={{ flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0 }}>Anomaly Detection Thresholds</h2>
                  {/* Approval Status Badge (A3) */}
                  <span 
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: allReviewed 
                        ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5') 
                        : (isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb'),
                      color: allReviewed 
                        ? (isDark ? '#34d399' : '#059669') 
                        : (isDark ? '#fbbf24' : '#b45309'),
                      border: allReviewed 
                        ? (isDark ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid #a7f3d0') 
                        : (isDark ? '1px solid rgba(217, 119, 6, 0.35)' : '1px solid #fde68a')
                    }}
                  >
                    {allReviewed ? '✓ Crossworks Approved' : `⏳ Pending Review (v${maxVersion})`}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0' }}>Live active rule parameters (Table 13)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                background: '#ff7a1a',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease'
              }}
              title="Tune live operational thresholds"
            >
              <Sliders size={13} />
              <span>Tune Thresholds &rarr;</span>
            </button>
          </div>

          {/* Operating Window */}
          <div className="adm-field adm-field--window adm-field--mb">
            <div className="adm-flex-between">
              <span className="adm-label">STANDARD BUSINESS WINDOW</span>
              <strong style={{ fontSize: '13px', color: '#ff7a1a' }}>
                {String(startHour).padStart(2, '0')}:00 – {String(endHour).padStart(2, '0')}:00 ({tz})
              </strong>
            </div>
            <div className="adm-window">
              <i style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, transition: 'all 0.3s ease' }} />
            </div>
            <div className="adm-ticks">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
            <div className="adm-wrap" style={{ marginTop: '14px' }}>
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
                <span 
                  key={d} 
                  className={`adm-day ${activeDays.includes(d) ? 'on' : ''}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Threshold 1: Failed Attempts */}
          <div className="adm-field adm-field--thr adm-field--mb">
            <div className="adm-thr__icon" style={{ background: '#d12a43' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="adm-label">CONSECUTIVE FAILED ATTEMPTS TRIGGER</span>
              <div className="adm-thr__val">
                <b>{failedThreshold}</b>
                <span>failed requests within {failedMinutes} minutes</span>
              </div>
            </div>
          </div>

          {/* Threshold 2: Burst Volume (A4: R3_REPORT_BURSTS only) */}
          <div className="adm-field adm-field--thr">
            <div className="adm-thr__icon" style={{ background: '#ff7a1a' }}>
              <Layers size={20} />
            </div>
            <div>
              <span className="adm-label">BURST REPORT GENERATION THRESHOLD</span>
              <div className="adm-thr__val">
                <b>{burstThreshold}</b>
                <span>reports generated within {burstMinutes} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TUNING MODAL (DIRECTLY ON SETTINGS SCREEN)
          ===================================================================== */}
      {isTuneModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setIsTuneModalOpen(false);
          }}
        >
          <div 
            style={{
              background: isDark ? '#111827' : '#ffffff',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isDark ? '#0f172a' : '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 122, 26, 0.15)',
                  color: '#ff7a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Tune Anomaly Detection Thresholds
                  </h3>
                  <span style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    Operational parameters for After-Hours Access, Failed Sign-Ins, and Report Generation Bursts
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsTuneModalOpen(false)}
                disabled={isSaving}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Inline Error Banner (A7: No alert() popups) */}
            {modalError && (
              <div style={{
                margin: '16px 24px 0',
                padding: '12px 16px',
                background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
                border: isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fecaca',
                borderRadius: '12px',
                color: isDark ? '#fca5a5' : '#b91c1c',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveThresholds} noValidate style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Section 1: Business Hours Window (S1_AFTER_HOURS) */}
              <div style={{
                background: isDark ? '#1e293b' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="#ff7a1a" />
                  <strong style={{ fontSize: '13px', color: isDark ? '#f8fafc' : '#0f172a' }}>
                    Standard Business Hours Window (S1_AFTER_HOURS)
                  </strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '4px' }}>
                      Start Hour (0–23):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={modalStartHour}
                      onChange={(e) => setModalStartHour(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '4px' }}>
                      End Hour (0–23):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={modalEndHour}
                      onChange={(e) => setModalEndHour(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '4px' }}>
                      Timezone:
                    </label>
                    <input
                      type="text"
                      value={modalTz}
                      onChange={(e) => setModalTz(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: '13px',
                        fontWeight: 700
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '6px' }}>
                    Active Workdays:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => {
                      const isSelected = modalDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleToggleDay(d)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            border: isSelected ? '1px solid #6a2bd9' : (isDark ? '1px solid #334155' : '1px solid #cbd5e1'),
                            background: isSelected ? '#6a2bd9' : (isDark ? '#0f172a' : '#ffffff'),
                            color: isSelected ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b'),
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 2: Failed Logins & Burst Limits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* R2_FAILED_LOGINS */}
                <div style={{
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} color="#d12a43" />
                    <strong style={{ fontSize: '12px', color: isDark ? '#f8fafc' : '#0f172a' }}>
                      Failed Logins Trigger (R2)
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>Attempts:</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={modalFailedCount}
                        onChange={(e) => setModalFailedCount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 700
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>Window (Min):</label>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={modalFailedMinutes}
                        onChange={(e) => setModalFailedMinutes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 700
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* R3_REPORT_BURSTS (A4) */}
                <div style={{
                  background: isDark ? '#1e293b' : '#f8fafc',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} color="#ff7a1a" />
                    <strong style={{ fontSize: '12px', color: isDark ? '#f8fafc' : '#0f172a' }}>
                      Report Generation Bursts Limit
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>Reports:</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={modalBurstCount}
                        onChange={(e) => setModalBurstCount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 700
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>Window (Min):</label>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={modalBurstMinutes}
                        onChange={(e) => setModalBurstMinutes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: 700
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2b: Role-Based Record Access Thresholds (Table 13, R3_HIGH_RECORD_ACCESS) */}
                <div style={{
                  gridColumn: '1 / -1',
                  background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
                  padding: '12px',
                  borderRadius: '10px',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldAlert size={15} color="#8b5cf6" />
                      <strong style={{ fontSize: '12px', color: isDark ? '#f8fafc' : '#0f172a' }}>
                        Table 13: Role-Based High Record Access Limits (15-min window)
                      </strong>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#6a2bd9',
                      background: 'rgba(106, 43, 217, 0.1)',
                      border: '1px solid rgba(106, 43, 217, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      🔒 Table 13 Crossworks Certified Standard (Read-Only)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>
                        Account Mgr:
                      </label>
                      <input
                        type="number"
                        value={modalAmAccessThreshold}
                        readOnly
                        tabIndex={-1}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                          background: isDark ? '#1e293b' : '#f1f5f9',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>
                        Trainer:
                      </label>
                      <input
                        type="number"
                        value={modalTrainerAccessThreshold}
                        readOnly
                        tabIndex={-1}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                          background: isDark ? '#1e293b' : '#f1f5f9',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>
                        Finance:
                      </label>
                      <input
                        type="number"
                        value={modalFinanceAccessThreshold}
                        readOnly
                        tabIndex={-1}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                          background: isDark ? '#1e293b' : '#f1f5f9',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>
                        Administrator:
                      </label>
                      <input
                        type="number"
                        value={modalAdminAccessThreshold}
                        readOnly
                        tabIndex={-1}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                          background: isDark ? '#1e293b' : '#f1f5f9',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>
                        Trainee:
                      </label>
                      <input
                        type="number"
                        value={modalTraineeAccessThreshold}
                        readOnly
                        tabIndex={-1}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                          background: isDark ? '#1e293b' : '#f1f5f9',
                          color: isDark ? '#94a3b8' : '#64748b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Mandatory Audit Reason (A2: Required, empty by default) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '4px' }}>
                  Mandatory Audit Reason (OI-08): <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows="2"
                  value={modalReason}
                  onChange={(e) => {
                    setModalReason(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  placeholder="Enter specific business justification for this threshold change..."
                  required
                  className="adm-reason-textarea"
                  style={{
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                />
                <span style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                  Changes will create a new rule version and require Crossworks review approval.
                </span>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsTuneModalOpen(false)}
                  disabled={isSaving}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    background: 'none',
                    color: isDark ? '#cbd5e1' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ff7a1a',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(255, 122, 26, 0.3)'
                  }}
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Saving Parameters...' : 'Save Parameters'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
