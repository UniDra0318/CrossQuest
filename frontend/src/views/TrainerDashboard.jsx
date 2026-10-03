import React, { useState } from 'react';
import { 
  GraduationCap, 
  Users, 
  CheckSquare, 
  BookOpen, 
  Lock, 
  CheckCircle2, 
  Search,
  Award,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CLIENT_COMPANIES } from '../data/mockData';

export default function TrainerDashboard({ activeSubView }) {
  const [activeCourse, setActiveCourse] = useState('ISO/IEC 27001 Information Security Management');
  const [trainees, setTrainees] = useState([
    { id: 't-1', name: 'Juan Dela Cruz', company: 'San Miguel Conglomerate', email: 'juan.delacruz@alpha-corp.ph', score: 94.5, labGrade: 'High Distinction', status: 'Submitted & Encrypted', enrolledCourse: 'ISO/IEC 27001 Information Security Management' },
    { id: 't-2', name: 'Maria Clara', company: 'Maya FinTech Innovations', email: 'maria.clara@maya-fintech.ph', score: 88.0, labGrade: 'Pass with Merit', status: 'Submitted & Encrypted', enrolledCourse: 'ISO/IEC 27701 Privacy Information Management' },
    { id: 't-3', name: 'Beatrice Tan', company: 'San Miguel Conglomerate', email: 'beatrice.tan@alpha-corp.ph', score: 98.0, labGrade: 'Perfect Score', status: 'Submitted & Encrypted', enrolledCourse: 'ISO/IEC 27001 Information Security Management' },
    { id: 't-4', name: 'Gabriel Ramos', company: 'Ayala Retail Omnichannel', email: 'g.ramos@ayala-retail.ph', score: null, labGrade: 'Pending', status: 'Drafting', enrolledCourse: 'Corporate Threat Modeling & Incident Handling' }
  ]);

  const [gradingTrainee, setGradingTrainee] = useState(null);
  const [inputScore, setInputScore] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');
  const [successToast, setSuccessToast] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');

  const courses = [
    {
      id: 'c-1',
      title: 'ISO/IEC 27001 Information Security Management',
      duration: '40 Hours',
      enrolled: 28,
      status: 'Active Cohort',
      code: 'SEC-27001'
    },
    {
      id: 'c-2',
      title: 'ISO/IEC 27701 Privacy Information Management & PIA',
      duration: '32 Hours',
      enrolled: 19,
      status: 'Active Cohort',
      code: 'PRV-27701'
    },
    {
      id: 'c-3',
      title: 'Corporate Threat Modeling & Incident Handling',
      duration: '24 Hours',
      enrolled: 14,
      status: 'Upcoming Cohort',
      code: 'THM-3001'
    }
  ];

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

    setSuccessToast(`Assessment score for ${gradingTrainee.name} signed & encrypted with CP-ABE.`);
    setGradingTrainee(null);
    setInputScore('');
    setInputRemarks('');

    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="dashboard-content-layout">
      {successToast && (
        <div className="card notice-box mb-16 flex-between">
          <div className="flex-align gap-8">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* 1. COURSES SUB-VIEW */}
      {(activeSubView === 'trainer_courses' || !activeSubView) && (
        <>
          <div className="view-title-header">
            <div>
              <h2>Course Cohorts & Delivery Schedules</h2>
              <p className="text-secondary text-sm">
                Corporate course modules delivered to client organizations by Crossworks instructors.
              </p>
            </div>
          </div>

          <div className="client-cards-grid">
            {courses.map(c => (
              <div key={c.id} className="card client-portfolio-card">
                <div className="client-card-header">
                  <BookOpen size={24} className="text-cyan" />
                  <span className="badge badge-blue">{c.code}</span>
                </div>
                <h3>{c.title}</h3>
                <div className="client-stat-line mt-16">
                  <span>Duration:</span>
                  <strong>{c.duration}</strong>
                </div>
                <div className="client-stat-line">
                  <span>Enrolled Attendees:</span>
                  <strong>{c.enrolled} Professionals</strong>
                </div>
                <div className="client-stat-line">
                  <span>Status:</span>
                  <span className="badge badge-green">{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 2. TRAINEE ROSTER SUB-VIEW */}
      {activeSubView === 'trainee_roster' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Corporate Attendee Roster</h3>
              <p className="card-subtitle">
                Directory of enrolled trainees across client organizations.
              </p>
            </div>
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search attendees..."
                className="search-input"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Trainee Name</th>
                  <th>Client Company</th>
                  <th>Enrolled Course</th>
                  <th>Current Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trainees
                  .filter(t => t.name.toLowerCase().includes(rosterSearch.toLowerCase()) || t.company.toLowerCase().includes(rosterSearch.toLowerCase()))
                  .map(t => (
                    <tr key={t.id}>
                      <td>
                        <div className="trainee-info-cell">
                          <span className="trainee-main-name">{t.name}</span>
                          <span className="trainee-email-text">{t.email}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-purple">{t.company}</span></td>
                      <td>{t.enrolledCourse}</td>
                      <td>{t.score ? <strong className="text-emerald">{t.score}%</strong> : 'In Progress'}</td>
                      <td>
                        <span className={`badge ${t.status.includes('Encrypted') ? 'badge-green' : 'badge-amber'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. GRADE & ENCRYPT SUB-VIEW */}
      {activeSubView === 'grade_entry' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Assessment Evaluation & CP-ABE Encryption Workbench</h3>
              <p className="card-subtitle">
                Review submissions, record practical lab remarks, and encrypt credentials under client attributes.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Client Company</th>
                  <th>Score</th>
                  <th>Practical Lab Remarks</th>
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
                    <td><span className="badge badge-purple">{t.company}</span></td>
                    <td>{t.score ? <span className="text-emerald font-bold">{t.score}%</span> : 'Not Graded'}</td>
                    <td>{t.labGrade}</td>
                    <td>
                      <span className={`badge ${t.status.includes('Encrypted') ? 'badge-green' : 'badge-amber'}`}>
                        <Lock size={11} /> {t.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setGradingTrainee(t);
                          setInputScore(t.score || '');
                        }}
                      >
                        <CheckSquare size={13} /> {t.score ? 'Re-grade' : 'Grade & Encrypt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <label className="field-label">Practical Lab Evaluation & Remarks</label>
                  <textarea
                    rows="3"
                    placeholder="Demonstrated Annex A control implementation..."
                    className="clean-input"
                    value={inputRemarks}
                    onChange={(e) => setInputRemarks(e.target.value)}
                  />
                </div>

                <div className="notice-box">
                  <Lock size={14} className="text-cyan" />
                  <span>
                    Saving binds this payload directly to {gradingTrainee.company} CP-ABE attributes.
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
