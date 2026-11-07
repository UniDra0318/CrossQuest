import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * SlimPageHeader - clean, professional B2B header replacing the 280px hero banners.
 * Follows the CrossQuest UI/UX Improvement Plan:
 * - Title + one line of context
 * - Optional primary action button
 * - No 3D cubes, no floating tags, no internal requirement IDs
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  badge,
  badgeType = 'default', // 'default' | 'success' | 'warning' | 'info'
  actions = null,
  children = null
}) {
  const { isDark } = useTheme?.() || { isDark: false };

  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'success':
        return {
          background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
          color: isDark ? '#34d399' : '#047857',
          border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #a7f3d0'
        };
      case 'warning':
        return {
          background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
          color: isDark ? '#fbbf24' : '#b45309',
          border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #fde68a'
        };
      case 'info':
        return {
          background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
          color: isDark ? '#38bdf8' : '#0369a1',
          border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #bae6fd'
        };
      default:
        return {
          background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
          color: isDark ? '#818cf8' : '#4338ca',
          border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #c7d2fe'
        };
    }
  };

  return (
    <div className="slim-page-header" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
      padding: '20px 0 24px',
      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '780px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '800',
            letterSpacing: '-0.02em',
            margin: 0,
            color: isDark ? '#f8fafc' : '#0f172a'
          }}>
            {title}
          </h1>
          {badge && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '700',
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '0.04em',
              ...getBadgeStyle()
            }}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p style={{
            fontSize: '13.5px',
            color: isDark ? '#94a3b8' : '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
