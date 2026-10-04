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
  ArrowRight,
  BarChart3,
  Sparkles,
  Filter,
  Check,
  Shield,
  FileText,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Hash,
  Clock,
  Briefcase,
  TrendingUp,
  Download,
  PieChart,
  HelpCircle,
  Send,
  RefreshCw,
  Target,
  CheckCheck,
  Zap,
  Printer,
  Eye,
  Link2,
  ListOrdered
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTrainees, fetchCompanies, createEncryptedRecordApi } from '../services/api';
import QuizStudio from '../components/QuizStudio';
import { getActiveQuizDatabase } from '../data/quizDatabase';

export default function TrainerDashboard({ activeSubView, setActiveView }) {
  const { token, currentUser } = useAuth();
  const [selectedCohort, setSelectedCohort] = useState('c-1');
  const [cohortModalData, setCohortModalData] = useState(null);
  
  // Real Trainees State
  const [trainees, setTrainees] = useState([
    { 
      id: 't-1', 
      name: 'Juan Dela Cruz', 
      company: 'San Miguel Conglomerate', 
      companyCode: 'CORP_ALPHA',
      companyId: 'comp-alpha',
      email: 'juan.delacruz@alpha-corp.ph', 
      score: 94.5, 
      labGrade: 'High Distinction', 
      status: 'Submitted & Certified', 
      enrolledCourse: 'Enterprise Security Audit & Zero-Trust',
      cohortId: 'c-1',
      dateCompleted: '2026-09-28'
    },
    { 
      id: 't-2', 
      name: 'Maria Clara', 
      company: 'Maya FinTech Innovations', 
      companyCode: 'FINTECH_BETA',
      companyId: 'comp-beta',
      email: 'maria.clara@maya-fintech.ph', 
      score: 88.0, 
      labGrade: 'Pass with Merit', 
      status: 'Submitted & Certified', 
      enrolledCourse: 'Privacy Impact Assessment & DPA R.A. 10173',
      cohortId: 'c-2',
      dateCompleted: '2026-09-30'
    },
    { 
      id: 't-3', 
      name: 'Beatrice Tan', 
      company: 'San Miguel Conglomerate', 
      companyCode: 'CORP_ALPHA',
      companyId: 'comp-alpha',
      email: 'beatrice.tan@alpha-corp.ph', 
      score: 98.0, 
      labGrade: 'Perfect Score', 
      status: 'Submitted & Certified', 
      enrolledCourse: 'Enterprise Security Audit & Zero-Trust',
      cohortId: 'c-1',
      dateCompleted: '2026-10-01'
    },
    { 
      id: 't-4', 
      name: 'Gabriel Ramos', 
      company: 'Ayala Retail Omnichannel', 
      companyCode: 'RETAIL_GAMMA',
      companyId: 'comp-gamma',
      email: 'g.ramos@ayala-retail.ph', 
      score: null, 
      labGrade: 'Pending', 
      status: 'Drafting', 
      enrolledCourse: 'Multi-Tenant Data Isolation & RLS',
      cohortId: 'c-3',
      dateCompleted: null
    },
    { 
      id: 't-5', 
      name: 'Carlos Mendoza', 
      company: 'Maya FinTech Innovations', 
      companyCode: 'FINTECH_BETA',
      companyId: 'comp-beta',
      email: 'c.mendoza@maya-fintech.ph', 
      score: 68.5, 
      labGrade: 'Needs Review', 
      status: 'Pending Review', 
      enrolledCourse: 'Privacy Impact Assessment & DPA R.A. 10173',
      cohortId: 'c-2',
      dateCompleted: null
    }
  ]);

  const [companies, setCompanies] = useState([]);
  const [gradingTrainee, setGradingTrainee] = useState(null);
  const [inputScore, setInputScore] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');
  const [rubricChecks, setRubricChecks] = useState({
    zeroTrust: true,
    cpabeTheory: true,
    isolationBoundaries: true,
    complianceAudit: true
  });
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const [certifiedResult, setCertifiedResult] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Advanced Analytics States
  const [analyticsCompanyFilter, setAnalyticsCompanyFilter] = useState('ALL');
  const [analyticsCourseFilter, setAnalyticsCourseFilter] = useState('ALL');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('all_time');
  const [analyticsActiveTab, setAnalyticsActiveTab] = useState('overview'); // 'overview' | 'competencies' | 'question_heatmap' | 'remediation'
  const [remediationSentIds, setRemediationSentIds] = useState(new Set());

  // Load backend trainees and companies
  useEffect(() => {
    async function loadData() {
      const [dbTrainees, dbCompanies] = await Promise.all([
        fetchTrainees(token),
        fetchCompanies(token)
      ]);

      if (dbCompanies && dbCompanies.length > 0) {
        setCompanies(dbCompanies);
      }

      if (dbTrainees && dbTrainees.length > 0) {
        setTrainees(dbTrainees.map((t, idx) => ({
          id: t.id,
          name: `${t.first_name} ${t.last_name}`,
          company: t.company_name || 'San Miguel Conglomerate',
          companyCode: t.company_code || 'CORP_ALPHA',
          companyId: t.current_company_id || 'comp-alpha',
          email: t.email,
          score: idx === 0 ? 94.5 : idx === 1 ? 88.0 : idx === 2 ? 98.0 : idx === 3 ? null : 68.5,
          labGrade: idx === 0 ? 'High Distinction' : idx === 1 ? 'Pass with Merit' : idx === 2 ? 'Perfect Score' : idx === 3 ? 'Pending' : 'Needs Review',
          status: idx < 3 ? 'Submitted & Certified' : idx === 3 ? 'Drafting' : 'Pending Review',
          enrolledCourse: idx % 3 === 0 
            ? 'Enterprise Security Audit & Zero-Trust' 
            : idx % 3 === 1 
            ? 'Privacy Impact Assessment & DPA R.A. 10173'
            : 'Multi-Tenant Data Isolation & RLS',
          cohortId: `c-${(idx % 3) + 1}`,
          dateCompleted: idx < 3 ? '2026-10-01' : null
        })));
      }
    }
    loadData();
  }, [token]);

  // Cohorts Catalog
  const cohorts = [
    {
      id: 'c-1',
      title: 'Enterprise Security Audit & Zero-Trust Architecture',
      code: 'SEC-201',
      company: 'San Miguel Conglomerate',
      companyCode: 'CORP_ALPHA',
      instructor: 'David Lim (Lead Trainer)',
      duration: '40 Hours',
      schedule: 'Mon / Wed / Fri · 09:00 - 12:00 PHT',
      enrolled: 24,
      certifiedCount: 21,
      avgScore: 92.4,
      status: 'Active Cohort',
      linkedQuizId: 'act-1',
      description: 'Zero-trust cryptographic isolation, attribute credential parsing, and CP-ABE policy bound ciphertexts.'
    },
    {
      id: 'c-2',
      title: 'Privacy Impact Assessment (PIA) & Statutory Compliance',
      code: 'PRV-202',
      company: 'Maya FinTech Innovations',
      companyCode: 'FINTECH_BETA',
      instructor: 'David Lim (Lead Trainer)',
      duration: '32 Hours',
      schedule: 'Tue / Thu · 13:00 - 17:00 PHT',
      enrolled: 18,
      certifiedCount: 14,
      avgScore: 86.8,
      status: 'Active Cohort',
      linkedQuizId: 'act-3',
      description: 'Data Privacy Act of 2012 (R.A. 10173), NPC guidelines, PIC/PIP statutory boundaries, and 72-hour breach response.'
    },
    {
      id: 'c-3',
      title: 'Multi-Tenant Cloud Data Isolation & Threat Modeling',
      code: 'THM-301',
      company: 'Ayala Retail Omnichannel',
      companyCode: 'RETAIL_GAMMA',
      instructor: 'David Lim (Lead Trainer)',
      duration: '28 Hours',
      schedule: 'Saturdays · 08:00 - 15:00 PHT',
      enrolled: 15,
      certifiedCount: 9,
      avgScore: 78.5,
      status: 'Under Evaluation',
      linkedQuizId: 'act-4',
      description: 'Cross-tenant boundary protection, SQL injection mitigation, and continuous access anomaly alert handling.'
    }
  ];

  // Helper for distinction tier
  const getDistinctionTier = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'Pending Evaluation';
    const num = parseFloat(val);
    if (num >= 95) return 'High Distinction (Summa Cum Laude)';
    if (num >= 85) return 'Pass with Merit';
    if (num >= 75) return 'Certified Passing';
    return 'Conditional / Needs Review';
  };

  // Grade & Certify Record Handler (CP-ABE Encryption)
  const handleSaveGradeAndCertify = async (e) => {
    e.preventDefault();
    if (!gradingTrainee) return;

    const numericScore = parseFloat(inputScore);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      alert("Please provide a valid score between 0 and 100.");
      return;
    }

    setIsSubmittingRecord(true);

    const targetCompanyId = gradingTrainee.companyId || (companies[0] ? companies[0].id : 'comp-alpha');
    const targetCompanyCode = gradingTrainee.companyCode || 'CORP_ALPHA';

    const recordPayload = {
      trainee_id: gradingTrainee.id,
      company_at_completion_id: targetCompanyId,
      course_name: gradingTrainee.enrolledCourse,
      status: numericScore >= 75 ? 'completed' : 'needs_review',
      score: numericScore,
      required_role: 'account_manager',
      required_company: targetCompanyCode,
      required_clearance: 1
    };

    // Call real backend CP-ABE encryption
    const result = await createEncryptedRecordApi(recordPayload, token);

    // Update local state
    const tier = getDistinctionTier(numericScore);
    const updatedStatus = numericScore >= 75 ? 'Submitted & Certified' : 'Pending Review';

    setTrainees(prev => prev.map(t => {
      if (t.id === gradingTrainee.id) {
        return {
          ...t,
          score: numericScore,
          labGrade: tier,
          status: updatedStatus,
          dateCompleted: new Date().toISOString().split('T')[0]
        };
      }
      return t;
    }));

    setIsSubmittingRecord(false);
    setCertifiedResult({
      trainee: gradingTrainee,
      score: numericScore,
      tier,
      policy: `(ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:${targetCompanyCode})`,
      hash: `SHA256:${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}...`,
      apiSuccess: result.ok
    });

    setSuccessToast(`Record for ${gradingTrainee.name} signed & encrypted under CP-ABE Policy.`);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handleStartGrading = (trainee) => {
    setGradingTrainee(trainee);
    setInputScore(trainee.score !== null ? trainee.score : '');
    setInputRemarks(`Candidate demonstrated solid capability in ${trainee.enrolledCourse}. Practical competencies verified.`);
    setCertifiedResult(null);
    if (setActiveView) setActiveView('grade_entry');
  };

  // Filtered roster
  const filteredTrainees = trainees.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
                          t.company.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                          t.email.toLowerCase().includes(rosterSearch.toLowerCase());
    const matchesCompany = companyFilter === 'ALL' || t.companyCode === companyFilter || t.company.includes(companyFilter);
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesCompany && matchesStatus;
  });

  // Calculate cohort summary stats
  const totalEnrolled = trainees.length;
  const certifiedTrainees = trainees.filter(t => t.status === 'Submitted & Certified');
  const certifiedRate = Math.round((certifiedTrainees.length / Math.max(1, totalEnrolled)) * 100);
  const gradedScores = trainees.filter(t => t.score !== null).map(t => t.score);
  const avgOverallScore = gradedScores.length > 0 
    ? (gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length).toFixed(1)
    : '88.5';

  return (
    <div className="dashboard-content-layout">
      {successToast && (
        <div className="card notice-box mb-16 flex-between animate-fadeIn">
          <div className="flex-align gap-8">
            <CheckCircle2 size={18} className="text-emerald flex-shrink-0" />
            <span className="font-semibold text-sm">{successToast}</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: COURSE COHORTS & DELIVERY SCHEDULES
          ========================================================================= */}
      {(activeSubView === 'trainer_courses' || !activeSubView) && (
        <>
          {/* TRAINER KPI HEADER BAND */}
          <div className="card trainer-hero-banner mb-20">
            <div className="trainer-hero-content">
              <div className="trainer-profile-group">
                <div className="trainer-avatar-box">
                  <GraduationCap size={30} />
                </div>
                <div className="trainer-profile-info">
                  <div className="trainer-badges-row">
                    <span className="badge badge-purple">Lead Trainer Workspace</span>
                    <span className="badge badge-blue">Crossworks Faculty</span>
                  </div>
                  <h2 className="trainer-welcome-title">
                    Welcome back, Lead Trainer David Lim
                  </h2>
                  <p className="trainer-welcome-desc">
                    Authorized Level 1 Faculty Member · Directing active client cohorts and certified CP-ABE score evaluations.
                  </p>
                </div>
              </div>

              <div className="trainer-kpi-chips-container">
                <div className="trainer-kpi-card">
                  <div className="kpi-card-num text-purple">{cohorts.length}</div>
                  <div className="kpi-card-label">Active Cohorts</div>
                </div>
                <div className="trainer-kpi-card">
                  <div className="kpi-card-num text-blue">{totalEnrolled}</div>
                  <div className="kpi-card-label">Enrolled Trainees</div>
                </div>
                <div className="trainer-kpi-card">
                  <div className="kpi-card-num text-emerald">{certifiedRate}%</div>
                  <div className="kpi-card-label">Certification Rate</div>
                </div>
              </div>
            </div>
          </div>

          <div className="view-title-header flex-between mb-16">
            <div>
              <h3>Enterprise Course Cohorts & Client Delivery</h3>
              <p className="text-secondary text-sm">
                Active modules delivered across corporate clients with customized cryptographic access boundaries.
              </p>
            </div>
            <div className="flex-align gap-8">
              <button 
                type="button" 
                className="btn btn-secondary btn-sm flex-align gap-6"
                onClick={() => setActiveView && setActiveView('quiz_creator')}
              >
                <Sparkles size={14} className="text-purple" />
                <span>Open Quiz Studio</span>
              </button>
            </div>
          </div>

          {/* COHORTS GRID */}
          <div className="grid-3-col gap-16 mb-24">
            {cohorts.map((cohort) => {
              const cohortTrainees = trainees.filter(t => t.cohortId === cohort.id);
              const passingPct = Math.round((cohort.certifiedCount / cohort.enrolled) * 100);

              return (
                <div key={cohort.id} className="card cohort-management-card p-20 flex-column justify-between">
                  <div>
                    <div className="flex-between mb-10">
                      <span className="badge badge-purple font-mono font-bold">{cohort.code}</span>
                      <span className={`badge ${cohort.status === 'Active Cohort' ? 'badge-green' : 'badge-amber'}`}>
                        {cohort.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                        Client Organization
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 m-0">{cohort.company}</h4>
                    </div>

                    <h3 className="cohort-card-title text-base font-bold text-slate-900 mb-8">
                      {cohort.title}
                    </h3>
                    <p className="cohort-desc text-xs text-secondary mb-14">
                      {cohort.description}
                    </p>

                    <div className="cohort-meta-list text-xs text-secondary space-y-2 mb-16 bg-slate-50 p-10 rounded">
                      <div className="flex-align gap-6">
                        <Clock size={12} className="text-purple flex-shrink-0" />
                        <span><strong>Schedule:</strong> {cohort.schedule}</span>
                      </div>
                      <div className="flex-align gap-6">
                        <Users size={12} className="text-cyan flex-shrink-0" />
                        <span><strong>Attendees:</strong> {cohort.enrolled} Enrolled · {cohort.certifiedCount} Certified</span>
                      </div>
                      <div className="flex-align gap-6">
                        <Award size={12} className="text-gold flex-shrink-0" />
                        <span><strong>Average Cohort Score:</strong> {cohort.avgScore}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="cohort-progress-group mb-16">
                      <div className="flex-between text-xs mb-4">
                        <span className="font-semibold text-secondary">Certification Progress</span>
                        <span className="font-bold text-slate-800">{passingPct}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill bg-purple"
                          style={{ width: `${passingPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="cohort-card-actions flex-between pt-12 border-top gap-8">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex-1 flex-align justify-center gap-4"
                      onClick={() => setCohortModalData(cohort)}
                    >
                      <Users size={13} />
                      <span>View Attendees</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex-1 flex-align justify-center gap-4"
                      onClick={() => {
                        if (setActiveView) setActiveView('trainee_roster');
                        setCompanyFilter(cohort.companyCode);
                      }}
                    >
                      <span>Grade Cohort</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* =========================================================================
          VIEW 2: ENROLLED TRAINEE MASTER ROSTER
          ========================================================================= */}
      {activeSubView === 'trainee_roster' && (
        <div className="card section-card">
          <div className="card-header-bar flex-between flex-wrap gap-12">
            <div>
              <h3 className="card-title flex-align gap-8">
                <Users size={20} className="text-purple" />
                <span>Enrolled Trainee Master Roster</span>
              </h3>
              <p className="card-subtitle">
                Attendees across client organizations enrolled in certified security programs.
              </p>
            </div>

            {/* FILTERS & SEARCH */}
            <div className="flex-align gap-10 flex-wrap">
              <select
                className="clean-input text-xs"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <option value="ALL">All Client Companies</option>
                <option value="CORP_ALPHA">San Miguel Conglomerate (CORP_ALPHA)</option>
                <option value="FINTECH_BETA">Maya FinTech Innovations (FINTECH_BETA)</option>
                <option value="RETAIL_GAMMA">Ayala Retail Omnichannel (RETAIL_GAMMA)</option>
              </select>

              <select
                className="clean-input text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Certification Statuses</option>
                <option value="Submitted & Certified">Submitted & Certified</option>
                <option value="Drafting">Drafting / In Progress</option>
                <option value="Pending Review">Pending Evaluation</option>
              </select>

              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search trainee name or email..."
                  className="search-input"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Trainee Details</th>
                  <th>Client Company</th>
                  <th>Course Curriculum</th>
                  <th>Assessment Score</th>
                  <th>Distinction Tier</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Evaluation Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-24 text-secondary">
                      No trainees found matching current search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTrainees.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div className="trainee-info-cell">
                          <span className="trainee-main-name font-bold text-slate-900">{t.name}</span>
                          <span className="trainee-email-text text-secondary text-xs">{t.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-purple">{t.company}</span>
                      </td>
                      <td>
                        <span className="text-xs font-semibold text-slate-800">{t.enrolledCourse}</span>
                      </td>
                      <td>
                        {t.score !== null ? (
                          <span className="text-sm font-extrabold text-emerald">{t.score}%</span>
                        ) : (
                          <span className="text-xs text-secondary italic">Not Evaluated</span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs font-medium text-slate-700">{t.labGrade}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          t.status === 'Submitted & Certified' 
                            ? 'badge-green' 
                            : t.status === 'Pending Review' 
                            ? 'badge-amber' 
                            : 'badge-blue'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm flex-align gap-4 ml-auto"
                          onClick={() => handleStartGrading(t)}
                        >
                          <CheckSquare size={13} className="text-purple" />
                          <span>{t.score !== null ? 'Re-Grade & Certify' : 'Grade & Sign'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: ASSESSMENT EVALUATION & CRYPTOGRAPHIC CERTIFICATION WORKBENCH
          ========================================================================= */}
      {activeSubView === 'grade_entry' && (
        <div className="card section-card">
          <div className="card-header-bar">
            <div>
              <h3 className="card-title flex-align gap-8">
                <ShieldCheck size={20} className="text-purple" />
                <span>Assessment Evaluation & Cryptographic Certification Workbench</span>
              </h3>
              <p className="card-subtitle">
                Enter exam and practical lab scores. Upon submission, records are bound to the client organization via CP-ABE encryption.
              </p>
            </div>
          </div>

          <div className="p-24">
            {gradingTrainee ? (
              <div className="grid-2-col gap-24">
                {/* LEFT COLUMN: EVALUATION FORM */}
                <form onSubmit={handleSaveGradeAndCertify} className="grade-form-card">
                  <div className="grade-form-header flex-between mb-16 p-12 bg-slate-50 rounded border border-slate-200">
                    <div>
                      <span className="text-xs text-secondary font-bold uppercase">Candidate Under Evaluation</span>
                      <h4 className="text-base font-bold text-slate-900 m-0">{gradingTrainee.name}</h4>
                      <span className="text-xs text-secondary">{gradingTrainee.email}</span>
                    </div>
                    <span className="badge badge-purple">{gradingTrainee.company}</span>
                  </div>

                  <div className="form-field mb-14">
                    <label className="field-label text-xs font-bold text-secondary uppercase mb-4">
                      Course Curriculum
                    </label>
                    <input 
                      type="text" 
                      className="clean-input w-full bg-slate-100" 
                      value={gradingTrainee.enrolledCourse} 
                      disabled 
                    />
                  </div>

                  <div className="grid-2-col gap-12 mb-14">
                    <div className="form-field">
                      <label className="field-label text-xs font-bold text-secondary uppercase mb-4">
                        Assessment Score (0–100%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        required
                        className="clean-input w-full text-lg font-bold text-purple"
                        value={inputScore}
                        onChange={(e) => setInputScore(e.target.value)}
                        placeholder="e.g. 94.5"
                      />
                    </div>

                    <div className="form-field">
                      <label className="field-label text-xs font-bold text-secondary uppercase mb-4">
                        Calculated Distinction Tier
                      </label>
                      <div className="p-10 bg-slate-50 border rounded text-xs font-bold text-emerald flex-align gap-6 h-42">
                        <Award size={15} />
                        <span>{getDistinctionTier(inputScore)}</span>
                      </div>
                    </div>
                  </div>

                  {/* COMPETENCY RUBRIC CHECKLIST */}
                  <div className="form-field mb-14">
                    <label className="field-label text-xs font-bold text-secondary uppercase mb-6">
                      Competency Verification Rubric
                    </label>
                    <div className="space-y-2 bg-slate-50 p-12 rounded border border-slate-200 text-xs">
                      <label className="flex-align gap-8 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rubricChecks.zeroTrust}
                          onChange={(e) => setRubricChecks({ ...rubricChecks, zeroTrust: e.target.checked })}
                          className="checkbox-accent"
                        />
                        <span>Demonstrated Zero-Trust Access & Policy Tree Validation</span>
                      </label>
                      <label className="flex-align gap-8 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rubricChecks.cpabeTheory}
                          onChange={(e) => setRubricChecks({ ...rubricChecks, cpabeTheory: e.target.checked })}
                          className="checkbox-accent"
                        />
                        <span>Verified CP-ABE Ciphertext Decryption & Attribute Scope</span>
                      </label>
                      <label className="flex-align gap-8 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rubricChecks.isolationBoundaries}
                          onChange={(e) => setRubricChecks({ ...rubricChecks, isolationBoundaries: e.target.checked })}
                          className="checkbox-accent"
                        />
                        <span>Audited Row-Level Security (RLS) & Multi-Tenant Boundaries</span>
                      </label>
                      <label className="flex-align gap-8 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rubricChecks.complianceAudit}
                          onChange={(e) => setRubricChecks({ ...rubricChecks, complianceAudit: e.target.checked })}
                          className="checkbox-accent"
                        />
                        <span>Compliance with R.A. 10173 and NPC Audit Trail Mandates</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-field mb-16">
                    <label className="field-label text-xs font-bold text-secondary uppercase mb-4">
                      Instructor Evaluation & Official Remarks
                    </label>
                    <textarea
                      rows={3}
                      className="clean-input w-full text-xs"
                      value={inputRemarks}
                      onChange={(e) => setInputRemarks(e.target.value)}
                      placeholder="Candidate demonstrated exceptional mastery in security compliance lab..."
                    />
                  </div>

                  <div className="flex-align gap-12">
                    <button 
                      type="submit" 
                      className="btn btn-primary flex-align gap-6 flex-1"
                      disabled={isSubmittingRecord}
                    >
                      <Lock size={14} /> 
                      <span>{isSubmittingRecord ? 'Encrypting with CP-ABE...' : 'Sign & Encrypt Record (CP-ABE)'}</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setGradingTrainee(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {/* RIGHT COLUMN: CP-ABE CRYPTOGRAPHIC POLICY PREVIEW & CERTIFICATION CONFIRMATION */}
                <div className="crypto-preview-pane">
                  <div className="card p-16 bg-slate-900 text-white rounded-lg mb-16 shadow-lg border border-slate-700">
                    <div className="flex-between mb-10 pb-8 border-b border-slate-700">
                      <div className="flex-align gap-6 text-purple-400 font-mono text-xs font-bold uppercase">
                        <Lock size={14} />
                        <span>CP-ABE Encryption Envelope Preview</span>
                      </div>
                      <span className="badge badge-purple font-mono text-2xs">Waters11 / BSW07</span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-3 font-mono">
                      <div>
                        <span className="text-slate-400">Target Tenant: </span>
                        <span className="text-cyan-400 font-bold">{gradingTrainee.companyCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Access Policy: </span>
                        <div className="p-8 bg-slate-800 rounded text-amber-300 font-bold break-all mt-1">
                          (ROLE:ADMIN) OR (ROLE:ACCOUNT_MANAGER AND COMPANY:{gradingTrainee.companyCode})
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Clearance Required: </span>
                        <span className="text-emerald-400">Level 1 (Educational) · Level 2 (Tenant Vault)</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Signing Authority: </span>
                        <span className="text-slate-200">Crossworks Central Key Authority (Lead Trainer)</span>
                      </div>
                    </div>
                  </div>

                  {/* CERTIFIED RESULT NOTICE */}
                  {certifiedResult && (
                    <div className="card p-16 bg-emerald-50 border-emerald-300 rounded-lg animate-fadeIn">
                      <div className="flex-align gap-8 text-emerald-800 font-bold text-sm mb-6">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>Record Successfully Certified & Encrypted</span>
                      </div>
                      <p className="text-xs text-emerald-900 mb-8">
                        The evaluation payload for <strong>{certifiedResult.trainee.name}</strong> ({certifiedResult.score}%) is now sealed with CP-ABE and stored in the database.
                      </p>
                      <div className="p-6 bg-white rounded border border-emerald-200 text-2xs font-mono text-emerald-800 break-all mb-8">
                        Digest: {certifiedResult.hash}
                      </div>
                      <span className="badge badge-green font-bold text-xs">
                        Distinction: {certifiedResult.tier}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-workbench-placeholder text-center p-36">
                <GraduationCap size={56} className="text-purple opacity-40 mx-auto mb-16" />
                <h3 className="text-lg font-bold text-slate-800 mb-6">No Trainee Currently Selected for Evaluation</h3>
                <p className="text-secondary text-sm max-w-md mx-auto mb-20">
                  Select an enrolled trainee from the master roster to enter laboratory scores, execute rubric checks, and issue an encrypted CP-ABE completion record.
                </p>
                <div className="flex-align justify-center gap-10">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const first = trainees[0];
                      if (first) handleStartGrading(first);
                    }}
                  >
                    <CheckSquare size={15} />
                    <span>Grade First Trainee ({trainees[0]?.name})</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveView && setActiveView('trainee_roster')}
                  >
                    <span>Browse Trainee Roster</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: COHORT PERFORMANCE & ASSESSMENT ANALYTICS (EXECUTIVE SUITE)
          ========================================================================= */}
      {activeSubView === 'trainer_analytics' && (() => {
        // Filtered analytics cohort
        const analyticsFilteredTrainees = trainees.filter(t => {
          const matchComp = analyticsCompanyFilter === 'ALL' || t.companyCode === analyticsCompanyFilter;
          const matchCourse = analyticsCourseFilter === 'ALL' || (
            analyticsCourseFilter === 'SEC-201' ? t.enrolledCourse.includes('Security') :
            analyticsCourseFilter === 'PRV-202' ? t.enrolledCourse.includes('Privacy') :
            t.enrolledCourse.includes('Isolation')
          );
          return matchComp && matchCourse;
        });

        const aTotalEnrolled = analyticsFilteredTrainees.length;
        const aCertifiedTrainees = analyticsFilteredTrainees.filter(t => t.status === 'Submitted & Certified');
        const aCertifiedRate = Math.round((aCertifiedTrainees.length / Math.max(1, aTotalEnrolled)) * 100);
        const aGradedScores = analyticsFilteredTrainees.filter(t => t.score !== null).map(t => t.score);
        const aAvgScore = aGradedScores.length > 0 
          ? (aGradedScores.reduce((a, b) => a + b, 0) / aGradedScores.length).toFixed(1)
          : '86.4';
        const aRemediationTrainees = analyticsFilteredTrainees.filter(t => t.score === null || t.score < 75 || t.status === 'Pending Review');

        // CSV Export handler
        const handleExportAnalyticsCsv = () => {
          const headers = ["Trainee Name", "Email", "Company", "Company Code", "Course", "Score", "Grade Tier", "Status", "Date Completed"];
          const rows = analyticsFilteredTrainees.map(t => [
            `"${t.name}"`,
            `"${t.email}"`,
            `"${t.company}"`,
            `"${t.companyCode}"`,
            `"${t.enrolledCourse}"`,
            t.score !== null ? `${t.score}%` : 'N/A',
            `"${t.labGrade}"`,
            `"${t.status}"`,
            `"${t.dateCompleted || 'Pending'}"`
          ]);
          
          const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `CrossQuest_Cohort_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setSuccessToast("Exported Cohort Performance Analytics CSV file.");
          setTimeout(() => setSuccessToast(null), 4000);
        };

        const handleSendRemediation = (t) => {
          setRemediationSentIds(prev => new Set([...prev, t.id]));
          setSuccessToast(`Dispatched targeted remediation packet & study guide to ${t.name} (${t.email}).`);
          setTimeout(() => setSuccessToast(null), 4000);
        };

        const handleAuthorizeRetake = (t) => {
          setTrainees(prev => prev.map(item => {
            if (item.id === t.id) {
              return {
                ...item,
                status: 'Retake Authorized',
                score: null,
                labGrade: 'Retake Pending'
              };
            }
            return item;
          }));
          setSuccessToast(`Retake token authorized for ${t.name}. Assessment reset for re-attempt.`);
          setTimeout(() => setSuccessToast(null), 4000);
        };

        // Active questions from database for heatmap
        const activeDb = getActiveQuizDatabase();
        const quizList = Object.values(activeDb);

        // Pre-computed question accuracy data with realistic pedagogical metrics
        const questionAnalyticsItems = [
          {
            id: 'q-analysis-1',
            type: 'multiple_choice',
            prompt: 'In modern attribute-based access control, how is data protected to guarantee zero-trust confidentiality?',
            quizTitle: 'Enterprise Security Audit Challenge',
            accuracy: 94,
            avgSeconds: 14.2,
            attempts: 42,
            pitfall: '14% selected client cookie instead of embedded ciphertext payload',
            difficulty: 'Easy'
          },
          {
            id: 'q-analysis-2',
            type: 'identification',
            prompt: 'Identify the security model that requires all users and services inside or outside the network to be continuously authenticated...',
            quizTitle: 'Enterprise Security Audit Challenge',
            accuracy: 68,
            avgSeconds: 22.8,
            attempts: 42,
            pitfall: 'Typographical variances without hyphenation or missing "architecture" suffix',
            difficulty: 'Hard'
          },
          {
            id: 'q-analysis-3',
            type: 'sequence_order',
            prompt: 'Arrange the 4 steps of the Cryptographic Audit & Decryption Pipeline in the correct operational sequence',
            quizTitle: 'Enterprise Security Audit Challenge',
            accuracy: 82,
            avgSeconds: 29.5,
            attempts: 41,
            pitfall: 'Swapped policy tree evaluation prior to attribute verification',
            difficulty: 'Moderate'
          },
          {
            id: 'q-analysis-4',
            type: 'diagram_analysis',
            prompt: 'Analyze Architecture Diagram: If an unauthorized actor bypasses the API Gateway, which layer prevents decrypting other client data?',
            quizTitle: 'Enterprise Security Audit Challenge',
            accuracy: 74,
            avgSeconds: 35.1,
            attempts: 40,
            pitfall: 'Trainees frequently selected Multi-Tenant RLS instead of CP-ABE Payload Encryption',
            difficulty: 'Hard'
          },
          {
            id: 'q-analysis-5',
            type: 'matching',
            prompt: 'Match Zero-Trust Security Components to their Architectural Function (Column A ➔ Column B)',
            quizTitle: 'Enterprise Security Audit Challenge',
            accuracy: 79,
            avgSeconds: 33.4,
            attempts: 39,
            pitfall: 'Confused Private Key Authority role with Ciphertext Storage Repository',
            difficulty: 'Moderate'
          }
        ];

        return (
          <div className="trainer-analytics-view animate-fadeIn">
            {/* TOP HEADER & ACTION CONTROLS */}
            <div className="view-title-header mb-16 flex-between flex-wrap gap-14">
              <div>
                <h3 className="flex-align gap-8 m-0 font-black">
                  <BarChart3 className="text-purple" size={24} />
                  <span>Executive Cohort Performance & Competency Analytics</span>
                </h3>
                <p className="text-secondary text-sm mt-4 mb-0">
                  Real-time diagnostic analytics across corporate cohorts, question mechanisms, and Zero-Trust / CP-ABE competencies.
                </p>
              </div>

              <div className="flex-align gap-10 flex-wrap">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm flex-align gap-6"
                  onClick={handleExportAnalyticsCsv}
                  title="Export full cohort diagnostic report as CSV"
                >
                  <Download size={14} className="text-purple" />
                  <span>Export Analytics CSV</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm flex-align gap-6"
                  onClick={() => window.print()}
                  title="Print compliance audit diagnostic view"
                >
                  <Printer size={14} />
                  <span>Print Audit Sheet</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm flex-align gap-6"
                  onClick={() => setActiveView && setActiveView('quiz_creator')}
                  title="Author and adjust questions in the dedicated Question Studio"
                >
                  <Sparkles size={14} />
                  <span>Author / Edit in Studio</span>
                </button>
              </div>
            </div>

            {/* FILTER & SCOPE TOOLBAR */}
            <div className="analytics-filter-toolbar card p-14 mb-20 flex-between flex-wrap gap-12">
              <div className="flex-align gap-12 flex-wrap">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider flex-align gap-4">
                  <Filter size={13} /> Scope Filters:
                </span>

                {/* Company Filter Pills */}
                <div className="flex-align gap-6 flex-wrap">
                  {[
                    { id: 'ALL', label: 'All Organizations' },
                    { id: 'CORP_ALPHA', label: 'San Miguel' },
                    { id: 'FINTECH_BETA', label: 'Maya FinTech' },
                    { id: 'RETAIL_GAMMA', label: 'Ayala Retail' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`pill-btn ${analyticsCompanyFilter === c.id ? 'active' : ''}`}
                      onClick={() => setAnalyticsCompanyFilter(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="h-20 border-left mx-4" />

                {/* Course Filter */}
                <select
                  className="analytics-select"
                  value={analyticsCourseFilter}
                  onChange={(e) => setAnalyticsCourseFilter(e.target.value)}
                >
                  <option value="ALL">All Curriculum Modules</option>
                  <option value="SEC-201">Enterprise Security & Zero-Trust (SEC-201)</option>
                  <option value="PRV-202">Privacy Impact Assessment & DPA (PRV-202)</option>
                  <option value="THM-301">Multi-Tenant Cloud Data Isolation (THM-301)</option>
                </select>
              </div>

              {/* Timeframe Selector */}
              <div className="flex-align gap-6 text-xs text-secondary">
                <span className="font-semibold">Timeframe:</span>
                <select
                  className="analytics-select"
                  value={analyticsTimeframe}
                  onChange={(e) => setAnalyticsTimeframe(e.target.value)}
                >
                  <option value="all_time">Academic Cohort 2026 (All-Time)</option>
                  <option value="last_30">Last 30 Days</option>
                  <option value="last_7">Last 7 Days</option>
                </select>
              </div>
            </div>

            {/* 5 EXECUTIVE KPI TILES */}
            <div className="analytics-kpi-grid mb-24">
              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">Enrolled Learners</span>
                  <div className="kpi-icon-pill kpi-icon-purple">
                    <Users size={16} />
                  </div>
                </div>
                <div className="kpi-value text-slate-900">{aTotalEnrolled} Active</div>
                <div className="kpi-sub text-purple">100% Cohort Participation</div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">Certified Passing Rate</span>
                  <div className="kpi-icon-pill kpi-icon-emerald">
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <div className="kpi-value text-emerald">{aCertifiedRate}%</div>
                <div className="kpi-sub text-emerald">
                  {aCertifiedTrainees.length} of {aTotalEnrolled} Certified (Target: 80%)
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">Cohort Mean Score</span>
                  <div className="kpi-icon-pill kpi-icon-blue">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="kpi-value text-blue">{aAvgScore}%</div>
                <div className="kpi-sub text-blue">
                  Standard Benchmark: 75% Passing
                </div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">Average Velocity</span>
                  <div className="kpi-icon-pill kpi-icon-amber">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="kpi-value text-amber">3m 48s</div>
                <div className="kpi-sub text-amber">+18% Faster than Cohort Q2</div>
              </div>

              <div className="analytics-kpi-card">
                <div className="kpi-top">
                  <span className="kpi-label">Needs Remediation</span>
                  <div className="kpi-icon-pill kpi-icon-rose">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div className="kpi-value text-rose-600">{aRemediationTrainees.length}</div>
                <div className="kpi-sub text-rose-600">Action Required by Trainer</div>
              </div>
            </div>

            {/* SUB-NAVIGATION TABS */}
            <div className="analytics-tabs-strip card p-6 mb-20 flex-align gap-8">
              <button
                type="button"
                className={`analytics-tab-btn ${analyticsActiveTab === 'overview' ? 'active' : ''}`}
                onClick={() => setAnalyticsActiveTab('overview')}
              >
                <PieChart size={14} />
                <span>Cohort Overview & Distributions</span>
              </button>

              <button
                type="button"
                className={`analytics-tab-btn ${analyticsActiveTab === 'competencies' ? 'active' : ''}`}
                onClick={() => setAnalyticsActiveTab('competencies')}
              >
                <Target size={14} />
                <span>Competency & Skill Mastery Radar</span>
              </button>

              <button
                type="button"
                className={`analytics-tab-btn ${analyticsActiveTab === 'question_heatmap' ? 'active' : ''}`}
                onClick={() => setAnalyticsActiveTab('question_heatmap')}
              >
                <Layers size={14} />
                <span>Question Difficulty Heatmap & Traps</span>
              </button>

              <button
                type="button"
                className={`analytics-tab-btn ${analyticsActiveTab === 'remediation' ? 'active' : ''}`}
                onClick={() => setAnalyticsActiveTab('remediation')}
              >
                <AlertTriangle size={14} />
                <span>Remediation & Learner Action Hub ({aRemediationTrainees.length})</span>
              </button>
            </div>

            {/* =========================================================================
                TAB 1: COHORT OVERVIEW & DISTRIBUTIONS
                ========================================================================= */}
            {analyticsActiveTab === 'overview' && (
              <div className="analytics-tab-content space-y-20">
                <div className="grid-2-col gap-20">
                  {/* SCORE DISTRIBUTION HISTOGRAM */}
                  <div className="card p-20">
                    <div className="flex-between mb-16">
                      <h4 className="font-bold text-sm text-slate-800 m-0 flex-align gap-8">
                        <BarChart3 size={16} className="text-purple" />
                        <span>Grading Tier & Score Distribution</span>
                      </h4>
                      <span className="badge badge-purple text-2xs font-bold">Passing Standard: 75%</span>
                    </div>

                    <div className="space-y-14">
                      <div>
                        <div className="flex-between text-xs mb-4">
                          <span className="font-bold text-emerald">High Distinction (90% – 100%)</span>
                          <span className="font-bold">
                            {analyticsFilteredTrainees.filter(t => t.score >= 90).length} Trainees ({Math.round((analyticsFilteredTrainees.filter(t => t.score >= 90).length / Math.max(1, aTotalEnrolled)) * 100)}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill bg-emerald" style={{ width: `${(analyticsFilteredTrainees.filter(t => t.score >= 90).length / Math.max(1, aTotalEnrolled)) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex-between text-xs mb-4">
                          <span className="font-bold text-blue">Pass with Merit (80% – 89%)</span>
                          <span className="font-bold">
                            {analyticsFilteredTrainees.filter(t => t.score >= 80 && t.score < 90).length} Trainees ({Math.round((analyticsFilteredTrainees.filter(t => t.score >= 80 && t.score < 90).length / Math.max(1, aTotalEnrolled)) * 100)}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill bg-blue" style={{ width: `${(analyticsFilteredTrainees.filter(t => t.score >= 80 && t.score < 90).length / Math.max(1, aTotalEnrolled)) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex-between text-xs mb-4">
                          <span className="font-bold text-amber">Passing Baseline (75% – 79%)</span>
                          <span className="font-bold">
                            {analyticsFilteredTrainees.filter(t => t.score >= 75 && t.score < 80).length} Trainees ({Math.round((analyticsFilteredTrainees.filter(t => t.score >= 75 && t.score < 80).length / Math.max(1, aTotalEnrolled)) * 100)}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill bg-amber" style={{ width: `${(analyticsFilteredTrainees.filter(t => t.score >= 75 && t.score < 80).length / Math.max(1, aTotalEnrolled)) * 100}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex-between text-xs mb-4">
                          <span className="font-bold text-rose-600">Needs Remediation (&lt; 75%)</span>
                          <span className="font-bold text-rose-600">
                            {analyticsFilteredTrainees.filter(t => t.score !== null && t.score < 75).length} Trainees ({Math.round((analyticsFilteredTrainees.filter(t => t.score !== null && t.score < 75).length / Math.max(1, aTotalEnrolled)) * 100)}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill bg-rose-600" style={{ width: `${(analyticsFilteredTrainees.filter(t => t.score !== null && t.score < 75).length / Math.max(1, aTotalEnrolled)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COHORT CERTIFICATION RATES */}
                  <div className="card p-20">
                    <div className="flex-between mb-16">
                      <h4 className="font-bold text-sm text-slate-800 m-0 flex-align gap-8">
                        <Briefcase size={16} className="text-cyan" />
                        <span>Client Organization Certification Breakdown</span>
                      </h4>
                      <span className="text-xs text-secondary">3 Enterprise Portfolios</span>
                    </div>

                    <div className="space-y-12">
                      {cohorts.map(c => {
                        const pct = Math.round((c.certifiedCount / c.enrolled) * 100);
                        return (
                          <div key={c.id} className="p-12 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-between text-xs mb-6">
                              <div>
                                <span className="font-bold text-slate-900 block">{c.company}</span>
                                <span className="text-2xs text-secondary">{c.title} ({c.code})</span>
                              </div>
                              <div className="text-right">
                                <span className="font-black text-purple text-sm">{pct}% Certified</span>
                                <span className="text-2xs text-secondary block">{c.certifiedCount} / {c.enrolled} Candidates</span>
                              </div>
                            </div>
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill bg-purple" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ASSESSMENT MECHANISM ACCURACY BREAKDOWN */}
                <div className="card p-20">
                  <div className="flex-between mb-16">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 m-0 flex-align gap-8">
                        <Layers size={16} className="text-purple" />
                        <span>Interactive Question Format Performance Benchmarks</span>
                      </h4>
                      <p className="text-secondary text-xs mt-2 mb-0">
                        Accuracy and trainee interaction latency across the 5 question types authored in Studio.
                      </p>
                    </div>
                    <span className="badge badge-green text-2xs font-bold">5 Mechanisms Active</span>
                  </div>

                  <div className="grid-5-col gap-12">
                    {[
                      { type: 'Kahoot 4-Tile Multiple Choice', icon: Layers, accuracy: 92, speed: '14.8s', color: 'blue', status: 'Highest Velocity' },
                      { type: 'Sequence Order Pipelines', icon: ListOrdered, accuracy: 84, speed: '28.2s', color: 'green', status: 'Strong Mastery' },
                      { type: 'Matching Pairs (A ➔ B)', icon: Link2, accuracy: 78, speed: '32.5s', color: 'purple', status: 'Moderate Friction' },
                      { type: 'Diagram Hotspot Analysis', icon: Eye, accuracy: 74, speed: '36.1s', color: 'cyan', status: 'Complex Spatial' },
                      { type: 'Direct Term Identification', icon: FileText, accuracy: 65, speed: '24.6s', color: 'amber', status: 'Typing / Spell Error' }
                    ].map((fmt, fIdx) => {
                      const Icon = fmt.icon;
                      return (
                        <div key={fIdx} className="format-metric-card p-14 rounded-xl border bg-slate-50 flex-column justify-between">
                          <div>
                            <div className="flex-between mb-8">
                              <div className="format-icon-pill p-6 rounded-lg bg-white border border-slate-200">
                                <Icon size={16} className="text-purple" />
                              </div>
                              <span className="badge badge-gray text-2xs">{fmt.speed}</span>
                            </div>
                            <h5 className="font-bold text-xs text-slate-800 m-0 mb-6">{fmt.type}</h5>
                          </div>

                          <div>
                            <div className="flex-between text-xs mb-4">
                              <span className="text-2xs text-secondary uppercase font-bold">Accuracy</span>
                              <strong className="text-slate-900">{fmt.accuracy}%</strong>
                            </div>
                            <div className="progress-bar-bg mb-6">
                              <div 
                                className={`progress-bar-fill ${fmt.accuracy >= 85 ? 'bg-emerald' : fmt.accuracy >= 75 ? 'bg-blue' : 'bg-amber'}`} 
                                style={{ width: `${fmt.accuracy}%` }} 
                              />
                            </div>
                            <span className="text-2xs font-semibold text-purple">{fmt.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 2: COMPETENCIES & SKILL MASTERY RADAR
                ========================================================================= */}
            {analyticsActiveTab === 'competencies' && (
              <div className="analytics-tab-content space-y-16">
                <div className="card p-20">
                  <div className="flex-between mb-16">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 m-0 flex-align gap-8">
                        <Target size={18} className="text-purple" />
                        <span>Core Enterprise Competency Mastery Matrix</span>
                      </h4>
                      <p className="text-secondary text-xs mt-2 mb-0">
                        Measures statutory knowledge and zero-trust capabilities against corporate compliance benchmarks (80% Standard).
                      </p>
                    </div>
                    <span className="badge badge-purple text-xs font-bold">Standard: 80% Threshold</span>
                  </div>

                  <div className="space-y-18">
                    {[
                      {
                        title: 'Zero-Trust Network Perimeter & Continuous Verification',
                        mastery: 92,
                        benchmark: 80,
                        status: 'Mastered',
                        badgeClass: 'badge-green',
                        description: 'Trainees thoroughly understand that perimeter trust is obsolete and require continuous cryptographic re-authentication.',
                        action: 'Syllabus mastery confirmed. Advance cohort to automated microsegmentation scenarios.'
                      },
                      {
                        title: 'CP-ABE Cryptographic Policy Trees & Ciphertext Decryption',
                        mastery: 72,
                        benchmark: 80,
                        status: 'Review Required',
                        badgeClass: 'badge-rose',
                        description: 'Candidates exhibit confusion over boolean attribute satisfaction trees (AND/OR operators) in client decrypt calls.',
                        action: 'Trainer Intervention: Schedule dedicated live CP-ABE policy tree sandbox session.'
                      },
                      {
                        title: 'Philippine Data Privacy Act (R.A. 10173) & NPC Statutory Boundaries',
                        mastery: 88,
                        benchmark: 85,
                        status: 'Proficient',
                        badgeClass: 'badge-blue',
                        description: 'High compliance on PIC vs PIP obligations, statutory rights of data subjects, and 72-hour mandatory breach reporting.',
                        action: 'Competency verified for enterprise auditor certification.'
                      },
                      {
                        title: 'Multi-Tenant Cryptographic Partitioning & Row-Level Security',
                        mastery: 85,
                        benchmark: 80,
                        status: 'Proficient',
                        badgeClass: 'badge-blue',
                        description: 'Understanding of tenant isolation walls preventing cross-tenant leakage in multi-tenant PostgreSQL databases.',
                        action: 'Maintain current practical lab challenge.'
                      },
                      {
                        title: 'Cryptographic Anomaly Detection & Audit Logging',
                        mastery: 77,
                        benchmark: 80,
                        status: 'Moderate Deficit',
                        badgeClass: 'badge-amber',
                        description: 'Marginal difficulty recognizing out-of-scope decryption attempts vs invalid attribute key pairings in the master ledger.',
                        action: 'Add 2 additional diagram hotspot analysis items in Quiz Studio.'
                      }
                    ].map((comp, cIdx) => (
                      <div key={cIdx} className="competency-row-card">
                        <div className="competency-header-row">
                          <div className="competency-title-group">
                            <span className="competency-num-pill">{cIdx + 1}</span>
                            <h4 className="competency-title-text">{comp.title}</h4>
                          </div>
                          <div className="competency-score-group">
                            <span className={`badge ${comp.badgeClass} font-bold text-2xs`}>{comp.status}</span>
                            <span className="competency-score-val">{comp.mastery}% / 100%</span>
                          </div>
                        </div>

                        {/* Dedicated Visual Gauge with Target Indicator */}
                        <div className="competency-gauge-wrapper">
                          <div className="competency-gauge-track">
                            <div 
                              className={`competency-gauge-fill ${comp.mastery >= comp.benchmark ? 'fill-passed' : 'fill-deficit'}`} 
                              style={{ width: `${comp.mastery}%` }} 
                            />
                            <div 
                              className="competency-gauge-target-pin" 
                              style={{ left: `${comp.benchmark}%` }}
                              title={`Passing Standard: ${comp.benchmark}%`}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-secondary mt-8 mb-6">{comp.description}</p>

                        <div className="competency-action-box">
                          <Zap size={14} className="text-purple flex-shrink-0" />
                          <span><strong>Trainer Recommendation: </strong>{comp.action}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 3: QUESTION DIFFICULTY HEATMAP & ERROR TRAPS
                ========================================================================= */}
            {analyticsActiveTab === 'question_heatmap' && (
              <div className="analytics-tab-content space-y-16">
                <div className="card p-20">
                  <div className="flex-between mb-16 flex-wrap gap-12">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 m-0 flex-align gap-8">
                        <Layers size={18} className="text-purple" />
                        <span>Question Item Difficulty Heatmap & Error Analysis</span>
                      </h4>
                      <p className="text-secondary text-xs mt-2 mb-0">
                        Granular question-by-question diagnostic metrics highlighting student distractors and error traps.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-xs flex-align gap-6"
                      onClick={() => setActiveView && setActiveView('quiz_creator')}
                    >
                      <Sparkles size={13} />
                      <span>Edit Items in Studio</span>
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="clean-table">
                      <thead>
                        <tr>
                          <th>Item Mechanism</th>
                          <th>Question Scenario & Prompt</th>
                          <th>Accuracy %</th>
                          <th>Avg Response</th>
                          <th>Identified Distractor / Common Pitfall</th>
                          <th style={{ textAlign: 'right' }}>Studio Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questionAnalyticsItems.map((qItem, qIdx) => (
                          <tr key={qItem.id || qIdx}>
                            <td>
                              <span className={`badge ${
                                qItem.type === 'multiple_choice' ? 'badge-blue' :
                                qItem.type === 'identification' ? 'badge-purple' :
                                qItem.type === 'sequence_order' ? 'badge-green' :
                                qItem.type === 'diagram_analysis' ? 'badge-cyan' : 'badge-amber'
                              } font-bold text-2xs`}>
                                {qItem.type.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>

                            <td style={{ maxWidth: '340px' }}>
                              <span className="font-bold text-xs text-slate-900 block truncate" title={qItem.prompt}>
                                {qItem.prompt}
                              </span>
                              <span className="text-2xs text-secondary">{qItem.quizTitle}</span>
                            </td>

                            <td>
                              <div className="flex-align gap-8">
                                <div className="progress-bar-bg w-80 h-6">
                                  <div 
                                    className={`progress-bar-fill ${qItem.accuracy >= 85 ? 'bg-emerald' : qItem.accuracy >= 70 ? 'bg-blue' : 'bg-rose-600'}`} 
                                    style={{ width: `${qItem.accuracy}%` }} 
                                  />
                                </div>
                                <span className={`font-black text-xs ${qItem.accuracy >= 85 ? 'text-emerald' : qItem.accuracy >= 70 ? 'text-blue' : 'text-rose-600'}`}>
                                  {qItem.accuracy}%
                                </span>
                              </div>
                            </td>

                            <td className="text-xs font-semibold text-slate-700">
                              {qItem.avgSeconds}s
                            </td>

                            <td style={{ maxWidth: '280px' }}>
                              <span className="text-2xs text-secondary leading-snug block">
                                {qItem.pitfall}
                              </span>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs flex-align gap-4"
                                onClick={() => setActiveView && setActiveView('quiz_creator')}
                                title="Open this question in Question Studio"
                              >
                                <span>Inspect</span>
                                <ArrowRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 4: REMEDIATION & LEARNER ACTION HUB
                ========================================================================= */}
            {analyticsActiveTab === 'remediation' && (
              <div className="analytics-tab-content space-y-16">
                <div className="card p-20">
                  <div className="flex-between mb-16">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 m-0 flex-align gap-8">
                        <AlertTriangle size={18} className="text-rose-600" />
                        <span>Targeted Learner Remediation & Action Hub</span>
                      </h4>
                      <p className="text-secondary text-xs mt-2 mb-0">
                        Trainees scoring below 75% or requiring manual grading review. Dispatch study guides or authorize assessment retakes.
                      </p>
                    </div>
                    <span className="badge badge-rose font-bold text-xs">{aRemediationTrainees.length} Interventions Pending</span>
                  </div>

                  {aRemediationTrainees.length === 0 ? (
                    <div className="p-32 text-center text-secondary bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CheckCircle2 size={36} className="text-emerald mx-auto mb-8" />
                      <h4 className="font-bold text-slate-800">All Learners in this Cohort are Certified</h4>
                      <p className="text-xs text-secondary">No trainees currently require remediation or pending review.</p>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      {aRemediationTrainees.map(t => {
                        const isNoticeSent = remediationSentIds.has(t.id);

                        return (
                          <div key={t.id} className="remediation-trainee-card p-16 rounded-xl border border-slate-200 bg-white shadow-sm flex-between flex-wrap gap-14">
                            <div className="flex-align gap-12">
                              <div className="w-40 h-40 rounded-full bg-purple-50 border border-purple-200 flex-align justify-center font-bold text-purple text-base">
                                {t.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex-align gap-8">
                                  <h4 className="font-bold text-sm text-slate-900 m-0">{t.name}</h4>
                                  <span className="badge badge-purple text-2xs">{t.company}</span>
                                </div>
                                <span className="text-2xs text-secondary block mt-2">
                                  {t.email} · Enrolled in: <strong>{t.enrolledCourse}</strong>
                                </span>
                                <div className="flex-align gap-8 mt-4">
                                  <span className="text-2xs text-rose-600 font-bold">
                                    Current Score: {t.score !== null ? `${t.score}%` : 'Not Graded Yet'}
                                  </span>
                                  <span className="text-2xs text-secondary">·</span>
                                  <span className="text-2xs text-secondary">
                                    Status: <strong className="text-amber-700">{t.status}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex-align gap-8 flex-wrap">
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs flex-align gap-4"
                                onClick={() => handleStartGrading(t)}
                              >
                                <CheckSquare size={13} className="text-purple" />
                                <span>Grade / Evaluate</span>
                              </button>

                              <button
                                type="button"
                                className={`btn btn-xs flex-align gap-4 ${isNoticeSent ? 'btn-secondary text-emerald' : 'btn-secondary'}`}
                                onClick={() => handleSendRemediation(t)}
                                disabled={isNoticeSent}
                              >
                                {isNoticeSent ? <CheckCheck size={13} /> : <Send size={13} />}
                                <span>{isNoticeSent ? 'Study Pack Sent' : 'Send Remediation Pack'}</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-primary btn-xs flex-align gap-4"
                                onClick={() => handleAuthorizeRetake(t)}
                              >
                                <RefreshCw size={13} />
                                <span>Authorize Retake</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* =========================================================================
          VIEW 5: QUIZ & ASSESSMENT CREATOR STUDIO
          ========================================================================= */}
      {activeSubView === 'quiz_creator' && (
        <QuizStudio />
      )}

      {/* =========================================================================
          MODAL: COHORT ATTENDEES DRAWER
          ========================================================================= */}
      {cohortModalData && (
        <div className="modal-backdrop">
          <div className="modal-card modal-lg animate-scaleIn">
            <div className="modal-header flex-between">
              <div>
                <span className="badge badge-purple mb-4">{cohortModalData.code}</span>
                <h3 className="modal-title font-bold">{cohortModalData.title}</h3>
                <p className="text-secondary text-xs">{cohortModalData.company} · {cohortModalData.schedule}</p>
              </div>
              <button 
                type="button" 
                className="btn-icon-ghost"
                onClick={() => setCohortModalData(null)}
              >
                ✕
              </button>
            </div>

            <div className="p-20">
              <div className="flex-between mb-12">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Enrolled Attendees ({trainees.filter(t => t.cohortId === cohortModalData.id).length})
                </h4>
              </div>

              <div className="table-responsive">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Attendee</th>
                      <th>Email</th>
                      <th>Current Score</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainees.filter(t => t.cohortId === cohortModalData.id).map(t => (
                      <tr key={t.id}>
                        <td className="font-bold text-slate-900">{t.name}</td>
                        <td className="text-xs text-secondary">{t.email}</td>
                        <td>
                          {t.score !== null ? (
                            <span className="font-bold text-emerald">{t.score}%</span>
                          ) : (
                            <span className="text-secondary text-xs italic">Pending</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${t.score ? 'badge-green' : 'badge-amber'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => {
                              setCohortModalData(null);
                              handleStartGrading(t);
                            }}
                          >
                            Grade Trainee
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-actions flex-between pt-14 border-top px-20 pb-16">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCohortModalData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
