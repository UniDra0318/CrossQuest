import React, { useState } from 'react';
import { 
  GraduationCap, 
  Users, 
  CheckSquare, 
  BookOpen, 
  Plus, 
  Lock, 
  CheckCircle2, 
  Award,
  Search
} from 'lucide-react';
import { CLIENT_COMPANIES } from '../data/mockData';

export default function TrainerDashboard() {
  const [activeCourse, setActiveCourse] = useState('ISO/IEC 27001 Information Security Management');
  const [trainees, setTrainees] = useState([
    { id: 't-1', name: 'Juan Dela Cruz', company: 'San Miguel Conglomerate', email: 'juan.delacruz@alpha-corp.ph', score: 94.5, labGrade: 'High Distinction', status: 'Submitted & Encrypted' },
    { id: 't-2', name: 'Maria Clara', company: 'Maya FinTech Innovations', email: 'maria.clara@maya-fintech.ph', score: 88.0, labGrade: 'Pass with Merit', status: 'Submitted & Encrypted' },
    { id: 't-3', name: 'Beatrice Tan', company: 'San Miguel Conglomerate', email: 'beatrice.tan@alpha-corp.ph', score: 98.0, labGrade: 'Perfect Score', status: 'Submitted & Encrypted' },
    { id: 't-4', name: 'Gabriel Ramos', company: 'Ayala Retail Omnichannel', email: 'g.ramos@ayala-retail.ph', score: null, labGrade: 'Pending', status: 'Drafting' }
  ]);

  const [gradingTrainee, setGradingTrainee] = useState(null);
  const [inputScore, setInputScore] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');
  const [successToast, setSuccessToast] = useState(null);

  const handleSaveGrade = (e) => {
    e.preventDefault();
    setTrainees(prev => prev.map(t => {
      if (t.id === gradingTrainee.id) {
        return {
          ...t,
          score: parseFloat(inputScore),
          labGrade: 'Verified by Lead Trainer',
          status: 'Submitted & Encrypted'
        };
      }
      return t;
    }));

    setSuccessToast(`Record for ${gradingTrainee.name} encrypted with CP-ABE and published.`);
    setGradingTrainee(null);
    setInputScore('');
    setInputRemarks('');

    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="dashboard-content-layout">
      {/* Success Notification */}
      {successToast && (
        <div className="card notice-box mb-16 flex-between">
          <div className="flex-align gap-8">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Cohorts Header Bar */}
      <div className="card view-toolbar">
        <div>
          <div className="flex-align gap-8">
            <GraduationCap size={20} className="text-cyan" />
            <h3>Lead Trainer Course Delivery Portal</h3>
          </div>
          <p className="text-secondary text-xs">
            Review attendee submissions, assign practical lab grades, and trigger CP-ABE encryption.
          </p>
        </div>

        <div className="company-filter-pills">
          <button 
            className={`pill-btn ${activeCourse.includes('27001') ? 'active' : ''}`}
            onClick={() => setActiveCourse('ISO/IEC 27001 Information Security Management')}
          >
            ISO 27001 Security
          </button>
          <button 
            className={`pill-btn ${activeCourse.includes('27701') ? 'active' : ''}`}
            onClick={() => setActiveCourse('ISO/IEC 27701 Privacy Information Management')}
          >
            ISO 27701 Privacy
          </button>
        </div>
      </div>

      {/* Trainee Roster and Grade Entry */}
      <div className="card section-card">
        <div className="card-header-bar">
          <div>
            <h3 className="card-title">{activeCourse} — Attendee Roster</h3>
            <p className="card-subtitle">
              Input assessment scores. Upon submission, records are encrypted using Waters11 CP-ABE.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Attendee Name</th>
                <th>Client Company</th>
                <th>Assessment Score</th>
                <th>Practical Lab Status</th>
                <th>Encryption Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainees.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="trainee-info-cell">
                      <span className="trainee-main-name">{t.name}</span>
                      <span className="trainee-email-text">{t.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-purple">{t.company}</span>
                  </td>
                  <td>
                    {t.score ? (
                      <span className="text-emerald font-bold">{t.score}%</span>
                    ) : (
                      <span className="text-secondary">Not Graded</span>
                    )}
                  </td>
                  <td>{t.labGrade}</td>
                  <td>
                    <span className={`badge ${t.status.includes('Encrypted') ? 'badge-green' : 'badge-amber'}`}>
                      <Lock size={11} /> {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setGradingTrainee(t);
                        setInputScore(t.score || '');
                      }}
                    >
                      <CheckSquare size={13} /> Grade & Encrypt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade Entry Modal */}
      {gradingTrainee && (
        <div className="modal-backdrop" onClick={() => setGradingTrainee(null)}>
          <div className="card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Grade Submission: {gradingTrainee.name}</h3>
            </div>
            <form onSubmit={handleSaveGrade}>
              <div className="dialog-body">
                <div className="form-field mb-16">
                  <label className="field-label">Final Assessment Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="e.g. 95.0"
                    className="clean-input"
                    value={inputScore}
                    onChange={(e) => setInputScore(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field mb-16">
                  <label className="field-label">Practical Lab Evaluation & Assessor Notes</label>
                  <textarea
                    rows="3"
                    placeholder="Document trainee competence against ISO/IEC requirements..."
                    className="clean-input"
                    value={inputRemarks}
                    onChange={(e) => setInputRemarks(e.target.value)}
                  />
                </div>

                <div className="notice-box">
                  <Lock size={14} className="text-cyan" />
                  <span>
                    Saving will trigger CP-ABE encryption binding this payload to {gradingTrainee.company} attributes.
                  </span>
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setGradingTrainee(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Encrypted Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
