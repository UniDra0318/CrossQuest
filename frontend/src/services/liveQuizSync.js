import { broadcastLiveQuiz, fetchActiveLiveBroadcast, endLiveQuizBroadcast } from './api';

const BROADCAST_STORAGE_KEY = 'cq_active_live_broadcast';
const BROADCAST_EVENT_NAME = 'cq_live_quiz_update';
const CHANNEL_NAME = 'cq_live_quiz_sync';

let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (err) {
    console.warn('BroadcastChannel initialization fallback:', err);
  }
}

export function getStoredLiveBroadcast() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BROADCAST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredLiveBroadcast(broadcast) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (broadcast) {
      localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(broadcast));
    } else {
      localStorage.removeItem(BROADCAST_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BROADCAST_EVENT_NAME, { detail: broadcast }));
  }
}

export async function startLiveBroadcast(payload, token) {
  // 1. Post to backend
  let broadcastData = null;
  try {
    broadcastData = await broadcastLiveQuiz(payload, token);
  } catch (err) {
    console.warn('Failed to post live broadcast to backend:', err);
  }

  // Fallback broadcast structure if backend is offline or mock
  if (!broadcastData || !broadcastData.active) {
    broadcastData = {
      active: true,
      quiz_id: payload.quiz_id || 'act-1',
      title: payload.title || 'Live Interactive Assessment',
      instructor: payload.instructor || 'Lead Trainer David Lim',
      session_code: payload.session_code || 'SESS-2026-08A',
      duration_seconds: payload.duration_seconds || 300,
      description: payload.description || 'Immediate live assessment initiated by your trainer.',
      questions_count: payload.questions_count || 4,
      started_at: new Date().toISOString(),
      broadcast_id: 'live-' + Date.now()
    };
  }

  // 2. Persist locally & notify current tab
  setStoredLiveBroadcast(broadcastData);

  // 3. Notify other tabs via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'START_BROADCAST', broadcast: broadcastData });
    } catch {
      // Ignore channel errors
    }
  }

  return broadcastData;
}

export async function endLiveBroadcast(token) {
  try {
    await endLiveQuizBroadcast(token);
  } catch (err) {
    console.warn('Failed to end live broadcast on backend:', err);
  }

  setStoredLiveBroadcast(null);

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'END_BROADCAST' });
    } catch {
      // Ignore channel errors
    }
  }
}

export function subscribeToLiveBroadcast(callback) {
  if (typeof window === 'undefined') return () => {};

  // Handler for custom in-tab events
  const handleLocalUpdate = (e) => {
    callback(e.detail || null);
  };

  // Handler for cross-window storage events
  const handleStorage = (e) => {
    if (e.key === BROADCAST_STORAGE_KEY) {
      try {
        const val = e.newValue ? JSON.parse(e.newValue) : null;
        callback(val);
      } catch {
        callback(null);
      }
    }
  };

  // Handler for BroadcastChannel messages
  const handleChannel = (event) => {
    if (event.data?.type === 'START_BROADCAST') {
      callback(event.data.broadcast);
    } else if (event.data?.type === 'END_BROADCAST') {
      callback(null);
    }
  };

  window.addEventListener(BROADCAST_EVENT_NAME, handleLocalUpdate);
  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleChannel);
  }

  // Initial load check from server / localStorage
  const localInitial = getStoredLiveBroadcast();
  if (localInitial) {
    callback(localInitial);
  }

  // Background poll every 4 seconds to sync across all browsers and devices
  let active = true;
  const pollServer = async () => {
    if (!active) return;
    try {
      const resp = await fetchActiveLiveBroadcast();
      if (resp && resp.active && resp.broadcast) {
        setStoredLiveBroadcast(resp.broadcast);
        callback(resp.broadcast);
      } else if (resp && !resp.active) {
        if (getStoredLiveBroadcast()) {
          setStoredLiveBroadcast(null);
          callback(null);
        }
      }
    } catch {
      // Fallback
    }
  };

  pollServer();
  const pollInterval = setInterval(pollServer, 4000);

  return () => {
    active = false;
    clearInterval(pollInterval);
    window.removeEventListener(BROADCAST_EVENT_NAME, handleLocalUpdate);
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleChannel);
    }
  };
}

