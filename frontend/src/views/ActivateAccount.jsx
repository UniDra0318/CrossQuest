import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { confirmPasswordResetApi } from '../services/api';
import logoStacked from '../assets/crossquest-logo-stacked.svg';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const tokenFromUrl = searchParams.get('token') || '';
  const [manualToken, setManualToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const activeToken = tokenFromUrl || manualToken.trim();

  // Password validation rules
  const hasMinLength = password.length >= 8;
  const hasMixedChars = /[A-Za-z]/.test(password) && /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = activeToken && hasMinLength && hasMixedChars && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await confirmPasswordResetApi({
      token: activeToken,
      new_password: password
    });

    setIsSubmitting(false);

    if (result.ok) {
      setIsSuccess(true);
    } else {
      setErrorMessage(result.error || 'Failed to activate account. The link may be expired or already used.');
    }
  };

  return (
    <div className="clean-login-viewport" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f8fafc' }}>
      {/* Top Bar with Return to Sign In */}
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button 
          type="button" 
          onClick={() => navigate('/login')}
          style={{ background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} />
          <span>Return to Sign In</span>
        </button>
        <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: '12px' }}>
          ENTERPRISE ONBOARDING
        </span>
      </div>

      <div style={{ width: '100%', maxWidth: '480px', background: '#ffffff', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img 
            src={logoStacked} 
            alt="CrossQuest Logo" 
            style={{ height: '42px', margin: '0 auto 14px', cursor: 'pointer' }} 
            onClick={() => navigate('/')}
          />
          <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {isSuccess ? 'Account Activated!' : 'Activate Your Account'}
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
            {isSuccess 
              ? 'Your enterprise credentials and CP-ABE security keys are established.'
              : 'Complete your initial onboarding by setting your password.'}
          </p>
        </div>

        {isSuccess ? (
          /* SUCCESS STATE */
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={36} />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0', width: '100%', textAlign: 'left', fontSize: '12.5px', color: '#334155', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: '#047857', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> Ready for Production Access
              </div>
              Your single-use activation token has been redeemed. You can now access your role-based dashboard, view assigned tenant records, or begin your learning quests.
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                marginTop: '8px'
              }}
            >
              <span>Proceed to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* ACTIVATION FORM */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* If no token in URL, allow manual paste */}
            {!tokenFromUrl && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  ACTIVATION TOKEN:
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste single-use token from invitation email"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                CREATE PASSWORD:
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                CONFIRM PASSWORD:
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLength ? '#059669' : '#94a3b8' }}>
                <CheckCircle2 size={14} />
                <span>At least 8 characters long</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMixedChars ? '#059669' : '#94a3b8' }}>
                <CheckCircle2 size={14} />
                <span>Includes letters and numbers or symbols</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? '#059669' : '#94a3b8' }}>
                <CheckCircle2 size={14} />
                <span>Passwords match</span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div style={{ padding: '12px 14px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12.5px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                background: !isFormValid ? '#cbd5e1' : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: !isFormValid ? 'none' : '0 4px 16px rgba(124, 58, 237, 0.3)',
                transition: 'all 0.2s ease',
                marginTop: '4px'
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Securing Credentials & Activating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Activate My Account</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
