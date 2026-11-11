import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Search,
  X,
  UserCheck,
  Building2,
  HelpCircle,
  Laptop,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
  Award,
  ClipboardList,
  Pencil,
  Edit3,
  Lock,
  Eye,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getTrainingSessions, createTrainingSession, updateParticipantAttendance, getStaffRecords } from '../../api/staff';
import { fetchTrainers } from '../../services/api';

const DEFAULT_COURSES = [
  'Agile PME & Project Management Challenge',
  'Executive Communication & CONNECT Simulation',
  'Supervisory Mastery & High-Impact Coaching',
  'Business Continuity & ISO 31000 Risk Management',
  'Cybersecurity Fundamentals & CP-ABE Access Control'
];

const formatSessionDate = (dateStr) => {
  if (!dateStr) return 'Date TBD';
  try {
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, d] = clean.split('-');
    if (!y || !m || !d) return dateStr;
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const getVenueDisplay = (sess) => {
  if (sess?.venue && sess.venue.trim()) return sess.venue.trim();
  if (sess?.delivery_mode === 'Online') return 'Online (Virtual Meeting)';
  return 'Crossworks Makati Learning Hub';
};

const stageOf = (s) => s.board_stage || (s.trainer_signed_off ? 'completed' : 'awaiting_signoff');
const byParticipants = (a, b) => (b.participant_count || 0) - (a.participant_count || 0);

const getTrainerDisplay = (sess) => {
  if (sess?.trainers && sess.trainers.length > 0) return sess.trainers.join(', ');
  if (sess?.assigned_trainers && sess.assigned_trainers.length > 0) {
    const names = sess.assigned_trainers.map(t => t.trainer_name).filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  return sess?.trainer_name || 'Unassigned';
};

export default function Sessions() {
  const { currentUser, token } = useAuth();
  const { isDark } = useTheme();

  const assignedClients = useMemo(() => {
    const list = currentUser?.assigned_client_accounts || currentUser?.assigned_companies || [];
    return list.length > 0 ? list : ['CORP_ALPHA'];
  }, [currentUser]);

  const [selectedClient, setSelectedClient] = useState('ALL');
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [trainersError, setTrainersError] = useState(null);

  // New Session Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [availableTrainers, setAvailableTrainers] = useState([]);
  const [newSession, setNewSession] = useState({
    course_name: DEFAULT_COURSES[0],
    session_code: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    delivery_mode: 'Online',
    venue: 'Online (Virtual Meeting)',
    client_code: assignedClients[0] || 'CORP_ALPHA',
    trainer_name: '',
    participants_input: ''
  });

  // Session Detail / Attendance Modal
  const [activeSession, setActiveSession] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceEdits, setAttendanceEdits] = useState({});

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    setTrainersError(null);
    try {
      const [sessList, recList, trainersRes] = await Promise.all([
        getTrainingSessions().catch(err => {
          throw new Error(`Failed to load sessions: ${err.message || 'Server error'}`);
        }),
        getStaffRecords().catch(() => []),
        fetchTrainers(token).catch(err => {
          setTrainersError(err.message || 'Could not retrieve trainer list from server.');
          return [];
        })
      ]);

      if (trainersRes && trainersRes.length > 0) {
        setAvailableTrainers(trainersRes.map(t => ({
          id: t.id,
          name: t.full_name || t.name,
          title: t.attributes?.title || 'Certified Instructor'
        })));
      } else {
        setAvailableTrainers([]);
      }

      if (sessList && Array.isArray(sessList)) {
        setSessions(sessList);
      } else {
        setSessions([]);
      }

      if (recList && recList.length > 0) {
        setRecords(recList);
      }
    } catch (e) {
      console.error('Error loading AM sessions:', e);
      setLoadError(e.message || 'Failed to communicate with training sessions server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Filtered by selected client
  const clientFilteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedClient === 'ALL') return true;
      return s.client_code === selectedClient || (s.client_company && s.client_company.includes(selectedClient));
    });
  }, [sessions, selectedClient]);

  // 3-Column Board Segmentation:
  // 1. Needs attendance: Not signed off, AM has not finished marking attendance
  // 2. Awaiting Trainer sign-off: AM attendance marked, awaiting trainer evaluation sign-off
  // 3. Completed: Trainer signed off
  const columnNeedsAttendance = useMemo(() => {
    return clientFilteredSessions.filter(s => stageOf(s) === 'needs_attendance').sort(byParticipants);
  }, [clientFilteredSessions]);

  const columnAwaitingSignOff = useMemo(() => {
    return clientFilteredSessions.filter(s => stageOf(s) === 'awaiting_signoff').sort(byParticipants);
  }, [clientFilteredSessions]);

  const columnCompleted = useMemo(() => {
    return clientFilteredSessions.filter(s => stageOf(s) === 'completed').sort(byParticipants);
  }, [clientFilteredSessions]);

  const handleOpenNewModal = () => {
    setFormError(null);
    setNewSession({
      course_name: DEFAULT_COURSES[0],
      session_code: `SES-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      delivery_mode: 'Online',
      venue: 'Online (Virtual Meeting)',
      client_code: assignedClients[0] || 'CORP_ALPHA',
      trainer_name: availableTrainers[0]?.name || '',
      participants_input: ''
    });
    setShowNewModal(true);
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setFormError(null);

    const venue = newSession.venue.trim();
    if (!venue) {
      setFormError('Venue is required. For online delivery, use "Online" or specify virtual platform.');
      return;
    }

    if (!newSession.trainer_name || !newSession.trainer_name.trim()) {
      setFormError('An assigned trainer is required to schedule a training session. Please select an instructor.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        session_code: newSession.session_code.trim(),
        course_name: newSession.course_name,
        course_id: `CRS-${Math.floor(100 + Math.random() * 900)}`,
        start_date: new Date(newSession.start_date).toISOString(),
        end_date: new Date(newSession.end_date).toISOString(),
        delivery_mode: newSession.delivery_mode,
        venue: venue
      };

      const created = await createTrainingSession(payload);

      const enriched = {
        ...created,
        client_code: newSession.client_code,
        needs_attendance: true,
        trainers: [newSession.trainer_name]
      };

      setSessions(prev => [enriched, ...prev]);
      setShowNewModal(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create training session on server.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDetail = (sess) => {
    setActiveSession(sess);
    // Find participants in this session strictly by session_id (no course_name fallback)
    const sessRecords = records.filter(r => r.session_id === sess.id);
    const initialEdits = {};
    sessRecords.forEach(r => {
      initialEdits[r.id] = {
        trainee: r.trainee || r.trainee_name || r.name,
        email: r.trainee_email || r.email,
        attendance_status: r.attendance_status || 'Present',
        status: r.status === 'Completed' ? 'In progress' : (r.status || 'In progress'),
        score: r.score != null ? r.score : ''
      };
    });
    setAttendanceEdits(initialEdits);
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      for (const [recId, data] of Object.entries(attendanceEdits)) {
        await updateParticipantAttendance(recId, {
          status: data.status,
          attendance_status: data.attendance_status
        }).catch(() => null);
      }

      // Transition session from "Needs attendance" to "Awaiting Trainer sign-off"
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return { ...s, needs_attendance: false, status: 'Awaiting Sign-off', board_stage: 'awaiting_signoff' };
        }
        return s;
      }));

      setActiveSession(null);
    } catch (err) {
      alert('Error updating participant attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div className="am-sessions-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .am-kanban-scroll::-webkit-scrollbar { width: 8px; }
        .am-kanban-scroll::-webkit-scrollbar-track { background: transparent; }
        .am-kanban-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.35); border-radius: 8px; }
        .am-kanban-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.6); }
      `}</style>
      {/* Account Manager Sessions Cockpit Hero Stage (Sunset Amber / Deep Bronze) */}
      <section className="trainee-hero-stage am-sessions-hero-stage">
        <div className="trainee-hero-content">
          <div className="trainee-hero-badge" style={{ background: 'rgba(251, 146, 60, 0.15)', borderColor: 'rgba(251, 146, 60, 0.3)', color: '#ffedd5' }}>
            <Calendar size={13} style={{ color: '#fb923c' }} />
            <span>OPERATIONS DISPATCH &bull; COHORT SCHEDULING &amp; ATTENDANCE</span>
          </div>

          <h2 className="trainee-hero-headline">Training Sessions &amp; Cohorts</h2>
          <p className="trainee-hero-sub">
            Coordinate enterprise cohort scheduling, manage participant attendance rosters, and dispatch completed evaluations to trainers for certification.
          </p>

          <div className="trainee-hero-actions">
            <button
              type="button"
              className="trainee-hero-primary-btn am-sessions-primary-btn"
              onClick={handleOpenNewModal}
              title="Schedule a new enterprise training session"
            >
              <Plus size={15} />
              <span>New Training Session</span>
            </button>
          </div>
        </div>

        {/* 4-Cell Bento Telemetry Grid for Sessions */}
        <div className="trainee-hero-metrics-panel">
          <div className="hero-metric-cell am-session-metric-cell">
            <span className="metric-tag">TOTAL COHORTS</span>
            <div className="metric-num">
              {clientFilteredSessions.length}
              <span className="metric-unit">SESS</span>
            </div>
            <span className="metric-sub-label">Filtered scope count</span>
          </div>

          <div className="hero-metric-cell am-session-metric-cell">
            <span className="metric-tag">NEEDS ATTENDANCE</span>
            <div className="metric-num" style={{ color: '#fbbf24' }}>
              {columnNeedsAttendance.length}
              <span className="metric-unit" style={{ color: '#fde68a' }}>ROSTER</span>
            </div>
            <span className="metric-sub-label">Awaiting attendance input</span>
          </div>

          <div className="hero-metric-cell am-session-metric-cell">
            <span className="metric-tag">AWAITING SIGN-OFF</span>
            <div className="metric-num" style={{ color: '#38bdf8' }}>
              {columnAwaitingSignOff.length}
              <span className="metric-unit" style={{ color: '#7dd3fc' }}>REVIEW</span>
            </div>
            <span className="metric-sub-label">With certified trainer</span>
          </div>

          <div className="hero-metric-cell am-session-metric-cell">
            <span className="metric-tag">COMPLETED COHORTS</span>
            <div className="metric-num" style={{ color: '#34d399' }}>
              {columnCompleted.length}
              <span className="metric-unit" style={{ color: '#6ee7b7' }}>DONE</span>
            </div>
            <span className="metric-sub-label">Certificates issued</span>
          </div>
        </div>
      </section>

      {/* Main Glassmorphic Container for Controls & Kanban Board */}
      <div className="adm-panel adm-vault-panel" style={{ padding: '24px 28px' }}>
        {/* Client Switcher & Actions Strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
            paddingBottom: '20px',
            borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Building2 size={18} color="#ea580c" />
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.04em', color: isDark ? '#cbd5e1' : '#334155' }}>
              CLIENT SCOPE:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`adm-chip ${selectedClient === 'ALL' ? 'adm-chip--solid' : ''}`}
                onClick={() => setSelectedClient('ALL')}
                style={{ 
                  cursor: 'pointer',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '12px',
                  padding: '6px 14px',
                  background: selectedClient === 'ALL' ? '#ea580c' : (isDark ? '#1e293b' : '#f1f5f9'),
                  color: selectedClient === 'ALL' ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'),
                  border: selectedClient === 'ALL' ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0')
                }}
              >
                All Clients ({assignedClients.length})
              </button>
              {assignedClients.map((client) => {
                const isSelected = selectedClient === client;
                return (
                  <button
                    key={client}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    style={{ 
                      cursor: 'pointer', 
                      fontFamily: 'var(--font-mono, monospace)',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      padding: '6px 14px',
                      background: isSelected ? '#ea580c' : (isDark ? '#1e293b' : '#f1f5f9'),
                      color: isSelected ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'),
                      border: isSelected ? 'none' : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {client}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {/* Server Loading Error Banner */}
      {loadError && (
        <div className="session-error-banner">
          <div className="session-error-banner__content">
            <AlertTriangle size={18} />
            <span><strong>Server Connection Error:</strong> {loadError}</span>
          </div>
          <button type="button" onClick={loadData} className="session-error-retry-btn">
            Retry
          </button>
        </div>
      )}

        {/* Editorial Guidance Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 20px',
            marginBottom: '28px',
            background: isDark ? 'rgba(2, 132, 199, 0.08)' : '#f0f9ff',
            border: isDark ? '1px solid rgba(2, 132, 199, 0.2)' : '1px solid #bae6fd',
            borderRadius: '16px',
            fontSize: '12.5px',
            color: isDark ? '#94a3b8' : '#334155'
          }}
        >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} color="#0284c7" />
          <span>
            <strong>Interactive Cohorts:</strong> Click any session card with the <span style={{ color: '#0284c7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Pencil size={11} /> Editable</span> badge to update participant attendance and roster status.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: isDark ? '#fbbf24' : '#b45309', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Needs Attendance
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} /> Awaiting Trainer
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} /> Certified
          </span>
        </div>
      </div>

      {/* 3-Column Kanban Sessions Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px', alignItems: 'stretch' }}>

        {/* Column 1: Needs Attendance */}
        <div
          className="am-kanban-column"
          style={{
            background: isDark ? 'linear-gradient(180deg, #131b2e 0%, #0d1322 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '24px',
            padding: '22px',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(245, 158, 11, 0.3)',
            boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(245, 158, 11, 0.06), 0 2px 8px rgba(15, 23, 42, 0.03)',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Column Glow Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Needs Attendance</h3>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', padding: '3px 10px', borderRadius: '999px', background: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', color: isDark ? '#fbbf24' : '#b45309', border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fde68a' }}>
              {columnNeedsAttendance.length}
            </span>
          </div>

          <div className="am-kanban-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: '320px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px', scrollbarWidth: 'thin' }}>
            {columnNeedsAttendance.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                  borderRadius: '18px',
                  border: isDark ? '1px dashed rgba(245, 158, 11, 0.3)' : '1px dashed rgba(245, 158, 11, 0.4)',
                  boxShadow: isDark ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.02)'
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                    border: isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #fde68a'
                  }}
                >
                  <ClipboardList size={26} color={isDark ? '#fbbf24' : '#d97706'} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  All Rosters Logged
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '240px', lineHeight: 1.5 }}>
                  No sessions currently require initial attendance tracking or roster submission.
                </p>
              </div>
            ) : (
              columnNeedsAttendance.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => handleOpenDetail(sess)}
                  className={`am-session-card ${isDark ? 'is-dark' : 'is-light'}`}
                  title="Click to log and edit participant attendance & roster"
                  style={{
                    background: isDark ? '#111827' : '#ffffff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontFamily: 'monospace' }}>
                      {sess.session_code}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                        {sess.client_code || sess.client_company || 'All Clients'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7',
                          color: isDark ? '#fbbf24' : '#b45309',
                          border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fde68a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          letterSpacing: '0.02em'
                        }}
                      >
                        <Pencil size={10} /> Editable Roster
                      </span>
                    </div>
                  </div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {sess.course_name}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} />
                      <span>{formatSessionDate(sess.start_date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={13} />
                      <span>{getVenueDisplay(sess)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={13} />
                      <span>Trainer: {getTrainerDisplay(sess)} • {sess.participant_count ?? 0} enrolled</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} color="#f59e0b" />
                      Roster Pending
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isDark ? '#fbbf24' : '#b45309',
                        fontWeight: 700,
                        background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #fde68a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Pencil size={11} />
                      Log & Edit Roster
                      <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Awaiting Trainer Sign-Off */}
        <div
          className="am-kanban-column"
          style={{
            background: isDark ? 'linear-gradient(180deg, #131b2e 0%, #0d1322 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '24px',
            padding: '22px',
            border: isDark ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(2, 132, 199, 0.3)',
            boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(2, 132, 199, 0.06), 0 2px 8px rgba(15, 23, 42, 0.03)',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Column Glow Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7', boxShadow: '0 0 10px #0284c7' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Awaiting Trainer Sign-Off</h3>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', padding: '3px 10px', borderRadius: '999px', background: isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0284c7', border: isDark ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid #bae6fd' }}>
              {columnAwaitingSignOff.length}
            </span>
          </div>

          <div className="am-kanban-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: '320px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px', scrollbarWidth: 'thin' }}>
            {columnAwaitingSignOff.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                  borderRadius: '18px',
                  border: isDark ? '1px dashed rgba(2, 132, 199, 0.3)' : '1px dashed rgba(2, 132, 199, 0.4)',
                  boxShadow: isDark ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.02)'
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: isDark ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                    border: isDark ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid #bae6fd'
                  }}
                >
                  <Clock size={26} color={isDark ? '#38bdf8' : '#0284c7'} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  No Pending Sign-Offs
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '240px', lineHeight: 1.5 }}>
                  Active cohorts are either awaiting attendance input or have already been certified.
                </p>
              </div>
            ) : (
              columnAwaitingSignOff.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => handleOpenDetail(sess)}
                  className={`am-session-card ${isDark ? 'is-dark' : 'is-light'}`}
                  title="Click to edit participant attendance & roster before trainer certification"
                  style={{
                    background: isDark ? '#111827' : '#ffffff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', fontFamily: 'monospace' }}>
                      {sess.session_code}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                        {sess.client_code || sess.client_company || 'All Clients'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: isDark ? 'rgba(2, 132, 199, 0.18)' : '#e0f2fe',
                          color: isDark ? '#38bdf8' : '#0284c7',
                          border: isDark ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid #bae6fd',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          letterSpacing: '0.02em'
                        }}
                      >
                        <Pencil size={10} /> Editable
                      </span>
                    </div>
                  </div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {sess.course_name}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} />
                      <span>{formatSessionDate(sess.start_date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={13} />
                      <span>{getVenueDisplay(sess)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={13} />
                      <span>Trainer: {getTrainerDisplay(sess)} • {sess.participant_count ?? 0} enrolled</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckSquare size={12} color="#0284c7" />
                      Attendance Logged
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isDark ? '#38bdf8' : '#0284c7',
                        fontWeight: 700,
                        background: isDark ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: isDark ? '1px solid rgba(2, 132, 199, 0.35)' : '1px solid #bae6fd',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Pencil size={11} />
                      Edit Roster
                      <ArrowRight size={11} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div
          className="am-kanban-column"
          style={{
            background: isDark ? 'linear-gradient(180deg, #131b2e 0%, #0d1322 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '24px',
            padding: '22px',
            border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.4)' : '0 10px 30px rgba(16, 185, 129, 0.06), 0 2px 8px rgba(15, 23, 42, 0.03)',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Column Glow Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Completed</h3>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', padding: '3px 10px', borderRadius: '999px', background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5', color: isDark ? '#34d399' : '#059669', border: isDark ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #a7f3d0' }}>
              {columnCompleted.length}
            </span>
          </div>

          <div className="am-kanban-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: '320px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px', scrollbarWidth: 'thin' }}>
            {columnCompleted.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#ffffff',
                  borderRadius: '18px',
                  border: isDark ? '1px dashed rgba(16, 185, 129, 0.3)' : '1px dashed rgba(16, 185, 129, 0.4)',
                  boxShadow: isDark ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.02)'
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                    border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #a7f3d0'
                  }}
                >
                  <Award size={26} color={isDark ? '#34d399' : '#059669'} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  No Completed Cohorts
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '240px', lineHeight: 1.5 }}>
                  Completed training sessions will appear here once trainer evaluation and certificate issuance are finalized.
                </p>
              </div>
            ) : (
              columnCompleted.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => handleOpenDetail(sess)}
                  className={`am-session-card ${isDark ? 'is-dark' : 'is-light'}`}
                  title="Click to view certified records and audit sign-off details"
                  style={{
                    background: isDark ? '#111827' : '#ffffff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    opacity: 0.95
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontFamily: 'monospace' }}>
                      {sess.session_code}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                        {sess.client_code || sess.client_company || 'All Clients'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: isDark ? 'rgba(5, 150, 105, 0.18)' : '#ecfdf5',
                          color: isDark ? '#34d399' : '#059669',
                          border: isDark ? '1px solid rgba(5, 150, 105, 0.35)' : '1px solid #a7f3d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          letterSpacing: '0.02em'
                        }}
                      >
                        <Lock size={10} /> Certified
                      </span>
                    </div>
                  </div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {sess.course_name}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} />
                      <span>{formatSessionDate(sess.start_date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={13} />
                      <span>{getVenueDisplay(sess)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={13} />
                      <span>Trainer: {getTrainerDisplay(sess)} • {sess.participant_count ?? 0} enrolled</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={12} color="#059669" />
                      Signed Off & Certified
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontWeight: 600,
                        background: isDark ? '#1e293b' : '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Eye size={11} />
                      View Roster
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      </div>

      {/* New Session Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '620px', padding: '28px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>Schedule New Training Session</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>Configure training cohort, venue requirement, and assigned client account.</p>
              </div>
              <button type="button" onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  COURSE PROGRAM
                </label>
                <select
                  value={newSession.course_name}
                  onChange={(e) => setNewSession({ ...newSession, course_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                >
                  {DEFAULT_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    CLIENT ACCOUNT
                  </label>
                  <select
                    value={newSession.client_code}
                    onChange={(e) => setNewSession({ ...newSession, client_code: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                  >
                    {assignedClients.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    ASSIGNED TRAINER
                  </label>
                  <select
                    required
                    value={newSession.trainer_name}
                    onChange={(e) => setNewSession({ ...newSession, trainer_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                  >
                    <option value="">
                      {trainersError 
                        ? `-- Trainer lookup failed (${trainersError}) --` 
                        : availableTrainers.length === 0 
                          ? '-- No Trainers Available (Server Unreachable) --' 
                          : '-- Select Assigned Trainer --'}
                    </option>
                    {availableTrainers.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.title})</option>
                    ))}
                  </select>
                  {trainersError && (
                    <span className="form-field-error-text">
                      ⚠️ Trainer lookup unavailable: {trainersError}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    START DATE
                  </label>
                  <input
                    type="date"
                    value={newSession.start_date}
                    onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    DELIVERY MODE
                  </label>
                  <select
                    value={newSession.delivery_mode}
                    onChange={(e) => {
                      const mode = e.target.value;
                      setNewSession({
                        ...newSession,
                        delivery_mode: mode,
                        venue: mode === 'Online' ? 'Online (Virtual Meeting)' : ''
                      });
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                  >
                    <option value="Online">Online / Virtual</option>
                    <option value="F2F">Face-to-Face (F2F)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  VENUE (REQUIRED — "Online" for Virtual)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Online (Zoom) or Crossworks Room 402, Makati"
                  value={newSession.venue}
                  onChange={(e) => setNewSession({ ...newSession, venue: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#ff7a1a', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  {creating ? 'Scheduling...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Detail & Attendance Marking Modal */}
      {activeSession && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>

            {/* Header */}
            <div style={{ padding: '24px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', fontFamily: 'monospace' }}>
                    {activeSession.session_code}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
                    {activeSession.client_code}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>{activeSession.course_name}</h3>
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  <span>Venue: {getVenueDisplay(activeSession)}</span>
                  <span>•</span>
                  <span>Delivery: {activeSession.delivery_mode || 'F2F'}</span>
                  <span>•</span>
                  <span>Date: {formatSessionDate(activeSession.start_date)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: activeSession.trainer_signed_off ? (isDark ? 'rgba(5, 150, 105, 0.15)' : '#ecfdf5') : (isDark ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe'),
                  color: activeSession.trainer_signed_off ? '#059669' : '#0284c7',
                  border: activeSession.trainer_signed_off ? '1px solid rgba(5, 150, 105, 0.3)' : '1px solid rgba(2, 132, 199, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  {activeSession.trainer_signed_off ? (
                    <><Lock size={12} /> Certified Record (Read-Only)</>
                  ) : (
                    <><Pencil size={12} /> Live Editable Roster</>
                  )}
                </span>
                <button type="button" onClick={() => setActiveSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Participants Attendance Table */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>Participant Attendance & Course Progress</h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {Object.keys(attendanceEdits).length} enrolled participants
                </span>
              </div>

              {Object.keys(attendanceEdits).length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: isDark ? '#94a3b8' : '#64748b' }}>
                  <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    No Enrolled Participants
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    This training session currently has no enrolled participant records in the database.
                  </p>
                </div>
              ) : (
                <div style={{ border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>PARTICIPANT</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ATTENDANCE <Pencil size={11} color="#0284c7" />
                          </span>
                        </th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            AM STATUS <Pencil size={11} color="#0284c7" />
                          </span>
                        </th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            SCORE (ADMIN-ONLY) <Lock size={11} color="#64748b" />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(attendanceEdits).map(([recId, row]) => (
                        <tr key={recId} style={{ borderBottom: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 700 }}>{row.trainee || recId}</div>
                            {row.email && <div style={{ fontSize: '11px', color: '#64748b' }}>{row.email}</div>}
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={row.attendance_status}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAttendanceEdits(prev => ({
                                  ...prev,
                                  [recId]: { ...prev[recId], attendance_status: val }
                                }));
                              }}
                              style={{ padding: '6px 10px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '12px' }}
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Excused">Excused</option>
                            </select>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                value={row.status}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAttendanceEdits(prev => ({
                                    ...prev,
                                    [recId]: { ...prev[recId], status: val }
                                  }));
                                }}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '12px' }}
                              >
                                <option value="In progress">In progress</option>
                                <option value="Not completed">Not completed</option>
                              </select>

                              <span
                                title="Completed status requires Trainer Sign-Off verification and cannot be assigned by Account Manager"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: isDark ? '#1e293b' : '#f1f5f9',
                                  color: isDark ? '#64748b' : '#94a3b8',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'not-allowed',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🔒 Completed
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <span
                              title="Evaluation scores are entered exclusively by Administrators (Chapter III, Table 9)"
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
                                color: row.score !== '' && row.score != null ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#64748b' : '#94a3b8'),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {row.score !== '' && row.score != null ? `${row.score}%` : 'Unassigned'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Attendance updates are logged to the cryptographic access audit ledger.
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSession(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance || Object.keys(attendanceEdits).length === 0}
                  style={{ 
                    padding: '8px 18px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    background: Object.keys(attendanceEdits).length === 0 ? '#94a3b8' : '#0284c7', 
                    color: '#ffffff', 
                    fontWeight: 700, 
                    fontSize: '12.5px', 
                    cursor: (savingAttendance || Object.keys(attendanceEdits).length === 0) ? 'not-allowed' : 'pointer' 
                  }}
                >
                  {savingAttendance ? 'Saving...' : 'Submit Attendance & Ready for Sign-Off'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

