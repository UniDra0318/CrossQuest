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
  Search,
  Sparkles,
  ShieldCheck,
  Check,
  X
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadImportFile(formData, token);
      setUploadSuccess(`Successfully staged ${file.name}! In-scope: ${result.in_scope_count}, Quarantined: ${result.quarantined_count}`);
      await loadBatches(false);
      setSelectedBatchId(result.batch_id);
    } catch (err) {
      setUploadError(err.message || 'File upload failed. Ensure headers match the template.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 4. Resolve Discrepancy
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingId || !resolutionReason.trim()) return;

    setResolvingLoading(true);
    try {
      await resolveDiscrepancy(resolvingId, {
        resolution: resolutionAction,
        resolution_reason: resolutionReason.trim()
      }, token);

      setResolveMessage(`Discrepancy #${resolvingId.slice(0, 8)} resolved with action: ${resolutionAction}`);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. DESK HEADER & REGULATORY SPEC STRIP */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          padding: '28px 32px', 
          border: '1px solid var(--cq-line)', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ maxWidth: '820px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
              FR-22 / DAT-01 / DAT-08 COMPLIANT
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              IN-MEMORY BILLING STRIP
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '3px 10px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              AUG 1, 2026 CUTOFF BASELINE
            </span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Pilot Data Ingestion & Reconciliation Desk
          </h2>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>
            Controlled pre-screening pipeline for legacy Crossworks client training workbooks (<code>Training_Participants.xlsx</code> and <code>Sample-Data.xlsx</code>). Strips sensitive sales fields (SI #, PO #, Tax Form 2307), auto-pseudonymizes retail individuals (<code>INDIV-C026 &mdash; C040</code>), and verifies 100% physical-to-ordinal row reconciliation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!selectedBatchId}
            style={{
              padding: '11px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: !selectedBatchId ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={15} />
            <span>Download Reconciliation PDF</span>
          </button>
          
          {isAdmin && (
            <button
              type="button"
              onClick={handleCommit}
              disabled={committing || selectedBatch?.reconciled}
              style={{
                padding: '11px 18px',
                borderRadius: '12px',
                background: selectedBatch?.reconciled ? '#f1f5f9' : '#059669',
                color: selectedBatch?.reconciled ? '#64748b' : '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: (committing || selectedBatch?.reconciled) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: selectedBatch?.reconciled ? 'none' : '0 4px 14px rgba(5, 150, 105, 0.25)'
              }}
            >
              <CheckCircle2 size={15} color={selectedBatch?.reconciled ? '#94a3b8' : '#ffffff'} />
              <span>{selectedBatch?.reconciled ? 'Batch Reconciled' : committing ? 'Committing...' : 'Commit to Vault'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. WORKBOOK UPLOAD DROPZONE */}
      <div 
        style={{ 
          background: '#f8fafc', 
          border: '1.5px dashed #cbd5e1', 
          borderRadius: '20px', 
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UploadCloud size={26} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>
              Stage New Training Participants Workbook (.xlsx / .csv)
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
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
              padding: '11px 22px',
              background: uploading ? '#94a3b8' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
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

        {uploadSuccess && (
          <div style={{ width: '100%', marginTop: '8px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '13px' }}>
            &#10004; {uploadSuccess}
          </div>
        )}
        {uploadError && (
          <div style={{ width: '100%', marginTop: '8px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontSize: '13px' }}>
            &#9888; {uploadError}
          </div>
        )}
      </div>

      {/* 3. BATCH SELECTOR STRIP */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '20px', 
          padding: '22px 26px', 
          border: '1px solid var(--cq-line)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ACTIVE STAGED IMPORT BATCHES:
          </span>
          <button
            type="button"
            onClick={() => loadBatches(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#4f46e5', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
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
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isSelected ? '#f5f3ff' : '#ffffff',
                  boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={16} color={isSelected ? '#4f46e5' : '#64748b'} />
                  <strong style={{ fontSize: '13px', color: isSelected ? '#4f46e5' : '#1e293b' }}>
                    {b.source_file_name}
                  </strong>
                  <span 
                    style={{ 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      padding: '2px 8px', 
                      borderRadius: '8px', 
                      background: b.reconciled ? '#ecfdf5' : b.discrepancy_count > 0 ? '#fffbeb' : '#e0f2fe',
                      color: b.reconciled ? '#059669' : b.discrepancy_count > 0 ? '#b45309' : '#0284c7',
                      border: b.reconciled ? '1px solid #a7f3d0' : b.discrepancy_count > 0 ? '1px solid #fde68a' : '1px solid #bae6fd'
                    }}
                  >
                    {b.reconciled ? 'RECONCILED' : b.discrepancy_count > 0 ? `${b.discrepancy_count} DISCREPANCIES` : 'STAGED'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {b.record_count} total rows &bull; {b.in_scope_count} in-scope &bull; {new Date(b.loaded_at).toLocaleDateString()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. RECONCILIATION KPI MATRIX */}
      {selectedBatch && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid var(--cq-line)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Physical Workbook Rows</span>
              <FileSpreadsheet size={18} color="#0284c7" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{report?.total_rows ?? selectedBatch.record_count}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Raw Rows in File</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid var(--cq-line)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Expected In-Scope</span>
              <CheckCircle2 size={18} color="#059669" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669' }}>{report?.in_scope_rows ?? selectedBatch.in_scope_count}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>&ge; August 1, 2026 Cutoff</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid var(--cq-line)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Pre-Cutoff Excluded</span>
              <AlertTriangle size={18} color="#d97706" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706' }}>{report?.pre_cutoff_excluded ?? selectedBatch.pre_cutoff_count}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>June 6, 2026 Quarantined</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid var(--cq-line)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Distinct Client Accounts</span>
              <Building2 size={18} color="#7c3aed" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed' }}>{report?.customer_breakdown?.length ?? selectedBatch.distinct_customers_count}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>24 Corporate + 15 Retail</div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {resolveMessage && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', color: '#065f46', fontSize: '13px' }}>
          &#10004; {resolveMessage}
        </div>
      )}
      {commitMessage && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '12px', color: '#065f46', fontSize: '13px' }}>
          &#10004; {commitMessage}
        </div>
      )}

      {/* 5. DISCREPANCY ISOLATION QUEUE (DAT-03, DAT-08, U-13) WITH STICKY SCROLL */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          padding: '24px 28px', 
          border: '1px solid var(--cq-line)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Discrepancy Quarantine Desk
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              Automated anomaly detection: Pre-cutoff dates, duplicate participant submissions, and punctuation variants.
            </p>
          </div>
          <span style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
            {discrepancies.filter(d => !d.resolution).length} Action Items Pending
          </span>
        </div>

        {/* Scrollable Container with Sticky Table Header */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px', width: '100%', boxSizing: 'border-box' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569', width: '90px' }}>ROW #</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>ISSUE CLASSIFICATION</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>FIELD NAME</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>RESOLUTION STATUS</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>AUDIT REASON / LOG</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569', width: '110px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {discrepancies.length > 0 ? (
                discrepancies.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, fontFamily: 'monospace', color: '#1e293b' }}>#{d.source_row_no}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          padding: '3px 8px', 
                          borderRadius: '6px',
                          background: d.issue_type === 'PRE_CUTOFF_DATE' ? '#fffbeb' : d.issue_type === 'DUPLICATE_PARTICIPANT' ? '#fff1f2' : '#f5f3ff',
                          color: d.issue_type === 'PRE_CUTOFF_DATE' ? '#b45309' : d.issue_type === 'DUPLICATE_PARTICIPANT' ? '#be123c' : '#7c3aed',
                          border: d.issue_type === 'PRE_CUTOFF_DATE' ? '1px solid #fde68a' : d.issue_type === 'DUPLICATE_PARTICIPANT' ? '1px solid #fecdd3' : '1px solid #ddd6fe'
                        }}
                      >
                        {d.issue_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>{d.field_name || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {d.resolution ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          &#10004; {d.resolution}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                          &#9888; PENDING REVIEW
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                      {d.resolution_reason || (
                        <em>Requires explanation to merge, correct or accept.</em>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {!d.resolution ? (
                        <button
                          type="button"
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '6px 14px',
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setResolvingId(d.id);
                            setResolutionAction(d.issue_type === 'PRE_CUTOFF_DATE' ? 'EXCLUDE' : d.issue_type === 'COMPANY_NAME_VARIANT' ? 'STANDARDIZE_NAME' : 'MERGE_DUPLICATE');
                            setResolutionReason(d.issue_type === 'PRE_CUTOFF_DATE' ? 'Pre-cutoff training prior to Aug 1, 2026 baseline excluded per FR-22.' : '');
                          }}
                        >
                          Resolve
                        </button>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 800 }}>Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '28px', width: '500px', maxWidth: '100%', boxShadow: '0 20px 45px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Resolve Discrepancy Quarantine Row
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
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
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}
                >
                  <option value="ACCEPT">ACCEPT (Override Flag)</option>
                  <option value="CORRECT">CORRECT (Fix Field Value)</option>
                  <option value="STANDARDIZE_NAME">STANDARDIZE_NAME (Normalize Company Name)</option>
                  <option value="MERGE_DUPLICATE">MERGE_DUPLICATE (Deduplicate Participant)</option>
                  <option value="EXCLUDE">EXCLUDE (Exclude Pre-Cutoff Row)</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  MANDATORY AUDIT REASON:
                </label>
                <textarea
                  rows="3"
                  required
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="State the justification, historical verification, or standardized client name..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setResolvingId(null)}
                  disabled={resolvingLoading}
                  style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolvingLoading}
                  style={{ padding: '9px 20px', borderRadius: '8px', background: '#4f46e5', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  {resolvingLoading ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. RECONCILIATION SUMMARY REPORT & CUSTOMER BREAKDOWN (FR-22, DAT-08) WITH STICKY SCROLL */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '24px', 
          padding: '24px 28px', 
          border: '1px solid var(--cq-line)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Customer Distribution & Pseudonymization Audit
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
              Audit log of 39 distinct customer accounts with auto-pseudonymized self-paying individuals (INDIV-C026 &mdash; C040).
            </p>
          </div>

          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search customer account..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '12.5px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Scrollable Container with Sticky Table Header */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px', width: '100%', boxSizing: 'border-box' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>CLIENT ACCOUNT / CUSTOMER</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>ENTITY CLASSIFICATION</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569', textAlign: 'right' }}>RECONCILED RECORDS</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569' }}>SECURITY & DATA PROTECTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.is_pseudonymized_individual ? (
                          <UserCheck size={16} color="#0891b2" />
                        ) : (
                          <Building2 size={16} color="#6366f1" />
                        )}
                        <span>{c.customer_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.is_pseudonymized_individual ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2', background: '#ecfeff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a5f3fc' }}>
                          INDIVIDUAL RETAIL (SELF-PAYING)
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                          CORPORATE CLIENT
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#1e293b' }}>
                      {c.row_count} records
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.is_pseudonymized_individual ? (
                        <span style={{ fontSize: '11.5px', color: '#0891b2', fontWeight: 700 }}>
                          &#128274; PII Redacted (Cryptographic Pseudonym)
                        </span>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                          &#10004; Multi-Tenant Isolated
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
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
