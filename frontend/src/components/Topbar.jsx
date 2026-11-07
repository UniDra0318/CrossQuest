import React, { useState } from 'react';
import { 
  Flame, 
  Sun, 
  Moon, 
  Zap, 
  PanelLeftClose, 
  PanelLeftOpen
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import DevRoleSwitcherModal from './DevRoleSwitcherModal';
import { useAuth } from '../contexts/AuthContext';

/**
 * Topbar - global header bar rendered by MainAppShell for all authenticated roles.
 * Includes sidebar collapse/expand toggle, contextual view breadcrumb, live streak indicator,
 * theme toggle, and dev role sandbox.
 */
export default function Topbar({ 
  activeViewTitle, 
  streakDays, 
  isSidebarCollapsed = false, 
  onToggleSidebar 
}) {
  const { currentUser } = useAuth();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      <header className="gamified-topbar">
        {/* Left: Sidebar Collapse/Expand Toggle & Section Breadcrumb */}
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

          <div className="topbar-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CrossQuest
            </span>
            <span style={{ color: isDark ? '#475569' : '#cbd5e1', fontSize: '14px', fontWeight: '400' }}>/</span>
            <span className="crumb-active" style={{ fontSize: '14px', fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a' }}>
              {activeViewTitle}
            </span>
          </div>
        </div>

        {/* Right: Trainee Streak, Dev Role Switcher, and Theme Toggle */}
        <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Prominent High-Visibility Dev Role Switcher Pill */}
          {import.meta.env.DEV && (
            <button
              type="button"
              className="dev-switcher-topbar-pill"
              onClick={() => setShowRoleModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(245, 158, 11, 0.35)',
                fontWeight: '800',
                fontSize: '12px',
                transition: 'transform 0.15s ease'
              }}
              title="Open Developer Role Switcher Sandbox (14 personas across 5 companies)"
            >
              <Zap size={14} />
              <span>DEV ROLE SWITCHER</span>
              <span style={{
                padding: '2px 7px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.28)',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                {currentUser?.name?.split(' ')[0] || 'User'}
              </span>
            </button>
          )}

          {/* Quick Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isDark ? '#1e293b' : '#f8fafc',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              color: isDark ? '#38bdf8' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

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

      {/* Developer Role Switcher Modal (Multi-Tenant Sandbox) */}
      <DevRoleSwitcherModal 
        isOpen={showRoleModal} 
        onClose={() => setShowRoleModal(false)} 
      />
    </>
  );
}
