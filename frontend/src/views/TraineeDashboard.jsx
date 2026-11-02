import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Flame, 
  Sparkles, 
  Check, 
  ArrowRight, 
  BookOpen, 
  AlertCircle, 
  Shield, 
  Play, 
  Clock, 
  GraduationCap, 
  AlertTriangle,
  FileQuestion,
  ChevronRight,
  ExternalLink,
  Download,
  RefreshCw,
  PlusCircle,
  FileCheck
} from 'lucide-react';
import { getActiveQuizDatabase } from '../data/quizDatabase';
import QuizArena from '../components/QuizArena';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchTraineeGamification, 
  submitQuizScore, 
  toggleLeaderboardOptOut, 
  fetchCompanyLeaderboard,
  fetchCertificates,
  fetchCertificationTypes,
  submitExternalCredential,
  fetchExpiryNotifications,
  triggerExpirySweep,
  fetchQuizzes
} from '../services/api';
import Mascot from '../components/Mascot';
import IsoCube from '../components/IsoCube';
import BadgeCoin from '../components/BadgeCoin';
import Podium from '../components/Podium';
import { TRACKS } from '../data/tracks';
import { badges as designBadges, leaderboard as designLeaderboard } from '../data/mock';

export default function TraineeDashboard({ activeSubView, setActiveView, onStreakLoad }) {
  const { currentUser, token } = useAuth();
  const [points, setPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [level, setLevel] = useState(null);
  const [streakDays, setStreakDays] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState(designBadges);
  const [realQuizzes, setRealQuizzes] = useState([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Live Certifications & Expiry Notifications State (FR-18, FR-19, DAT-05, U-15)
  const [liveCerts, setLiveCerts] = useState([]);
  const [certNotifications, setCertNotifications] = useState([]);
  const [certTypes, setCertTypes] = useState([]);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalSubmitting, setExternalSubmitting] = useState(false);
  const [externalForm, setExternalForm] = useState({
    cert_type_code: 'PMP',
    title: 'Project Management Professional (PMP)',
    credential_url: '',
    issue_date: '',
    expiry_date: ''
  });
  const [certMsg, setCertMsg] = useState(null);
  const [certError, setCertError] = useState(null);
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [gamLoading, setGamLoading] = useState(true);

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizScoreStatus, setQuizScoreStatus] = useState({
    'act-1': { completed: false, score: null },
    'act-2': { completed: false, score: null },
    'act-3': { completed: false, score: null },
    'act-4': { completed: false, score: null }
  });

  // Track online status (SEC-26: Offline quizzes disabled)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync with backend gamification data & real-time streak
  useEffect(() => {
    async function loadGamification() {
      setGamLoading(true);
      if (currentUser?.id) {
        // Sync individual trainee quiz progress status
        const defaultProg = {
          'act-1': { completed: false, score: null, segments: [false, false, false, false] },
          'act-2': { completed: false, score: null, segments: [false, false, false, false] },
          'act-3': { completed: false, score: null, segments: [false, false, false, false] },
          'act-4': { completed: false, score: null, segments: [false, false, false, false] }
        };
        const traineeProg = currentUser?.quiz_progress || defaultProg;
        setQuizScoreStatus(traineeProg);

        const [gam, dbQuizzes] = await Promise.all([
          fetchTraineeGamification(currentUser.id, token),
          fetchQuizzes(token)
        ]);
        if (gam) {
          setPoints(gam.points ?? currentUser?.points ?? 0);
          setLevel(gam.level ?? currentUser?.level ?? 1);
          const streak = gam.streak ?? gam.current_streak ?? currentUser?.streak ?? 1;
          setStreakDays(streak);
          if (onStreakLoad) onStreakLoad(streak);

          if (Array.isArray(gam.badges) && gam.badges.length > 0) {
            const BADGE_DEFINITIONS = {
              FIRST_STEP: {
                id: 'first-step',
                title: 'First Quest Completed',
                description: 'Completed your first verified compliance assessment',
                tier: 'Adept',
                icon: 'star',
                hi: '#ffe08a',
                lo: '#ffc53d',
                rim: '#d99a00',
                fg: '#17102b'
              },
              SEVEN_DAY_STREAK: {
                id: 'seven-day-streak',
                title: '7-Day Streak Keeper',
                description: 'Maintained 7 consecutive active study days',
                tier: 'Legendary',
                icon: 'flame',
                hi: '#ffb57a',
                lo: '#ff7a1a',
                rim: '#b84f00',
                fg: '#17102b'
              },
              STREAK_7D: {
                id: 'seven-day-streak',
                title: '7-Day Streak Keeper',
                description: 'Maintained 7 consecutive active study days',
                tier: 'Legendary',
                icon: 'flame',
                hi: '#ffb57a',
                lo: '#ff7a1a',
                rim: '#b84f00',
                fg: '#17102b'
              },
              SECURITY_CHAMPION: {
                id: 'security-champion',
                title: 'Security Champion',
                description: 'Aced Security & Compliance Assessment with high score',
                tier: 'Master',
                icon: 'shield',
                hi: '#6fa8ff',
                lo: '#1d6fe0',
                rim: '#124a9e',
                fg: '#ffffff'
              },
              QUIZ_MASTER: {
                id: 'security-champion',
                title: 'Cipher Master',
                description: 'Scored 90%+ on CP-ABE Policy Verification',
                tier: 'Master',
                icon: 'shield',
                hi: '#6fa8ff',
                lo: '#1d6fe0',
                rim: '#124a9e',
                fg: '#ffffff'
              },
              RISK_GUARDIAN: {
                id: 'risk-guardian',
                title: 'Risk Guardian',
                description: 'Successfully identified and mitigated simulated data leakage risks',
                tier: 'Master',
                icon: 'award',
                hi: '#a7f3d0',
                lo: '#059669',
                rim: '#065f46',
                fg: '#ffffff'
              },
              AUDIT_MASTER: {
                id: 'audit-master',
                title: 'Audit Master',
                description: 'Passed all tenant row-level compliance and privacy checks',
                tier: 'Legendary',
                icon: 'crown',
                hi: '#fde68a',
                lo: '#d97706',
                rim: '#92400e',
                fg: '#17102b'
              },
              SPEED_DEMON: {
                id: 'speed-demon',
                title: 'Rapid Responder',
                description: 'Completed timed security assessment under 60 seconds',
                tier: 'Adept',
                icon: 'zap',
                hi: '#a97cf5',
                lo: '#6a2bd9',
                rim: '#3b1590',
                fg: '#ffffff'
              },
              SEC_ROOKIE: {
                id: 'sec-rookie',
                title: 'Zero-Trust Initiate',
                description: 'Enrolled in corporate zero-trust compliance curriculum',
                tier: 'Adept',
                icon: 'star',
                hi: '#e0e7ff',
                lo: '#6366f1',
                rim: '#4338ca',
                fg: '#ffffff'
              },
              PERFECT_SCORE: {
                id: 'perfect-score',
                title: 'Flawless Decryption',
                description: 'Achieved 100% precision on cryptographic verification test',
                tier: 'Legendary',
                icon: 'crown',
                hi: '#fef08a',
                lo: '#eab308',
                rim: '#a16207',
                fg: '#17102b'
              }
            };
            setEarnedBadges(gam.badges.map(b => BADGE_DEFINITIONS[b] || {
              id: b.toLowerCase().replace(/_/g, '-'),
              title: b.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
              description: 'Verified corporate compliance achievement unlocked',
              tier: b.includes('STREAK') || b.includes('MASTER') ? 'Legendary' : b.includes('CHAMPION') || b.includes('GUARDIAN') ? 'Master' : 'Adept',
              icon: b.includes('STREAK') ? 'flame' : b.includes('SECURITY') || b.includes('GUARDIAN') ? 'shield' : b.includes('SPEED') ? 'zap' : 'star',
              hi: b.includes('STREAK') ? '#ffb57a' : b.includes('SECURITY') ? '#6fa8ff' : '#a97cf5',
              lo: b.includes('STREAK') ? '#ff7a1a' : b.includes('SECURITY') ? '#1d6fe0' : '#6a2bd9',
              rim: b.includes('STREAK') ? '#b84f00' : b.includes('SECURITY') ? '#124a9e' : '#3b1590',
              fg: b.includes('STREAK') ? '#17102b' : '#ffffff'
            }));
          }
        } else {
          const fallbackStreak = currentUser?.streak ?? 1;
          setStreakDays(fallbackStreak);
          setPoints(currentUser?.points ?? 500);
          setLevel(currentUser?.level ?? 1);
          if (onStreakLoad) onStreakLoad(fallbackStreak);
        }

        if (dbQuizzes && dbQuizzes.length > 0) {
          setRealQuizzes(dbQuizzes);
        }
      }
      setGamLoading(false);
    }
    loadGamification();
  }, [currentUser?.id, token, onStreakLoad]);

  // Sync company leaderboard
  useEffect(() => {
    async function loadLeaderboard() {
      const data = await fetchCompanyLeaderboard(token);
      if (data && data.length > 0) {
        setLeaderboard(data);
      }
    }
    loadLeaderboard();
  }, [token]);

  const handleToggleOptOut = async () => {
    const nextVal = !leaderboardOptOut;
    setLeaderboardOptOut(nextVal);
    await toggleLeaderboardOptOut(nextVal);
  };

  // Quizzes list aligned with dynamic per-trainee progress status
  const assignedActivities = [
    {
      id: 'act-1',
      title: 'Enterprise Security Audit Challenge',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.infosec.color,
      category: TRACKS.infosec.name,
      track: TRACKS.infosec,
      progressSegments: quizScoreStatus['act-1']?.segments || (quizScoreStatus['act-1']?.completed ? [true, true, true, true] : [false, false, false, false]),
      completed: quizScoreStatus['act-1']?.completed,
      score: quizScoreStatus['act-1']?.score,
      accuracy: quizScoreStatus['act-1']?.completed ? `${quizScoreStatus['act-1'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-2',
      title: 'Role-Based Access & Policy Verification',
      instructor: 'Dr. Sarah Jenkins',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.access.color,
      category: TRACKS.access.name,
      track: TRACKS.access,
      progressSegments: quizScoreStatus['act-2']?.segments || (quizScoreStatus['act-2']?.completed ? [true, true, true, true] : [false, false, false, false]),
      completed: quizScoreStatus['act-2']?.completed,
      score: quizScoreStatus['act-2']?.score,
      accuracy: quizScoreStatus['act-2']?.completed ? `${quizScoreStatus['act-2'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-3',
      title: 'Privacy Impact Assessment (PIA) Simulation',
      instructor: 'Lead Trainer David Lim',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.privacy.color,
      category: TRACKS.privacy.name,
      track: TRACKS.privacy,
      progressSegments: quizScoreStatus['act-3']?.segments || (quizScoreStatus['act-3']?.completed ? [true, true, true, true] : [false, false, false, false]),
      completed: quizScoreStatus['act-3']?.completed,
      score: quizScoreStatus['act-3']?.score,
      accuracy: quizScoreStatus['act-3']?.completed ? `${quizScoreStatus['act-3'].score}% accuracy` : 'Assigned'
    },
    {
      id: 'act-4',
      title: 'Multi-Tenant Data Isolation & Security',
      instructor: 'Prof. Roel Traballo',
      questionsCount: '5 QUESTIONS',
      headerColor: TRACKS.database.color,
      category: TRACKS.database.name,
      track: TRACKS.database,
      progressSegments: quizScoreStatus['act-4']?.segments || (quizScoreStatus['act-4']?.completed ? [true, true, true, true] : [false, false, false, false]),
      completed: quizScoreStatus['act-4']?.completed,
      score: quizScoreStatus['act-4']?.score,
      accuracy: quizScoreStatus['act-4']?.completed ? `${quizScoreStatus['act-4'].score}% accuracy` : 'Assigned - Due in 3d'
    }
  ];

// Earned badges state synchronized with database

  const displayCertificates = (liveCerts && liveCerts.length > 0) ? liveCerts.map(c => ({
    id: c.id,
    title: c.title,
    serialNumber: c.serial_number || 'CQ-2026-PENDING',
    clientCompany: currentUser?.organization || 'San Miguel Conglomerate Holdings',
    issuedOn: c.issue_date ? new Date(c.issue_date).toLocaleDateString() : '2026-08-15',
    expiresOn: c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : '2029-08-15',
    daysUntilExpiry: Math.max(0, Math.ceil(((new Date(c.expiry_date || Date.now())) - Date.now()) / (1000 * 60 * 60 * 24))),
    isRenewalApproaching: c.is_nearing_renewal || c.status === 'Expiring soon',
    status: c.status || 'Valid',
    isSelfReported: Boolean(c.is_self_reported),
    credentialUrl: c.credential_url,
    hash: `SERIAL:${c.serial_number || c.id?.substring(0, 8)}`
  })) : [
    {
      id: 'cert-01',
      title: 'ISO 31000 Certified Risk Manager',
      serialNumber: 'SMC20260815-01',
      clientCompany: currentUser?.organization || 'San Miguel Conglomerate Holdings',
      issuedOn: '2026-08-15',
      expiresOn: '2029-08-15',
      daysUntilExpiry: 1018,
      isRenewalApproaching: false,
      status: 'Valid',
      isSelfReported: false,
      credentialUrl: null,
      hash: 'SERIAL:SMC20260815-01'
    },
    {
      id: 'cert-02',
      title: 'Project Management Professional (PMP)',
      serialNumber: 'SMC20231201-01',
      clientCompany: currentUser?.organization || 'San Miguel Conglomerate Holdings',
      issuedOn: '2023-12-01',
      expiresOn: '2026-12-12',
      daysUntilExpiry: 42,
      isRenewalApproaching: true,
      status: 'Expiring soon',
      isSelfReported: true,
      credentialUrl: 'https://www.credly.com/badges/juan-delacruz-pmp-2023',
      hash: 'SERIAL:SMC20231201-01'
    }
  ];

  // Start quiz by ID (from assigned card or catalog)
  const handleStartQuizById = (quizId) => {
    if (!isOnline) return; // SEC-26: block offline quiz launch
    const db = getActiveQuizDatabase();
    const q = db[quizId] || db['act-1'];
    setActiveQuiz(q);
  };

  // Quiz finish handler
  const handleQuizFinish = async (resultData) => {
    if (currentUser?.id) {
      await submitQuizScore(currentUser.id, resultData.scorePercentage);
    }

    setQuizScoreStatus(prev => ({
      ...prev,
      [resultData.quizId]: {
        completed: true,
        score: resultData.scorePercentage
      }
    }));

    setPoints(prev => (prev ?? 0) + (resultData.pointsEarned || 250));
    setActiveQuiz(null);
  };

  // Quiz exit handler (no session save - SEC-26)
  const handleQuizExit = () => {
    setActiveQuiz(null);
  };

  // Certification Handlers (FR-18, FR-19, DAT-05, U-15)
  const reloadCerts = async () => {
    try {
      const [cList, nList] = await Promise.all([
        fetchCertificates(token),
        fetchExpiryNotifications(token)
      ]);
      if (cList) setLiveCerts(cList);
      if (nList) setCertNotifications(nList);
    } catch (err) {
      console.warn('Failed reloading certificates:', err);
    }
  };

  const handleExternalSubmit = async (e) => {
    e.preventDefault();
    setCertError(null);
    setCertMsg(null);

    const url = externalForm.credential_url.trim();
    if (!url.startsWith('https://')) {
      setCertError('External credential badge URL must be a valid HTTPS link (e.g. https://www.credly.com/badges/...).');
      return;
    }

    setExternalSubmitting(true);
    try {
      const payload = {
        cert_type_code: externalForm.cert_type_code,
        title: externalForm.title || 'External Credential',
        credential_url: url,
        issue_date: externalForm.issue_date ? new Date(externalForm.issue_date).toISOString() : new Date().toISOString(),
        expiry_date: externalForm.expiry_date ? new Date(externalForm.expiry_date).toISOString() : null
      };

      const res = await submitExternalCredential(payload, token);
      setCertMsg(`Successfully registered ${res.title}! Serial: ${res.serial_number}. Automated 36-month expiry tracking active.`);
      setShowExternalModal(false);
      setExternalForm({
        cert_type_code: 'PMP',
        title: 'Project Management Professional (PMP)',
        credential_url: '',
        issue_date: '',
        expiry_date: ''
      });
      await reloadCerts();
    } catch (err) {
      setCertError(err.message || 'Failed to submit external credential.');
    } finally {
      setExternalSubmitting(false);
    }
  };

  const handleRunSweep = async () => {
    try {
      const res = await triggerExpirySweep(token);
      alert(`Automated Expiry Sweep Complete! Scanned ${res.total_certificates_scanned || 0} certificates. Issued ${res.notifications_issued || 0} expiry notification(s).`);
      await reloadCerts();
    } catch (err) {
      alert(err.message || 'Failed to trigger expiry sweep.');
    }
  };

  // Trainee in-page tab options
  const currentTab = ['trainee_quiz', 'trainee_badges', 'trainee_certs'].includes(activeSubView) 
    ? activeSubView 
    : 'trainee_quest';

  const traineeTabs = [
    { id: 'trainee_quest', label: 'Quest & Progress', icon: Flame },
    { id: 'trainee_quiz', label: 'Knowledge Quizzes', icon: GraduationCap },
    { id: 'trainee_badges', label: 'Earned Badges', icon: Award },
    { id: 'trainee_certs', label: 'My Certifications', icon: BookOpen }
  ];

  // =========================================================================
  // FULLSCREEN DISTRACTION-FREE QUIZ ARENA TAKEOVER
  // When inside a quiz, sidebar, topbar, and dashboard are completely obscured
  // =========================================================================
  if (activeQuiz) {
    return (
      <div className="dashboard-content-layout" style={{ maxWidth: '1080px', margin: '0 auto', width: '100%', padding: '16px 20px 48px' }}>
        <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-sm flex-align gap-6"
            onClick={handleQuizExit}
            style={{ fontWeight: '700', borderRadius: '10px' }}
          >
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
            <span>Back to Quizzes Catalog</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
            <span style={{ padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', borderRadius: '999px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interactive Assessment
            </span>
            <span>&bull;</span>
            <span style={{ color: '#0f172a' }}>{activeQuiz.title}</span>
          </div>
        </div>

        <QuizArena 
          quiz={activeQuiz}
          initialSession={null}
          onFinish={handleQuizFinish}
          onExit={handleQuizExit}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-content-layout">
      {/* OFFLINE CONNECTIVITY NOTICE BANNER (SEC-26) */}
      {!isOnline && (
        <div style={{ background: '#451a03', border: '1px solid #f59e0b', color: '#fef3c7', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={22} color="#f59e0b" className="flex-shrink-0" />
          <div>
            <strong>Offline Mode Notice:</strong> Live quizzes, assessments, and score synchronization require an active network connection per security policy (SEC-26). Offline caching and submissions are disabled.
          </div>
        </div>
      )}

      {/* IN-PAGE TRAINEE WORKSPACE TAB STRIP */}
      <nav className="trainee-nav-tabs" aria-label="Trainee Sections" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '10px'
      }}>
        {traineeTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView && setActiveView(tab.id)}
              className={`trainee-tab-pill ${isActive ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#4338ca' : '#64748b',
                background: isActive ? '#eef2ff' : '#ffffff',
                border: isActive ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 3px rgba(67, 56, 202, 0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} color={isActive ? '#4f46e5' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 1. MAIN TRAINEE QUEST VIEW */}
      {(currentTab === 'trainee_quest') && (
        <>
          {/* 1. HERO BANNER WITH 3D MASCOT */}
          <div className="template-hero-banner">
            <div className="template-hero-left">
              <div className="template-hero-badge">
                <Sparkles size={13} className="text-gold" />
                <span>CROSSQUEST GAMIFIED LEARNING</span>
              </div>
              <h1 className="template-hero-title">Welcome back, {currentUser?.name}!</h1>
              <p className="template-hero-subtitle">
                Complete today's interactive quest to extend your <strong>{Number.isFinite(Number(streakDays)) ? `${streakDays}-day` : '7-day'} streak</strong> and climb the corporate leaderboard.
              </p>

              {/* Enterprise Learning Action Buttons */}
              <div className="template-hero-actions">
                <button 
                  className={`template-cta-btn template-cta-btn--primary${!isOnline ? ' btn-disabled' : ''}`}
                  onClick={() => handleStartQuizById('act-1')}
                  disabled={!isOnline}
                  title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Start Assigned Quest</span>
                </button>
                <button 
                  className="template-cta-btn template-cta-btn--secondary"
                  onClick={() => {
                    const el = document.getElementById('assigned-activities-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <BookOpen size={15} />
                  <span>View All Modules</span>
                </button>
              </div>
            </div>

            <div className="template-hero-right">
              {/* Badges container on right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {/* Floating streak pill - live from backend */}
                <div className="template-hero-streak-badge">
                  <div className="streak-flame-circle">
                    <Flame size={16} className="text-orange" fill="#ff6a00" />
                  </div>
                  <div className="streak-text-group">
                    <span className="streak-val">
                      {`${streakDays ?? 7} Days`}
                    </span>
                    <span className="streak-lbl">ACTIVE STREAK</span>
                  </div>
                </div>

                {/* Level & Points Pill */}
                <div className="template-hero-streak-badge">
                  <div className="streak-flame-circle" style={{ background: '#ecfdf5' }}>
                    <Award size={16} color="#059669" />
                  </div>
                  <div className="streak-text-group">
                    <span className="streak-val">
                      {gamLoading ? '...' : `Level ${level ?? 1}`}
                    </span>
                    <span className="streak-lbl">{gamLoading ? '...' : `${(points ?? 0).toLocaleString()} XP`}</span>
                  </div>
                </div>
              </div>

              {/* Pure CSS 3D Quest Bot Mascot */}
              <div className="template-mascot-container">
                <Mascot />
              </div>
            </div>
          </div>

          {/* 2. ASSIGNED COURSE ACTIVITIES (4 CARDS WITH 3D ISOMETRIC GRAPHICS) */}
          <div id="assigned-activities-section" className="template-section-block">
            <div className="template-section-header">
              <div className="template-section-title-wrap">
                <h3>Assigned Course Activities</h3>
              </div>
              <span className="template-section-instructor-tag">ASSIGNED BY CROSSWORKS INSTRUCTORS</span>
            </div>

            <div className="template-activities-grid">
              {assignedActivities.map((act) => {
                return (
                  <div key={act.id} className="template-activity-card">
                    {/* Top Colored Banner with 3D Graphic */}
                    <div className="activity-card-banner" style={{ backgroundColor: act.headerColor }}>
                      <div className="activity-banner-left">
                        <span className="activity-q-pill">{act.questionsCount}</span>
                        <h4 className="activity-category-title">{act.category}</h4>
                      </div>
                      <div className="activity-banner-icon-slot">
                        <IsoCube 
                          size={46} 
                          color={act.track.color} 
                          top={act.track.top} 
                          right={act.track.right} 
                          label={act.track.face.label} 
                        />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="activity-card-body">
                      <h4 className="activity-title">{act.title}</h4>
                      <p className="activity-instructor">{act.instructor}</p>

                      {/* Segmented Progress Indicator (4 pills) */}
                      <div className="activity-segmented-bar">
                        {act.progressSegments.map((isFilled, idx) => (
                          <div 
                            key={idx} 
                            className={`activity-segment-pill ${isFilled ? 'filled' : 'empty'}`}
                            style={{ backgroundColor: isFilled ? act.headerColor : '#e2e8f0' }}
                          />
                        ))}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="activity-card-footer">
                        {act.completed ? (
                          <>
                            <span className="activity-accuracy-pill">
                              <Check size={12} strokeWidth={3} />
                              <span>{act.score}% accuracy</span>
                            </span>
                            <button
                              className="activity-btn-replay"
                              onClick={() => handleStartQuizById(act.id)}
                              disabled={!isOnline}
                              title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
                            >
                              <span>Replay</span>
                              <ArrowRight size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="activity-pending-pill">
                              <span>Assigned - Due in 3d</span>
                            </span>
                            <button
                              className="activity-btn-play"
                              onClick={() => handleStartQuizById(act.id)}
                              disabled={!isOnline}
                              title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
                            >
                              <span>Play Quest</span>
                              <Play size={12} fill="currentColor" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. LOWER SPLIT SECTION: BADGES SHOWCASE + RIGHT WIDGETS */}
          <div className="template-lower-split">
            {/* Left: Your Earned Badges */}
            <div className="template-badges-container">
              <div className="template-section-header mb-16">
                <div className="template-section-title-wrap">
                  <h3>Your Earned Badges</h3>
                </div>
                <button 
                  className="template-view-all-link"
                  onClick={() => setActiveView && setActiveView('trainee_badges')}
                >
                  View All ({earnedBadges.length})
                </button>
              </div>

              <div className="template-badges-grid">
                {earnedBadges.map((badge) => (
                  <div key={badge.id} className="template-badge-card">
                    <BadgeCoin badge={badge} />
                    <div className="template-badge-name" style={{ marginTop: '16px' }}>{badge.title}</div>
                    <div className="template-badge-desc">{badge.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Streak This Week + Corporate Leaderboard */}
            <div className="template-right-widgets">
              {/* This Week Streak Tracker - live from backend */}
              <div className="template-this-week-card">
                <div className="this-week-header flex-between">
                  <h4>This week</h4>
                  <span className="this-week-counter">
                    {`${Math.min(streakDays ?? 7, 7)} / 7 DAYS`}
                  </span>
                </div>
                <div className="this-week-days-row">
                  {['M','T','W','T','F','S','S'].map((day, idx) => {
                    const activeCount = Math.min(streakDays ?? 7, 7);
                    const isActive = idx < activeCount;
                    return (
                      <div key={idx} className="this-week-day-item">
                        <div className={`day-flame-circle ${isActive ? 'active' : ''}`}>
                          <Flame size={14} fill={isActive ? '#ea580c' : 'none'} className="text-orange" />
                        </div>
                        <span className="day-label">{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corporate Leaderboard Podium Card */}
              <div className="template-leaderboard-card">
                <div className="leaderboard-card-header flex-between" style={{ marginBottom: '12px' }}>
                  <div className="leaderboard-card-title">Corporate leaderboard</div>
                  {/* Opt-out toggle */}
                  <label className="leaderboard-optout-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={leaderboardOptOut}
                      onChange={handleToggleOptOut}
                      style={{ cursor: 'pointer' }}
                    />
                    Hide my rank
                  </label>
                </div>
                
                {/* 3D Podium Graphic */}
                <div style={{ marginBottom: '20px' }}>
                  <Podium top={designLeaderboard.top} small={true} />
                </div>

                {/* Bottom User Pill */}
                {!leaderboardOptOut && (
                  <div className="leaderboard-user-pill">
                    <div className="user-pill-left flex-align gap-8">
                      <div className="leaderboard-avatar-circle">
                        {currentUser?.initials || 'JD'}
                      </div>
                      <span className="leaderboard-user-name">
                        You - {currentUser?.name || 'Juan Dela Cruz'}
                      </span>
                    </div>
                    <span className="leaderboard-rank-badge">RANK [#1]</span>
                  </div>
                )}
                {leaderboardOptOut && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '8px 0' }}>
                    Your rank is hidden from the leaderboard.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. DEDICATED KNOWLEDGE QUIZZES CATALOG VIEW (When clicking Quizzes tab) */}
      {currentTab === 'trainee_quiz' && (
        <div className="quizzes-catalog-view">
          <div className="catalog-header-banner">
            <div>
              <div className="catalog-badge-pill">
                <FileQuestion size={14} className="text-cyan" />
                <span>OFFICIAL EVALUATIONS</span>
              </div>
              <h2>Enterprise Knowledge Quizzes</h2>
              <p className="catalog-subtitle">
                Select an assessment to enter the dedicated distraction-free testing arena. Each quiz includes interactive Kahoot-style questions, sequence ordering, term identification, and architecture diagrams.
              </p>
            </div>
          </div>

          <div className="quizzes-catalog-grid">
            {Object.values(getActiveQuizDatabase()).map((quizItem) => {
              const status = quizScoreStatus[quizItem.id];

              return (
                <div key={quizItem.id} className="quiz-catalog-card card-gamified">
                  <div className="catalog-card-top" style={{ borderTop: `4px solid ${quizItem.headerColor}` }}>
                    <div className="flex-between">
                      <span className="catalog-category-tag" style={{ color: quizItem.headerColor }}>
                        {quizItem.category}
                      </span>
                      <span className="catalog-time-tag">
                        <Clock size={12} /> {quizItem.timePerQuestion}s / Q
                      </span>
                    </div>
                    <h3 className="catalog-card-title">{quizItem.title}</h3>
                    <p className="catalog-instructor-tag">Instructor: {quizItem.instructor}</p>
                  </div>

                  <div className="catalog-card-body">
                    <p className="catalog-quiz-desc">{quizItem.description}</p>

                    <div className="catalog-types-row">
                      <span className="qtype-badge">Kahoot 4-Choice</span>
                      <span className="qtype-badge">Identification</span>
                      <span className="qtype-badge">Sequence Order</span>
                      <span className="qtype-badge">Diagram Analysis</span>
                    </div>

                    <div className="catalog-meta-row">
                      <div className="catalog-meta-item">
                        <span className="meta-k">Passing Grade:</span>
                        <span className="meta-v">{quizItem.passingScore}%</span>
                      </div>
                      <div className="catalog-meta-item">
                        <span className="meta-k">Items:</span>
                        <span className="meta-v">{quizItem.questions.length} Questions</span>
                      </div>
                      <div className="catalog-meta-item">
                        <span className="meta-k">Status:</span>
                        <span className={`meta-v ${status?.completed ? 'text-emerald' : 'text-amber'}`}>
                          {status?.completed ? `${status.score}% Passed` : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="catalog-card-actions">
                    <button
                      className={`btn-tactile btn-tactile-purple w-full`}
                      onClick={() => handleStartQuizById(quizItem.id)}
                      disabled={!isOnline}
                      title={!isOnline ? 'Requires network connection (SEC-26)' : undefined}
                    >
                      <Play size={15} />
                      <span>{status?.completed ? 'Retake Assessment' : 'Start Assessment'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EARNED BADGES SUB-VIEW */}
      {currentTab === 'trainee_badges' && (
        <div className="card section-card p-24" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div className="card-header-bar mb-16" style={{ padding: '0 0 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 className="card-title" style={{ fontSize: '20px', fontWeight: '800', color: '#1e1b4b', marginBottom: '4px' }}>
                Badge Showcase &amp; Achievements
              </h3>
              <p className="text-muted text-xs" style={{ color: '#64748b' }}>
                Unlock shiny 3D collectible badges by proving your knowledge across security frameworks and policy access controls.
              </p>
            </div>
          </div>

          {earnedBadges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
              <Award size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <h4 style={{ fontWeight: '700', marginBottom: '8px', color: '#64748b' }}>No badges earned yet</h4>
              <p style={{ fontSize: '14px' }}>Complete a quest to unlock your first badge!</p>
            </div>
          ) : (
            <div className="badges-full-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginTop: '16px' }}>
              {earnedBadges.map((badge) => {
                const tierName = badge.tier || (badge.id === 'seven-day-streak' ? 'Legendary' : badge.id === 'security-champion' ? 'Master' : 'Adept');
                const tierClass = tierName.toLowerCase();
                return (
                  <div key={badge.id} className="badge-detail-card card-gamified" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ marginBottom: '16px', transform: 'scale(1.1)' }}>
                      <BadgeCoin badge={badge} />
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>{badge.title || badge.name}</h4>
                    <p className="badge-desc" style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', flex: 1, lineHeight: '1.4' }}>{badge.description || badge.desc}</p>
                    <div className="badge-footer flex-between" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                      <span className={`tier-chip tier-${tierClass}`} style={{ fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '999px', background: tierClass === 'legendary' ? '#fef3c7' : tierClass === 'master' ? '#dbeafe' : '#e0e7ff', color: tierClass === 'legendary' ? '#b45309' : tierClass === 'master' ? '#1d4ed8' : '#4338ca' }}>
                        {tierName.toUpperCase()}
                      </span>
                      <span className="badge-check flex-align gap-4 text-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: '#059669' }}>
                        <Check size={14} /> Unlocked
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. CERTIFICATIONS SUB-VIEW (FR-18, FR-19, DAT-05, U-15) */}
      {currentTab === 'trainee_certs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Renewal Notifications Alert Banner */}
          {certNotifications.length > 0 && (
            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #f59e0b',
                borderRadius: '12px',
                padding: '16px 20px',
                color: '#92400e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={24} color="#d97706" />
                <div>
                  <strong style={{ fontSize: '14px', color: '#78350f' }}>
                    {certNotifications[0].title}
                  </strong>
                  <div style={{ fontSize: '13px', marginTop: '2px', color: '#92400e' }}>
                    {certNotifications[0].message}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExternalForm(prev => ({
                    ...prev,
                    cert_type_code: 'PMP',
                    title: 'Project Management Professional (PMP)'
                  }));
                  setShowExternalModal(true);
                }}
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Submit Renewal Badge URL
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {certMsg && (
            <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', color: '#065f46', fontSize: '13px' }}>
              &#10004; {certMsg}
            </div>
          )}

          <div className="card section-card">
            <div className="card-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="card-title">My Verified Certifications & External Credentials</h3>
                <p className="card-subtitle">
                  Official course completion certificates and self-reported industry certifications (PMI / PECB) with automated 36-month validity tracking.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary flex-align gap-8"
                  onClick={() => setShowExternalModal(true)}
                  style={{ background: '#6366f1', color: '#ffffff' }}
                >
                  <PlusCircle size={15} />
                  <span>Self-Report External Credential</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary flex-align gap-8"
                  onClick={handleRunSweep}
                  style={{ fontSize: '12.5px' }}
                >
                  <RefreshCw size={14} />
                  <span>Check Expiry Sweep</span>
                </button>
              </div>
            </div>

            {displayCertificates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                <h4 style={{ fontWeight: '700', marginBottom: '8px', color: '#64748b' }}>No certifications yet</h4>
                <p style={{ fontSize: '14px' }}>Complete a training program or self-report an external certification to begin!</p>
              </div>
            ) : (
              <div className="p-24 certs-list-grid">
                {displayCertificates.map((cert) => (
                  <div key={cert.id} className="card-gamified certificate-card">
                    <div className="cert-top-row flex-between">
                      <div className="flex-align gap-8">
                        <Shield size={22} className={cert.isSelfReported ? "text-cyan" : "text-gold"} />
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 800 }}>{cert.title}</h4>
                          <div className="text-secondary text-xs">{cert.clientCompany}</div>
                        </div>
                      </div>
                      <span className={`badge-gamified ${cert.status === 'Expiring soon' ? 'badge-amber' : cert.status === 'Expired' ? 'badge-red' : 'badge-green'}`}>
                        {cert.status === 'Expiring soon' ? `Due in ${cert.daysUntilExpiry}d` : cert.status === 'Expired' ? 'Expired' : 'Active Credential'}
                      </span>
                    </div>

                    <div className="cert-meta-body">
                      <div className="cert-meta-item">
                        <span className="meta-label">Serial Number:</span>
                        <code style={{ fontSize: '11px', fontWeight: 800, color: '#4338ca' }}>{cert.serialNumber}</code>
                      </div>
                      <div className="cert-meta-item">
                        <span className="meta-label">Issued On:</span>
                        <span className="meta-val">{cert.issuedOn}</span>
                      </div>
                      <div className="cert-meta-item">
                        <span className="meta-label">Valid Until (36m):</span>
                        <span className="meta-val">{cert.expiresOn}</span>
                      </div>

                      {cert.isSelfReported && (
                        <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#0891b2', textTransform: 'uppercase' }}>
                            &#128274; SELF-REPORTED EXTERNAL CREDENTIAL
                          </div>
                          {cert.credentialUrl && (
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#0284c7', fontWeight: 700, marginTop: '2px', textDecoration: 'none' }}
                            >
                              <span>View Verified Badge (Credly/Issuer)</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {cert.isRenewalApproaching && (
                      <div className="renewal-alert-strip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="flex-align gap-8">
                          <AlertCircle size={14} className="text-gold" />
                          <span>Renewal due in <strong>{cert.daysUntilExpiry} days</strong> (36-month cycle)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExternalForm(prev => ({
                              ...prev,
                              cert_type_code: cert.title.includes('PMP') ? 'PMP' : 'ISO_31000',
                              title: cert.title
                            }));
                            setShowExternalModal(true);
                          }}
                          style={{
                            background: '#ffbe0b',
                            color: '#1e293b',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          Renew Badge
                        </button>
                      </div>
                    )}

                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <a
                        href={`http://localhost:8000/api/v1/certifications/${cert.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary flex-align gap-8"
                        style={{ fontSize: '11.5px', padding: '6px 12px', textDecoration: 'none' }}
                      >
                        <Download size={13} />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Self-Report External Credential Modal (FR-18, FR-19, DAT-05, U-15) */}
          {showExternalModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#ffffff', borderRadius: '14px', padding: '24px', width: '520px', maxWidth: '92%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    Self-Report External Credential (PMI / PECB)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowExternalModal(false)}
                    style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
                  >
                    &times;
                  </button>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                  Self-report an active industry certification (e.g. PMI PMP, PECB ISO 31000). System activates automated 90, 60, 30, and 0-day renewal tracking with a standard 36-month validity cycle.
                </p>

                {certError && (
                  <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '12.5px' }}>
                    &#9888; {certError}
                  </div>
                )}

                <form onSubmit={handleExternalSubmit}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      CERTIFICATION TYPE:
                    </label>
                    <select
                      value={externalForm.cert_type_code}
                      onChange={(e) => {
                        const code = e.target.value;
                        let autoTitle = 'Project Management Professional (PMP)';
                        if (code === 'CAPM') autoTitle = 'Certified Associate in Project Management (CAPM)';
                        if (code === 'PMI-ACP') autoTitle = 'PMI Agile Certified Practitioner (PMI-ACP)';
                        if (code === 'PMI-CPMAI') autoTitle = 'Cognitive Project Management in AI (PMI-CPMAI)';
                        if (code === 'ISO_31000') autoTitle = 'ISO 31000 Certified Risk Manager';
                        if (code === 'PECB-LRM') autoTitle = 'PECB ISO 31000 Lead Risk Manager';
                        if (code === 'PECB-SLRM') autoTitle = 'PECB ISO 31000 Senior Lead Risk Manager';
                        if (code === 'OTHER') autoTitle = 'Industry Certified Specialist';
                        setExternalForm(prev => ({ ...prev, cert_type_code: code, title: autoTitle }));
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="PMP">PMP &mdash; Project Management Professional (PMI)</option>
                      <option value="CAPM">CAPM &mdash; Certified Associate in Project Management (PMI)</option>
                      <option value="PMI-ACP">PMI-ACP &mdash; PMI Agile Certified Practitioner (PMI)</option>
                      <option value="PMI-CPMAI">PMI-CPMAI &mdash; Cognitive Project Management in AI (PMI)</option>
                      <option value="ISO_31000">ISO 31000 &mdash; Certified Risk Manager (PECB)</option>
                      <option value="PECB-LRM">PECB-LRM &mdash; ISO 31000 Lead Risk Manager (PECB)</option>
                      <option value="PECB-SLRM">PECB-SLRM &mdash; ISO 31000 Senior Lead Risk Manager (PECB)</option>
                      <option value="OTHER">OTHER &mdash; Custom Industry Credential</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      CERTIFICATION TITLE:
                    </label>
                    <input
                      type="text"
                      required
                      value={externalForm.title}
                      onChange={(e) => setExternalForm(prev => ({ ...prev, title: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      VERIFIED CREDENTIAL BADGE URL (HTTPS ONLY):
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.credly.com/badges/your-credential-badge-id"
                      value={externalForm.credential_url}
                      onChange={(e) => setExternalForm(prev => ({ ...prev, credential_url: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: '11px', color: '#0891b2', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>&#128274; SSRF-Protected: Per Chapter III SEC-28, link syntax is validated without inbound server scraping.</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        ISSUE DATE:
                      </label>
                      <input
                        type="date"
                        value={externalForm.issue_date}
                        onChange={(e) => setExternalForm(prev => ({ ...prev, issue_date: e.target.value }))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        EXPIRY DATE (OPTIONAL):
                      </label>
                      <input
                        type="date"
                        value={externalForm.expiry_date}
                        onChange={(e) => setExternalForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                      />
                      <span style={{ fontSize: '10.5px', color: '#64748b' }}>Defaults to 36 months if blank</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowExternalModal(false)}
                      disabled={externalSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ background: '#6366f1', color: '#ffffff' }}
                      disabled={externalSubmitting}
                    >
                      {externalSubmitting ? 'Registering...' : 'Register Credential'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
