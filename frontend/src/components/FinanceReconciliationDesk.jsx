import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Building2,
  UserCheck,
  Search
} from 'lucide-react';
import {
  fetchImportBatches,
  uploadImportFile,
  fetchBatchDiscrepancies,
  resolveDiscrepancy,
  fetchReconciliationReport,
  commitImportBatch
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function FinanceReconciliationDesk() {
  const { token, currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [report, setReport] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Discrepancy resolution modal state
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('ACCEPT');
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [resolveMessage, setResolveMessage] = useState(null);

  // Customer search filter
  const [customerSearch, setCustomerSearch] = useState('');

  // Commit state
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState(null);

  // 1. Load Batches
  const loadBatches = async (selectFirst = true) => {
    setLoading(true);
    try {
      const data = await fetchImportBatches(token);
      if (data && data.length > 0) {
        setBatches(data);
        if (selectFirst && !selectedBatchId) {
          const pilot = data.find(b => b.source_file_name?.includes('Training_Participants') || b.source_file_name?.includes('Pilot'));
          setSelectedBatchId(pilot ? pilot.id : data[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load import batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches(true);
  }, [token]);

  // 2. Load Details for Selected Batch
  const loadBatchDetails = async (batchId) => {
    if (!batchId) return;
    try {
      const [repData, discData] = await Promise.all([
        fetchReconciliationReport(batchId, token),
        fetchBatchDiscrepancies(batchId, token)
      ]);
      setReport(repData);
      setDiscrepancies(discData || []);
    } catch (err) {
      console.warn('Failed to load batch details:', err);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchDetails(selectedBatchId);
      setResolveMessage(null);
      setCommitMessage(null);
    }
  }, [selectedBatchId, token]);

  // 3. File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await uploadImportFile(file, token);
      setUploadSuccess(`Successfully staged ${file.name}! Parsed ${res.total_rows || res.record_count || 'all'} rows with automated pre-screening.`);
      await loadBatches(false);
      if (res.batch_id) {
        setSelectedBatchId(res.batch_id);
      }
    } catch (err) {
      setUploadError(err.message || 'Workbook upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 4. Resolve Discrepancy
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingId) return;
    if (!resolutionReason.trim()) {
      alert('Mandatory explanation reason must be provided for resolution.');
      return;
    }

    setResolvingLoading(true);
    try {
      await resolveDiscrepancy(
        resolvingId,
        {
          resolution: resolutionAction,
          reason: resolutionReason.trim()
        },
        token
      );
      setResolveMessage(`Discrepancy row successfully resolved with action: ${resolutionAction}.`);
      setResolvingId(null);
      setResolutionReason('');
      await loadBatchDetails(selectedBatchId);
      await loadBatches(false);
    } catch (err) {
      alert(err.message || 'Failed to resolve discrepancy.');
    } finally {
      setResolvingLoading(false);
    }
  };

  // 5. Commit Batch
  const handleCommit = async () => {
    if (!selectedBatchId) return;
    if (!confirm('Commit this validated batch to the encrypted training records vault? Validated rows will be encrypted via CP-ABE.')) {
      return;
    }

    setCommitting(true);
    try {
      const res = await commitImportBatch(selectedBatchId, token);
      setCommitMessage(`Successfully committed batch! ${res.committed_records || res.message || 'Records encrypted and persisted.'}`);
      await loadBatchDetails(selectedBatchId);
      await loadBatches(false);
    } catch (err) {
      alert(err.message || 'Failed to commit batch.');
    } finally {
      setCommitting(false);
    }
  };

  // 6. Download PDF
  const handleDownloadPdf = () => {
    if (!selectedBatchId) return;
    const url = `http://localhost:8000/api/v1/imports/batches/${selectedBatchId}/reconciliation/pdf`;
    window.open(url, '_blank');
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const filteredCustomers = (report?.customer_breakdown || []).filter(c =>
    c.customer_name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. DESK HEADER & REGULATORY SPEC STRIP */}
      <div className="card section-card" style={{ borderLeft: '4px solid #6366f1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-purple">FR-22 / DAT-01 / DAT-08 COMPLIANT</span>
              <span className="badge badge-green">IN-MEMORY BILLING STRIP</span>
              <span className="badge badge-cyan">AUG 1, 2026 CUTOFF BASELINE</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 6px', color: '#0f172a' }}>
              Pilot Data Ingestion & Reconciliation Desk
            </h2>
            <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
              Controlled pre-screening pipeline for legacy Crossworks client training workbooks (<code>Training_Participants.xlsx</code> and <code>Sample-Data.xlsx</code>). Strips sensitive sales fields (SI #, PO #, Tax Form 2307), auto-pseudonymizes retail individuals (<code>INDIV-C026 &mdash; C040</code>), and verifies 100% physical-to-ordinal row reconciliation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary flex-align gap-8"
              onClick={handleDownloadPdf}
              disabled={!selectedBatchId}
              style={{ background: '#4338ca', color: '#ffffff' }}
            >
              <Download size={15} />
              <span>Download Reconciliation PDF</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-secondary flex-align gap-8"
                onClick={handleCommit}
                disabled={committing || selectedBatch?.reconciled}
              >
                <CheckCircle2 size={15} color="#10b981" />
                <span>{selectedBatch?.reconciled ? 'Batch Reconciled' : committing ? 'Committing...' : 'Commit to Vault'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. WORKBOOK UPLOAD DROPZONE */}
      <div className="card p-20" style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={24} color="#4338ca" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>
                Stage New Training Participants Workbook (.xlsx / .csv)
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Pre-screening actively strips SI/PO numbers, payment details, and applies SHA-256 deduplication.
              </div>
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                background: uploading ? '#94a3b8' : '#4338ca',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(67, 56, 202, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <FileSpreadsheet size={16} />
              <span>{uploading ? 'Parsing in Volatile Memory...' : 'Select File to Stage'}</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {uploadSuccess && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '12.5px' }}>
            &#10004; {uploadSuccess}
          </div>
        )}
        {uploadError && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '12.5px' }}>
            &#9888; {uploadError}
          </div>
        )}
      </div>

      {/* 3. BATCH SELECTOR STRIP */}
      <div className="card p-16" style={{ background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ACTIVE STAGED IMPORT BATCHES:
          </span>
          <button
            type="button"
            onClick={() => loadBatches(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            <RefreshCw size={13} />
            <span>Refresh Batches</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {batches.map((b) => {
            const isSelected = b.id === selectedBatchId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBatchId(b.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #4338ca' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  boxShadow: isSelected ? '0 2px 8px rgba(67, 56, 202, 0.15)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileSpreadsheet size={15} color={isSelected ? '#4338ca' : '#64748b'} />
                  <strong style={{ fontSize: '13px', color: isSelected ? '#4338ca' : '#1e293b' }}>
                    {b.source_file_name}
                  </strong>
                  <span className={`badge ${b.reconciled ? 'badge-green' : b.discrepancy_count > 0 ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                    {b.reconciled ? 'RECONCILED' : b.discrepancy_count > 0 ? `${b.discrepancy_count} DISCREPANCIES` : 'STAGED'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {b.record_count} total rows &bull; {b.in_scope_count} in-scope &bull; {new Date(b.loaded_at).toLocaleDateString()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. RECONCILIATION KPI MATRIX */}
      {selectedBatch && (
        <div className="metrics-summary-row">
          <div className="card metric-tile">
            <div className="metric-tile-header">
              <span className="tile-label">Physical Workbook Rows</span>
              <FileSpreadsheet size={18} className="text-blue" />
            </div>
            <div className="tile-value">{report?.total_rows ?? selectedBatch.record_count}</div>
            <div className="tile-sub">Raw Rows in File</div>
          </div>

          <div className="card metric-tile">
            <div className="metric-tile-header">
              <span className="tile-label">Expected In-Scope</span>
              <CheckCircle2 size={18} className="text-emerald" />
            </div>
            <div className="tile-value text-emerald">{report?.in_scope_rows ?? selectedBatch.in_scope_count}</div>
            <div className="tile-sub">&ge; August 1, 2026 Cutoff</div>
          </div>

          <div className="card metric-tile">
            <div className="metric-tile-header">
              <span className="tile-label">Pre-Cutoff Excluded</span>
              <AlertTriangle size={18} className="text-amber" />
            </div>
            <div className="tile-value text-amber">{report?.pre_cutoff_excluded ?? selectedBatch.pre_cutoff_count}</div>
            <div className="tile-sub">June 6, 2026 Quarantined</div>
          </div>

          <div className="card metric-tile">
            <div className="metric-tile-header">
              <span className="tile-label">Distinct Client Accounts</span>
              <Building2 size={18} className="text-purple" />
            </div>
            <div className="tile-value text-purple">{report?.customer_breakdown?.length ?? selectedBatch.distinct_customers_count}</div>
            <div className="tile-sub">24 Corporate + 15 Retail</div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {resolveMessage && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', color: '#065f46', fontSize: '13px' }}>
          &#10004; {resolveMessage}
        </div>
      )}
      {commitMessage && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', color: '#065f46', fontSize: '13px' }}>
          &#10004; {commitMessage}
        </div>
      )}

      {/* 5. DISCREPANCY ISOLATION QUEUE (DAT-03, DAT-08, U-13) */}
      <div className="card section-card">
        <div className="card-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Discrepancy Quarantine Desk</h3>
            <p className="card-subtitle">
              Automated anomaly detection: Pre-cutoff dates, duplicate participant submissions, and punctuation variants.
            </p>
          </div>
          <span className="badge badge-amber" style={{ fontSize: '11px' }}>
            {discrepancies.filter(d => !d.resolution).length} Action Items Pending
          </span>
        </div>

        <div className="table-responsive">
          <table className="clean-table" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Row #</th>
                <th>Issue Classification</th>
                <th>Field Name</th>
                <th>Resolution Status</th>
                <th>Audit Reason / Log</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.length > 0 ? (
                discrepancies.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 800, fontFamily: 'monospace' }}>#{d.source_row_no}</td>
                    <td>
                      <span className={`badge ${d.issue_type === 'PRE_CUTOFF_DATE' ? 'badge-amber' : d.issue_type === 'DUPLICATE_PARTICIPANT' ? 'badge-rose' : 'badge-purple'}`}>
                        {d.issue_type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#475569' }}>{d.field_name || '—'}</td>
                    <td>
                      {d.resolution ? (
                        <span className="badge badge-green">&#10004; {d.resolution}</span>
                      ) : (
                        <span className="badge badge-amber">&#9888; PENDING REVIEW</span>
                      )}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12px' }}>
                      {d.resolution_reason || (
                        <em>Requires Admin explanation to merge, correct or accept.</em>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!d.resolution ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 10px', background: '#6366f1' }}
                          onClick={() => {
                            setResolvingId(d.id);
                            setResolutionAction(d.issue_type === 'PRE_CUTOFF_DATE' ? 'EXCLUDE' : d.issue_type === 'COMPANY_NAME_VARIANT' ? 'STANDARDIZE_NAME' : 'MERGE_DUPLICATE');
                            setResolutionReason(d.issue_type === 'PRE_CUTOFF_DATE' ? 'Pre-cutoff training prior to Aug 1, 2026 baseline excluded per FR-22.' : '');
                          }}
                        >
                          Resolve
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    &#10004; Zero discrepancies quarantined for this batch. All rows conform to schema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal / Drawer */}
      {resolvingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Resolve Discrepancy Quarantine Row
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b' }}>
              Specify the resolution action and a mandatory audit reason conforming to Chapter III Section 3.5.4.
            </p>

            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  RESOLUTION ACTION:
                </label>
                <select
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="ACCEPT">ACCEPT (Override Flag)</option>
                  <option value="CORRECT">CORRECT (Fix Field Value)</option>
                  <option value="STANDARDIZE_NAME">STANDARDIZE_NAME (Normalize Company Name)</option>
                  <option value="MERGE_DUPLICATE">MERGE_DUPLICATE (Deduplicate Participant)</option>
                  <option value="EXCLUDE">EXCLUDE (Exclude Pre-Cutoff Row)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  MANDATORY AUDIT REASON:
                </label>
                <textarea
                  rows="3"
                  required
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="State the justification, historical verification, or standardized client name..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResolvingId(null)}
                  disabled={resolvingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#4338ca', color: '#ffffff' }}
                  disabled={resolvingLoading}
                >
                  {resolvingLoading ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. RECONCILIATION SUMMARY REPORT & CUSTOMER BREAKDOWN (FR-22, DAT-08) */}
      <div className="card section-card">
        <div className="card-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-title">Customer Distribution & Pseudonymization Audit</h3>
            <p className="card-subtitle">
              Audit log of 39 distinct customer accounts with auto-pseudonymized self-paying individuals (INDIV-C026 &mdash; C040).
            </p>
          </div>

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search customer account..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table className="clean-table" style={{ fontSize: '12.5px' }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                <th>Client Account / Customer</th>
                <th>Entity Classification</th>
                <th style={{ textAlign: 'right' }}>Reconciled Records</th>
                <th>Security & Data Protection</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.is_pseudonymized_individual ? (
                          <UserCheck size={16} color="#0891b2" />
                        ) : (
                          <Building2 size={16} color="#6366f1" />
                        )}
                        <span>{c.customer_name}</span>
                      </div>
                    </td>
                    <td>
                      {c.is_pseudonymized_individual ? (
                        <span className="badge badge-cyan" style={{ fontSize: '10.5px' }}>
                          INDIVIDUAL RETAIL (SELF-PAYING)
                        </span>
                      ) : (
                        <span className="badge badge-blue" style={{ fontSize: '10.5px' }}>
                          CORPORATE CLIENT
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>
                      {c.row_count} records
                    </td>
                    <td>
                      {c.is_pseudonymized_individual ? (
                        <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 700 }}>
                          &#128274; PII Redacted (Cryptographic Pseudonym)
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                          &#10004; Multi-Tenant Isolated
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No matching customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
