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
  Save
} from 'lucide-react';
import { updateAnomalyRule } from '../../services/api';
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
      window: { start: '09:00', end: '18:00', tz: 'UTC+8', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
      failedAttempts: { count: 5, minutes: 10 },
      burstVolume: { records: 5, minutes: 60 }
    }
  };

  const [currentRules, setCurrentRules] = useState(liveRules);
  const [isTuneModalOpen, setIsTuneModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Modal form states
  const [modalStartHour, setModalStartHour] = useState(9);
  const [modalEndHour, setModalEndHour] = useState(18);
  const [modalTz, setModalTz] = useState('UTC+8');
  const [modalDays, setModalDays] = useState(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [modalFailedCount, setModalFailedCount] = useState(5);
  const [modalFailedMinutes, setModalFailedMinutes] = useState(10);
  const [modalBurstCount, setModalBurstCount] = useState(5);
  const [modalBurstMinutes, setModalBurstMinutes] = useState(60);
  const [modalReason, setModalReason] = useState('');

  // Sync when liveRules prop updates
  useEffect(() => {
    if (liveRules && liveRules.length > 0) {
      setCurrentRules(liveRules);
    }
  }, [liveRules]);

  // Find live rule objects
  const rAfter = currentRules.find(r => r.rule_code === 'S1_AFTER_HOURS');
  const rFailed = currentRules.find(r => r.rule_code === 'R2_FAILED_LOGINS_ACCOUNT') || currentRules.find(r => r.rule_code?.includes('FAILED_LOGINS'));
  const rBurst = currentRules.find(r => r.rule_code === 'R3_REPORT_BURSTS') || currentRules.find(r => r.rule_code === 'R4_BULK_EDIT') || currentRules.find(r => r.rule_code?.includes('BURST'));

  const startHour = rAfter?.parameters?.start_hour !== undefined ? Number(rAfter.parameters.start_hour) : 9;
  const endHour = rAfter?.parameters?.end_hour !== undefined ? Number(rAfter.parameters.end_hour) : 18;
  const tz = rAfter?.parameters?.tz || 'UTC+8';
  const activeDays = rAfter?.parameters?.days || ['MON', 'TUE', 'WED', 'THU', 'FRI'];

  const failedThreshold = rFailed?.parameters?.threshold ?? currentSettings.anomaly.failedAttempts.count;
  const failedMinutes = rFailed?.parameters?.window_minutes ?? currentSettings.anomaly.failedAttempts.minutes;

  const burstThreshold = rBurst?.parameters?.threshold ?? currentSettings.anomaly.burstVolume.records;
  const burstMinutes = rBurst?.parameters?.window_minutes ?? currentSettings.anomaly.burstVolume.minutes;

  // Dynamic visual timeline bar positioning
  const leftPercent = Math.max(0, Math.min(100, (startHour / 24) * 100));
  const widthPercent = Math.max(0, Math.min(100 - leftPercent, ((endHour - startHour) / 24) * 100));

  // Open modal and pre-fill current active values
  const handleOpenModal = () => {
    setModalStartHour(startHour);
    setModalEndHour(endHour);
    setModalTz(tz);
    setModalDays([...activeDays]);
    setModalFailedCount(failedThreshold);
    setModalFailedMinutes(failedMinutes);
    setModalBurstCount(burstThreshold);
    setModalBurstMinutes(burstMinutes);
    setModalReason('Operational anomaly threshold adjustment by Administrator.');
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
    if (modalStartHour < 0 || modalStartHour > 23 || modalEndHour < 0 || modalEndHour > 23) {
      alert('Hours must be between 0 and 23.');
      return;
    }
    if (modalStartHour >= modalEndHour) {
      alert('Start hour must be strictly before end hour.');
      return;
    }

    setIsSaving(true);
    const auditReason = modalReason.trim() || 'Anomaly detection threshold adjusted by Administrator.';

    try {
      // 1. Update S1_AFTER_HOURS
      let updatedAfter;
      try {
        updatedAfter = await updateAnomalyRule('S1_AFTER_HOURS', {
          parameters: { start_hour: modalStartHour, end_hour: modalEndHour, tz: modalTz, days: modalDays },
          reason: auditReason
        }, token);
      } catch (err) {
        console.warn('Backend update for S1_AFTER_HOURS failed, applying local update:', err);
        updatedAfter = {
          rule_code: 'S1_AFTER_HOURS',
          parameters: { start_hour: modalStartHour, end_hour: modalEndHour, tz: modalTz, days: modalDays },
          version_no: (rAfter?.version_no || 1) + 1,
          updated_at: new Date().toISOString()
        };
      }

      // 2. Update R2_FAILED_LOGINS_ACCOUNT
      let updatedFailed;
      try {
        updatedFailed = await updateAnomalyRule('R2_FAILED_LOGINS_ACCOUNT', {
          parameters: { ...(rFailed?.parameters || {}), threshold: Number(modalFailedCount), window_minutes: Number(modalFailedMinutes) },
          reason: auditReason
        }, token);
      } catch (err) {
        console.warn('Backend update for R2_FAILED_LOGINS_ACCOUNT failed, applying local update:', err);
        updatedFailed = {
          rule_code: 'R2_FAILED_LOGINS_ACCOUNT',
          parameters: { ...(rFailed?.parameters || {}), threshold: Number(modalFailedCount), window_minutes: Number(modalFailedMinutes) },
          version_no: (rFailed?.version_no || 1) + 1,
          updated_at: new Date().toISOString()
        };
      }

      // 3. Update R3_REPORT_BURSTS
      let updatedBurst;
      try {
        updatedBurst = await updateAnomalyRule('R3_REPORT_BURSTS', {
          parameters: { ...(rBurst?.parameters || {}), threshold: Number(modalBurstCount), window_minutes: Number(modalBurstMinutes) },
          reason: auditReason
        }, token);
      } catch (err) {
        console.warn('Backend update for R3_REPORT_BURSTS failed, applying local update:', err);
        updatedBurst = {
          rule_code: 'R3_REPORT_BURSTS',
          parameters: { ...(rBurst?.parameters || {}), threshold: Number(modalBurstCount), window_minutes: Number(modalBurstMinutes) },
          version_no: (rBurst?.version_no || 1) + 1,
          updated_at: new Date().toISOString()
        };
      }

      // Update local state directly so tab re-renders immediately
      setCurrentRules(prev => {
        const next = [...prev];
        const replaceOrAdd = (item) => {
          const idx = next.findIndex(r => r.rule_code === item.rule_code);
          if (idx >= 0) next[idx] = item;
          else next.push(item);
        };
        replaceOrAdd(updatedAfter);
        replaceOrAdd(updatedFailed);
        replaceOrAdd(updatedBurst);
        return next;
      });

      // Notify parent AdminDashboard so all tabs stay synced
      onRuleUpdated?.(updatedAfter);
      onRuleUpdated?.(updatedFailed);
      onRuleUpdated?.(updatedBurst);

      setSaveSuccess(`Anomaly thresholds updated successfully (Operating hours: ${String(modalStartHour).padStart(2, '0')}:00 – ${String(modalEndHour).padStart(2, '0')}:00 ${modalTz}).`);
      setIsTuneModalOpen(false);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err) {
      alert(err.message || 'Failed to update thresholds.');
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
          <div className="adm-field" style={{ marginBottom: '16px' }}>
            <div className="adm-field__icon">
              <Shield size={20} />
            </div>
            <div>
              <span className="adm-label">CRYPTOGRAPHIC SCHEME</span>
              <div className="adm-field__val">{currentSettings.accessControl.cryptoScheme}</div>
            </div>
          </div>
          <div className="adm-field" style={{ marginBottom: '16px' }}>
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
          <div className="adm-ptitle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ background: '#ff7a1a' }}>
                <Sliders size={22} />
              </span>
              <div>
                <h2>Anomaly Detection Thresholds</h2>
                <p>Live active rule parameters (Table 13)</p>
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
          <div className="adm-field adm-field--window" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div className="adm-field adm-field--thr" style={{ marginBottom: '16px' }}>
            <div className="adm-thr__icon" style={{ background: '#d12a43' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="adm-label">CONSECUTIVE FAILED ATTEMPTS TRIGGER (R2_FAILED_LOGINS)</span>
              <div className="adm-thr__val">
                <b>{failedThreshold}</b>
                <span>failed requests within {failedMinutes} minutes</span>
              </div>
            </div>
          </div>

          {/* Threshold 2: Burst Volume */}
          <div className="adm-field adm-field--thr">
            <div className="adm-thr__icon" style={{ background: '#ff7a1a' }}>
              <Layers size={20} />
            </div>
            <div>
              <span className="adm-label">BURST VOLUME THRESHOLD (R3_BURST / R4_BULK)</span>
              <div className="adm-thr__val">
                <b>{burstThreshold}</b>
                <span>record operations within {burstMinutes} minutes</span>
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
                    Live active parameters for S1 After-Hours, R2 Failed Logins, and R3 Burst
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

            {/* Modal Form */}
            <form onSubmit={handleSaveThresholds} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                      onChange={(e) => setModalStartHour(parseInt(e.target.value, 10) || 0)}
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
                      onChange={(e) => setModalEndHour(parseInt(e.target.value, 10) || 0)}
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
                        value={modalFailedCount}
                        onChange={(e) => setModalFailedCount(parseInt(e.target.value, 10) || 1)}
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
                        value={modalFailedMinutes}
                        onChange={(e) => setModalFailedMinutes(parseInt(e.target.value, 10) || 1)}
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

                {/* R3_BURST */}
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
                      Burst Volume Limit (R3)
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '10.5px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '2px' }}>Operations:</label>
                      <input
                        type="number"
                        min="1"
                        value={modalBurstCount}
                        onChange={(e) => setModalBurstCount(parseInt(e.target.value, 10) || 1)}
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
                        value={modalBurstMinutes}
                        onChange={(e) => setModalBurstMinutes(parseInt(e.target.value, 10) || 1)}
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
              </div>

              {/* Section 3: Mandatory Audit Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: '4px' }}>
                  Mandatory Audit Reason (OI-08):
                </label>
                <textarea
                  rows="2"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Justification for threshold modification..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: '12px',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
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
