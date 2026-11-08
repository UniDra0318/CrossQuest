import React from 'react';
import { 
  Key, 
  Shield, 
  Server, 
  Lock, 
  Sliders, 
  AlertTriangle, 
  Layers 
} from 'lucide-react';

export default function SystemSettings({ settings, liveRules = [], onTuneRules }) {
  const currentSettings = settings || {
    accessControl: {
      cryptoScheme: 'Native Charm CP-ABE (BSW07)',
      provider: 'Zero-Trust Cryptographic Engine',
      keyAuthority: 'Decentralized Multi-Authority (DMA-ABE)'
    },
    anomaly: {
      window: { start: '08:00', end: '19:00', tz: 'PHT', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
      failedAttempts: { count: 3, minutes: 5 },
      burstVolume: { records: 50, minutes: 10 }
    }
  };

  return (
    <div style={{ marginTop: '24px' }}>
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
            {onTuneRules && (
              <button
                type="button"
                onClick={onTuneRules}
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
                  cursor: 'pointer'
                }}
                title="Tune thresholds in Anomaly Monitor"
              >
                <Sliders size={13} />
                <span>Tune Thresholds &rarr;</span>
              </button>
            )}
          </div>

          {/* Operating Window */}
          <div className="adm-field adm-field--window" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="adm-label">STANDARD BUSINESS WINDOW</span>
              <strong style={{ fontSize: '13px', color: '#ff7a1a' }}>
                {(() => {
                  const rAfter = liveRules.find(r => r.rule_code === 'S1_AFTER_HOURS');
                  if (rAfter?.parameters?.start_hour !== undefined) {
                    return `${String(rAfter.parameters.start_hour).padStart(2, '0')}:00 – ${String(rAfter.parameters.end_hour).padStart(2, '0')}:00 (${rAfter.parameters.tz || 'UTC+8'})`;
                  }
                  return `${currentSettings.anomaly.window.start} – ${currentSettings.anomaly.window.end} ${currentSettings.anomaly.window.tz}`;
                })()}
              </strong>
            </div>
            <div className="adm-window">
              <i style={{ left: '33.3%', width: '45.8%' }} />
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
                  className={`adm-day ${currentSettings.anomaly.window.days.includes(d) ? 'on' : ''}`}
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
                <b>
                  {(() => {
                    const rFailed = liveRules.find(r => r.rule_code === 'R2_FAILED_LOGINS_ACCOUNT') || liveRules.find(r => r.rule_code?.includes('FAILED_LOGINS'));
                    return rFailed?.parameters?.threshold ?? currentSettings.anomaly.failedAttempts.count;
                  })()}
                </b>
                <span>
                  failed requests within {(() => {
                    const rFailed = liveRules.find(r => r.rule_code === 'R2_FAILED_LOGINS_ACCOUNT') || liveRules.find(r => r.rule_code?.includes('FAILED_LOGINS'));
                    return rFailed?.parameters?.window_minutes ?? currentSettings.anomaly.failedAttempts.minutes;
                  })()} minutes
                </span>
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
                <b>
                  {(() => {
                    const rBurst = liveRules.find(r => r.rule_code === 'R3_REPORT_BURSTS') || liveRules.find(r => r.rule_code === 'R4_BULK_EDIT') || liveRules.find(r => r.rule_code?.includes('BURST'));
                    return rBurst?.parameters?.threshold ?? currentSettings.anomaly.burstVolume.records;
                  })()}
                </b>
                <span>
                  record operations within {(() => {
                    const rBurst = liveRules.find(r => r.rule_code === 'R3_REPORT_BURSTS') || liveRules.find(r => r.rule_code === 'R4_BULK_EDIT') || liveRules.find(r => r.rule_code?.includes('BURST'));
                    return rBurst?.parameters?.window_minutes ?? currentSettings.anomaly.burstVolume.minutes;
                  })()} minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
