import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_HOME } from '../routes/routeConfig';
import logoStacked from '../assets/crossquest-logo-stacked.svg';
import logoStackedWhite from '../assets/crossquest-logo-stacked-white.svg';

/**
 * Topbar - global header bar rendered by MainAppShell for all authenticated roles.
 * Includes sidebar collapse/expand toggle, contextual view breadcrumb, and live streak indicator.
 */
export default function Topbar({
  streakDays,
  isSidebarCollapsed = false,
  onToggleSidebar
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();

  return (
    <>
      <header className="gamified-topbar">
        {/* Left: Sidebar Collapse/Expand Toggle & Section Breadcrumb */}
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onToggleSidebar && (
            <button
              type="button"
              className="sidebar-collapse-toggle-btn"
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
              aria-label="Toggle Navigation Sidebar"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          )}

          <div className="topbar-context" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {currentUser?.title || (currentUser?.role ? currentUser.role.replace(/_/g, ' ').toUpperCase() : 'CROSSQUEST')}
            </span>
            {currentUser?.organization && (
              <>
                <span style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: '13px' }}>•</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: isDark ? '#cbd5e1' : '#334155' }}>
                  {currentUser.organization}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Trainee Streak */}
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Streak Pill - Trainees only */}
          {currentUser?.role === 'trainee' && (
            <div
              className="gamified-stat-pill streak-pill"
              style={{
                background: isDark ? 'rgba(234, 88, 12, 0.16)' : '#fff7ed',
                border: isDark ? '1.5px solid rgba(249, 115, 22, 0.35)' : '1.5px solid #fed7aa',
                boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(234, 88, 12, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Flame
                size={16}
                className="stat-flame-icon"
                style={{
                  color: isDark ? '#fb923c' : '#ea580c',
                  filter: isDark ? 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.6))' : 'drop-shadow(0 0 4px rgba(234, 88, 12, 0.4))'
                }}
              />
              <span
                className="stat-num streak-num"
                style={{
                  color: isDark ? '#fb923c' : '#ea580c',
                  fontWeight: 800,
                  fontSize: '14px',
                  lineHeight: 1
                }}
              >
                {Number.isFinite(Number(streakDays))
                  ? Number(streakDays)
                  : (Number.isFinite(Number(currentUser?.streak)) ? Number(currentUser.streak) : 7)}
              </span>
              <span
                className="stat-label streak-label"
                style={{
                  color: isDark ? '#fdba74' : '#9a3412',
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '0.04em',
                  lineHeight: 1
                }}
              >
                DAY STREAK
              </span>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
