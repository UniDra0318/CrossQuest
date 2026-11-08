import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Radio, 
  X, 
  Play, 
  CheckCircle2, 
  Clock, 
  Award, 
  Sparkles, 
  AlertCircle,
  Square
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getActiveQuizDatabase } from '../data/quizDatabase';
import QuizArena from './QuizArena';
import { 
  subscribeToLiveBroadcast, 
  startLiveBroadcast, 
  endLiveBroadcast, 
  getStoredLiveBroadcast 
} from '../services/liveQuizSync';
import { submitQuizScore } from '../services/api';

export default function LiveQuizPopUpModal() {
  const { currentUser, token } = useAuth();
  const [liveBroadcast, setLiveBroadcast] = useState(getStoredLiveBroadcast);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [dismissedBroadcastId, setDismissedBroadcastId] = useState(null);
  const [completedBroadcastId, setCompletedBroadcastId] = useState(() => {
    try {
      return localStorage.getItem('cq_last_completed_broadcast') || null;
    } catch {
      return null;
    }
  });
  const [isInArena, setIsInArena] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Trainer modal state
  const [selectedQuizId, setSelectedQuizId] = useState('act-1');
  const [sessionCode, setSessionCode] = useState('SESS-2026-08A');
  const [instructorName, setInstructorName] = useState(currentUser?.full_name || 'Lead Trainer Joey Ramos');

  const quizDb = useMemo(() => getActiveQuizDatabase(), []);

  // Subscribe to live broadcast updates across windows and server
  useEffect(() => {
    const unsubscribe = subscribeToLiveBroadcast((broadcast) => {
      setLiveBroadcast(broadcast);
      if (!broadcast) {
        setIsInArena(false);
      }
    });

    // Listen for custom trigger to open trainer modal
    const handleOpenTrainer = () => {
      setShowTrainerModal(true);
    };
    window.addEventListener('cq_open_trainer_broadcast_modal', handleOpenTrainer);

    return () => {
      unsubscribe();
      window.removeEventListener('cq_open_trainer_broadcast_modal', handleOpenTrainer);
    };
  }, []);

  // Update instructor name if currentUser changes
  useEffect(() => {
    if (currentUser?.full_name) {
      setInstructorName(currentUser.full_name);
    }
  }, [currentUser]);

  // Handle Trainer Launch Broadcast
  const handleLaunchBroadcast = async (quizIdOverride) => {
    const qId = quizIdOverride || selectedQuizId;
    const targetQuiz = quizDb[qId] || quizDb['act-1'];
    const payload = {
      quiz_id: qId,
      title: targetQuiz?.title || 'Interactive Live Assessment',
      instructor: instructorName || 'Lead Trainer Joey Ramos',
      session_code: sessionCode || 'SESS-2026-08A',
      duration_seconds: 300,
      description: targetQuiz?.description || 'Immediate live assessment initiated by your lead instructor.',
      questions_count: targetQuiz?.questions?.length || 4
    };

    await startLiveBroadcast(payload, token);
    setShowTrainerModal(false);
    showToast('🚀 Live Pop-Up Quiz broadcasted to all active trainees!');
  };

  // Handle End Broadcast
  const handleEndBroadcast = async () => {
    await endLiveBroadcast(token);
    showToast('⏹️ Live broadcast session ended.');
  };

  // Toast notification helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Trainee: Finish live quiz
  const handleTraineeQuizFinish = async (resultData) => {
    if (currentUser?.id) {
      try {
        await submitQuizScore(currentUser.id, resultData.scorePercentage);
      } catch (e) {
        console.warn('Failed to submit live quiz score:', e);
      }
    }

    if (liveBroadcast?.broadcast_id) {
      setCompletedBroadcastId(liveBroadcast.broadcast_id);
      try {
        localStorage.setItem('cq_last_completed_broadcast', liveBroadcast.broadcast_id);
      } catch {}
    }

    setIsInArena(false);
    showToast(`🎉 Live Quiz Completed! Score: ${resultData.scorePercentage}% (+250 XP earned)`);
  };

  const handleTraineeQuizExit = () => {
    setIsInArena(false);
  };

  const isTrainee = currentUser?.role === 'trainee';
  const isTrainerOrAdmin = currentUser?.role === 'trainer' || currentUser?.role === 'admin';

  // Determine if trainee should see pop-up
  const shouldShowTraineePopUp = 
    isTrainee && 
    liveBroadcast?.active && 
    liveBroadcast.broadcast_id !== dismissedBroadcastId && 
    liveBroadcast.broadcast_id !== completedBroadcastId;

  // Active quiz object for arena
  const currentArenaQuiz = useMemo(() => {
    if (!liveBroadcast?.quiz_id) return quizDb['act-1'];
    return quizDb[liveBroadcast.quiz_id] || quizDb['act-1'];
  }, [liveBroadcast, quizDb]);

  return (
    <>
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#38bdf8',
          border: '1px solid #0284c7',
          borderRadius: '12px',
          padding: '12px 20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          animation: 'fadeSlideUp 0.3s ease-out'
        }}>
          <Sparkles size={18} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TRAINER ACTIVE BROADCAST BAR */}
      {isTrainerOrAdmin && liveBroadcast?.active && (
        <div style={{
          position: 'fixed',
          top: '68px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(153, 27, 27, 0.95))',
          border: '1px solid #f87171',
          borderRadius: '30px',
          padding: '8px 18px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(220, 38, 38, 0.45)',
          backdropFilter: 'blur(10px)',
          animation: 'pulseGlow 2s infinite ease-in-out'
        }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 10px #ffffff'
          }} />
          <div style={{ fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 800, letterSpacing: '0.04em' }}>LIVE BROADCAST: </span>
            <span style={{ fontWeight: 600 }}>{liveBroadcast.title}</span>
            <span style={{ opacity: 0.85, marginLeft: '6px' }}>({liveBroadcast.session_code})</span>
          </div>
          <button
            type="button"
            onClick={handleEndBroadcast}
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Square size={12} fill="#ffffff" /> End Broadcast
          </button>
        </div>
      )}

      {/* 2. TRAINER INSTANT QUIZ LAUNCH MODAL */}
      {showTrainerModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 24, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #131b2e, #0b0f19)',
            border: '1px solid #3b82f6',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setShowTrainerModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                padding: '10px',
                borderRadius: '12px',
                color: '#fff',
                display: 'flex'
              }}>
                <Zap size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 800 }}>
                  Instant Pop-Up Quiz Broadcast
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Deliver an immediate interactive assessment to all active trainees.
                </p>
              </div>
            </div>

            <div style={{ margin: '20px 0' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                QUICK 1-CLICK PRESETS:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { id: 'act-1', title: '⚡ Zero-Trust Security Sprint', desc: '4 Core Cryptography Qs' },
                  { id: 'act-2', title: '🔑 Key Management & CP-ABE', desc: 'Waters11 Tree Access' },
                  { id: 'act-3', title: '🛡️ Incident Response Drill', desc: 'Containment & Logs' },
                  { id: 'act-4', title: '⚖️ Compliance & Auditing', desc: 'FR-22 & Tamper Proofing' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedQuizId(item.id);
                      handleLaunchBroadcast(item.id);
                    }}
                    style={{
                      background: selectedQuizId === item.id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                      border: `1px solid ${selectedQuizId === item.id ? '#3b82f6' : '#334155'}`,
                      borderRadius: '12px',
                      padding: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>{item.desc}</div>
                    <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>
                      ⚡ Broadcast Now →
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Session Code
                </label>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Lead Instructor
                </label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowTrainerModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLaunchBroadcast()}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '9px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Zap size={16} /> Broadcast Custom Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRAINEE POP-UP MODAL (ZERO NAVIGATION) */}
      {shouldShowTraineePopUp && !isInArena && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 24, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'linear-gradient(145deg, #111827, #0b0f19)',
            border: '2px solid #8b5cf6',
            boxShadow: '0 25px 70px rgba(139, 92, 246, 0.35)',
            borderRadius: '24px',
            padding: '32px',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Top Close / Dismiss Button */}
            <button
              type="button"
              onClick={() => setDismissedBroadcastId(liveBroadcast.broadcast_id)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
              title="Dismiss for later"
            >
              <X size={18} />
            </button>

            {/* Glowing Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 18px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.6)'
            }}>
              <Zap size={34} />
            </div>

            {/* Session Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '20px',
              background: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              color: '#f472b6',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px'
            }}>
              <Radio size={14} /> LIVE IN-SESSION POP-UP QUIZ
            </div>

            <h2 style={{
              margin: '0 0 8px',
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#f8fafc',
              lineHeight: 1.3
            }}>
              {liveBroadcast.title}
            </h2>

            <p style={{
              margin: '0 0 20px',
              fontSize: '0.88rem',
              color: '#94a3b8',
              lineHeight: 1.5
            }}>
              Initiated by <strong style={{ color: '#e2e8f0' }}>{liveBroadcast.instructor || 'Lead Trainer Joey Ramos'}</strong> for cohort session <code style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{liveBroadcast.session_code}</code>.
            </p>

            {/* Quiz Info Badges */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '26px'
            }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600
              }}>
                <Clock size={16} color="#38bdf8" />
                <span>5 Minutes</span>
              </div>

              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600
              }}>
                <Award size={16} color="#f59e0b" />
                <span>+250 XP Award</span>
              </div>
            </div>

            {/* Action CTAs */}
            <button
              type="button"
              onClick={() => setIsInArena(true)}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 25px rgba(139, 92, 246, 0.5)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <Play size={20} fill="#ffffff" />
              Join Live Quiz Arena Now
            </button>

            <button
              type="button"
              onClick={() => setDismissedBroadcastId(liveBroadcast.broadcast_id)}
              style={{
                marginTop: '12px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* 4. FULLSCREEN DISTRACTION-FREE QUIZ ARENA TAKEOVER IN-PLACE */}
      {isInArena && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: '#090d16',
          overflowY: 'auto'
        }}>
          <QuizArena
            quiz={currentArenaQuiz}
            initialSession={null}
            onFinish={handleTraineeQuizFinish}
            onExit={handleTraineeQuizExit}
          />
        </div>
      )}
    </>
  );
}

