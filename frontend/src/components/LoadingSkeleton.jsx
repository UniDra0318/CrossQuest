import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Reusable animated shimmer skeleton placeholder for loading states.
 * @param {number} rows - number of text lines to display (default: 3)
 * @param {string} type - 'card' | 'table' | 'rows' (default: 'rows')
 * @param {string} height - custom height for row or block
 */
export default function LoadingSkeleton({ rows = 3, type = 'rows', height }) {
  const { isDark } = useTheme?.() || { isDark: false };

  const shimmerStyle = {
    background: isDark
      ? 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)'
      : 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmerSweep 1.5s infinite',
    borderRadius: '8px'
  };

  if (type === 'card') {
    return (
      <div style={{
        background: isDark ? '#111827' : '#ffffff',
        borderRadius: '14px',
        border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ ...shimmerStyle, height: '24px', width: '40%' }} />
        <div style={{ ...shimmerStyle, height: '14px', width: '70%' }} />
        <div style={{ ...shimmerStyle, height: '80px', width: '100%', borderRadius: '10px' }} />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div style={{
        background: isDark ? '#111827' : '#ffffff',
        borderRadius: '12px',
        border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ ...shimmerStyle, height: '32px', width: '100%', borderRadius: '6px' }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ ...shimmerStyle, height: height || '22px', width: '100%', borderRadius: '6px' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            ...shimmerStyle,
            height: height || '18px',
            width: i === rows - 1 ? '60%' : '100%'
          }}
        />
      ))}
    </div>
  );
}

