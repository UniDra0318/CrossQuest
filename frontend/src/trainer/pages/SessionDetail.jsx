import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  CheckSquare, 
  Calendar, 
  Building2, 
  BookOpen,
  MapPin,
  Clock
} from 'lucide-react';
import { useTrainer } from '../TrainerContext';
import { useTheme } from '../../contexts/ThemeContext';
import Roster from './Roster';
import Grade from './Grade';

export default function SessionDetail({ sessionId: propSessionId }) {
  const params = useParams();
  const navigate = useNavigate();
  const { cohorts, sessions, setSelectedSessionId } = useTrainer();
  const { isDark } = useTheme();

  const sessionId = propSessionId || params.id;
  const cohort = cohorts?.find(c => c.id === sessionId || c.sessionId === sessionId);

  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'signoff'

  React.useEffect(() => {
    if (!sessionId) return;
    const matchSess = (sessions || []).find(s => s.id === sessionId || s.session_code === sessionId);
    if (matchSess && setSelectedSessionId) {
      setSelectedSessionId(matchSess.id);
    } else if (cohort?.sessionId && setSelectedSessionId) {
      setSelectedSessionId(cohort.sessionId);
    }
  }, [sessionId, cohort, sessions, setSelectedSessionId]);

  if (!sessionId || !cohort) {
    return (
      <div 
        style={{
          background: isDark ? '#111827' : '#ffffff',
          borderRadius: '24px',
          padding: '48px 24px',
          border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Calendar size={28} />
        </div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
          Session Not Found
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '420px', lineHeight: 1.5 }}>
          The requested training session ({sessionId || 'unspecified'}) could not be found among your assigned cohorts.
        </p>
        <button
          type="button"
          onClick={() => navigate('/trainer')}
          style={{
            marginTop: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            background: 'var(--cq-crimson, #d12a43)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Sessions</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Session Breadcrumb & Header Card */}
      <div 
        style={{ 
          background: isDark ? '#111827' : '#ffffff', 
          borderRadius: '24px', 
          padding: '24px 28px', 
          border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/trainer')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
              background: isDark ? '#1e293b' : '#f8fafc',
              color: isDark ? '#f8fafc' : '#0f172a',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Sessions</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', fontFamily: 'monospace' }}>
                {cohort.id}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                {cohort.org}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {cohort.course}
            </h2>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              <span>📅 {cohort.schedule}</span>
              <span>•</span>
              <span>👥 {cohort.enrolled || 0} Participants</span>
            </div>
          </div>
        </div>

        {/* 2 Tabs: Participants & Sign-off */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`adm-chip ${activeTab === 'participants' ? 'adm-chip--solid' : ''}`}
            onClick={() => setActiveTab('participants')}
            style={{ cursor: 'pointer', padding: '9px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={15} />
            <span>Participants</span>
          </button>
          <button
            type="button"
            className={`adm-chip ${activeTab === 'signoff' ? 'adm-chip--solid' : ''}`}
            onClick={() => setActiveTab('signoff')}
            style={{ cursor: 'pointer', padding: '9px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <CheckSquare size={15} />
            <span>Sign-off</span>
          </button>
        </div>
      </div>

      {/* Tab View Content */}
      <div>
        {activeTab === 'participants' ? (
          <Roster
            sessionFilter={cohort.id}
            onNavigateTab={() => setActiveTab('signoff')}
          />
        ) : (
          <Grade />
        )}
      </div>

    </div>
  );
}

