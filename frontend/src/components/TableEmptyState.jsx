import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Inbox } from 'lucide-react';

export function TableEmptyRow({
  colSpan = 5,
  icon: Icon = Inbox,
  title = 'No records found',
  subtitle = 'There are no items to display at this time.',
  style = {}
}) {
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  return (
    <tr style={{ borderBottom: 'none' }}>
      <td
        colSpan={colSpan}
        style={{
          padding: '48px 20px',
          textAlign: 'center',
          background: 'transparent',
          ...style
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
              border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2px'
            }}
          >
            <Icon size={22} style={{ color: isDark ? '#cbd5e1' : '#64748b' }} />
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '420px', lineHeight: 1.45 }}>
              {subtitle}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function TableEmptyBlock({
  icon: Icon = Inbox,
  title = 'No records found',
  subtitle = 'There are no items to display at this time.',
  className = 'adm-row',
  style = {}
}) {
  const { effectiveTheme } = useTheme?.() || { effectiveTheme: 'light' };
  const isDark = effectiveTheme === 'dark';

  return (
    <div
      className={className}
      style={{
        padding: '48px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        gridColumn: '1 / -1',
        borderBottom: 'none',
        ...style
      }}
    >
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: isDark ? 'rgba(148, 163, 184, 0.12)' : '#f1f5f9',
          border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2px'
        }}
      >
        <Icon size={22} style={{ color: isDark ? '#cbd5e1' : '#64748b' }} />
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '420px', lineHeight: 1.45 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export default TableEmptyRow;

