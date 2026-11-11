import React, { useEffect, useState } from 'react';
import { fetchAdminCourses, fetchTrainerPrograms, saveTrainerPrograms } from '../../services/api';

export default function TrainerProgramsModal({ trainer, token, onClose }) {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([fetchAdminCourses(token), fetchTrainerPrograms(trainer.id, token)]);
      setCourses(c);
      setSelected(new Set(p.map(x => x.course_id)));
    })();
  }, [trainer.id, token]);

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const save = async () => {
    setSaving(true); setError(null);
    const ok = await saveTrainerPrograms(trainer.id, [...selected], token);
    setSaving(false);
    if (ok) onClose(); else setError('Could not save programs.');
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} className="adm-panel"
        style={{ width: 'min(480px, 92vw)', maxHeight: '80vh', overflow: 'auto', padding: '20px', background: '#111827', color: '#e5e7eb', borderRadius: '16px' }}>
        <h3 style={{ fontWeight: 800, marginBottom: 4 }}>Programs for {trainer.full_name}</h3>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
          Selected programs let this trainer author and approve quizzes for every session of that course, in addition to their assigned sessions.
        </p>
        {courses.map(c => (
          <label key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
            <span>{c.name}{c.acronym_3 ? ` (${c.acronym_3})` : ''}</span>
          </label>
        ))}
        {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" className="adm-btn adm-btn--light" onClick={onClose}>Cancel</button>
          <button type="button" className="adm-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save programs'}</button>
        </div>
      </div>
    </div>
  );
}
