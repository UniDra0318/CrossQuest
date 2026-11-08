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
  const { cohorts } = useTrainer();
  const { isDark } = useTheme();

  const sessionId = propSessionId || params.id || 'COHORT-2026-08';
  const cohort = cohorts.find(c => c.id === sessionId) || cohorts[0] || {
    id: sessionId,
    course: 'Agile PME & Project Management Challenge',
    org: 'San Miguel Conglomerate Holdings',
    schedule: '2026-11-01 to 2026-11-03',
    enrolled: 8,
    status: 'In Training'
  };

  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'signoff'

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
              <span>👥 {cohort.enrolled || 8} Participants</span>
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
          <Roster />
        ) : (
          <Grade />
        )}
      </div>

    </div>
  );
}

