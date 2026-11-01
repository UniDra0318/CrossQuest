const API_BASE = 'http://localhost:8000/api/v1';

export async function fetchCompanies(token) {
  try {
    const res = await fetch(`${API_BASE}/trainees/companies`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for companies:", err);
  }
  return null;
}

export async function fetchTrainees(token) {
  try {
    const res = await fetch(`${API_BASE}/trainees/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for trainees:", err);
  }
  return null;
}

export async function fetchRecords(token) {
  try {
    const res = await fetch(`${API_BASE}/records/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for records:", err);
  }
  return null;
}

export async function createEncryptedRecordApi(recordData, token) {
  try {
    const res = await fetch(`${API_BASE}/records/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(recordData)
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}


export async function decryptRecordApi(recordId, token) {
  try {
    const res = await fetch(`${API_BASE}/records/${recordId}/decrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchAnomalies(token) {
  try {
    const res = await fetch(`${API_BASE}/anomalies/alerts`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for anomalies:", err);
  }
  return null;
}

export async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/gamification/leaderboard`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for leaderboard:", err);
  }
  return null;
}

export async function fetchClassLeaderboard(sessionId, token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/gamification/leaderboard/class?session_id=${encodeURIComponent(sessionId)}`, { headers });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for class leaderboard:", err);
  }
  return null;
}

export async function fetchCompanyLeaderboard(token) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/gamification/leaderboard/company`, { headers });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for company leaderboard:", err);
  }
  return null;
}

export async function toggleLeaderboardOptOut(optOut, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/gamification/profile/leaderboard-opt-out`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ opt_out: optOut })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API error updating leaderboard opt-out:", err);
  }
  return null;
}

export async function fetchTraineeGamification(traineeId) {
  try {
    const res = await fetch(`${API_BASE}/gamification/trainee/${traineeId}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for trainee gamification:", err);
  }
  return null;
}

export async function submitQuizScore(traineeId, score) {
  try {
    const res = await fetch(`${API_BASE}/gamification/submit-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainee_id: traineeId, score })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for submit-quiz:", err);
  }
  return null;
}

export async function submitQuizAttempt(payload, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/gamification/submit-quiz`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API error submitting quiz attempt:", err);
  }
  return null;
}

export async function fetchStaffUsers(token) {
  try {
    const res = await fetch(`${API_BASE}/users/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for staff users:", err);
  }
  return null;
}

export async function updateStaffAttributes(userId, attrs, token) {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}/attributes`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(attrs)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API error updating staff attributes:", err);
  }
  return null;
}

export async function fetchTrainerSessions(token) {
  try {
    const res = await fetch(`${API_BASE}/records/sessions/assigned`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for trainer sessions:", err);
  }
  return null;
}

export async function submitTrainerSignOff(sessionId, payload, token) {
  const res = await fetch(`${API_BASE}/records/sessions/${sessionId}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Sign-off failed (${res.status})`);
  }
  return data;
}

export async function fetchImportBatches(token) {
  try {
    const res = await fetch(`${API_BASE}/imports/batches`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for import batches:", err);
  }
  return null;
}

export async function uploadImportFile(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const endpoint = isExcel ? `${API_BASE}/imports/upload-workbook` : `${API_BASE}/imports/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `File upload failed (${res.status})`);
  }
  return data;
}

export async function fetchBatchDiscrepancies(batchId, token) {
  try {
    const res = await fetch(`${API_BASE}/imports/batches/${batchId}/discrepancies`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for batch discrepancies:", err);
  }
  return null;
}

export async function resolveDiscrepancy(discrepancyId, payload, token) {
  const res = await fetch(`${API_BASE}/imports/discrepancies/${discrepancyId}/resolve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Resolution failed (${res.status})`);
  }
  return data;
}

export async function fetchReconciliationReport(batchId, token) {
  try {
    const res = await fetch(`${API_BASE}/imports/batches/${batchId}/reconciliation`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for reconciliation report:", err);
  }
  return null;
}

export async function commitImportBatch(batchId, token) {
  const res = await fetch(`${API_BASE}/imports/batches/${batchId}/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Commit batch failed (${res.status})`);
  }
  return data;
}

export async function fetchCertificationTypes(token) {
  try {
    const res = await fetch(`${API_BASE}/certifications/types`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for cert types:", err);
  }
  return null;
}

export async function fetchCertificates(token) {
  try {
    const res = await fetch(`${API_BASE}/certifications/`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for certificates:", err);
  }
  return null;
}

export async function submitExternalCredential(payload, token) {
  const res = await fetch(`${API_BASE}/certifications/external-renewal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `External credential submission failed (${res.status})`);
  }
  return data;
}

export async function fetchExpiryNotifications(token) {
  try {
    const res = await fetch(`${API_BASE}/certifications/notifications`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("API fallback for notifications:", err);
  }
  return null;
}

export async function triggerExpirySweep(token) {
  const res = await fetch(`${API_BASE}/certifications/trigger-sweep`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Sweep trigger failed (${res.status})`);
  }
  return data;
}
