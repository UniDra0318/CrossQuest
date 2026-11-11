import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Layers,
  KeyRound,
  ExternalLink,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../StaffContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function Portfolios() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { portfolios, me } = useStaff();
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';
  const scrollContainerRef = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const assignedScopes = currentUser?.assigned_client_accounts || currentUser?.assigned_companies || me?.scopes || ['CORP_ALPHA', 'BANK_DELTA'];

  // Prioritize active/assigned client portfolios first, followed by restricted portfolios
  const sortedPortfolios = useMemo(() => {
    return [...portfolios].sort((a, b) => {
      const aMine = assignedScopes.includes(a.scope);
      const bMine = assignedScopes.includes(b.scope);
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return 0;
    });
  }, [portfolios, assignedScopes]);

  const activePortfoliosCount = useMemo(() => {
    return portfolios.filter(p => assignedScopes.includes(p.scope)).length;
  }, [portfolios, assignedScopes]);

  const totalActiveTrainees = useMemo(() => {
    return portfolios.reduce((acc, p) => acc + (p.trainees || 0), 0);
  }, [portfolios]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkScroll();
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [sortedPortfolios]);

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -380 : 380,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <div className="am-portfolios-enclave">
      {/* Account Manager Hero Stage (Electric Ultramarine / Deep Cobalt Cockpit) */}
      <section className="trainee-hero-stage am-clients-hero-stage">
        <div className="trainee-hero-content">
          <div className="trainee-hero-badge" style={{ background: 'rgba(56, 189, 248, 0.14)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#e0f2fe' }}>
            <Briefcase size={13} style={{ color: '#38bdf8' }} />
            <span>ENTERPRISE ACCOUNTS &bull; CLIENT PORTFOLIO DESK</span>
          </div>

          <h2 className="trainee-hero-headline">Assigned Enterprise Portfolios</h2>
          <p className="trainee-hero-sub">
            Institutional client accounts, cryptographic contract scopes, and workforce training enrollments under your active management.
          </p>

          <div className="trainee-hero-actions">
            <span 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#ffffff',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}
            >
              <KeyRound size={13} style={{ color: '#38bdf8' }} />
              AUTHORIZED SCOPES: {assignedScopes.join(', ')}
            </span>
          </div>
        </div>

        {/* 4-Cell Bento Telemetry Grid for Portfolios */}
        <div className="trainee-hero-metrics-panel">
          <div className="hero-metric-cell am-portfolio-metric-cell">
            <span className="metric-tag">TOTAL CLIENTS</span>
            <div className="metric-num">
              {portfolios.length}
              <span className="metric-unit">ORGS</span>
            </div>
            <span className="metric-sub-label">Global directory registry</span>
          </div>

          <div className="hero-metric-cell am-portfolio-metric-cell">
            <span className="metric-tag">ASSIGNED PORTFOLIOS</span>
            <div className="metric-num" style={{ color: '#34d399' }}>
              {activePortfoliosCount}
              <span className="metric-unit" style={{ color: '#6ee7b7' }}>ACTIVE</span>
            </div>
            <span className="metric-sub-label">Assigned client scope (SEC-10)</span>
          </div>

          <div className="hero-metric-cell am-portfolio-metric-cell">
            <span className="metric-tag">ENROLLED TRAINEES</span>
            <div className="metric-num" style={{ color: '#38bdf8' }}>
              {totalActiveTrainees}
              <span className="metric-unit" style={{ color: '#7dd3fc' }}>LEARNERS</span>
            </div>
            <span className="metric-sub-label">Across client workforce</span>
          </div>

          <div className="hero-metric-cell am-portfolio-metric-cell">
            <span className="metric-tag">CP-ABE POLICIES</span>
            <div className="metric-num" style={{ color: '#c084fc' }}>
              100<span className="metric-unit" style={{ color: '#e9d5ff' }}>%</span>
            </div>
            <span className="metric-sub-label">Cryptographically isolated</span>
          </div>
        </div>
      </section>

      {/* Main Glassmorphic Container for Carousel & Cards */}
      <div className="adm-panel adm-vault-panel" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              Client Directory &amp; Assigned Scope
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
              Scroll horizontally to inspect assigned enterprise accounts, training agreements, and CP-ABE encryption policies.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              title="Scroll Left"
              aria-label="Scroll Left"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canScrollLeft ? 'pointer' : 'not-allowed',
                opacity: canScrollLeft ? 1 : 0.4,
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              title="Scroll Right"
              aria-label="Scroll Right"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canScrollRight ? 'pointer' : 'not-allowed',
                opacity: canScrollRight ? 1 : 0.4,
                transition: 'all 0.15s ease'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Side-Scrolling Horizontal Container */}
        <div 
          ref={scrollContainerRef}
          className="stf-cards"
          style={{ 
            display: 'flex', 
            flexWrap: 'nowrap', 
            gap: '24px', 
            overflowX: 'auto', 
            overflowY: 'hidden',
            paddingBottom: '20px',
            paddingTop: '8px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}
        >
          {sortedPortfolios.map((p) => {
            const isMine = assignedScopes.includes(p.scope);

            return (
              <div 
                key={p.scope} 
                className={`stf-card am-portfolio-card ${isMine ? 'am-portfolio-card--active' : 'am-portfolio-card--locked'}`}
                style={{
                  flex: '0 0 380px',
                  minWidth: '380px',
                  maxWidth: '380px',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  borderRadius: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '28px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: isMine 
                    ? (isDark ? 'linear-gradient(145deg, #131b2e 0%, #0f172a 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)')
                    : (isDark ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(10, 15, 30, 0.9) 100%)' : 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)'),
                  border: isMine 
                    ? (isDark ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(14, 165, 233, 0.3)')
                    : (isDark ? '1px dashed rgba(148, 163, 184, 0.25)' : '1px dashed rgba(148, 163, 184, 0.45)'),
                  boxShadow: isMine 
                    ? (isDark ? '0 16px 36px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 189, 248, 0.15)' : '0 20px 40px -8px rgba(14, 165, 233, 0.15), 0 4px 14px -2px rgba(15, 23, 42, 0.05)')
                    : (isDark ? 'none' : '0 4px 14px rgba(15, 23, 42, 0.03)'),
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Decorative Top Glowing Accent Line */}
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: isMine 
                      ? 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #34d399 100%)' 
                      : (isDark ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(148, 163, 184, 0.2) 100%)' : 'linear-gradient(90deg, #fca5a5 0%, #cbd5e1 100%)')
                  }} 
                />

                <div>
                  {/* Card Header: Icon Badge & Status */}
                  <div className="stf-card__top" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div 
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isMine 
                            ? (isDark ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe')
                            : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2'),
                          color: isMine 
                            ? (isDark ? '#38bdf8' : '#0284c7')
                            : (isDark ? '#f87171' : '#dc2626')
                        }}
                      >
                        <Building2 size={16} />
                      </div>
                      <span 
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          background: isMine ? (isDark ? 'rgba(2, 132, 199, 0.2)' : '#f0f9ff') : (isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'),
                          color: isMine ? (isDark ? '#38bdf8' : '#0369a1') : (isDark ? '#f87171' : '#b91c1c'),
                          border: isMine ? (isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #bae6fd') : (isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fecaca')
                        }}
                      >
                        {p.scope}
                      </span>
                    </div>

                    {isMine ? (
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
                          color: isDark ? '#34d399' : '#059669',
                          border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #a7f3d0'
                        }}
                      >
                        <span className="adm-live" style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }} />
                        AUTHORIZED
                      </span>
                    ) : (
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                          color: isDark ? '#fca5a5' : '#b91c1c',
                          border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #fecaca'
                        }}
                      >
                        <Lock size={10} />
                        RESTRICTED
                      </span>
                    )}
                  </div>

                  {/* Title & Industry */}
                  <h3 style={{ margin: '20px 0 6px', fontSize: '18px', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.01em', color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {p.name}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500, marginBottom: '22px' }}>
                    {p.industry}
                  </div>

                  {/* High-End Cockpit Spec Panel */}
                  <div 
                    style={{
                      background: isMine 
                        ? (isDark ? 'rgba(2, 132, 199, 0.08)' : 'rgba(240, 249, 255, 0.85)')
                        : (isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff'),
                      border: isMine 
                        ? (isDark ? '1px solid rgba(56, 189, 248, 0.22)' : '1px solid rgba(186, 230, 253, 0.9)')
                        : (isDark ? '1px solid #1e293b' : '1px solid #e2e8f0'),
                      borderRadius: '16px',
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: isDark ? 'inset 0 1px 1px rgba(255, 255, 255, 0.04)' : '0 2px 8px rgba(15, 23, 42, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>Account Agreement</span>
                      <span style={{ fontWeight: 700, color: isMine ? (isDark ? '#34d399' : '#059669') : (isDark ? '#cbd5e1' : '#334155'), display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isMine ? '#10b981' : '#94a3b8' }} />
                        {p.status || 'Active Agreement'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>Enrolled Trainees</span>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '13px', color: isMine ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#cbd5e1' : '#334155') }}>
                        {p.trainees} <span style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>active</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>CP-ABE Policy</span>
                      <code style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: isDark ? '#0b1120' : '#f1f5f9', border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', color: isDark ? '#cbd5e1' : '#334155' }}>
                        COMPANY:{p.scope}
                      </code>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', paddingTop: '4px', borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9' }}>
                      <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>Scope Access</span>
                      <span 
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono, monospace)',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          letterSpacing: '0.06em',
                          background: isMine ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5') : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                          color: isMine ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#b91c1c'),
                          border: isMine ? (isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #a7f3d0') : (isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid #fca5a5')
                        }}
                      >
                        {isMine ? 'GRANTED' : 'RESTRICTED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                {isMine ? (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                    <button
                      type="button"
                      className="am-card-primary-action"
                      style={{
                        flex: 1,
                        padding: '11px 16px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => navigate('/am/records?client=' + p.scope)}
                    >
                      <span>Vault Records</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      style={{ 
                        flex: 1, 
                        padding: '11px 16px',
                        borderRadius: '12px',
                        background: isDark ? '#1e293b' : '#ffffff', 
                        border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        color: isDark ? '#f8fafc' : '#334155',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isDark ? 'none' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => navigate('/am/reports?client=' + p.scope)}
                    >
                      <FileText size={13} />
                      <span>Audit Trail</span>
                    </button>
                  </div>
                ) : (
                  <div 
                    style={{ 
                      marginTop: '22px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: isDark ? '1px dashed #334155' : '1px dashed #cbd5e1',
                      background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                      color: isDark ? '#94a3b8' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: isDark ? 'none' : '0 1px 3px rgba(15, 23, 42, 0.03)'
                    }}
                  >
                    <Lock size={13} style={{ color: isDark ? '#f87171' : '#ef4444' }} />
                    <span>Requires Admin Scope Grant</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
