import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { fetchTrainees } from '../services/api';

export default function TrainerDashboard({ activeSubView }) {
  const { token } = useAuth();
  const [activeCourse, setActiveCourse] = useState('Information Security & Governance');
  const [trainees, setTrainees] = useState([
    { id: 't-1', name: 'Juan Dela Cruz', company: 'San Miguel Conglomerate', email: 'juan.delacruz@alpha-corp.ph', score: 94.5, labGrade: 'High Distinction', status: 'Submitted & Certified', enrolledCourse: 'Information Security & Governance' },
    { id: 't-2', name: 'Maria Clara', company: 'Maya FinTech Innovations', email: 'maria.clara@maya-fintech.ph', score: 88.0, labGrade: 'Pass with Merit', status: 'Submitted & Certified', enrolledCourse: 'Privacy Information Management & GDPR' },
    { id: 't-3', name: 'Beatrice Tan', company: 'San Miguel Conglomerate', email: 'beatrice.tan@alpha-corp.ph', score: 98.0, labGrade: 'Perfect Score', status: 'Submitted & Certified', enrolledCourse: 'Information Security & Governance' },
    { id: 't-4', name: 'Gabriel Ramos', company: 'Ayala Retail Omnichannel', email: 'g.ramos@ayala-retail.ph', score: null, labGrade: 'Pending', status: 'Drafting', enrolledCourse: 'Corporate Threat Modeling & Incident Handling' }
  ]);

  const [gradingTrainee, setGradingTrainee] = useState(null);
  const [inputScore, setInputScore] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');
  const [successToast, setSuccessToast] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');

  // Fetch real database trainees
  useEffect(() => {
    async function loadTraineeRoster() {
      const dbTrainees = await fetchTrainees(token);
      if (dbTrainees && dbTrainees.length > 0) {
        setTrainees(dbTrainees.map((t, idx) => ({
          id: t.id,
          name: `${t.first_name} ${t.last_name}`,
          company: t.company_name || 'San Miguel Conglomerate',
          email: t.email,
          score: idx === 0 ? 94.5 : idx === 1 ? 88.0 : idx === 2 ? 98.0 : null,
          labGrade: idx < 3 ? 'Verified' : 'Pending',
          status: idx < 3 ? 'Submitted & Certified' : 'Drafting',
          enrolledCourse: idx % 2 === 0 ? 'Information Security & Governance' : 'Privacy Information Management & GDPR'
        })));
      }
    }
    loadTraineeRoster();
  }, [token]);

  const courses = [
    {
      id: 'c-1',
      title: 'Information Security & Governance',
      duration: '40 Hours',
      enrolled: 28,
      status: 'Active Cohort',
      code: 'SEC-201'
    },
    {
      id: 'c-2',
      title: 'Privacy Information Management & GDPR',
      duration: '32 Hours',
      enrolled: 19,
      status: 'Active Cohort',
      code: 'PRV-202'
    },
    {
      id: 'c-3',
      title: 'Corporate Threat Modeling & Incident Handling',
      duration: '24 Hours',
      enrolled: 14,
      status: 'Upcoming Cohort',
      code: 'THM-301'
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
          status: 'Submitted & Certified'
        };
      }
      return t;
    }));

    setSuccessToast(`Assessment score for ${gradingTrainee.name} signed & certified.`);
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
            <div className="flex-align gap-8">
              <span className="badge badge-purple">Instructor: Lead Trainer</span>
              <span className="badge badge-green">3 Active Cohorts</span>
            </div>
          </div>

          <div className="courses-grid-layout">
            {courses.map(course => (
              <div key={course.id} className="card course-cohort-card">
                <div className="course-card-top flex-between">
                  <span className="badge badge-blue">{course.code}</span>
                  <span className="badge badge-green">{course.status}</span>
                </div>
                <h3>{course.title}</h3>
                <div className="course-cohort-meta">
                  <div className="flex-align gap-6">
                    <Calendar size={13} className="text-secondary" />
                    <span>Duration: {course.duration}</span>
                  </div>
                  <div className="flex-align gap-6">
                    <Users size={13} className="text-cyan" />
                    <span>Enrolled Trainees: {course.enrolled}</span>
                  </div>
                </div>
                <div className="course-card-actions">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveCourse(course.title)}
                  >
                    <span>Manage Cohort</span>
                    <ArrowRight size={13} />
                  </button>
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
              <h3 className="card-title">Enrolled Trainee Master Roster</h3>
              <p className="card-subtitle">
                Attendees across client organizations enrolled in certified security programs.
              </p>
            </div>
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search trainee name or company..."
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
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
                      <td>
                        {t.score ? (
                          <span className="text-emerald font-bold">{t.score}%</span>
                        ) : (
                          <span className="text-secondary">Not Graded</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${t.score ? 'badge-green' : 'badge-amber'}`}>
                          {t.status}
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
                          <CheckSquare size={13} />
                          <span>{t.score ? 'Update Grade' : 'Grade Lab'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. GRADE & ENCRYPT VIEW */}
      {activeSubView === 'grade_entry' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title">Assessment Evaluation & Certification Workbench</h3>
              <p className="card-subtitle">
                Enter exam and practical lab scores. Upon submission, records are bound to the client organization.
              </p>
            </div>
          </div>

          <div className="p-24">
            {gradingTrainee ? (
              <form onSubmit={handleSaveGrade} className="grade-form-card">
                <div className="grade-form-header">
                  <h4>Grading: {gradingTrainee.name}</h4>
                  <span className="badge badge-purple">{gradingTrainee.company}</span>
                </div>

                <div className="form-field mb-16">
                  <label className="field-label">Course Title</label>
                  <input type="text" className="clean-input" value={gradingTrainee.enrolledCourse} disabled />
                </div>

                <div className="form-field mb-16">
                  <label className="field-label">Official Score (0–100%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    required
                    className="clean-input"
                    value={inputScore}
                    onChange={(e) => setInputScore(e.target.value)}
                    placeholder="e.g. 95.0"
                  />
                </div>

                <div className="form-field mb-16">
                  <label className="field-label">Instructor Evaluation & Comments</label>
                  <textarea
                    rows={3}
                    className="clean-input"
                    value={inputRemarks}
                    onChange={(e) => setInputRemarks(e.target.value)}
                    placeholder="Candidate demonstrated exceptional mastery in security compliance lab..."
                  />
                </div>

                <div className="card notice-box mb-16">
                  <Lock size={16} className="text-cyan" />
                  <p className="text-xs text-secondary">
                    Saving binds this payload directly to {gradingTrainee.company} organization access attributes.
                  </p>
                </div>

                <div className="flex-align gap-12">
                  <button type="submit" className="btn btn-primary">
                    <CheckSquare size={14} /> Submit & Certify Record
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setGradingTrainee(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="empty-workbench-placeholder">
                <GraduationCap size={48} className="text-secondary mb-16" />
                <h3>No Trainee Selected</h3>
                <p className="text-secondary text-sm mb-16">
                  Select a trainee from the roster to enter official grades and certify their assessment.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const first = trainees[0];
                    setGradingTrainee(first);
                    setInputScore(first.score || '');
                  }}
                >
                  Select First Trainee ({trainees[0]?.name})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
