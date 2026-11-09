import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  CheckCircle2,
  Edit2,
  Trash2,
  RotateCcw,
  Award,
  X,
  AlertCircle,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { TablePagination, TablePaginationCompact, usePagination } from '../../components/TablePagination';
import { TableEmptyBlock } from '../../components/TableEmptyState';
import { exportAuditLogs, exportVaultRecords } from '../../api/admin';
import { 
  updateTrainingRecord, 
  deleteTrainingRecord, 
  restoreTrainingRecord, 
  reissueCertificate,
  createEncryptedRecordApi,
  fetchTrainees,
  fetchCompanies
} from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function RecordsVault({ records = [], token, onRefreshRecords }) {
  const { isDark } = useTheme();
  const [localRecords, setLocalRecords] = useState(records);
  const [recordSearch, setRecordSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [exportingAuditLogs, setExportingAuditLogs] = useState(false);
  const [exportingVaultRecords, setExportingVaultRecords] = useState(false);
  const [vaultToast, setVaultToast] = useState(null);

  // B5: Add Record Modal State
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [addTraineeId, setAddTraineeId] = useState('');
  const [addCompanyId, setAddCompanyId] = useState('');
  const [addCourseName, setAddCourseName] = useState('Cloud Infrastructure Security & Zero-Trust Defense');
  const [addStatus, setAddStatus] = useState('In progress');
  const [addScore, setAddScore] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [traineeList, setTraineeList] = useState([]);
  const [companyList, setCompanyList] = useState([]);

  // Load dropdown datasets
  useEffect(() => {
    if (token) {
      fetchTrainees(token).then(tr => { if (tr && tr.length > 0) setTraineeList(tr); }).catch(() => {});
      fetchCompanies(token).then(cp => { if (cp && cp.length > 0) setCompanyList(cp); }).catch(() => {});
    }
  }, [token]);

  // Sync with prop updates
  useEffect(() => {
    if (records) setLocalRecords(records);
  }, [records]);

  // U-05: Edit / Correct Record Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState('In progress');
  const [editScore, setEditScore] = useState('');
  const [editAttendance, setEditAttendance] = useState('Present');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Certificate Reissue Modal State
  const [reissuingRecord, setReissuingRecord] = useState(null);
  const [reissueReason, setReissueReason] = useState('');
  const [reissueLoading, setReissueLoading] = useState(false);
  const [reissueError, setReissueError] = useState(null);

  const filteredRecords = useMemo(() => {
    let list = localRecords || [];
    if (!showDeleted) {
      list = list.filter(r => !r.deleted_at);
    }
    if (!recordSearch) return list;
    const q = recordSearch.toLowerCase();
    return list.filter(r =>
      (r.trainee && r.trainee.toLowerCase().includes(q)) ||
      (r.course && r.course.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.org && r.org.toLowerCase().includes(q))
    );
  }, [localRecords, recordSearch, showDeleted]);

  const {
    currentPage: recordPage,
    setCurrentPage: setRecordPage,
    paginatedItems: pagedRecords,
    totalItems: totalRecords
  } = usePagination(filteredRecords, 4);

  // U-05: Handle Save Record Correction
  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditStatus(rec.status || 'In progress');
    setEditScore(rec.score != null ? rec.score : '');
    setEditAttendance(rec.attendance_status || 'Present');
    setEditReason(''); // Mandatory reason starts empty!
    setEditError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editReason || !editReason.trim()) {
      setEditError('A mandatory explanation reason must be provided for record modifications (U-05).');
      return;
    }

    setEditLoading(true);
    setEditError(null);
    try {
      const payload = {
        status: editStatus,
        attendance_status: editAttendance,
        score: editScore !== '' ? parseFloat(editScore) : null,
        reason: editReason.trim()
      };
      await updateTrainingRecord(editingRecord.id, payload, token);
      
      setLocalRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...payload } : r));
      setVaultToast({ type: 'success', text: `Record ${editingRecord.id} successfully updated with audit log.` });
      setEditingRecord(null);
      onRefreshRecords?.();
    } catch (err) {
      setEditError(err.message || 'Failed to update record.');
    } finally {
      setEditLoading(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  // U-07: Soft-delete record
  const handleDeleteRecord = async (rec) => {
    if (!window.confirm(`Are you sure you want to soft-delete record ${rec.id}? This will trigger an immediate high-severity security alert.`)) {
      return;
    }
    try {
      await deleteTrainingRecord(rec.id, token);
      setLocalRecords(prev => prev.map(r => r.id === rec.id ? { ...r, deleted_at: new Date().toISOString() } : r));
      setVaultToast({ type: 'success', text: `Record ${rec.id} soft-deleted. Audit event logged (U-07).` });
      onRefreshRecords?.();
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Failed to delete record.' });
    } finally {
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  // U-07: Restore record
  const handleRestoreRecord = async (rec) => {
    try {
      await restoreTrainingRecord(rec.id, token);
      setLocalRecords(prev => prev.map(r => r.id === rec.id ? { ...r, deleted_at: null } : r));
      setVaultToast({ type: 'success', text: `Record ${rec.id} restored successfully (U-07).` });
      onRefreshRecords?.();
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Failed to restore record.' });
    } finally {
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  // Certificate Reissue
  const handleOpenReissue = (rec) => {
    setReissuingRecord(rec);
    setReissueReason('');
    setReissueError(null);
  };

  const handleSaveReissue = async (e) => {
    e.preventDefault();
    if (!reissueReason || !reissueReason.trim()) {
      setReissueError('A valid, non-empty reason is mandatory for certificate reissue.');
      return;
    }

    setReissueLoading(true);
    setReissueError(null);
    try {
      const certId = reissuingRecord.certificate_id || reissuingRecord.id;
      await reissueCertificate(certId, { reason: reissueReason.trim() }, token);
      setVaultToast({ type: 'success', text: `Certificate reissued for ${reissuingRecord.trainee} with audit trail.` });
      setReissuingRecord(null);
      onRefreshRecords?.();
    } catch (err) {
      setReissueError(err.message || 'Failed to reissue certificate.');
    } finally {
      setReissueLoading(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  const handleExportAuditLogs = async () => {
    if (exportingAuditLogs) return;
    setExportingAuditLogs(true);
    setVaultToast(null);
    try {
      const ok = await exportAuditLogs(token);
      if (ok) {
        setVaultToast({ type: 'success', text: 'Master Audit Logs (CSV) exported successfully.' });
      } else {
        setVaultToast({ type: 'error', text: 'Failed to export master audit logs.' });
      }
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Export error.' });
    } finally {
      setExportingAuditLogs(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  const handleExportVaultRecords = async () => {
    if (exportingVaultRecords) return;
    setExportingVaultRecords(true);
    setVaultToast(null);
    try {
      const ok = await exportVaultRecords(token);
      if (ok) {
        setVaultToast({ type: 'success', text: 'Master Vault Training Records (CSV) exported successfully.' });
      } else {
        setVaultToast({ type: 'error', text: 'Failed to export vault records.' });
      }
    } catch (err) {
      setVaultToast({ type: 'error', text: err.message || 'Export error.' });
    } finally {
      setExportingVaultRecords(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!addTraineeId || !addCompanyId || !addCourseName.trim()) {
      setAddError('Please select a trainee, client company, and enter a course program name.');
      return;
    }

    setAddLoading(true);
    setAddError(null);
    try {
      const res = await createEncryptedRecordApi({
        trainee_id: addTraineeId,
        company_at_completion_id: addCompanyId,
        course_name: addCourseName.trim(),
        status: addStatus,
        score: addScore !== '' ? parseFloat(addScore) : null,
        assessment_notes: addNotes.trim() || undefined
      }, token);

      if (!res.ok) {
        throw new Error(res.data?.detail || 'Failed to create training record');
      }

      setVaultToast({ type: 'success', text: `Training record created successfully for course "${addCourseName.trim()}".` });
      setIsAddRecordOpen(false);
      setAddTraineeId('');
      setAddCompanyId('');
      setAddScore('');
      setAddNotes('');
      onRefreshRecords?.();
    } catch (err) {
      setAddError(err.message || 'Error creating record.');
    } finally {
      setAddLoading(false);
      setTimeout(() => setVaultToast(null), 4000);
    }
  };

  return (
    <div className="adm-vault-enclave" style={{ marginTop: '10px' }}>
      {/* Mission Command Hero Stage (Cyan/Navy cockpit stage matching Trainee Home Hero) */}
      <section className="trainee-hero-stage adm-vault-hero-stage">
        <div className="trainee-hero-content">
          <div className="trainee-hero-badge">
            <ShieldCheck size={13} className="hero-badge-icon" />
            <span>CRYPTOGRAPHIC ENCLAVE &bull; VAULT REGISTRY</span>
          </div>

          <h2 className="trainee-hero-headline">Master Record Vault</h2>
          <p className="trainee-hero-sub">
            Global store of multi-tenant cryptographic certificates and training evaluations secured with Charm CP-ABE.
          </p>

          <div className="trainee-hero-actions">
            <button
              type="button"
              className="trainee-hero-primary-btn"
              onClick={() => { setIsAddRecordOpen(true); setAddError(null); }}
              title="Create and encrypt a new training record (B5)"
            >
              <Plus size={14} />
              <span>Add Master Record</span>
            </button>

            <button
              type="button"
              className="trainee-hero-secondary-btn"
              onClick={handleExportVaultRecords}
              disabled={exportingVaultRecords}
              title="Download CSV training records vault"
            >
              <FileText size={13} className={exportingVaultRecords ? 'spin-animation' : ''} />
              <span>{exportingVaultRecords ? 'Exporting...' : 'Export Vault CSV'}</span>
            </button>

            <button
              type="button"
              className="trainee-hero-secondary-btn"
              onClick={handleExportAuditLogs}
              disabled={exportingAuditLogs}
              title="Download CSV access & security audit log"
            >
              <Download size={13} className={exportingAuditLogs ? 'spin-animation' : ''} />
              <span>{exportingAuditLogs ? 'Exporting...' : 'Export Audit Trail'}</span>
            </button>
          </div>
        </div>

        {/* 4-Cell Bento Telemetry Grid */}
        <div className="trainee-hero-metrics-panel">
          <div className="hero-metric-cell">
            <span className="metric-tag">TOTAL RECORDS</span>
            <div className="metric-num">
              {localRecords.length}
              <span className="metric-unit">RECS</span>
            </div>
            <span className="metric-sub-label">Verified ledger count</span>
          </div>

          <div className="hero-metric-cell">
            <span className="metric-tag">COMPLETED CERTIFIED</span>
            <div className="metric-num" style={{ color: '#34d399' }}>
              {localRecords.filter(r => r.status?.toUpperCase() === 'COMPLETED').length}
              <span className="metric-unit" style={{ color: '#6ee7b7' }}>DONE</span>
            </div>
            <span className="metric-sub-label">CP-ABE certs issued</span>
          </div>

          <div className="hero-metric-cell">
            <span className="metric-tag">IN-PROGRESS MODULES</span>
            <div className="metric-num" style={{ color: '#fbbf24' }}>
              {localRecords.filter(r => r.status?.toUpperCase() === 'IN_PROGRESS').length}
              <span className="metric-unit" style={{ color: '#fde68a' }}>ACTIVE</span>
            </div>
            <span className="metric-sub-label">Awaiting completion</span>
          </div>

          <div className="hero-metric-cell">
            <span className="metric-tag">TENANT ENCLAVES</span>
            <div className="metric-num" style={{ color: '#38bdf8' }}>
              {new Set(localRecords.map(r => r.org)).size}
              <span className="metric-unit" style={{ color: '#7dd3fc' }}>ORGS</span>
            </div>
            <span className="metric-sub-label">Cross-tenant boundaries</span>
          </div>
        </div>
      </section>

      {/* Main Vault Panel Container */}
      <div className="adm-panel adm-vault-panel">
        <div className="adm-panel__head adm-vault-controls">
          <div className="adm-vault-search-wrap">
            <div className="adm-search adm-vault-search">
              <Search size={15} />
              <input 
                type="text" 
                placeholder="Search by trainee, course, record ID, or organization..." 
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
              />
              {recordSearch && (
                <button 
                  type="button" 
                  onClick={() => setRecordSearch('')} 
                  className="adm-vault-clear-search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <label className="adm-vault-filter-toggle">
              <input 
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              <span>Show Soft-Deleted (U-07)</span>
            </label>
          </div>

          <div className="adm-vault-actions-group">
            <TablePaginationCompact
              currentPage={recordPage}
              totalItems={totalRecords}
              pageSize={4}
              onPageChange={setRecordPage}
            />
          </div>

          {vaultToast && (
            <div className={`adm-vault-toast ${vaultToast.type === 'success' ? 'adm-vault-toast--success' : 'adm-vault-toast--error'}`}>
              <CheckCircle2 size={14} />
              <span>{vaultToast.text}</span>
            </div>
          )}
        </div>

        <div className="adm-scroll" style={{ maxHeight: 'none', overflowY: 'visible' }}>
          <div className="adm-table adm-vault-table">
            <div className="adm-grid adm-th adm-vault-grid-header">
              <div>RECORD ID</div>
              <div>TRAINEE</div>
              <div>CLIENT ORGANIZATION</div>
              <div>COURSE PROGRAM</div>
              <div>ACCESS CONTROL POLICY</div>
              <div style={{ textAlign: 'center' }}>STATUS</div>
              <div style={{ textAlign: 'right' }}>ACTIONS</div>
            </div>

            {filteredRecords && filteredRecords.length > 0 ? (
              pagedRecords.map((r) => {
                const isDeleted = Boolean(r.deleted_at);
                const isCompleted = r.status?.toUpperCase() === 'COMPLETED';
                return (
                  <div 
                    key={r.id} 
                    className={`adm-row adm-grid adm-vault-row ${isDeleted ? 'is-deleted' : ''}`}
                  >
                    <div className="adm-vault-cell-recid">
                      <span className="adm-vault-rec-icon">
                        <FileText size={13} />
                      </span>
                      <code>{r.id}</code>
                    </div>

                    <div className="adm-person adm-vault-cell-person">
                      <div 
                        className="adm-av adm-av--sq adm-vault-avatar" 
                        style={{ 
                          background: isDeleted 
                            ? '#64748b' 
                            : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', 
                          color: '#fff' 
                        }}
                      >
                        {(r.trainee || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="adm-vault-person-text">
                        <strong>{r.trainee}</strong>
                        <span className="adm-mono">{r.email}</span>
                      </div>
                    </div>

                    <div className="adm-vault-cell-org">
                      <span className="adm-org adm-vault-org-tag" title={r.org}>
                        {r.org}
                      </span>
                    </div>

                    <div className="adm-course adm-vault-cell-course">
                      <span title={r.course}>{r.course}</span>
                    </div>

                    <div className="adm-vault-cell-policy">
                      <code className="adm-policy adm-vault-policy-badge" title={r.policy}>
                        {r.policy}
                      </code>
                    </div>

                    <div className="adm-vault-cell-status" style={{ textAlign: 'center' }}>
                      {isDeleted ? (
                        <span className="adm-chip adm-chip--red adm-vault-status-chip">
                          DELETED
                        </span>
                      ) : (
                        <span className={`adm-chip ${isCompleted ? 'adm-chip--green' : 'adm-chip--amber'} adm-vault-status-chip`}>
                          <span className={`adm-status-dot ${isCompleted ? 'adm-status-dot--green' : 'adm-status-dot--amber'}`} />
                          {r.status}
                        </span>
                      )}
                    </div>

                    <div className="adm-vault-cell-actions">
                      {!isDeleted ? (
                        <div className="adm-vault-action-cluster">
                          <button
                            type="button"
                            className="adm-vault-row-action-btn"
                            onClick={() => handleOpenEdit(r)}
                            title="Correct/Update Record with mandatory reason (U-05)"
                          >
                            <Edit2 size={13} />
                          </button>
                          {isCompleted && (
                            <button
                              type="button"
                              className="adm-vault-row-action-btn adm-vault-row-action-btn--cert"
                              onClick={() => handleOpenReissue(r)}
                              title="Reissue Official Certificate"
                            >
                              <Award size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="adm-vault-row-action-btn adm-vault-row-action-btn--delete"
                            onClick={() => handleDeleteRecord(r)}
                            title="Soft-Delete Record (U-07)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="adm-vault-restore-btn"
                          onClick={() => handleRestoreRecord(r)}
                          title="Restore Soft-Deleted Record (U-07)"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <TableEmptyBlock
                icon={FileText}
                title="No Master Training Records Found"
                subtitle="No records match your current filter, company selection, or search query."
              />
            )}
          </div>
        </div>

        <div className="adm-vault-pagination-wrap">
          <TablePagination
            currentPage={recordPage}
            totalItems={totalRecords}
            pageSize={4}
            onPageChange={setRecordPage}
            itemName="master records"
          />
        </div>
      </div>

      {/* =====================================================================
          U-05: CORRECT / EDIT RECORD MODAL
          ===================================================================== */}
      {editingRecord && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '540px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Correct Training Record (U-05)</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Record ID: {editingRecord.id} • {editingRecord.trainee}</span>
              </div>
              <button type="button" onClick={() => setEditingRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {editError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', color: isDark ? '#f87171' : '#b91c1c', fontSize: '12.5px', fontWeight: 600 }}>
                  <AlertCircle size={15} />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  COMPLETION STATUS
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                >
                  <option value="Enrolled">Enrolled</option>
                  <option value="In progress">In progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Not completed">Not completed</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    SCORE (0–100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    placeholder="e.g. 94.5"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    ATTENDANCE
                  </label>
                  <select
                    value={editAttendance}
                    onChange={(e) => setEditAttendance(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Excused">Excused</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  MANDATORY AUDIT REASON *
                </label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Mandatory explanation required per security & compliance policies (e.g. Corrected score per proctor review)..."
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{ padding: '8px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#ffffff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  {editLoading ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CERTIFICATE REISSUE MODAL
          ===================================================================== */}
      {reissuingRecord && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '520px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Reissue Official Certificate</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Recipient: {reissuingRecord.trainee} • {reissuingRecord.course}</span>
              </div>
              <button type="button" onClick={() => setReissuingRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveReissue} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reissueError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: isDark ? 'rgba(225, 29, 72, 0.2)' : '#fee2e2', color: isDark ? '#f87171' : '#b91c1c', fontSize: '12.5px', fontWeight: 600 }}>
                  <AlertCircle size={15} />
                  <span>{reissueError}</span>
                </div>
              )}

              <div style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
                Reissuing will increment the version serial counter, regenerate the cryptographic signature, and write an immutable audit log entry.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  MANDATORY REISSUE REASON *
                </label>
                <textarea
                  rows={3}
                  value={reissueReason}
                  onChange={(e) => setReissueReason(e.target.value)}
                  placeholder="State formal reason for certificate reissue (e.g. Corrected participant middle initial per corporate HR request)..."
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReissuingRecord(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reissueLoading}
                  style={{ padding: '8px 20px', borderRadius: '8px', background: '#ff7a1a', color: '#ffffff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  {reissueLoading ? 'Reissuing...' : 'Confirm Reissue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          B5: ADD NEW MASTER RECORD MODAL
          ===================================================================== */}
      {isAddRecordOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: isDark ? '#111827' : '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '560px', border: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: isDark ? '1px solid #1f2937' : '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Create Master Training Record</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Encrypts credentials with Native CP-ABE access policy (B5)</span>
              </div>
              <button type="button" onClick={() => setIsAddRecordOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {addError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', color: isDark ? '#f87171' : '#b91c1c', fontSize: '12.5px', fontWeight: 600 }}>
                  <AlertCircle size={15} />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  SELECT TRAINEE PARTICIPANT *
                </label>
                <select
                  value={addTraineeId}
                  onChange={(e) => setAddTraineeId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                >
                  <option value="">-- Choose Trainee --</option>
                  {traineeList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  CLIENT COMPANY SPONSOR *
                </label>
                <select
                  value={addCompanyId}
                  onChange={(e) => setAddCompanyId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                >
                  <option value="">-- Choose Company --</option>
                  {companyList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  COURSE PROGRAM NAME *
                </label>
                <input
                  type="text"
                  value={addCourseName}
                  onChange={(e) => setAddCourseName(e.target.value)}
                  required
                  placeholder="e.g. Cloud Security Architecture & DevSecOps"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    INITIAL STATUS
                  </label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px' }}
                  >
                    <option value="In progress">In progress</option>
                    <option value="Enrolled">Enrolled</option>
                    <option value="Completed">Completed</option>
                    <option value="Not completed">Not completed</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                    SCORE (0–100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={addScore}
                    onChange={(e) => setAddScore(e.target.value)}
                    placeholder="e.g. 88.0"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: isDark ? '#cbd5e1' : '#334155' }}>
                  CONFIDENTIAL ASSESSMENT NOTES
                </label>
                <textarea
                  rows={2}
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Encrypted payload notes only decryptable by authorized attribute holders..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddRecordOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #cbd5e1', background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{ padding: '8px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#ffffff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  {addLoading ? 'Encrypting & Saving...' : 'Create & Encrypt Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

