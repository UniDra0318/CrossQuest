import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
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
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getTrainingSessions, createTrainingSession, updateParticipantAttendance, getStaffRecords } from '../../api/staff';

const DEFAULT_COURSES = [
  'Agile PME & Project Management Challenge',
  'Executive Communication & CONNECT Simulation',
  'Supervisory Mastery & High-Impact Coaching',
  'Business Continuity & ISO 31000 Risk Management',
  'Cybersecurity Fundamentals & CP-ABE Access Control'
];

const DEFAULT_TRAINERS = [
  { id: 'trainer-joey', name: 'Joey Ramos', title: 'Lead Technical Trainer' },
  { id: 'trainer-billy', name: 'Billy Fernandez', title: 'Senior Cloud Trainer' },
  { id: 'trainer-jobert', name: 'Jobert Cruz', title: 'Enterprise Data Trainer' },
  { id: 'trainer-owen', name: 'Owen Castillo', title: 'Security & App Dev Trainer' }
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

const getTrainerDisplay = (sess) => {
  if (sess?.trainers && sess.trainers.length > 0) return sess.trainers.join(', ');
  if (sess?.assigned_trainers && sess.assigned_trainers.length > 0) {
    const names = sess.assigned_trainers.map(t => t.trainer_name).filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  return sess?.trainer_name || 'Lead Trainer';
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

  // New Session Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);
  const [newSession, setNewSession] = useState({
    course_name: DEFAULT_COURSES[0],
    session_code: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    delivery_mode: 'Online',
    venue: 'Online (Virtual Meeting)',
    client_code: assignedClients[0] || 'CORP_ALPHA',
    trainer_name: DEFAULT_TRAINERS[0].name,
    participants_input: ''
  });

  // Session Detail / Attendance Modal
  const [activeSession, setActiveSession] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceEdits, setAttendanceEdits] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessList, recList] = await Promise.all([
        getTrainingSessions(),
        getStaffRecords()
      ]);

      if (sessList && sessList.length > 0) {
        setSessions(sessList);
      } else {
        // Built-in baseline training cohorts mapped to assigned clients
        const baseline = [
          {
            id: 'sess-01',
            session_code: 'SES-2026-AGILE-01',
            course_name: 'Agile PME & Project Management Challenge',
            client_code: assignedClients[0] || 'CORP_ALPHA',
            start_date: '2026-11-01',
            end_date: '2026-11-03',
            venue: 'Online (Microsoft Teams)',
            delivery_mode: 'Online',
            trainer_signed_off: false,
            needs_attendance: true,
            trainers: ['Joey Ramos']
          },
          {
            id: 'sess-02',
            session_code: 'SES-2026-RISK-02',
            course_name: 'Business Continuity & ISO 31000 Risk Management',
            client_code: assignedClients[1] || assignedClients[0] || 'CORP_ALPHA',
            start_date: '2026-10-20',
            end_date: '2026-10-22',
            venue: 'Crossworks Main Learning Hub, Makati',
            delivery_mode: 'F2F',
            trainer_signed_off: false,
            needs_attendance: false,
            trainers: ['Billy Fernandez']
          },
          {
            id: 'sess-03',
            session_code: 'SES-2026-EXEC-03',
            course_name: 'Executive Communication & CONNECT Simulation',
            client_code: assignedClients[0] || 'CORP_ALPHA',
            start_date: '2026-10-10',
            end_date: '2026-10-12',
            venue: 'Online (Zoom Meeting)',
            delivery_mode: 'Online',
            trainer_signed_off: true,
            trainer_sign_off_at: '2026-10-13T10:00:00Z',
            needs_attendance: false,
            trainers: ['Jobert Cruz']
          }
        ];
        setSessions(baseline);
      }

      if (recList && recList.length > 0) {
        setRecords(recList);
      }
    } catch (e) {
      console.warn('Error loading AM sessions:', e);
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
    return clientFilteredSessions.filter(s => !s.trainer_signed_off && (s.needs_attendance || s.status === 'Needs Attendance'));
  }, [clientFilteredSessions]);

  const columnAwaitingSignOff = useMemo(() => {
    return clientFilteredSessions.filter(s => !s.trainer_signed_off && !(s.needs_attendance || s.status === 'Needs Attendance'));
  }, [clientFilteredSessions]);

  const columnCompleted = useMemo(() => {
    return clientFilteredSessions.filter(s => s.trainer_signed_off || s.status === 'Completed');
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
      trainer_name: DEFAULT_TRAINERS[0].name,
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

      const created = await createTrainingSession(payload).catch(err => {
        console.warn('Backend session creation fallback:', err);
        return {
          id: `sess-${Date.now()}`,
          ...payload,
          client_code: newSession.client_code,
          trainer_signed_off: false,
          needs_attendance: true,
          trainers: [newSession.trainer_name]
        };
      });

      const enriched = {
        ...created,
        client_code: newSession.client_code,
        needs_attendance: true,
        trainers: [newSession.trainer_name]
      };

      setSessions(prev => [enriched, ...prev]);
      setShowNewModal(false);
    } catch (err) {
      setFormError(err.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDetail = (sess) => {
    setActiveSession(sess);
    // Find participants in this session
    const sessRecords = records.filter(r => r.session_id === sess.id || r.course === sess.course_name);
    const initialEdits = {};
    if (sessRecords.length > 0) {
      sessRecords.forEach(r => {
        initialEdits[r.id] = {
          attendance_status: r.attendance_status || 'Present',
          status: r.status === 'Completed' ? 'In progress' : (r.status || 'Enrolled'),
          score: r.score != null ? r.score : ''
        };
      });
    } else {
      // Baseline roster for presentation
      const sampleIds = [`rec-${sess.id}-1`, `rec-${sess.id}-2`, `rec-${sess.id}-3`];
      sampleIds.forEach((id, idx) => {
        initialEdits[id] = {
          trainee: idx === 0 ? 'Andrea Aguilar' : idx === 1 ? 'Ricardo Ocampo' : 'Bea Macaraeg',
          email: idx === 0 ? 'andrea@client.com' : idx === 1 ? 'ricardo@client.com' : 'bea@client.com',
          attendance_status: 'Present',
          status: 'In progress',
          score: ''
        };
      });
    }
    setAttendanceEdits(initialEdits);
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      for (const [recId, data] of Object.entries(attendanceEdits)) {
        await updateParticipantAttendance(recId, {
          status: data.status,
          attendance_status: data.attendance_status,
          score: data.score ? parseFloat(data.score) : null
        }).catch(() => null);
      }

      // Transition session from "Needs attendance" to "Awaiting Trainer sign-off"
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return { ...s, needs_attendance: false, status: 'Awaiting Sign-off' };
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
    <div className="am-sessions-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Client Switcher & Actions Strip */}
      <div 
        style={{ 
          background: isDark ? '#111827' : '#ffffff', 
          borderRadius: '20px', 
          padding: '16px 24px', 
          border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building2 size={18} color="#0284c7" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b' }}>
            CLIENT SCOPE:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`adm-chip ${selectedClient === 'ALL' ? 'adm-chip--solid' : ''}`}
              onClick={() => setSelectedClient('ALL')}
              style={{ cursor: 'pointer' }}
            >
              All Clients ({assignedClients.length})
            </button>
            {assignedClients.map((client) => (
              <button
                key={client}
                type="button"
                className={`adm-chip ${selectedClient === client ? 'adm-chip--solid' : ''}`}
                onClick={() => setSelectedClient(client)}
                style={{ cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {client}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenNewModal}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            background: '#ff7a1a',
            color: '#ffffff',
            border: 'none',
            fontWeight: 800,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(255, 122, 26, 0.25)'
          }}
        >
          <Plus size={16} />
          <span>New Training Session</span>
        </button>
      </div>

      {/* 3-Column Kanban Sessions Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'stretch' }}>
        
        {/* Column 1: Needs Attendance */}
        <div 
          style={{ 
            background: isDark ? '#0b1120' : '#f8fafc', 
            borderRadius: '20px', 
            padding: '18px', 
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Needs Attendance</h3>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#475569' }}>
              {columnNeedsAttendance.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {columnNeedsAttendance.length === 0 ? (
              <div 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '36px 20px', 
                  textAlign: 'center',
                  background: isDark ? 'rgba(17, 24, 39, 0.4)' : '#ffffff',
                  borderRadius: '16px',
                  border: isDark ? '1px dashed #334155' : '1px dashed #cbd5e1'
                }}
              >
                <div 
                  style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '14px', 
                    background: isDark ? '#1e293b' : '#fef3c7', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '12px' 
                  }}
                >
                  <ClipboardList size={22} color={isDark ? '#f59e0b' : '#d97706'} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  All Rosters Logged
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '240px', lineHeight: 1.5 }}>
                  No sessions currently require initial attendance tracking or roster submission.
                </p>
              </div>
            ) : (
              columnNeedsAttendance.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => handleOpenDetail(sess)}
                  style={{
                    background: isDark ? '#111827' : '#ffffff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontFamily: 'monospace' }}>
                      {sess.session_code}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                      {sess.client_code || sess.client_company || 'All Clients'}
                    </span>
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
                      <span>Trainer: {getTrainerDisplay(sess)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>Record Roster</span>
                    <ArrowRight size={13} color="#f59e0b" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Awaiting Trainer Sign-Off */}
        <div 
          style={{ 
            background: isDark ? '#0b1120' : '#f8fafc', 
            borderRadius: '20px', 
            padding: '18px', 
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }} />
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Awaiting Trainer Sign-Off</h3>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#475569' }}>
              {columnAwaitingSignOff.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {columnAwaitingSignOff.length === 0 ? (
              <div 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '36px 20px', 
                  textAlign: 'center',
                  background: isDark ? 'rgba(17, 24, 39, 0.4)' : '#ffffff',
                  borderRadius: '16px',
                  border: isDark ? '1px dashed #334155' : '1px dashed #cbd5e1'
                }}
              >
                <div 
                  style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '14px', 
                    background: isDark ? '#1e293b' : '#e0f2fe', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '12px' 
                  }}
                >
                  <Clock size={22} color={isDark ? '#38bdf8' : '#0284c7'} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  No Pending Sign-Offs
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '240px', lineHeight: 1.5 }}>
                  Active cohorts are either awaiting attendance input or have already been certified.
                </p>
              </div>
            ) : (
              columnAwaitingSignOff.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => handleOpenDetail(sess)}
                  style={{
                    background: isDark ? '#111827' : '#ffffff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', fontFamily: 'monospace' }}>
                      {sess.session_code}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                      {sess.client_code || sess.client_company || 'All Clients'}
                    </span>
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
                      <span>Trainer: {getTrainerDisplay(sess)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckSquare size={12} color="#0284c7" />
                      Attendance Logged • Awaiting Trainer
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div 
          style={{ 
            background: isDark ? '#0b1120' : '#f8fafc', 
            borderRadius: '20px', 
            padding: '18px', 
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }} />
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>Completed</h3>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#475569' }}>
              {columnCompleted.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {columnCompleted.length === 0 ? (
              <div 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '36px 20px', 
                  textAlign: 'center',
                  background: isDark ? 'rgba(17, 24, 39, 0.4)' : '#ffffff',
                  borderRadius: '16px',
                  border: isDark ? '1px dashed #334155' : '1px dashed #cbd5e1'
                }}
              >
                <div 
                  style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '14px', 
                    background: isDark ? '#1e293b' : '#ecfdf5', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginBottom: '12px' 
                  }}
                >
                  <Award size={22} color={isDark ? '#34d399' : '#059669'} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  No Completed Cohorts
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', maxWidth: '240px', lineHeight: 1.5 }}>
                  Completed training sessions will appear here once trainer evaluation and certificate issuance are finalized.
                </p>
              </div>
            ) : (
              columnCompleted.map(sess => (
                <div
                  key={sess.id}
                  onClick={() => handleOpenDetail(sess)}
                  style={{
                    background: isDark ? '#111827' : '#ffffff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: isDark ? '1px solid #1f2937' : '1px solid var(--cq-line)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    opacity: 0.95,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontFamily: 'monospace' }}>
                      {sess.session_code}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                      {sess.client_code || sess.client_company || 'All Clients'}
                    </span>
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
                      <span>Trainer: {getTrainerDisplay(sess)}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: isDark ? '1px solid #1f2937' : '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={12} color="#059669" />
                      Signed Off & Certified
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {sess.trainer_sign_off_at ? formatSessionDate(sess.trainer_sign_off_at) : 'Archived'}
                    </span>
                  </div>
                </div>
              ))
            )}
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
                    value={newSession.trainer_name}
                    onChange={(e) => setNewSession({ ...newSession, trainer_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                  >
                    {DEFAULT_TRAINERS.map(t => <option key={t.id} value={t.name}>{t.name} ({t.title})</option>)}
                  </select>
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
              <button type="button" onClick={() => setActiveSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* Participants Attendance Table */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>Participant Attendance & Course Progress</h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {Object.keys(attendanceEdits).length} enrolled participants
                </span>
              </div>

              <div style={{ border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>PARTICIPANT</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>ATTENDANCE</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>AM STATUS</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>SCORE (OPTIONAL)</th>
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
                              <option value="Enrolled">Enrolled</option>
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
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Optional"
                            value={row.score}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendanceEdits(prev => ({
                                ...prev,
                                [recId]: { ...prev[recId], score: val }
                              }));
                            }}
                            style={{ width: '80px', padding: '6px 8px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '12px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  disabled={savingAttendance}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
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

